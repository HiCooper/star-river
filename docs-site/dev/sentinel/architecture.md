# 星河哨兵 · 架构设计

星河哨兵（Star-River Sentinel）是一套通用的 AI 自动化 Issue 监控与自愈平台。本文档描述其整体架构、核心组件、数据流和安全设计。

## 设计目标

| 目标 | 说明 |
|------|------|
| **服务无关** | 新服务接入只需配置文件，无需写代码 |
| **智能分诊** | LLM 驱动的错误分类、去重、严重性评估 |
| **自动修复** | 低风险 bug 自动生成修复代码并提交 PR |
| **安全可控** | 多层安全边界，涉及支付/结算/认证的代码绝不自动修改 |
| **人工兜底** | 高风险 issue 推送管理后台，由人工决策 |

## 整体架构

星河哨兵采用 **Platform Layer + Service Adapter** 模式：

- **平台层**：通用引擎，负责日志采集、AI 分诊、自动修复、Dashboard 展示
- **Sidecar**：每个业务服务旁路的轻量进程，负责日志采集和错误富化
- **sentinel.yaml**：服务适配器配置文件，声明服务元数据和安全边界

```
┌──────────────────────────────────────────────────────────────────┐
│                    星河哨兵 (Sentinel) 平台层                      │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐   │
│  │ Log Ingest   │   │ AI Triage    │   │ Auto Fix Pipeline  │   │
│  │ Pipeline     │──▶│ Engine       │──▶│                    │   │
│  │ (Go)         │   │ (Python)     │   │ (Python + Shell)   │   │
│  └──────────────┘   └──────────────┘   └────────────────────┘   │
│         │                   │                     │              │
│         ▼                   ▼                     ▼              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    共享存储层                                │  │
│  │  PostgreSQL (issues/signatures/config)                      │  │
│  │  ClickHouse (原始错误冷存储)  │  Redis (队列/缓存)           │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              消息队列 (Redis Streams → Kafka)                │  │
│  │  sentinel.errors  │  sentinel.issues  │  sentinel.fix       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Management Dashboard (Next.js)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
          ▲                                   ▲
          │ (错误推送)                         │ (配置拉取)
          │                                   │
┌─────────┴────────────┐       ┌─────────────┴───────────┐
│  sentinel-sidecar    │       │  sentinel-sidecar        │
│  (hydra-pay)         │       │  (hydra-wall)            │
│  · 日志 tail         │       │  · 日志 tail             │
│  · 错误富化          │       │  · 错误富化              │
│  · 签名计算          │       │  · 签名计算              │
│  · sentinel.yaml     │       │  · sentinel.yaml         │
└──────────────────────┘       └──────────────────────────┘
```

## 核心组件

### sentinel-sidecar (Go)

每个业务服务的"传感器"，零侵入采集错误日志。

**运行方式**：Kubernetes Pod Sidecar 容器 / Docker Compose companion service。

**核心职责**：

| 模块 | 职责 |
|------|------|
| LogTailer | tail 容器 stdout，正则匹配 `level=error`/`level=fatal` |
| ErrorNormalizer | 提取 service/error_code/trace_id/stack/message |
| SignatureComputer | 按规则计算 SHA256 签名 |
| Enricher | 读取 sentinel.yaml，注入服务 metadata |
| Publisher | 推送到消息队列 |

**资源消耗**：内存 < 50MB，CPU < 0.1 core。

### Log Ingest Pipeline (Go)

消费错误流，标准化入库，聚合阈值判断。

| 模块 | 职责 |
|------|------|
| Consumer | 批量消费消息队列 |
| ClickHouseWriter | 批量写入原始错误 (TTL 90 天) |
| SignatureAggregator | Redis ZSET 滑动窗口计数 (5 分钟窗口) |
| ThresholdDetector | 签名频次触发阈值 → 创建或更新 Issue |
| IssueManager | Issue 状态机管理 |

### AI Triage Engine (Python + FastAPI)

LLM 驱动的智能分诊，是整个系统的"大脑"。

**为什么选 Python**：LLM 生态成熟（LangChain、LiteLLM），适合快速迭代的 AI 逻辑。不涉及高并发场景。

**LLM 策略**：

