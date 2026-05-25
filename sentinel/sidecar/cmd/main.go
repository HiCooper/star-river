package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/hydra/sentinel-sidecar/internal/config"
	"github.com/hydra/sentinel-sidecar/internal/publisher"
	"github.com/hydra/sentinel-sidecar/internal/tailer"
)

func main() {
	cfg := config.Load()
	log.Printf("[sidecar] starting for service: %s (mode: %s)", cfg.ServiceName, cfg.Mode())

	entries := make(chan tailer.ErrorEntry, 200)
	pub := publisher.New(cfg.PlatformURL, cfg.ServiceName)
	done := make(chan struct{})

	go pub.Run(entries, done)

	stop := make(chan struct{})
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		log.Println("[sidecar] received signal, shutting down...")
		close(stop)
	}()

	if cfg.LogPath != "" && cfg.LogPath != "-" {
		tailer.TailFile(cfg.LogPath, entries, stop)
	} else {
		tailer.Tail(os.Stdin, entries)
	}

	<-done
	log.Println("[sidecar] exiting")
}
