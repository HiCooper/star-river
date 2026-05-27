package tailer

import (
	"bufio"
	"encoding/json"
	"io"
	"log"
	"os"
	"strings"
	"time"
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

func TailFile(filePath string, out chan<- ErrorEntry, stop <-chan struct{}) {
	var f *os.File
	var err error

	// Open file initially
	f, err = os.Open(filePath)
	if err != nil {
		log.Printf("[sidecar] cannot open %s: %v", filePath, err)
		return
	}
	defer f.Close()

	// Seek to end for tail -f behavior
	f.Seek(0, io.SeekEnd)

	reader := bufio.NewReader(f)

	for {
		select {
		case <-stop:
			close(out)
			return
		default:
		}

		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				// Check if file was truncated (inode change)
				if fi, statErr := os.Stat(filePath); statErr == nil {
					currentFi, _ := f.Stat()
					if fi.Size() < currentFi.Size() {
						// File was truncated, seek to beginning
						f.Seek(0, io.SeekStart)
						reader.Reset(f)
					}
				}
				time.Sleep(200 * time.Millisecond)
				continue
			}
			// Real error
			log.Printf("[sidecar] read error: %v", err)
			time.Sleep(time.Second)
			continue
		}

		entry := parseLine(line)
		if entry != nil {
			out <- *entry
		}
	}
}

// Tail reads from stdin (pipe mode) — used for docker pipe: hydra-pay | sidecar
func Tail(reader io.Reader, out chan<- ErrorEntry) {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		entry := parseLine(line)
		if entry != nil {
			entry.RawLine = string(line)
			out <- *entry
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("[sidecar] scanner error: %v", err)
	}
	close(out)
}

func parseLine(line []byte) *ErrorEntry {
	rawLine := string(line)
	var entry map[string]interface{}
	if err := json.Unmarshal(line, &entry); err != nil {
		// Non-JSON log — capture as raw error
		return &ErrorEntry{
			Level:   "error",
			Message: rawLine,
			RawLine: rawLine,
		}
	}

	level, _ := entry["level"].(string)
	level = strings.ToLower(level)
	if level != "error" && level != "fatal" && level != "panic" {
		return nil
	}

	errEntry := &ErrorEntry{
		Level:   level,
		RawLine: rawLine,
	}
	if v, ok := entry["timestamp"].(string); ok { errEntry.Timestamp = v }
	if v, ok := entry["error_code"].(string); ok { errEntry.ErrorCode = v }
	if v, ok := entry["message"].(string); ok { errEntry.Message = v } else if v, ok := entry["msg"].(string); ok { errEntry.Message = v }
	if v, ok := entry["stack_trace"].(string); ok { errEntry.StackTrace = v } else if v, ok := entry["stack"].(string); ok { errEntry.StackTrace = v }
	if v, ok := entry["trace_id"].(string); ok { errEntry.TraceID = v }
	if v, ok := entry["handler"].(string); ok { errEntry.Handler = v }
	if v, ok := entry["file"].(string); ok { errEntry.File = v }
	if v, ok := entry["line"].(float64); ok { errEntry.Line = int(v) }
	return errEntry
}
