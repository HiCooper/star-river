#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== 星河哨兵 · 本地开发启动 ==="

# 确保依赖中间件已启动
if ! pg_isready -h localhost -p 5432 -U hydra -d sentinel >/dev/null 2>&1; then
  echo "PostgreSQL 未就绪，请先启动: docker compose -f docker-compose.infra.yml up -d"
  echo "然后创建 sentinel 数据库: docker exec -i postgres psql -U hydra -c 'CREATE DATABASE sentinel;'"
  exit 1
fi

cleanup() {
  echo ""
  echo "=== 停止所有服务 ==="
  kill $PLATFORM_PID $AI_PID $DASHBOARD_PID 2>/dev/null
  wait
}

trap cleanup EXIT INT TERM

echo "→ Platform  :8082"
cd "$ROOT/platform" && go run ./cmd/server &
PLATFORM_PID=$!

echo "→ AI Engine :8083"
cd "$ROOT/ai-engine" && python main.py &
AI_PID=$!

echo "→ Dashboard :3000"
cd "$ROOT/dashboard" && npm run dev &
DASHBOARD_PID=$!

echo ""
echo "=== 全部启动完成 ==="
echo "Dashboard: http://localhost:3000"
echo "Platform:  http://localhost:8082/health"
echo "AI Engine: http://localhost:8083/health"
echo ""

wait