| 阶段 | Provider | 用途 |
|------|----------|------|
| Phase 1-2 | DeepSeek V4 Pro | 错误分类 + 复杂分析 |
| Phase 3+ | 可扩展 Qwen / Ollama 等 | 多模型切换，降低成本 |

**AI 分析输出**：

```json
{
  "category": "channel",
  "severity": "high",
  "auto_fixable": "no",
  "suspected_location": "internal/channel/alipay/alipay.go:89",
  "fix_suggestion": "Alipay 沙箱环境 endpoint 响应超时，建议检查 gateway 连通性...",
  "confidence": 92
}
```

### Auto Fix Pipeline (Shell + Claude Code CLI)

对低风险 issue 自动生成修复代码并提交 PR。

**为什么选 Claude Code CLI**：Anthropic API 在国内网络环境不稳定，Claude Code CLI 作为本地工具可以正常使用，且内置了代码读写、测试运行、迭代修复的完整 agent 能力，无需自己实现 agent 循环。

**执行流程**：

1. 接收 issue → 查询详情 + 错误上下文
2. **安全检查**（最先执行，一票否决）
3. 通过 → clone repo → 创建分支 `sentinel/auto-fix-{issue_id}`
4. 调用 Claude Code CLI 非交互模式生成代码补丁：
   ```bash
   claude -p "修复以下 bug: {issue.ai_fix_suggestion}。\
   只修改必要代码，不要重构。完成后运行 go test ./... 验证。" \
   --allowedTools "Read,Edit,Bash" --verbose
   ```
5. 检查 diff 变更范围 → 运行测试 → 通过 → 提交 + Push + 创建 PR
6. 测试失败 → 将失败日志作为上下文重新调用 CLI (最多 2 次) → 仍失败则降级到人工审批

### Management Dashboard (Next.js + React)

与现有 `wall-admin` 技术栈一致（Next.js + React + TypeScript）。

**页面结构**：

| 页面 | 功能 |
|------|------|
| Issue 看板 | 卡片视图，按 severity 排序，多维度筛选 |
| Issue 详情 | 错误堆栈、AI 分析、修复建议、操作时间线 |
| 审批队列 | 待人工决策的 issue，一键 Approve/Reject/Assign |
| 修复追踪 | PR 状态追踪，修复效果验证 |
| 服务配置 | 在线管理 sentinel.yaml，安全规则配置 |
| 统计面板 | MTTR、自动修复成功率、AI 准确率、错误趋势 |

## 全链路数据流

```
Step 1: Error 产生
  业务服务 → panic recovery / error middleware → 结构化日志 (JSON, stdout)

Step 2: Sidecar 采集
  sentinel-sidecar tail stdout → 过滤 error/fatal
  → 计算签名 SHA256(service|error_code|stack_frame|normalized_msg)
  → 推送消息队列

Step 3: Log Ingest
  消费 → 写 ClickHouse (冷存储)
  → 更新 PostgreSQL error_signatures (occurrence_count +1)
  → 阈值触发 → 创建/更新 Issue

Step 4: AI Triage
  → LLM 分类 + 严重性评估 + 可修复性判断
  → auto_fixable=yes + severity∈{low,medium} → sentinel.fix.auto
  → auto_fixable=no 或 severity∈{high,critical} → sentinel.fix.review

Step 5a: Auto Fix
  安全检查 → clone → LLM 修复 → go test → git push → 创建 PR

Step 5b: Human Review
  推送 Dashboard 审批队列 → 通知 (Slack/钉钉/企微)
  → Approve/Reject/Assign

Step 6: 反馈闭环
  PR 合并 → webhook 触发 → 更新 issue 状态 → 记录修复效果
  → 反馈给 AI 模型持续优化
```

## Error Signature 去重

为避免告警风暴，系统会将相同模式的错误归并到同一 Issue：

```
signature = SHA256(
    service_name + "|" +
    error_code + "|" +
    normalized_stack_top_frame + "|" +
    simplified_message(
        前 80 字符,
        数字 → *,
        UUID → *,
        金额 → *,
        时间戳 → *
    )
)
```

**示例**：

| 原始消息 | 归一化后 | 相同签名? |
|----------|----------|----------|
| `order abc-123 timeout 30s` | `order * timeout *` | ✅ |
| `order def-456 timeout 45s` | `order * timeout *` | ✅ |
| `order abc-123 refund failed` | `order * refund failed` | ❌ (不同模式) |

