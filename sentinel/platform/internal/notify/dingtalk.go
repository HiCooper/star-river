package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type dingtalkMsg struct {
	MsgType string       `json:"msgtype"`
	Markdown dingtalkMD  `json:"markdown"`
}

type dingtalkMD struct {
	Title string `json:"title"`
	Text  string `json:"text"`
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

func SendDingtalk(webhookURL, title, text string) {
	if webhookURL == "" {
		return
	}
	msg := dingtalkMsg{
		MsgType: "markdown",
		Markdown: dingtalkMD{
			Title: title,
			Text:  text,
		},
	}
	body, _ := json.Marshal(msg)
	resp, err := httpClient.Post(webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("[notify] dingtalk error: %v", err)
		return
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		log.Printf("[notify] dingtalk status: %d", resp.StatusCode)
		return
	}
	log.Printf("[notify] dingtalk sent: %s", title)
}

func IssueCreated(webhookURL, issueID, service, title, severity, aiCategory, aiSeverity string) {
	if webhookURL == "" {
		return
	}
	text := fmt.Sprintf(`## 🚨 新 Issue: %s

- **服务**: %s
- **严重性**: %s
- **AI 分类**: %s / %s
- **时间**: %s

[查看详情](http://localhost:3000/issues/%s)`, title, service, severity, aiCategory, aiSeverity, issueID, time.Now().Format("15:04:05"))
	SendDingtalk(webhookURL, fmt.Sprintf("[%s] %s", service, title), text)
}

func IssueApproved(webhookURL, issueID, service, title string) {
	if webhookURL == "" {
		return
	}
	text := fmt.Sprintf(`## ✅ Issue 已批准

- **服务**: %s
- **标题**: %s
- **时间**: %s
- **状态**: 自动修复 Pipeline 已启动

[查看详情](http://localhost:3000/issues/%s)`, service, title, issueID, time.Now().Format("15:04:05"))
	SendDingtalk(webhookURL, fmt.Sprintf("✅ [%s] 已批准", service), text)
}
