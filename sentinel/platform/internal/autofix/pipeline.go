package autofix

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/hydra/sentinel-service/internal/model"
)

type Pipeline struct {
	db *gorm.DB
}

func NewPipeline(db *gorm.DB) *Pipeline {
	return &Pipeline{db: db}
}

func (p *Pipeline) Run(issue model.Issue, svc model.Service) {
	log.Printf("[autofix] starting for issue %s: %s", issue.ID, issue.Title)

	p.db.Model(&issue).Updates(map[string]interface{}{
		"fix_type":   "auto",
		"fix_status": "in_progress",
	})
	p.timeline(issue.ID, "auto_fix_started", "Claude Code 自动修复启动")

	repoPath := svc.RepoLocalPath
	if repoPath == "" {
		p.fail(issue.ID, "repo_local_path not configured")
		return
	}

	if issue.Severity == "critical" {
		p.fail(issue.ID, "critical severity, requires manual review")
		return
	}

	branchName := fmt.Sprintf("sentinel/auto-fix-%s", issue.ID.String()[:8])

	if err := p.gitCheckout(repoPath, branchName); err != nil {
		p.fail(issue.ID, fmt.Sprintf("git checkout failed: %v", err))
		return
	}

	prompt := buildFixPrompt(issue)
	cmd := exec.Command("claude", "-p", prompt, "--allowedTools", "Read,Edit,Bash")
	cmd.Dir = repoPath
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[autofix] claude error: %v\n%s", err, string(output))
		p.fail(issue.ID, fmt.Sprintf("claude fix failed: %v", err))
		p.gitCleanup(repoPath, branchName)
		return
	}
	log.Printf("[autofix] claude output: %.500s", string(output))

	testCmd := getTestCommand(svc.Language)
	if testCmd != "" {
		parts := strings.Fields(testCmd)
		testExec := exec.Command(parts[0], parts[1:]...)
		testExec.Dir = repoPath
		testOut, testErr := testExec.CombinedOutput()
		if testErr != nil {
			log.Printf("[autofix] tests failed: %v\n%s", testErr, string(testOut))
			p.db.Model(&issue).Update("fix_status", "failed")
			p.timeline(issue.ID, "auto_fix_failed", fmt.Sprintf("Tests failed: %v", testErr))
			p.gitCleanup(repoPath, branchName)
			return
		}
		log.Printf("[autofix] tests passed")
	}

	if err := p.gitCommitPush(repoPath, branchName, issue); err != nil {
		p.fail(issue.ID, fmt.Sprintf("git push failed: %v", err))
		p.gitCleanup(repoPath, branchName)
		return
	}

	prURL, err := p.createPR(repoPath, branchName, issue)
	if err != nil {
		p.fail(issue.ID, fmt.Sprintf("create PR failed: %v", err))
		return
	}

	p.db.Model(&issue).Updates(map[string]interface{}{
		"fix_status": "succeeded",
		"fix_pr_url": prURL,
		"fix_branch": branchName,
		"status":     "fixed",
	})
	p.timeline(issue.ID, "auto_fix_completed", fmt.Sprintf("PR created: %s", prURL))
	log.Printf("[autofix] completed: %s", prURL)
}

func (p *Pipeline) gitCheckout(repoPath, branch string) error {
	run(exec.Command("git", "-C", repoPath, "fetch", "origin"))
	run(exec.Command("git", "-C", repoPath, "checkout", "main"))
	run(exec.Command("git", "-C", repoPath, "pull", "origin", "main"))
	return run(exec.Command("git", "-C", repoPath, "checkout", "-b", branch))
}

func (p *Pipeline) gitCommitPush(repoPath, branch string, issue model.Issue) error {
	run(exec.Command("git", "-C", repoPath, "add", "-A"))
	msg := fmt.Sprintf("fix: [sentinel] %s\n\nAuto-fix for issue %s", issue.Title, issue.ID)
	if err := run(exec.Command("git", "-C", repoPath, "commit", "-m", msg)); err != nil {
		return nil // no changes to commit is OK
	}
	return run(exec.Command("git", "-C", repoPath, "push", "origin", branch))
}

func (p *Pipeline) createPR(repoPath, branch string, issue model.Issue) (string, error) {
	title := fmt.Sprintf("fix: [sentinel] %s", issue.Title)
	body := fmt.Sprintf("Auto-fix for issue %s\n\nAI Suggestion: %s", issue.ID, issue.AIFixSuggestion)
	cmd := exec.Command("gh", "pr", "create", "--title", title, "--body", body, "--base", "main", "--head", branch)
	cmd.Dir = repoPath
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("%v: %s", err, string(out))
	}
	return strings.TrimSpace(string(out)), nil
}

func (p *Pipeline) gitCleanup(repoPath, branch string) {
	run(exec.Command("git", "-C", repoPath, "checkout", "main"))
	run(exec.Command("git", "-C", repoPath, "branch", "-D", branch))
}

func (p *Pipeline) fail(issueID uuid.UUID, reason string) {
	log.Printf("[autofix] FAILED %s: %s", issueID, reason)
	p.db.Model(&model.Issue{}).Where("id = ?", issueID).Updates(map[string]interface{}{
		"fix_type": "auto", "fix_status": "failed",
	})
	p.timeline(issueID, "auto_fix_failed", reason)
}

func (p *Pipeline) timeline(issueID uuid.UUID, eventType, description string) {
	p.db.Create(&model.IssueTimeline{
		IssueID:     issueID,
		EventType:   eventType,
		Description: description,
		CreatedAt:   time.Now(),
	})
}

func buildFixPrompt(issue model.Issue) string {
	p := fmt.Sprintf("修复以下 bug，只修改必要代码，不要重构：\n\n错误: %s\n", issue.Title)
	if issue.AISuspectedFile != "" {
		p += fmt.Sprintf("位置: %s:%d\n", issue.AISuspectedFile, issue.AISuspectedLine)
	}
	if issue.AIFixSuggestion != "" {
		p += fmt.Sprintf("修复建议: %s\n", issue.AIFixSuggestion)
	}
	p += "\n完成后运行项目的测试命令验证。"
	return p
}

func getTestCommand(language string) string {
	switch language {
	case "go":
		return "go test ./..."
	case "typescript":
		return "npm test"
	default:
		return ""
	}
}

func run(cmd *exec.Cmd) error {
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
