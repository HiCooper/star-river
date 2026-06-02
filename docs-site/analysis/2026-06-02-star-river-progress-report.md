# 2026-06-02 星河项目进展报告

> 分析日期：2026-06-02 | 基于 main 分支代码 | 距上次全面分析（2026-05-26）间隔 7 天

---

## 一、总体进展概览

| 产品线 | 5月26日评估 | 6月2日评估 | 变化 |
|--------|-------------|-------------|------|
| **Hydra-Pay** 后端 | ~60% | ~85% | +25% |
| **Hydra-Pay** 前端 (admin/portal/pay) | 基础可用 | 功能完善 | 大幅提升 |
| **Hydra-Wall** 后端 | ~55% | ~90% | +35% |
| **Hydra-Wall** 前端 (wall-admin) | 0%（mock） | ~85% | **从零到基本完成** |
| **Sentinel** | 框架搭建 | 框架搭建 | 持平 |
| **文档站点** | 30+ 篇 | 50+ 篇 | +20 篇 |

---

## 二、Hydra-Pay 进展详情

### 2.1 新增支付渠道

在过去 7 天中，新增了两个完整的支付渠道集成：

| 渠道 | 适配器 | 独立 SDK | 回调处理 | 状态 |
|------|--------|----------|----------|------|
| **银联/云闪付** | `internal/channel/unionpay/adapter.go` | `unionpay-go/`（支付/查询/退款/签名/回调） | `unionpay_callback` 表 | ✅ 完成 |
| **数字人民币** | `internal/channel/ecny/adapter.go` | `ecny-go/`（支付/查询/退款/签名/回调） | `ecny_callback` 表 | ✅ 完成 |

此前已有支付宝和微信支付，现在 **4 条渠道全部就绪**。

#### 渠道适配器统一接口

```go
type Adapter interface {
    CreatePayment(ctx, req) (*CreatePaymentResult, error)
    VerifyCallback(ctx, body, query) (*CallbackData, error)
    GetPaymentStatus(ctx, tradeNo) (*PaymentStatus, error)
    Refund(ctx, req) (*RefundResult, error)
}
```

所有渠道适配器遵循同一接口，新增渠道只需实现 4 个方法即可接入。

#### 系统支付渠道管理

新增 `payment_channels` 表和对应的 Admin API：

```
hydra-pay 接入渠道
├── 支付宝 (alipay)      - 排序1, 启用, 支持进件
├── 微信支付 (wechat)    - 排序2, 启用, 支持进件
├── 云闪付 (unionpay)    - 排序3, 启用, 不支持进件
└── 数字人民币 (ecny)    - 排序4, 启用, 不支持进件
```

前端合并「支付渠道」和「渠道配置」为单一页面，支持启用/停用切换和 API 密钥配置查看。

### 2.2 商户-应用-渠道体系重构（本周重点工作）

#### 问题

此前渠道配置逻辑混乱——子商户号（PID/sub_mchid）平铺在 Merchant 表上，无法表达「哪些应用开通了哪些渠道」这一核心关系。

#### 方案

引入 **`merchant_app_channels`** 表，建立三层清晰模型：

```
Merchant（商户）
  ├── alipay_pid / wechat_sub_mchid / ...   ← 进件后获得，每条渠道一个
  │
  └── App（应用）
        └── MerchantAppChannel（应用渠道配置）
              ├── channel_key               ← 渠道标识
              ├── enabled                   ← 是否启用
              └── config (jsonb)            ← 费率/限额等个性配置
```

**关键设计决策：**
- 子商户号留在 Merchant 表（一个法律主体每条渠道只有一个）
- MerchantAppChannel 只记录 per-app 的启用状态和配置覆盖
- `merchant_id` 冗余存储，避免每次 JOIN apps 表
- 前端开通渠道时仅展示商户已进件的渠道

#### Admin 管理后台变更

