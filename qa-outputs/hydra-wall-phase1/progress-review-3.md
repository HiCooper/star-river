# Hydra 项目进展审查 #3 — 2026-05-22（终审）

## 三轮审查总结

| 维度 | #1 审查 | #2 审查 | #3 审查（本次） |
|------|---------|---------|-----------------|
| 视角 | Bug 驱动 | 产品完整度 | 架构策略 + AI 差异化 |
| 核心发现 | 6 个 P0 Bug | 架构文档 12 模块仅实现 5 个 | 基础扎实，策略需聚焦 |
| 后端就绪度 | 不可用 | CRUD 可用 | 构建/测试/静态分析全绿 |

---

## 当前代码状态（最终确认）

```
• 构建: ✅ go build 通过
• 测试: ✅ 3 个测试包通过 (service, pkg/crypto, pkg/errors)
• 静态分析: ✅ go vet 无警告
• 已修改文件: 9 个 (+1 新增 handler/helpers.go)
• 净代码变化: -32 行 (删除多于新增，代码更干净)
• 二进制: 28.5 MB (Golang 1.21, darwin/arm64)
```

---

## Wall↔Pay 集成架构：最小闭环方案

当前架构文档定义的集成路径存在一个**鸡生蛋蛋死锁**：

- Wall 需要 Pay 的商品数据来展示 Plan → 但 Pay 还没开始
- Pay 需要 Wall 的评估结果来创建支付 → 但 Wall 还缺 Entitlement/Offer 模块

### 建议的打破死锁路径

**Step 1**：Wall 增加最小化的 `Offer/Plan` 模块（复用现有 model 模式，1-2 个文件）
- 新增 `internal/model/plan.go` — Plan 数据模型
- 新增 `internal/service/plan_service.go` — Plan CRUD
- 新增 `internal/handler/plan_handler.go` — Plan API 端点
- **范围**：仅支持手动创建 Plan（名称、价格、周期），不依赖 Hydra-Pay

**Step 2**：启动 Hydra-Pay MVP（复用 wall-service 项目结构）
- 脚手架：`hydra-pay/service/cmd/server/main.go`
- 最小 API：`POST /v1/payments/create` + `GET /v1/payments/:id`
- 单渠道：支付宝扫码（App 支付 / 电脑网站支付）
- **关键**：Pay 不依赖 Wall，Wall 通过 HTTP 调用 Pay

**Step 3**：Wall↔Pay 握手点
```
SDK 调用 /evaluate → 返回 {action: "show_paywall", paywall: {...}}
→ 用户选择 Plan → 前端 POST /payments/create {plan_id, user_id}
→ Pay 创建订单 → 返回 {payment_url, qr_code}
→ 用户支付成功 → Pay 回调 → Pay 通知 Wall (webhook)
→ Wall 更新 Entitlement → 用户获得权限
```

### 集成接口定义（建议）

```go
// Wall 调用 Pay 的接口
POST /v1/payments/create
{
  "plan_id": "plan_xxx",
  "user_id": "user_xxx", 
  "app_id": "app_xxx",
  "success_url": "https://app.com/success",
  "metadata": {"paywall_id": "pw_xxx", "campaign_id": "camp_xxx"}
}

// Pay 回调 Wall 的 webhook
POST /api/v1/webhooks/payment
{
  "event": "payment.success",
  "payment_id": "pay_xxx",
  "user_id": "user_xxx",
  "plan_id": "plan_xxx",
  "amount": 9900,
  "currency": "CNY"
}
```

---

## AI 时代差异化机会分析

Superwall 和 Stripe 是 2010 年代的产品——API driven, rule-based, deterministic。AI 时代的付费基础设施应该是什么样？

### 当前架构的 AI 就绪度

