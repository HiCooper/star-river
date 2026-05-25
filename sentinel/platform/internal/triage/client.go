package triage

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Client struct {
	baseURL string
	client  *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 30 * time.Second},
	}
}

type ErrorInput struct {
	ServiceName string `json:"service_name"`
	ErrorCode   string `json:"error_code"`
	Message     string `json:"message"`
	StackTrace  string `json:"stack_trace"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Handler     string `json:"handler"`
}

type TriageRequest struct {
	Errors []ErrorInput `json:"errors"`
}

type TriageResult struct {
	Category       string `json:"category"`
	Severity       string `json:"severity"`
	AutoFixable    string `json:"auto_fixable"`
	SuspectedFile  string `json:"suspected_file"`
	SuspectedLine  int    `json:"suspected_line"`
	FixSuggestion  string `json:"fix_suggestion"`
	Confidence     int    `json:"confidence"`
}

type TriageResponse struct {
	Results []TriageResult `json:"results"`
}

func (c *Client) Classify(serviceName, errorCode, message, stackTrace, file, handler string, line int) (*TriageResult, error) {
	req := TriageRequest{
		Errors: []ErrorInput{
			{ServiceName: serviceName, ErrorCode: errorCode, Message: message,
				StackTrace: stackTrace, File: file, Line: line, Handler: handler},
		},
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}

	resp, err := c.client.Post(c.baseURL+"/api/v1/triage", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	var triageResp TriageResponse
	if err := json.NewDecoder(resp.Body).Decode(&triageResp); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}

	if len(triageResp.Results) == 0 {
		return nil, fmt.Errorf("no results from ai engine")
	}

	result := triageResp.Results[0]
	log.Printf("[sentinel] AI classified [%s] as %s/%s (confidence: %d%%)",
		serviceName, result.Category, result.Severity, result.Confidence)
	return &result, nil
}
