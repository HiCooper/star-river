package tailer

import (
	"bufio"
	"encoding/json"
	"io"
	"log"
)

type ErrorEntry struct {
	Timestamp  string `json:"timestamp"`
	Level      string `json:"level"`
	ErrorCode  string `json:"error_code"`
	Message    string `json:"message"`
	StackTrace string `json:"stack_trace"`
	RawLine    string `json:"raw_line"`
	TraceID    string `json:"trace_id"`
	Handler    string `json:"handler"`
	File       string `json:"file"`
	Line       int    `json:"line"`
}

func Tail(reader io.Reader, out chan<- ErrorEntry) {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		rawLine := string(line)
		var entry map[string]interface{}
		if err := json.Unmarshal(line, &entry); err != nil {
			// Non-JSON log — still capture as raw error
			errEntry := ErrorEntry{
				Level:   "error",
				Message: rawLine,
				RawLine: rawLine,
			}
			out <- errEntry
			continue
		}

		level, _ := entry["level"].(string)
		if level != "error" && level != "fatal" && level != "panic" {
			continue
		}

		errEntry := ErrorEntry{
			Level:   level,
			RawLine: rawLine,
		}
		if v, ok := entry["timestamp"].(string); ok {
			errEntry.Timestamp = v
		}
		if v, ok := entry["error_code"].(string); ok {
			errEntry.ErrorCode = v
		}
		if v, ok := entry["message"].(string); ok {
			errEntry.Message = v
		} else if v, ok := entry["msg"].(string); ok {
			errEntry.Message = v
		}
		if v, ok := entry["stack_trace"].(string); ok {
			errEntry.StackTrace = v
		} else if v, ok := entry["stack"].(string); ok {
			errEntry.StackTrace = v
		}
		if v, ok := entry["trace_id"].(string); ok {
			errEntry.TraceID = v
		}
		if v, ok := entry["handler"].(string); ok {
			errEntry.Handler = v
		}
		if v, ok := entry["file"].(string); ok {
			errEntry.File = v
		}
		if v, ok := entry["line"].(float64); ok {
			errEntry.Line = int(v)
		}
		out <- errEntry
	}

	if err := scanner.Err(); err != nil {
		log.Printf("[sidecar] scanner error: %v", err)
	}
	close(out)
}