| 变更项 | 说明 |
|--------|------|
| 删除独立「应用管理」菜单 | 应用列表移入商户详情弹窗 |
| 合并「渠道配置」+「支付渠道」 | 渠道管理一个页面完成 |
| 商户列表重构 | 去掉 PID/微信子商户列，新增搜索（名称/邮箱/手机），操作只保留「查看」 |
| 商户详情弹窗 | 四 Tab：基本信息（可内联编辑）、应用列表（展开行内嵌渠道）、进件状态（已进件渠道+申请记录） |
| 订单列表优化 | 新增商户列和商户筛选，删除渠道交易号列，修复应用名称显示，补充缺失状态标签 |
| 全局大小写修复 | 前端 dataIndex 从 PascalCase 改为 snake_case，与 Go JSON 标签一致 |

#### 菜单结构演进

```
之前：仪表盘 | 商户管理 | 应用管理 | 支付订单 | 测试工具 | 支付渠道 | 渠道配置
现在：仪表盘 | 商户管理 | 支付订单 | 支付渠道 | 测试工具
              └── 详情弹窗（基本信息 + 应用列表 + 进件状态）
                    └── 应用展开行（渠道启用/停用）
```

### 2.3 API 新增

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/merchants/:id/app-channels` | 查询商户下所有应用渠道配置 |
| `POST` | `/api/admin/app-channels` | 为应用开通渠道 |
| `PUT` | `/api/admin/app-channels/:id` | 更新渠道配置 |
| `GET` | `/api/admin/merchants?q=xxx` | 商户搜索（新增 q 参数） |
| `GET` | `/api/admin/orders?merchant_id=xxx` | 按商户筛选订单（新增参数） |

### 2.4 托管结算页升级

`pay-frontend` 新增 V2 版本：
- 渠道卡片式选择（支付宝/微信/云闪付 Logo）
- 二维码展示组件
- 倒计时组件
- 移动端自适应
- 嵌入式 SDK（`hydra-pay.js`，iframe + postMessage）

---

## 三、Hydra-Wall 进展详情

### 3.1 后端（wall-service）

过去 7 天 Hydra-Wall 后端完成了从「基础 CRUD + 若干 P0 Bug」到「生产可用」的跨越：

| 模块 | 5月26日 | 6月2日 | 变更 |
|------|---------|--------|------|
| Placement 评估 API | 有 P0 panic bug | ✅ 生产可用 | Bug 修复 |
| 事件上报 + Redis Worker | 有 P0 panic bug | ✅ 生产可用 | Bug 修复 |
| Analytics 聚合 API | 返回 400 | ✅ 可用 | Bug 修复 |
| JWT 登录 | 循环依赖 | ✅ 可用 | Bug 修复 |
| Plan/Offer 模块 | 0% | ✅ 可用 | 从零实现 |
| Entitlement 权限管理 | 0% | 架构定义 | 待实现 |
| A/B 实验框架 | 0% | 架构定义 | 待实现 |

### 3.2 前端（wall-admin）— 从零到基本完成

这是过去一周最大的进展。wall-admin 之前使用 mock 数据，现在 **所有页面均已连接真实 API**：

| 页面 | 路由 | 功能 |
|------|------|------|
| 仪表盘 | `/` | 统计卡片（收入/交易/转化率）、交易列表、快速开始指南 |
| 应用管理 | `/settings` | 创建/编辑/删除应用、API Key 生成与轮转 |
| 付费计划 | `/plans` | 订阅计划 CRUD |
| 付费墙管理 | `/paywalls` → `/paywalls/[id]` | 创建/编辑/预览付费墙模板 |
| 受众规则 | `/rules` | 受众条件组编辑、排序、条件 DSL 构建 |
| A/B 实验 | `/experiments` | A/B 测试配置（含 E2E 测试） |
| 登录 | `/login` | JWT 登录 |

**前端工程化：**
- 完整的 `apiClient.ts`（TypeScript 类型化 API 客户端，JWT Bearer 鉴权，401 自动跳转）
- `EmptyState`、`ErrorBoundary`、`LoadingSkeleton` 通用组件
- Playwright E2E 测试（`e2e/experiments.spec.ts`）
- AGENTS.md / CLAUDE.md AI 辅助开发配置

### 3.3 前端（wall-frontend）— 用户侧付费墙

用户侧付费墙渲染页面：

| 页面 | 路由 | 功能 |
|------|------|------|
| 付费墙展示 | `/paywall/[id]` | 三种模板渲染（Standard / Minimal / FeatureList） |
| 支付成功 | `/paywall/[id]/success` | 购买后回跳页面 |

---

## 四、Sentinel 进展

Sentinel 模块过去一周未做大幅改动，保持此前状态：

| 组件 | 状态 |
|------|------|
| Platform API（Go） | 错误摄入、Issue 管理、安全规则、自动修复管线 |
| AI Engine（Python） | FastAPI 骨架，分类端点存在但未接入模型 |
| Sidecar（Go） | 日志跟踪器，支持文件和 stdin |
| Dashboard（Next.js） | 概览、Issue 详情、服务管理、设置页面 |

Sentinel 的 AI 诊断能力是星河差异化核心，但目前优先级低于 Hydra-Pay 和 Hydra-Wall 的业务功能完善。

---

## 五、文档站点

文档站点新增 20+ 篇文档，覆盖：

- 银联支付技术设计与测试文档
- 支付宝沙箱验证
- 微信支付服务商配置
- 支付渠道适配器架构
- 商户进件流程
- Webhook 签名验证
- 服务商模式设计决策
- 竞品分析
- AI 时代支付趋势

---

## 六、技术栈全景图

```
┌─────────────────────────────────────────────────────────┐
│                      星河 (Star-River)                    │
├─────────────┬───────────────┬───────────────┬────────────┤
│  Hydra-Pay  │  Hydra-Wall   │   Sentinel    │  Docs      │
│  支付网关    │  付费墙引擎    │  可观测性平台  │  文档站点   │
├─────────────┼───────────────┼───────────────┼────────────┤
│ Go + Gin    │ Go + Gin      │ Go + Python   │ VitePress  │
│ GORM + PG   │ GORM + PG     │ GORM + PG     │ Mermaid    │
│ React SPA   │ Next.js 16    │ Next.js       │            │
│ Antd 6.x    │ Antd 6.x      │ xterm.js      │            │
├─────────────┼───────────────┼───────────────┼────────────┤
│ Channels:   │ Event System: │ AI Triage     │ 50+ pages  │
│ 支付宝       │ Redis Queue   │ Auto-Fix      │            │
│ 微信支付     │ Conditions    │ DingTalk      │            │
│ 云闪付       │ DSL           │ Sidecar       │            │
│ 数字人民币   │ A/B Testing   │               │            │
└─────────────┴───────────────┴───────────────┴────────────┘
```

---

## 七、下一步优先级建议

| 优先级 | 模块 | 事项 |
|--------|------|------|
| P0 | Hydra-Wall | A/B 测试统计引擎（当前仅有配置，无分流效果评估） |
| P0 | Hydra-Pay | 端到端集成测试覆盖（目前测试较薄） |
| P1 | Hydra-Wall | 客户端 SDK 开发（iOS/Android/Web/Flutter） |
| P1 | Hydra-Wall | 付费墙可视化编辑器（拖拽式模板设计） |
| P1 | Sentinel | AI 模型集成到诊断引擎 |
| P2 | 全局 | CI/CD 流水线 + 自动化部署 |
| P2 | Hydra-Pay | Stripe/Apple IAP/Google Billing 渠道扩展 |
| P2 | Sentinel | 告警规则配置 + 多渠道通知 |

---

## 八、结论

过去一周（5/26 → 6/2）星河项目进展显著：

- **Hydra-Pay** 从 2 条渠道扩展到 4 条，商户-应用-渠道体系理顺，管理后台大幅完善，达到 **~85% 完成度**
- **Hydra-Wall** 解决了所有已知 P0 级 Bug，前端 admin 从零到基本完成，整体达到 **~85% 完成度**
- **文档** 从 30+ 篇增长到 50+ 篇，技术文档覆盖趋于完整

项目已从「基础框架搭建」阶段进入「功能完善与打磨」阶段。核心技术风险（多通道适配、付费墙评估引擎、事件系统）均已验证可行，剩余工作主要集中在产品化（SDK、可视化编辑器、CI/CD）和差异化能力（AI 诊断）上。
