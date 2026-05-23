# Hydra 项目进展审查 #2 — 2026-05-22

## 距上次审查的变化

- 6 个 P0 Bug 已修复并验证编译通过
- 提取 `handler/helpers.go` 统一共享工具函数
- 代码量：56 个 Go 源文件（4,766 行），3 个测试文件（仅覆盖 `pkg/errors`、`pkg/crypto`、`internal/service/audience_evaluator`）

---

## 对照 12 周开发计划的进度评估

| 阶段 | 计划周期 | 交付物 | 当前状态 |
|------|---------|--------|----------|
| M1 基础设施 | Week 1-2 | DB Schema、API 框架、CI/CD | ✅ 完成（CI/CD 除外） |
| M2 核心服务 | Week 3-5 | CRUD API + 评估引擎 + 事件系统 | ✅ 代码完成，Bug 已修复 |
| M3 管理后台 | Week 6-8 | 付费墙编辑器、Dashboard | ❌ 0% |
| M4 客户端 SDK | Week 9-10 | iOS/Android/Web SDK | ❌ 0% |
| M5 MVP 完成 | Week 11-12 | 端到端可用、Hydra-Pay 集成 | ❌ 0% |

**结论**：后端进度基本符合计划（M1 + M2），前端和 SDK 严重滞后。实际完成了 5/12 周计划中的后端部分，剩余 7 周工作尚未开始。

---

## 架构深层审视：Phase 2 就绪度

### 架构文档 vs 实际实现的差距

ARCHITECTURE.md 规划的 `wall-service/internal/` 模块 vs 当前实现：

| 架构文档中的模块 | 当前实现 | 差距 |
|-----------------|---------|------|
| `api/handler/` | `handler/` 8 个 handler ✅ | 完整 |
| `api/middleware/` | `middleware/` 5 个中间件 ✅ | 完整 |
| `api/router.go` | `router/router.go` ✅ | 完整 |
| `service/paywall_engine.go` | `service/evaluation_service.go` ✅ | 评估链路完整 |
| `service/targeting.go` | `service/audience_evaluator.go` ✅ | DSL 设计好 |
| `service/analytics.go` | `service/analytics_service.go` ⚠️ | 仅基础聚合，MRR 计算不准确 |
| `service/entitlement.go` | ❌ 不存在 | **Phase 2 阻塞** — 无法管理订阅权限 |
| `service/offer.go` | ❌ 不存在 | **Phase 2 阻塞** — 无法管理商品/Plan |
| `service/experiment.go` | ❌ 不存在 | v2.0 规划，合理缺失 |
| `service/remote_config.go` | ❌ 不存在 | Phase 2 规划 |
| `integration/hydra_pay.go` | ❌ 不存在 | **Phase 2 阻塞** — Wall 无法调用 Pay |
| `domain/` 包 | `model/` 包 ✅ | 8 个数据模型完整 |
| `worker/subscription_expirer.go` | ❌ 不存在 | 订阅过期无感知 |

### 隐性问题

1. **AudiencePaywall 唯一约束**：`uniqueIndex:idx_ap_unique` 同时约束 `(audience_id, paywall_id)`，意味着一个 audience 只能关联一个 paywall。但业务上应支持多个 paywall（流量分割）。需要确认这是设计意图还是错误。

2. **CORS 生产模式**：`cors.go:24` 生产模式 echo 任意 origin，上线前必须改为 allowlist。

3. **`CampaignRepository.List` 的 Preload**：`GetByID` 预加载了 `Placements`，但 `List` 没有。这会导致 N+1 问题。

4. **Redis 连接无 health check**：`database/redis.go` 创建 client 后未 `Ping()`，连接失败不会在启动时发现。

---

## 对标深度分析

### Superwall 的核心壁垒是什么？

Superwall 不只是"有 API"，而是：

1. **Remote Config 实时下发** — 运营人员改配置，SDK 秒级生效（不需要 App 更新）
2. **可视化编辑器** — 非技术人员能独立制作付费墙
3. **A/B 实验结果统计显著性** — 不是简单分流，是置信区间 + p-value
4. **SDK 零摩擦接入** — 一行 `configure(apiKey:)` 就能用
5. **Paywall Preview** — 编辑器中实时预览不同设备和语言

### Stripe 的核心壁垒是什么？

1. **支付成功率优化** — 智能路由、自动重试、银行卡更新器
2. **全球合规** — PCI DSS、GDPR、PSD2/SCA
3. **开发者体验** — 7 行代码完成支付集成
4. **Revenue Recovery** — 智能重试失败付款、卡更新
5. **Billing 引擎** — 复杂的订阅生命周期管理（试用→付费→升级→降级→取消→恢复）

### Hydra 当前差距的根因

差距不在"代码行数"，而在**产品完整度**：

- Wall 后端只解决了"配置 CRUD + 规则评估"，没有解决"配置实时分发 + 非技术人员可操作 + 实验结果可信"
- Pay 完全不存在，这意味着 Hydra 无法独立完成"展示付费墙 → 用户付费 → 开通权限"闭环

---

## 优先级最高的 3 项下一步工作（更新）

### 1. 前端 wall-admin 对接 + 后端联调（P0）
**为什么是现在**：后端核心链路已修复，可以联调。前端是产品可演示的前提。
**范围**：`apiClient.ts` + Settings/Paywall/Rules/Dashboard 4 个页面
**验收标准**：全链路 CRUD 操作可从前端触发并持久化

### 2. Hydra-Pay MVP 最小闭环（P0）
**为什么是现在**：没有支付，Hydra 只是"付费墙配置工具"，不是"付费基础设施"。
**最小范围**（2-3 周，1 人）：
- Go 脚手架（复用 wall-service 结构）
- `POST /v1/payments/create` — 创建支付订单
- 单渠道适配（支付宝扫码支付）
- `POST /v1/payments/callback` — 异步回调处理
- Wall ↔ Pay 集成点：评估结果包含 product_id → Pay 返回 checkout URL → 前端跳转
**不需要现在做**：多渠道路由、风控、账务对账（这些是 Phase 2-3）

### 3. 补充测试 + CORS/Auth 加固（P1）
**范围**：
- service 层：App/Campaign/Placement/Audience/Paywall CRUD 单元测试
- handler 层：happy path + error path 集成测试
- CORS 生产模式 allowlist
- 登录密码从硬编码改为环境变量

---

## 当前状态结论

**Wall Phase 1 后端**：修复 6 个 Bug 后架构完整、核心链路可用。4,766 行 Go 代码，分层清晰，Audience DSL 设计是亮点。

**产品完整度**：
- vs Superwall：后端能力 ~35%（有 CRUD + 评估，缺实时下发 + 编辑器 + A/B 测试 + SDK）
- vs Stripe：0%（零代码）
- 整体产品完成度：~15%

**时间线估算**：
- Wall 后端收尾（测试 + 加固）：1-2 天 → Phase 1 验收
- 前端对接：2-3 天 → 产品可演示
- Hydra-Pay MVP：2-3 周 → 端到端支付闭环
- SDK MVP：2-3 周 → 外部可接入
- **总计 6-8 周可达"最小可用产品"**（有付费墙 + 能支付 + 能接入）

**最大的风险不是技术，是范围蔓延**。架构文档定义了 20+ 模块、5 种支付渠道、4 种 SDK、拖拽编辑器——如果追求完整实现会陷入无尽的开发。建议砍掉一切非核心功能，先跑通"配置付费墙 → 触发评估 → 展示支付 → 收款成功"这一个闭环。
