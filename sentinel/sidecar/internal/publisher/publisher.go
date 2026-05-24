package publisher

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/hydra/sentinel-sidecar/internal/tailer"
)

type Publisher struct {
	PlatformURL string
	ServiceName string
	client      *http.Client
}

func New(platformURL, serviceName string) *Publisher {
	return &Publisher{
		PlatformURL: platformURL,
		ServiceName: serviceName,
		client:      &http.Client{Timeout: 10 * time.Second},
	}
}

type ingestReq struct {
	Timestamp   string `json:"timestamp"`
	Level       string `json:"level"`
	ErrorCode   string `json:"error_code"`
	Message     string `json:"message"`
	StackTrace  string `json:"stack_trace"`
	TraceID     string `json:"trace_id"`
	Handler     string `json:"handler"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	ServiceName string `json:"service_name"`
}

func (p *Publisher) Publish(entries []tailer.ErrorEntry) error {
	reqs := make([]ingestReq, len(entries))
	for i, e := range entries {
		reqs[i] = ingestReq{
			Timestamp:   e.Timestamp,
			Level:       e.Level,
			ErrorCode:   e.ErrorCode,
			Message:     e.Message,
			StackTrace:  e.StackTrace,
			TraceID:     e.TraceID,
			Handler:     e.Handler,
			File:        e.File,
			Line:        e.Line,
			ServiceName: p.ServiceName,
		}
	}

	body, err := json.Marshal(reqs)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	resp, err := p.client.Post(
		p.PlatformURL+"/api/v1/ingest/errors",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("post: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	return nil
}

func (p *Publisher) Run(entries <-chan tailer.ErrorEntry, done chan<- struct{}) {
	defer close(done)

	batch := make([]tailer.ErrorEntry, 0, 10)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	flush := func() (success bool) {
		if len(batch) == 0 {
			return true
		}
		if err := p.Publish(batch); err != nil {
			log.Printf("[sidecar] publish error (retaining %d entries): %v", len(batch), err)
			return false
		}
		log.Printf("[sidecar] published %d errors", len(batch))
		return true
	}

	for {
		select {
		case entry, ok := <-entries:
			if !ok {
				flush()
				return
			}
			batch = append(batch, entry); if len(batch) > 100 { log.Printf("[sidecar] batch overflow, dropping oldest"); batch = batch[1:] }
			if len(batch) >= 10 {
				if flush() {
					batch = batch[:0]
				}
			}
		case <-ticker.C:
			if flush() {
				batch = batch[:0]
			}
		}
	}
}
