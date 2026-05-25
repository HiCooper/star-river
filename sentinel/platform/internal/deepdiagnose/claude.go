package deepdiagnose

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"strings"
)

type DiagnoseInput struct {
	ServiceName string `json:"service_name"`
	ErrorCode   string `json:"error_code"`
	Message     string `json:"message"`
	StackTrace  string `json:"stack_trace"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Handler     string `json:"handler"`
	RepoPath    string `json:"repo_path"`
	DocsPath    string `json:"docs_path"`
}

type DiagnoseResult struct {
	RootCause    string `json:"root_cause"`
	FixPlan      string `json:"fix_plan"`
	AffectedCode string `json:"affected_code"`
	Confidence   int    `json:"confidence"`
	RawOutput    string `json:"raw_output"`
}

func Diagnose(input DiagnoseInput) (*DiagnoseResult, error) {
	prompt := buildPrompt(input)

	cmd := exec.Command("claude", "-p", prompt)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	log.Printf("[deepdiagnose] running Claude Code for %s/%s at %s:%d",
		input.ServiceName, input.ErrorCode, input.File, input.Line)

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("claude error: %w\nstderr: %s", err, stderr.String())
	}

	output := stdout.String()
	result := &DiagnoseResult{
		RawOutput: output,
	}

	if err := json.Unmarshal([]byte(output), result); err != nil {
		result.RootCause = output
		result.FixPlan = "See raw output"
		result.Confidence = 70
	}

	log.Printf("[deepdiagnose] completed for %s/%s", input.ServiceName, input.ErrorCode)
	return result, nil
}

func buildPrompt(input DiagnoseInput) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("你是 %s 服务的 SRE 专家。请分析以下线上错误：\n\n", input.ServiceName))
	sb.WriteString(fmt.Sprintf("错误码: %s\n", input.ErrorCode))
	sb.WriteString(fmt.Sprintf("错误消息: %s\n", input.Message))
	sb.WriteString(fmt.Sprintf("位置: %s:%d\n", input.File, input.Line))
	sb.WriteString(fmt.Sprintf("处理函数: %s\n", input.Handler))
	if input.StackTrace != "" {
		sb.WriteString(fmt.Sprintf("堆栈: %s\n", input.StackTrace))
	}
	sb.WriteString("\n请执行以下操作：\n")
	sb.WriteString("1. 阅读错误位置的源码文件\n")
	if input.DocsPath != "" {
		sb.WriteString(fmt.Sprintf("2. 参考 %s 下的文档了解业务背景\n", input.DocsPath))
	}
	sb.WriteString("3. 分析根因\n")
	sb.WriteString("4. 给出具体修复方案\n\n")
	sb.WriteString("请以 JSON 格式输出：\n")
	sb.WriteString(`{"root_cause": "根因分析", "fix_plan": "修复方案", "affected_code": "受影响代码说明", "confidence": 85}`)
	return sb.String()
}