## 数据库设计

### PostgreSQL 核心表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `sentinel_services` | 服务注册 | name, repo_url, config_json |
| `error_signatures` | 错误签名聚合 | signature, service_name, occurrence_count |
| `sentinel_issues` | Issue 记录 | title, severity, ai_*, fix_*, review_* |
| `issue_timeline` | 审计时间线 | issue_id, event_type, metadata |
| `fix_history` | 修复历史 | commit_sha, pr_url, test_passed, retry_count |
| `safety_rules` | 安全规则 | rule_type (path/kw), rule_value, priority |

### ClickHouse (原始错误冷存储)

列式存储 + TTL 90 天自动过期，按 `(service_name, signature, timestamp)` 排序。

### Redis 用途

| 数据结构 | Key Pattern | 用途 | TTL |
|----------|-------------|------|-----|
| Sorted Set | `sentinel:window:{sig}` | 滑动窗口计数 | 15 min |
| String | `sentinel:dedup:{sig}` | Issue 创建去重 | 10 min |

## 安全与风控

### 6 层防护

```
第一层: 全局黑名单 (safety_rules 表 → path_blacklist)
  → 匹配 → 立即拒绝自动修复

第二层: 服务级黑名单 (sentinel.yaml → safety.extra_blacklist_paths)
  → 匹配 → 立即拒绝自动修复

第三层: AI 评估 (auto_fixable = no 或 confidence < 60%)
  → 路由到人工审批

第四层: 严重性阈值 (severity = critical / high)
  → 路由到人工审批

第五层: 变更范围检查 (diff > 50 行 或 涉及 > 3 个文件)
  → 路由到人工审批

第六层: CI Gate (test + lint + build 全部通过)
  → PR 设置 required reviewers + CODEOWNERS
```

### 绝对不可自动修改的路径

```
**/ledger/**          # 记账核心
**/settlement/**      # 结算核心
**/refund*            # 退款逻辑
**/callback*          # 支付回调处理
**/middleware/auth*   # 安全认证
**/jwt/**             # JWT 密钥
**/migrate*           # 数据库迁移
**/.env*              # 环境配置
**/payment_service.go # 支付核心逻辑
```

### PR 保护规则 (GitHub)

```
sentinel/auto-fix-* 分支:
  - 至少 1 人 Code Review
  - 必须通过 CI (test + lint + build)
  - 禁止直接 push，必须 squash merge
```

## 技术选型

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 平台层语言 | Go | 与现有服务一致，复用 Gin + GORM 模式 |
| AI 层语言 | Python | LLM 生态最佳，LangChain/LiteLLM 快速迭代 |
| Dashboard | Next.js + React | 与 wall-admin 技术栈一致 |
| 消息队列 | Redis Streams → Kafka | 先轻后重，按需升级 |
| 原始日志存储 | ClickHouse | 列式存储 + TTL 自动过期 |
| LLM Provider | DeepSeek V4 Pro → 可扩展 Qwen/Ollama | 主力模型 DeepSeek，后续支持多模型切换 |
| 服务鉴权 | HMAC | 轻量，不需要 OAuth 全套 |

## 实施路线图

| 阶段 | 时间 | 目标 | 关键产出 |
|------|------|------|----------|
| **Phase 1** | Week 1-2 | "能看见" | 统一日志格式 + Sidecar + Log Ingest + 基础 Dashboard |
| **Phase 2** | Week 3-4 | "能判断" | AI Triage Engine + 阈值触发 + 通知集成 |
| **Phase 3** | Week 5-7 | "能自愈" | Auto Fix Pipeline + 审批工作流 + CI 集成 |
| **Phase 4** | Week 8+ | "更聪明" | 模型微调 + 多服务接入 + 根因分析 + 预测告警 |

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| AI 误判导致错误修复合并 | 多层安全边界 + 黑名单 + 必须 Code Review + CI 全过 |
| LLM API 成本过高 | DeepSeek V4 Pro 性价比高；Phase 3 后可切换本地模型进一步降本 |
| 告警风暴 | Signature 去重 + 滑动窗口阈值 + Issue 创建去重 |
| Sidecar 资源消耗 | Go 实现，极轻量；仅做 tail+富化，不做存储 |
| 新服务接入门槛高 | 只需配置 sentinel.yaml；提供 `sentinel init` 模板工具 |
