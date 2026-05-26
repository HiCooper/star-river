# 2026-05-26 星河 (Star-River) 项目全面分析

> 分析日期：2026-05-26 | 基于当前 main 分支代码

---

## 一、项目定位回顾

星河是 **AI 时代的支付基础设施**，包含三条产品线：

| 产品线 | 对标 | 定位 |
|--------|------|------|
| **Hydra-Pay** | Stripe | 统一支付网关（支付宝/微信/Stripe/Apple IAP/Google Billing） |
| **Hydra-Wall** | Superwall | 付费墙服务（远程配置、行为触发、A/B 测试） |
| **Sentinel** | — | AI 驱动的可观测性与自动修复平台（差异化能力） |

---

## 二、当前实现进度

### Hydra-Wall（wall-service）— 后端 ~55%，产品整体 ~15%

| 模块 | 完成度 | 状态 |
|------|--------|------|
| 项目脚手架 + DB 迁移 + 中间件 | 100% | 构建/测试/静态分析全绿 |
| App/Campaign/Placement/Audience/Paywall CRUD | ~90% | CRUD 可用，校验有缺口 |
| Audience 条件评估引擎 (DSL) | 算法完成，测试覆盖充分 | **亮点模块**，AND/OR 嵌套 + 10+ 运算符 |
| Placement 评估 API (`/evaluate`) | 代码存在但 panic | P0 Bug，类型转换错误 |
| 事件上报 + Redis 异步 Worker | 代码存在但 panic | P0 Bug，同上 |
| Analytics 聚合 API | 端点存在但返回 400 | P1 Bug |
| JWT 登录 | 循环依赖 Bug | `/auth/login` 被自己的中间件拦截 |
| **前端 wall-admin 对接** | **0%** | 全部 mock 数据，apiClient.ts 不存在 |
| **Plan/Offer 模块** | **0%** | 架构文档定义但未实现 |
| **Entitlement 权限管理** | **0%** | 架构文档定义但未实现 |
| **A/B 实验框架** | **0%** | 仅在架构文档中设计 |
| **客户端 SDK (iOS/Android/Web)** | **0%** | 未开始 |

### Hydra-Pay（pay-service）— 后端 ~60%

| 模块 | 完成度 | 状态 |
|------|--------|------|
| Go 服务脚手架 + 中间件 | 100% | 含限流、幂等、链路追踪、优雅关闭 |
| 支付宝渠道适配器 | 80% | 对接支付宝 SDK，含商户进件 |
| 微信支付渠道适配器 | 80% | 对接微信 SDK，含商户进件 |
| 支付创建/查询/退款 API | 可用 | 有集成测试 |
| Checkout Session | 可用 | Stripe 风格托管结算页 |
| 订阅管理 | 基础可用 | 创建/列表/取消 |
| 回调处理 + Webhook | 可用 | 含签名验证和重试 |
| 管理后台 + Portal + 支付前端 | 3 个 SPA 已构建 | React/Vite |
| **Stripe 渠道** | **0%** | Phase 2 |
| **Apple IAP / Google Billing** | **0%** | Phase 2 |
| **支付智能路由** | 接口定义但未实现 | 仅有 Sentinel 熔断 |
| **风控系统** | **0%** | Phase 3 |
| **账务对账** | **0%** | Phase 3 |
| **Go SDK** | 有客户端库 | webhook 签名 + 辅助函数 |

### Sentinel — ~70%

三个核心组件（sidecar、platform、ai-engine）均可工作，auto-fix pipeline 使用 Claude Code 创建 PR 是差异化亮点。

---

## 三、距离项目目标，还缺哪些必要能力

### 第一优先级：让现有代码能跑（1-2 天）

1. **修复 3 个 P0 panic** — evaluate_handler、event_handler 类型转换，auth/login 循环依赖
2. **修复 5 个 P1 缺陷** — 重复 placement 错误码、audience 校验缺失、analytics 端点等
3. **前端 wall-admin 对接** — 创建 apiClient.ts，Settings → Paywall → Dashboard 逐页切换

### 第二优先级：跑通付费闭环（2-3 周）

4. **Plan 模块** — wall-service 侧 Plan/Offer 数据模型 + CRUD（当前完全空白）
5. **Wall↔Pay 集成** — 当前两个子服务独立运行，无实际集成。需要实现：
   - Wall 评估返回 Paywall → 用户选 Plan → 调用 Pay 创建支付
   - Pay 支付成功 → Webhook 回调 Wall → 更新 Entitlement
6. **Entitlement 权限管理** — 用户订阅状态查询、权限判定（当前完全空白）
7. **Hydra-Pay 单渠道跑通** — 至少支付宝端到端可用（目前 channel adapter 代码存在，但未见完整的 sandbox 验证）

### 第三优先级：产品竞争力（3-4 周）

8. **客户端 SDK** — iOS/Android/Web SDK（开发者接入的入口，当前为零）
9. **A/B 实验框架** — 实验创建、分组分配、统计显著性计算
10. **AI 差异化功能** — 自然语言 → Audience 规则生成（利用现有 DSL 优势）
11. **Remote Config** — 运行时热更新付费墙配置，无需发版

