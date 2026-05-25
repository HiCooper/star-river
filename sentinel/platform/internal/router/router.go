package router

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/hydra/sentinel-service/internal/config"
	"github.com/hydra/sentinel-service/internal/handler"
	"github.com/hydra/sentinel-service/internal/autofix"
	"github.com/hydra/sentinel-service/internal/middleware"
	"github.com/hydra/sentinel-service/internal/triage"
)

func Setup(cfg *config.Config, db *gorm.DB) *gin.Engine {
	gin.SetMode(cfg.Server.Mode)
	r := gin.New()

	r.Use(middleware.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(cfg))

	r.GET("/health", handler.Health)

	triageClient := triage.NewClient(cfg.AIEngine.URL)
	ingestHandler := handler.NewIngestHandler(db, triageClient)
	af := autofix.NewPipeline(db); issueHandler := handler.NewIssueHandler(db, af)
	serviceHandler := handler.NewServiceHandler(db)
	statsHandler := handler.NewStatsHandler(db)
	safetyHandler := handler.NewSafetyHandler(db)
	settingHandler := handler.NewSettingHandler(db)

	v1 := r.Group("/api/v1")
	{
		ingest := v1.Group("/ingest")
		{
			ingest.POST("/errors", ingestHandler.IngestErrors)
		}

		issues := v1.Group("/issues")
		{
			issues.GET("", issueHandler.ListIssues)
			issues.GET("/:id", issueHandler.GetIssue)
			issues.GET("/:id/timeline", issueHandler.GetIssueTimeline)
			issues.POST("/:id/approve", issueHandler.ApproveIssue)
			issues.POST("/:id/reject", issueHandler.RejectIssue)
		}

		services := v1.Group("/services")
		{
			services.GET("", serviceHandler.ListServices)
			services.POST("", serviceHandler.CreateService)
			services.GET("/:name", serviceHandler.GetService)
			services.PUT("/:name/config", serviceHandler.UpdateServiceConfig)
		}

		stats := v1.Group("/stats")
		{
			stats.GET("/overview", statsHandler.Overview)
		}

		safety := v1.Group("/safety-rules")
		{
			safety.GET("", safetyHandler.ListRules)
			safety.POST("", safetyHandler.CreateRule)
			safety.DELETE("/:id", safetyHandler.DeleteRule)

		settings := v1.Group("/settings")
		{
			settings.GET("", settingHandler.GetSettings)
			settings.POST("", settingHandler.UpdateSetting)
		}
		}
	}

	return r
}
