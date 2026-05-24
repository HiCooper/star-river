# 服务接入指南

新服务接入星河哨兵只需三步。本文档以 `hydra-pay` 为例，展示完整接入流程。

## 接入前提

- 服务支持**结构化日志**（JSON 格式输出到 stdout）
- 服务有 GitHub 仓库
- 了解服务的核心模块和安全边界

## Step 1: 统一日志格式

首先确保服务输出结构化 JSON 日志。参考 `hydra-wall` 的日志中间件实现。

### Go 服务 (Gin)

```go
// middleware/logger.go
func LoggerMiddleware() gin.HandlerFunc {
    return gin.LoggerWithFormatter(func(params gin.LogFormatterParams) string {
        log := map[string]interface{}{
            "timestamp":  params.TimeStamp.Format(time.RFC3339),
            "level":      "info",
            "method":     params.Method,
            "path":       params.Path,
            "status":     params.StatusCode,
            "latency_ms": params.Latency.Milliseconds(),
            "client_ip":  params.ClientIP(),
        }
        b, _ := json.Marshal(log)
        return string(b) + "\n"
    })
}
```

关键要求：
- **`level` 字段**：区分 `debug`/`info`/`warn`/`error`/`fatal`
- **`error_code` 字段**：业务错误码，用于签名计算
- **`stack` 字段**：错误堆栈 (panic recovery 时)
- **`trace_id` 字段**：分布式追踪 ID

## Step 2: 创建 sentinel.yaml

在服务根目录创建 `sentinel.yaml`：

```yaml
service:
  name: hydra-pay
  display_name: "Hydra 支付网关"
  language: go
  repo:
    url: "https://github.com/hydra-pay/hydra-pay"
    default_branch: main
  owner:
    team: "payment-team"
    slack_channel: "#pay-alerts"

log_config:
  format: json
  level_field: level
  message_field: message
  error_code_field: error_code
  stack_field: stack
  trace_field: trace_id

safety:
  extra_blacklist_paths:
    - "internal/service/payment_service.go"
    - "internal/service/order_sync.go"
    - "internal/channel/**"

fix_pipeline:
  test_command: "go test ./..."
  build_command: "go build ./cmd/server"
  lint_command: "golangci-lint run"
```

完整配置项参考 → [sentinel.yaml 参考](./sentinel-yaml-reference)

## Step 3: 部署 Sidecar

### Kubernetes 环境

在 Pod 中添加 sidecar 容器：

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: hydra-pay
      image: hydra-pay:latest
      # ... 业务容器配置
    - name: sentinel-sidecar
      image: sentinel-sidecar:latest
      env:
        - name: SENTINEL_SERVICE_NAME
          value: hydra-pay
        - name: SENTINEL_CONFIG_PATH
          value: /etc/sentinel/sentinel.yaml
        - name: SENTINEL_BROKER_URL
          value: redis://sentinel-redis:6379
      volumeMounts:
        - name: sentinel-config
          mountPath: /etc/sentinel
        - name: shared-logs
          mountPath: /var/log/app
  volumes:
    - name: sentinel-config
      configMap:
        name: sentinel-hydra-pay
    - name: shared-logs
      emptyDir: {}
```

### Docker Compose 环境

```yaml
services:
  hydra-pay:
    image: hydra-pay:latest
    volumes:
      - shared-logs:/var/log/app

  sentinel-sidecar:
    image: sentinel-sidecar:latest
    environment:
      - SENTINEL_SERVICE_NAME=hydra-pay
      - SENTINEL_CONFIG_PATH=/etc/sentinel/sentinel.yaml
    volumes:
      - ./sentinel.yaml:/etc/sentinel/sentinel.yaml
      - shared-logs:/var/log/app
    depends_on:
      - hydra-pay

volumes:
  shared-logs:
```

## 验证接入

部署后，可以通过以下方式验证侧车是否正常工作：

### 1. 检查 Sidecar 健康状态

```bash
curl http://localhost:9090/health
# {"status": "ok", "service": "hydra-pay", "broker": "connected"}
```

### 2. 触发测试错误

```bash
curl -X POST http://hydra-pay:8081/api/v1/test/error
```

### 3. 在 Dashboard 查看

登录星河哨兵 Dashboard → Issue 看板，应能看到对应的错误记录。

## 接入检查清单

| 检查项 | 状态 |
|--------|------|
| 日志格式为结构化 JSON | ☐ |
| 包含 level/message/error_code/stack/trace_id 字段 | ☐ |
| error 和 fatal 级别日志有完整堆栈 | ☐ |
| sentinel.yaml 配置完整且格式正确 | ☐ |
| 安全黑名单覆盖核心业务路径 | ☐ |
| Sidecar 容器已部署且健康检查通过 | ☐ |
| Dashboard 能收到测试错误 | ☐ |
| 通知 webhook 配置正确 | ☐ |

## 后续步骤

- 接入后观察 1 周，确认 AI 分类准确率
- 根据实际错误模式调整 `error_rules.ignore_patterns`
- Phase 3 阶段开启自动修复功能
