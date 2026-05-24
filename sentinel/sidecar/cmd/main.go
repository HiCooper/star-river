package main

import (
	"log"
	"os"

	"github.com/hydra/sentinel-sidecar/internal/config"
	"github.com/hydra/sentinel-sidecar/internal/publisher"
	"github.com/hydra/sentinel-sidecar/internal/tailer"
)

func main() {
	cfg := config.Load()
	log.Printf("[sidecar] starting for service: %s", cfg.ServiceName)

	entries := make(chan tailer.ErrorEntry, 100)
	pub := publisher.New(cfg.PlatformURL, cfg.ServiceName)
	done := make(chan struct{})

	go pub.Run(entries, done)

	var reader *os.File
	if cfg.LogPath != "" {
		f, err := os.Open(cfg.LogPath)
		if err != nil {
			log.Printf("[sidecar] failed to open %s: %v, falling back to stdin", cfg.LogPath, err)
			reader = os.Stdin
		} else {
			defer f.Close()
			reader = f
		}
	} else {
		reader = os.Stdin
	}

	tailer.Tail(reader, entries)
	<-done
	log.Println("[sidecar] exiting")
}
