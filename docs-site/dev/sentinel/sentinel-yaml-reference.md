# sentinel.yaml 配置参考

业务服务接入星河哨兵时，只需在服务根目录提供 `sentinel.yaml` 配置文件。本文档提供完整配置项参考。

## 完整示例

```yaml
service:
  name: hydra-pay                    # 服务唯一标识
  display_name: "Hydra 支付网关"      # 显示名称 (Dashboard 用)
  language: go                        # go | typescript | python
  repo:
    url: "https://github.com/hydra-pay/hydra-pay"
    default_branch: main
    fix_branch_prefix: "sentinel/auto-fix"
  owner:
    team: "payment-team"
    slack_channel: "#pay-alerts"
    oncall: "pagerduty-pay"

log_config:
  format: json                        # json | text
  level_field: level
  message_field: message
  error_code_field: error_code
  stack_field: stack
  trace_field: trace_id
  service_field: service
  multiline_start_pattern: '^\{.*"level":"error"'

error_rules:
  ignore_patterns:
    - error_code: "VALIDATION_ERROR"
    - message_pattern: "user .* cancelled"

safety:
  extra_blacklist_paths:
    - "internal/service/payment_service.go"
    - "internal/service/order_sync.go"
    - "internal/channel/**"
  extra_blacklist_keywords:
    - "Ledger"
    - "settlement"

fix_pipeline:
  test_command: "go test ./..."
  build_command: "go build ./..."
  lint_command: "golangci-lint run"
  test_timeout_seconds: 120
  pr_labels: ["auto-fix", "sentinel"]
  pr_reviewers: ["payment-team"]

notifications:
  slack_webhook_url: "${SLACK_WEBHOOK_URL}"
  dingtalk_webhook_url: "${DINGTALK_WEBHOOK_URL}"
```

## 字段说明

### `service` (必填)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 服务唯一标识，与数据库注册名一致 |
| `display_name` | string | ✅ | Dashboard 展示名称 |
| `language` | string | ✅ | 编程语言：`go` / `typescript` / `python` |
| `repo.url` | string | ✅ | GitHub 仓库地址 |
| `repo.default_branch` | string | - | 修复目标分支，默认 `main` |
| `repo.fix_branch_prefix` | string | - | 修复分支前缀，默认 `sentinel/auto-fix` |
| `owner.team` | string | - | 负责团队 |
| `owner.slack_channel` | string | - | Slack 通知频道 |
| `owner.oncall` | string | - | Oncall 标识 |

### `log_config` (必填)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `format` | string | ✅ | 日志格式：`json` 或 `text` |
| `level_field` | string | ✅ | 日志级别字段名 |
| `message_field` | string | ✅ | 消息字段名 |
| `error_code_field` | string | - | 错误码字段名 |
| `stack_field` | string | - | 堆栈字段名 |
| `trace_field` | string | - | Trace ID 字段名 |
| `multiline_start_pattern` | string | - | 多行日志起始正则（Go panic 需要） |

### `error_rules` (可选)

| 字段 | 类型 | 说明 |
|------|------|------|
| `ignore_patterns[].error_code` | string | 忽略指定错误码 |
| `ignore_patterns[].message_pattern` | string | 忽略匹配正则的错误消息 |

### `safety` (可选)

| 字段 | 类型 | 说明 |
|------|------|------|
| `extra_blacklist_paths` | string[] | 额外禁止自动修改的文件路径 (glob) |
| `extra_blacklist_keywords` | string[] | 额外禁止自动修改的代码关键字 |

这些规则会叠加在全局黑名单之上。全局黑名单规则见[安全规则配置](./safety-rules)。

### `fix_pipeline` (可选)

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `test_command` | string | - | 运行测试命令 |
| `build_command` | string | - | 构建命令 |
| `lint_command` | string | - | Lint 命令 |
| `test_timeout_seconds` | int | 120 | 测试超时 |
| `pr_labels` | string[] | `["auto-fix"]` | PR 自动添加的标签 |
| `pr_reviewers` | string[] | - | PR 自动指派的 reviewer |

### `notifications` (可选)

| 字段 | 类型 | 说明 |
|------|------|------|
| `slack_webhook_url` | string | Slack incoming webhook URL |
| `dingtalk_webhook_url` | string | 钉钉机器人 webhook URL |

支持环境变量替换：`${SLACK_WEBHOOK_URL}` 会从 Sidecar 运行环境读取。

## 语言特定配置

### Go 服务

```yaml
log_config:
  format: json
  level_field: level
  message_field: msg          # Go 常用 "msg" 而非 "message"
  error_code_field: error_code
  stack_field: stack
  multiline_start_pattern: '^\{.*"level":"(error|fatal|panic)"'

fix_pipeline:
  test_command: "go test ./..."
  build_command: "go build ./cmd/server"
  lint_command: "golangci-lint run"
```

### TypeScript/Node.js 服务

```yaml
log_config:
  format: json
  level_field: level
  message_field: message
  error_code_field: code

fix_pipeline:
  test_command: "npm test"
  build_command: "npm run build"
  lint_command: "npm run lint"
```

## 配置验证

可以使用 CLI 工具验证配置格式：

```bash
sentinel validate --service=hydra-pay
```

或通过 API：

```bash
curl -X POST https://sentinel.hydra.com/api/v1/services/hydra-pay/validate \
  -H "Content-Type: application/x-yaml" \
  --data-binary @sentinel.yaml
```
