#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Load .env if exists
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | xargs)
fi

echo "=== 星河哨兵 · 本地开发启动 ==="

# Clean up stale processes
kill $(lsof -ti :8082) 2>/dev/null || true
kill $(lsof -ti :8083) 2>/dev/null || true
kill $(lsof -ti :3000) 2>/dev/null || true
sleep 1

# Check PostgreSQL via docker
if ! docker exec postgres pg_isready -U hydra -d sentinel >/dev/null 2>&1; then
  echo "PostgreSQL 未就绪，请先启动: docker compose -f docker-compose.infra.yml up -d"
  exit 1
fi

cleanup() {
  echo ""
  echo "=== 停止所有服务 ==="
  kill $PLATFORM_PID $AI_PID $DASHBOARD_PID 2>/dev/null
  wait
}

trap cleanup EXIT INT TERM

echo "→ Platform  :${PORT:-8082}"
cd "$ROOT/platform" && go run ./cmd/server &
PLATFORM_PID=$!

echo "→ AI Engine :8083"
cd "$ROOT/ai-engine" && python3 main.py &
AI_PID=$!

echo "→ Dashboard :3000"
cd "$ROOT/dashboard" && npm run dev &
DASHBOARD_PID=$!

echo ""
echo "=== 全部启动完成 ==="
echo "Dashboard: http://localhost:3000"
echo "Platform:  http://localhost:${PORT:-8082}/health"
echo "AI Engine: http://localhost:8083/health"

wait