### 第四优先级：生产就绪（4-8 周）

12. **Stripe / Apple IAP / Google Billing 渠道**
13. **支付智能路由** — 按地区/金额/渠道可用性自动选择最优渠道
14. **风控系统**
15. **CI/CD + 私有化部署**

---

## 四、当前架构 QPS 评估

### 评估场景：`POST /api/v1/evaluate`（付费墙核心热路径）

这是 QPS 最高的接口，每个用户触发事件都会调用。

**当前瓶颈分析：**

| 层次 | 现状 | 瓶颈 |
|------|------|------|
| HTTP Server | **无任何超时配置** | 慢客户端可耗尽连接 |
| 限流 | **hydra-wall 无限流** | 无保护，可被击穿 |
| 缓存 | **无 Redis 缓存命中** | 每次请求都查 DB（Campaign → Audiences → Paywalls 联表） |
| DB 连接池 | 25 最大连接 / 5 空闲 | 约 25 个并发 DB 查询 |
| 业务逻辑 | 纯内存计算（JSON 解析 + 条件匹配） | 计算本身不重 |

**估算**：假设评估请求需要 3-5 次 DB 查询（查 campaign、audiences、paywalls、关联表），每次查询 ~5ms。无缓存时每个请求 DB 耗时约 15-25ms，25 个连接理论上最多支撑约 **1000-1500 QPS**。

但实际远低于此，因为：
- 每个请求持有 DB 连接时间更长（GORM 未做连接复用优化）
- 无 HTTP 超时，慢请求会堆积

**实际估计：200-500 QPS**（无缓存，单实例）

> 加上 Redis 缓存（Plan 建议的 `wall:paywall:{app_id}:{paywall_id}` 和 `wall:config:{app_id}`），评估请求可降至 0-1 次 DB 查询，**QPS 可提升至 2000-5000**。

### 支付创建：`POST /v1/payments/create`

| 层次 | 现状 |
|------|------|
| 限流 | 10 QPS/app（API v1），30 QPS/app（Portal） |
| 熔断 | 支付宝/微信 50% 错误率阈值 |
| 外部调用 | 支付宝/微信 API（耗时 200-1000ms） |

**估计：受限于外部渠道响应时间，单实例约 50-100 QPS**（受 25 个 DB 连接 + 外部 HTTP 调用阻塞）。

### 事件上报：`POST /api/v1/events`

| 层次 | 现状 |
|------|------|
| 写入路径 | HTTP → Redis LPUSH → 异步 Worker BRPop → PostgreSQL BatchInsert |
| Worker | **仅 1 个 goroutine**，逐批处理 |
| 批大小 | 100 条/批，5s 刷新间隔 |

**估计：**
- 写入 Redis：**5000+ QPS**（Redis 单线程可轻松支撑）
- 写入 PostgreSQL：受限于单 Worker，500 条/批 / 5s = **100 条/s**，即 100 QPS 的持续事件写入

> 瓶颈在单 Worker。扩展到 5-10 个 Worker 可支撑 **500-1000 QPS** 持续事件写入。

---

## 五、综合 QPS 能力评估

| 接口 | 当前估计 QPS | 瓶颈 | 优化后可达 |
|------|-------------|------|-----------|
| `/evaluate` | 200-500 | 无缓存，全 DB 查询 | 2000-5000 (加 Redis) |
| `/payments/create` | 50-100 | 外部渠道响应 + DB 连接数 | 200-500 (连接池 + 异步) |
| `/events` | 5000+ (写入) / 100 (持久化) | 单 Worker | 5000+ / 1000 |
| CRUD API | 200-500 | DB 连接数 | 1000+ (连接池调优) |

**整体评估：当前架构在单实例下可承接约 200-500 QPS 的混合流量。** 加上缓存、连接池调优、HTTP 超时配置后可达 **1000-2000 QPS**。

---

## 六、关键性能风险

| 风险 | 严重程度 | 说明 |
|------|----------|------|
| HTTP Server 无超时 | 高 | 三个 Go 服务均未配置 ReadTimeout/WriteTimeout/IdleTimeout，可被 Slowloris 攻击 |
| Webhook goroutine 无界 | 高 | `go s.safeNotifyWall(...)` 无 semaphore/pool，回调高峰可 OOM |
| 单 Worker 处理事件 | 中 | 事件持久化瓶颈，Redis 队列可无限增长 |
| 无 Redis 缓存命中 | 中 | 每次 `/evaluate` 全量查 DB |
| 无压测基准 | 中 | 所有 QPS 估算均为理论推导，无实测数据 |
| Redis 连接池默认 | 低 | 未显式配置 pool size |

---

## 七、策略建议

1. **不要追求架构文档的完整实现** — 那需要 12 周。先跑通 Wall + Pay 的最小闭环（4 周内）
2. **在闭环中嵌入 1 个 AI 差异化功能** — 自然语言配置 Audience 规则，利用现有 DSL 优势
3. **Hydra 的机会不是追平 Superwall/Stripe 的功能矩阵** — 是靠 AI 原生的配置体验和更低的接入成本
4. **先修 Bug，再谈性能** — 核心功能有 panic，产品不可演示，QPS 优化在当前阶段不是瓶颈