| 系统能力 | 当前实现 | AI 增强潜力 |
|---------|---------|------------|
| Audience 条件 DSL | JSON 结构化的 AND/OR 规则树 | **高** — LLM 可直接生成/解释/优化规则 |
| Paywall Config | JSONB 模板配置 | **高** — AI 可生成个性化付费墙文案 |
| 评估引擎 | 确定性规则匹配 | **中** — 可加入 ML 模型预测转化概率 |
| 事件系统 | 异步写入，结构化 | **高** — 训练数据源，用户行为序列 |
| Analytics | 基础聚合查询 | **低** — 需先补充漏斗和留存分析 |

### 3 个高杠杆 AI 切入点（按投入产出比排序）

1. **AI 生成 Audience 规则**（低投入，高感知）
   - 输入："对注册 3 天后仍用免费版的 iOS 用户展示付费墙"
   - LLM 输出结构化 JSON conditions → 直接写入 Audience 表
   - 现有 DSL 完全支持，只需加一个自然语言 → JSON 的转换层

2. **AI 优化 Paywall 转化率**（中投入，高价值）
   - 基于历史事件数据训练模型
   - 自动调整 Paywall 模板、文案、Plan 排序
   - 类似 Superwall 的 "Demand Score" 但用 AI 驱动

3. **AI 代码生成 SDK 集成**（低投入，降低接入门槛）
   - 输入：App 技术栈（iOS/Swift，Android/Kotlin，Web/React）
   - LLM 生成完整的 SDK 初始化代码 + Placement 注册代码
   - 大幅降低开发者接入成本

### 与 Superwall/Stripe 的关键差异

Superwall 的 "AI" 目前仅限于规则推荐，Stripe 的 "AI" 主要是风控。Hydra 可以在**配置层**做 AI-native：让运营人员用自然语言描述策略，AI 自动生成规则并持续优化。

---

## 优先级最高的 3 项下一步工作（终版）

### 1. 前端对接 + 后端联调验证（P0，1-2 天）
**目标**：让产品可演示（不是好看，是能跑）
**范围**：
- `apiClient.ts` 模块（fetch + error handling + JWT token）
- Settings 页面（App CRUD + API Key 管理）— 这是其他页面的前提
- Paywall 列表页（CRUD）— 核心配置入口
- Dashboard 页（Analytics + Transactions 只读）— 门面

### 2. Plan 模块 + Hydra-Pay 单渠道 MVP（P0，2-3 周）
**目标**：跑通"配置 → 评估 → 展示 → 支付 → 收款"闭环
**范围**：
- Wall 侧：Plan/Offer 数据模型 + CRUD（1-2 天）
- Pay 侧：Go 脚手架 + `/v1/payments/create` + 支付宝回调（2-3 周）
- 集成点：HTTP 调用（不引入消息队列，MVP 够用）
- **砍掉**：多渠道路由、风控、对账、Apple IAP、Google Billing

### 3. AI 自然语言 → Audience 规则（差异化亮点，1 周 POC）
**目标**：验证"用自然语言配置付费墙策略"的可行性
**范围**：
- 新增 `POST /api/v1/audiences/generate` — 接收自然语言描述，返回结构化 conditions
- 调用 LLM（Claude API / OpenAI API）做文本→JSON 转换
- 在 wall-admin 中加一个"AI 生成规则"的输入框
- **价值**：即使后端功能对齐 Superwall 70%，这个功能让产品有独特卖点

---

## 最终结论

**Phase 1 后端的代码质量和架构设计是合格的**。6 个 Bug 修复后，构建/测试/静态分析全绿，4,766 行 Go 代码分层清晰，Audience DSL 设计是亮点。

**但工程质量 ≠ 产品就绪**。当前产品完成度约 15%，距离"能演示"还差前端对接（1-2 天），距离"最小可用产品"还差支付闭环（2-3 周）。

**策略建议**：
- 不要追求 ARCHITECTURE.md 的完整实现——那需要 12 周
- 先跑通 Wall + Pay 的最小闭环（4 周内）
- 在闭环中嵌入 1 个 AI 差异化功能（自然语言配置规则）
- 用这个 MVP 验证产品方向，而不是在内部追求功能完备

**Hydra 有机会，但不是靠追平 Superwall/Stripe 的功能矩阵——是靠 AI 原生的配置体验和更低的接入成本。**
