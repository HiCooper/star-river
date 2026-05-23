# Hydra 项目进展审查 #1 — 2026-05-22

## 本轮已完成的工作

### P0 Bug 修复（6 项）
1. **ContextAppID 类型不一致** — middleware 存 `string`，handler 断言 `uuid.UUID`，导致 evaluate/event API panic。改为统一使用 `uuid.UUID`
2. **`/auth/login` 被 JWT 中间件拦截** — 登录接口在 JWT 保护组内，造成循环依赖。单独提取到公开路由组
3. **`handleServiceError` 逻辑错误** — `IsAppError(err, "")` 只匹配 code 为空的错误，所有业务错误被吞为 500。改为标准 type assertion，并提取到 `handler/helpers.go`
4. **`AudienceService.UpdateAudience` 查询错误** — 用 audience ID 当 campaign ID 调 `ListByCampaign`。已添加 `GetByID` 并修复
5. **`CampaignRepository.List` 全量查询缺失** — `uuid.Nil` 时仍做 `WHERE app_id = ?`。改为可选过滤（同步修复 PaywallRepository）
6. **`docker-compose.yml` 重复 `container_name`** — redis 服务声明了两次

### 架构改进
- 提取 `handler/helpers.go` 集中管理 `handleServiceError` 和 `parseIntQuery`，之前散落在 `analytics_handler.go` 中

---

## 对标分析：Hydra vs Superwall + Stripe

### Wall（付费墙）能力矩阵

| Superwall 能力 | Hydra-Wall 现状 | 差距 |
|---------------|----------------|------|
| **Paywall Editor** (可视化编辑器) | 仅 JSON 配置，无编辑器 | 大 — Phase 2 规划 |
| **Behavioral Targeting** (行为触发) | ✅ Audience 条件 DSL 已实现（12 种操作符，AND/OR 嵌套） | 小 — 算法完整，需联调验证 |
| **A/B Testing** (实验框架) | ❌ 未实现 | 大 — 架构设计有，v2.0 规划 |
| **Paywall Preview** (实时预览) | ❌ 未实现 | 中 — 依赖前端 SDK |
| **Revenue Analytics** (收入分析) | ⚠️ 基础聚合（MRR/ARR/转化率） | 中 — MRR 计算需修正 |
| **Remote Config** (远程配置) | ❌ 未实现 | 中 — Phase 2 |
| **Webhook 触发** | ❌ 未实现 | 中 — Phase 2 |
| **Subscription Entitlement** (订阅权限) | ❌ 未实现 | 大 — 需要 Hydra-Pay 配合 |
| **SDK** (iOS/Android/Web/Flutter) | ❌ 零代码 | 大 — Phase 4 |
| **Placement 评估** | ⚠️ 算法完整，刚修复 panic | 小 — 需要性能测试 |
| **Event 系统** | ⚠️ Redis 队列 + Worker + 批量写入，刚修复 panic | 小 — 需要联调验证 |

### Pay（支付）能力矩阵

| Stripe 能力 | Hydra-Pay 现状 | 差距 |
|------------|---------------|------|
| **Payment API** | 📄 仅 ARCHITECTURE.md 设计文档 | 极大 — 零代码 |
| **Checkout Page** (托管结算页) | 📄 设计完成 | 极大 |
| **Payment Channels** (支付宝/微信/Stripe/Apple IAP) | 📄 Channel Adapter 接口设计完成 | 极大 |
| **Smart Routing** (支付路由) | 📄 设计完成 | 极大 |
| **Ledger/Reconciliation** (账务对账) | 📄 设计完成 | 极大 |
| **Webhook Management** | 📄 设计完成 | 极大 |
| **SDK** (Web/iOS/Android) | 📄 设计完成 | 极大 |
| **Subscription Management** | ❌ 未设计 | 极大 |
| **Risk/Fraud** (风控) | 📄 设计完成 | 极大 |

### 整体判断

- **Wall 侧**：后端骨架完成度 ~70%，修复本轮 Bug 后核心链路可跑通。最大的差距在前端（0%）、SDK（0%）、A/B 测试（0%）和支付集成（0%）
- **Pay 侧**：仅有架构设计文档，零代码。这是当前最大的瓶颈 — 没有支付能力就无法对标 Stripe
- **里程碑**：当前处于 Phase 1 尾声（Wall 后端基础设施），距离完整产品还需 Phase 2-4（SDK + 支付 + 实验）

---

## 优先级最高的 3 项下一步工作

### 1. 前端 wall-admin API 对接（P0，阻塞验收）
**目标**：AC-6 "前端对接率 100%"
**工作量**：2-3 天（1 名前端）
**顺序**：创建 `apiClient.ts` → Settings（App CRUD）→ Paywall → Rules（Audience）→ Experiments → Dashboard
**依赖**：后端 Bug 已修复，API 可用

### 2. 启动 Hydra-Pay MVP（P0，产品完整性瓶颈）
**目标**：支付创建 + 渠道回调 + 交易记录
**工作量**：4-6 周（1-2 名后端）
**最小可行范围**：Go 脚手架 + 订单 CRUD + 支付宝/微信支付单渠道 + 回调处理
**依赖**：需要申请支付宝/微信支付商户账号

### 3. 补充单元测试 + 端到端验收（P0，质量保障）
**目标**：覆盖率 >70%，全链路 Happy Path 通过
**工作量**：1-2 天
**范围**：service 层 CRUD + handler 层 happy/error path + middleware 认证 + 评估引擎边界
**依赖**：Bug 修复完成

---

## 当前状态结论

**Wall Phase 1 后端** 经本轮 6 个 Bug 修复后，核心 API 应可正常工作（待联调验证）。架构分层合理，Audience DSL 设计优秀。

**关键风险**：
- 前端 0% 对接 → 无法演示完整产品
- Hydra-Pay 零代码 → 无法提供端到端付费能力
- SDK 零代码 → 无法被外部接入
- 测试严重不足 → 线上事故风险高

**当前不可上线。** 全团队投入，Wall 后端 2 天可达验收标准，整个产品矩阵（Wall + Pay + SDK）需要 6-12 周。
