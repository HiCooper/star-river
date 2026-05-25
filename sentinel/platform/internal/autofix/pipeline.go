package autofix

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"github.com/hydra/sentinel-service/internal/model"
)

type Pipeline struct {
	db *gorm.DB
}

type FixLog struct {
	Steps []FixStep `json:"steps"`
}

type FixStep struct {
	Step   string `json:"step"`
	Status string `json:"status"`
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

func NewPipeline(db *gorm.DB) *Pipeline {
	return &Pipeline{db: db}
}

func (p *Pipeline) Run(issue model.Issue, svc model.Service) {
	log.Printf("[autofix] starting for issue %s: %s", issue.ID, issue.Title)
	fixLog := &FixLog{Steps: []FixStep{}}

	p.db.Model(&issue).Updates(map[string]interface{}{
		"fix_type": "auto", "fix_status": "in_progress",
	})
	p.timeline(issue.ID, "auto_fix_started", "Claude Code 自动修复启动")

	repoPath := svc.RepoLocalPath
	if repoPath == "" {
		p.failWithLog(issue.ID, fixLog, "repo_local_path not configured")
		return
	}
	if issue.Severity == "critical" {
		p.failWithLog(issue.ID, fixLog, "critical severity, requires manual review")
		return
	}

	branchName := fmt.Sprintf("sentinel/auto-fix-%s", issue.ID.String()[:8])

	// git checkout
	step := p.runCmd("git fetch", repoPath, "git", "fetch", "origin")
	fixLog.Steps = append(fixLog.Steps, step)
	p.runCmd("", repoPath, "git", "checkout", "main")
	p.runCmd("", repoPath, "git", "pull", "origin", "main")
	step = p.runCmd("git checkout -b "+branchName, repoPath, "git", "checkout", "-b", branchName)
	fixLog.Steps = append(fixLog.Steps, step)
	if step.Status == "failed" {
		p.failWithLog(issue.ID, fixLog, "git checkout failed")
		return
	}

	// Claude Code
	prompt := buildFixPrompt(issue)
	cmd := exec.Command("claude", "-p", prompt, "--allowedTools", "Read,Edit,Bash", "--dangerously-skip-permissions")
	cmd.Dir = repoPath
	var claudeOut bytes.Buffer
	cmd.Stdout = &claudeOut
	cmd.Stderr = &claudeOut
	claudeErr := cmd.Run()
	claudeOutput := claudeOut.String()
	log.Printf("[autofix] claude output: %.500s", claudeOutput)
	fixStep := FixStep{Step: "Claude Code 修复", Output: claudeOutput}
	if claudeErr != nil {
		fixStep.Status = "failed"
		fixStep.Error = claudeErr.Error()
		fixLog.Steps = append(fixLog.Steps, fixStep)
		p.failWithLog(issue.ID, fixLog, fmt.Sprintf("claude fix failed: %v", claudeErr))
		p.gitCleanup(repoPath, branchName)
		return
	}
	fixStep.Status = "ok"
	fixLog.Steps = append(fixLog.Steps, fixStep)

	// Tests
	testCmd := getTestCommand(repoPath)
	if testCmd != "" {
		parts := strings.Fields(testCmd)
		step = p.runCmd("run tests: "+testCmd, repoPath, parts[0], parts[1:]...)
		fixLog.Steps = append(fixLog.Steps, step)
		if step.Status == "failed" {
			p.db.Model(&issue).Update("fix_status", "failed")
			p.timeline(issue.ID, "auto_fix_failed", "Tests failed")
			p.saveLog(issue.ID, fixLog)
			p.gitCleanup(repoPath, branchName)
			return
		}
	}

	// git commit
	step = p.runCmd("git add -A", repoPath, "git", "add", "-A")
	fixLog.Steps = append(fixLog.Steps, step)
	msg := fmt.Sprintf("fix: [sentinel] %s", issue.Title)
	p.runCmd("git commit", repoPath, "git", "commit", "-m", msg)

	// git push
	step = p.runCmd("git push", repoPath, "git", "push", "origin", branchName)
	fixLog.Steps = append(fixLog.Steps, step)
	if step.Status == "failed" {
		p.failWithLog(issue.ID, fixLog, fmt.Sprintf("git push failed: %s", step.Error))
		p.gitCleanup(repoPath, branchName)
		return
	}

	// gh pr create
	prCmd := exec.Command("gh", "pr", "create",
		"--title", fmt.Sprintf("fix: [sentinel] %s", issue.Title),
		"--body", fmt.Sprintf("Auto-fix for issue %s", issue.ID),
		"--base", "main", "--head", branchName)
	prCmd.Dir = repoPath
	var prOut bytes.Buffer
	prCmd.Stdout = &prOut
	prCmd.Stderr = &prOut
	step = FixStep{Step: "gh pr create", Output: prOut.String()}
	if prCmd.Run() != nil {
		step.Status = "failed"
		fixLog.Steps = append(fixLog.Steps, step)
		p.failWithLog(issue.ID, fixLog, "PR create failed")
		return
	}
	step.Status = "ok"
	fixLog.Steps = append(fixLog.Steps, step)

	// Success
	p.db.Model(&issue).Updates(map[string]interface{}{
		"fix_status": "succeeded", "fix_pr_url": strings.TrimSpace(prOut.String()),
		"fix_branch": branchName, "status": "fixed",
	})
	p.timeline(issue.ID, "auto_fix_completed", "PR: "+strings.TrimSpace(prOut.String()))
	p.saveLog(issue.ID, fixLog)
	log.Printf("[autofix] completed: %s", strings.TrimSpace(prOut.String()))
}

func (p *Pipeline) runCmd(label string, dir string, name string, args ...string) FixStep {
	cmd := exec.Command(name, args...)
	if dir != "" { cmd.Dir = dir }
	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &buf
	err := cmd.Run()
	step := FixStep{Output: buf.String()}
	if label != "" { step.Step = label } else { step.Step = fmt.Sprintf("%s %s", name, strings.Join(args, " ")) }
	if err != nil { step.Status = "failed"; step.Error = err.Error() } else { step.Status = "ok" }
	return step
}

func (p *Pipeline) saveLog(issueID uuid.UUID, fixLog *FixLog) {
	data, _ := json.Marshal(fixLog)
	p.db.Model(&model.Issue{}).Where("id = ?", issueID).Update("fix_log", datatypes.JSON(data))
}

func (p *Pipeline) failWithLog(issueID uuid.UUID, fixLog *FixLog, reason string) {
	log.Printf("[autofix] FAILED %s: %s", issueID, reason)
	p.db.Model(&model.Issue{}).Where("id = ?", issueID).Updates(map[string]interface{}{
		"fix_type": "auto", "fix_status": "failed",
	})
	p.saveLog(issueID, fixLog)
	p.timeline(issueID, "auto_fix_failed", reason)
}

func (p *Pipeline) gitCleanup(repoPath, branch string) {
	exec.Command("git", "-C", repoPath, "checkout", "main").Run()
	exec.Command("git", "-C", repoPath, "branch", "-D", branch).Run()
}

func (p *Pipeline) timeline(issueID uuid.UUID, eventType, description string) {
	p.db.Create(&model.IssueTimeline{
		IssueID: issueID, EventType: eventType, Description: description, CreatedAt: time.Now(),
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

func getTestCommand(repoPath string) string {
	if _, err := os.Stat(filepath.Join(repoPath, "go.mod")); err == nil {
		return "go test ./..."
	}
	if _, err := os.Stat(filepath.Join(repoPath, "package.json")); err == nil {
		return "npm test"
	}
	return ""
}
