# 安全规则配置

星河哨兵通过多层安全边界确保自动修复不会引入风险。本文档说明安全规则的配置方式和工作原理。

## 安全边界总览

```
┌──────────────────────────────────────────────┐
│  第 1 层: 全局黑名单 (safety_rules 表)        │
│  ↓                                           │
│  第 2 层: 服务级黑名单 (sentinel.yaml)        │
│  ↓                                           │
│  第 3 层: AI 评估 (auto_fixable 判断)         │
│  ↓                                           │
│  第 4 层: 严重性阈值 (critical/high 拒修)     │
│  ↓                                           │
│  第 5 层: 变更范围检查 (>50 行 / >3 文件)      │
│  ↓                                           │
│  第 6 层: CI Gate (test + lint + review)      │
└──────────────────────────────────────────────┘
```

任何一层拦截，都会将 issue 降级到人工审批流程。

## 全局黑名单

全局黑名单在 Dashboard 的「安全规则」页面配置，存储在 PostgreSQL `safety_rules` 表中，对所有服务生效。

### 路径黑名单 (path_blacklist)

使用 glob 模式匹配文件路径：

```yaml
# 绝对不可自动修改的路径
- "**/ledger/**"           # 记账
- "**/settlement/**"       # 结算
- "**/refund*"             # 退款
- "**/callback*"           # 支付回调
- "**/middleware/auth*"    # 认证中间件
- "**/jwt/**"              # JWT
- "**/migrate*"            # 数据库迁移
- "**/.env*"               # 环境变量
- "**/secrets/**"          # 密钥
```

### 关键词黑名单 (keyword_blacklist)

匹配代码中包含的关键词：

```yaml
- "amount"        # 金额计算
- "settle"        # 结算
- "refund"        # 退款
- "api_key"       # API 密钥
- "secret"        # 密钥
- "password"      # 密码
- "private_key"   # 私钥
```

### 严重性阈值 (severity_threshold)

```yaml
# 只允许自动修复 medium 及以下严重性的 issue
severity_threshold: "medium"
```

## 服务级黑名单

在 `sentinel.yaml` 的 `safety` 段配置，叠加在全局规则上。

```yaml
safety:
  extra_blacklist_paths:
    - "internal/service/payment_service.go"   # 核心支付逻辑
    - "internal/channel/alipay/**"            # 支付渠道适配
  extra_blacklist_keywords:
    - "Ledger"
    - "order_sync"
```

## AI 评估维度

AI Triage Engine 在评估 `auto_fixable` 时考虑：

| 维度 | 可自动修复 | 不可自动修复 |
|------|------------|-------------|
| NPE / nil check | ✅ | - |
| 参数校验遗漏 | ✅ | - |
| 错误格式/日志 | ✅ | - |
| 类型转换 | ✅ (简单) | (复杂) |
| 渠道超时 | - | ✅ (涉及外部依赖) |
| 数据一致性问题 | - | ✅ |
| 安全漏洞 | - | ✅ |

## 变更范围限制

| 限制项 | 阈值 | 超出后 |
|--------|------|--------|
| 最大修改行数 | 50 lines | 降级审批 |
| 最大修改文件数 | 3 files | 降级审批 |
| 最大重试次数 | 2 | 降级审批 |

这些限制在 Auto Fix Pipeline 中硬编码，不可通过配置修改。

## PR 保护 (GitHub)

对 `sentinel/auto-fix-*` 分支的强制规则：

```
- 至少 1 个 Code Review 通过
- CI 必须全部通过 (test + lint + build)
- 禁止直接 push main
- 必须 squash merge
- CODEOWNERS 审查
```

## Dashboard 管理

安全规则可在 Dashboard → 安全规则页面在线管理：

- **查看**：列出所有全局规则，按 priority 排序
- **新增**：填写 rule_type、rule_value、priority
- **编辑**：修改规则值和优先级
- **启用/禁用**：临时关闭某条规则
- **删除**：删除不再需要的规则

## 最佳实践

1. **全局规则管"绝对红线"** —— 涉及资金、安全、数据的路径
2. **服务级规则管"业务特化"** —— 每个服务自己的核心逻辑
3. **规则宁严勿松** —— 不确定的路径先加入黑名单，后续再放开
4. **定期 review** —— 每月回顾安全规则的有效性
