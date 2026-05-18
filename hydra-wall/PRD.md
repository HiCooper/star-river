# Hydra-Wall PRD - MVP 版本

> 类 Superwall 付费墙服务 - 最小可行产品

## 1. 产品愿景

Hydra-Wall 致力于成为 **Superwall 的开源替代方案**，帮助移动应用开发者以极低成本实现专业级付费墙功能。通过 SDK 集成，开发者可以远程控制付费墙的展示时机、内容和定价，无需应用商店审核即可实时调整变现策略。

**核心差异点**：
- 完全自托管，数据完全自主
- 与 Hydra-Pay 深度集成
- 极简接入，最快 30 分钟完成集成

---

## 2. MVP 范围

### 2.1 必须完成 (MVP Scope)

#### 2.1.1 客户端 SDK
| 功能 | 描述 | 优先级 |
|------|------|--------|
| SDK 初始化 | `configure(apiKey)` 配置 SDK | P0 |
| 用户识别 | `identify(userId)` / `reset()` 用户身份管理 | P0 |
| Placement 注册 | `register(placement, featureBlock)` 触发付费墙 | P0 |
| 订阅状态 | 获取当前用户订阅状态 | P0 |
| 用户属性 | `setUserAttributes()` 设置用户属性 | P1 |

#### 2.1.2 服务端核心
| 功能 | 描述 | 优先级 |
|------|------|--------|
| Campaign 管理 | 创建/编辑/归档 Campaign | P0 |
| Placement 管理 | 在 Campaign 中添加 Placement | P0 |
| Audience 定向 | 基于用户属性/事件过滤 | P0 |
| Paywall 渲染 | 返回付费墙配置给 SDK | P0 |
| Feature Gating | Gated / Non-Gated 两种模式 | P0 |

#### 2.1.3 付费墙编辑器
| 功能 | 描述 | 优先级 |
|------|------|--------|
| 模板市场 | 预置 5+ 付费墙模板 | P0 |
| 可视化编辑 | 调整文字/颜色/图片 | P0 |
| 商品关联 | 关联 Hydra-Pay 商品 | P0 |
| 实时预览 | 编辑器内设备预览 | P0 |

#### 2.1.4 数据分析
| 功能 | 描述 | 优先级 |
|------|------|--------|
| Dashboard | 关键指标总览 | P0 |
| Campaign 报表 | 展示/转化/收入 | P0 |

### 2.2 后续迭代 (Post-MVP)

| 功能 | 描述 | 计划版本 |
|------|------|----------|
| A/B Testing | 流量分配/统计显著性 | v2.0 |
| Web Paywalls | Web 结账页 + Stripe 集成 | v2.0 |
| Deep Links | 外部链接直接打开指定付费墙 | v2.0 |
| Localization | AI 翻译 + 多语言支持 | v2.0 |
| Demand Score | AI 定价建议 | v3.0 |
| Flows 多步流程 | 多页面引导式购买 | v3.0 |

---

## 3. 用户旅程

### 3.1 开发者侧

```
注册账号 → 创建 App → 安装 SDK → 配置 Campaign → 发布
```

1. **注册/登录** Hydra-Wall 后台
2. **创建 App** 并获取 API Key
3. **安装 SDK** (iOS/Android/Web)
4. **配置 Campaign**:
   - 添加 Placement (如 `premium_feature`)
   - 创建 Audience (如 "未订阅用户")
   - 选择/创建 Paywall
5. **集成 SDK**:
   ```swift
   HydraWall.configure(apiKey: "hw_xxx")
   HydraWall.shared.register(placement: "premium_feature") {
     // 用户解锁功能
   }
   ```
6. **发布** - Campaign 生效，SDK 自动获取配置

### 3.2 用户侧

```
使用 App → 触发 Placement → 展示 Paywall → 购买订阅 → 解锁功能
```

---

## 4. 核心概念

### 4.1 Placement

Placement 是一个**触发点**，当用户触发时决定是否展示付费墙。

```swift
// 注册 placement
HydraWall.shared.register(placement: "start_workout") {
  // 功能代码
}
```

常见 Placement:
- `opened_app` - 打开应用
- `feature_access` - 访问特定功能
- `purchase_attempted` - 购买意图

### 4.2 Campaign

Campaign = Placements + Audiences + Paywalls

```
Campaign "Premium Upsell"
├── Placements
│   ├── start_workout
│   ├── added_entry
│   └── settings_opened
├── Audiences
│   ├── "Non-subscribers" (default)
│   └── "Trial expired"
└── Paywalls
    ├── Paywall A (70%)
    └── Paywall B (30%)
```

### 4.3 Audience

Audience 定义**谁**会看到付费墙。

| 过滤条件 | 示例 |
|----------|------|
| 订阅状态 | `subscription_status == none` |
| 事件次数 | `workout_completed >= 3` |
| 用户属性 | `plan == free` |
| App 版本 | `app_version >= 1.0.0` |
| 日期范围 | `signup_date within 7 days` |

### 4.4 Feature Gating

| 模式 | 行为 |
|------|------|
| **Non-Gated** | 付费墙关闭后**总是**执行功能代码 |
| **Gated** | 只有**已订阅**或**购买成功**时才执行功能 |

---

## 5. SDK 交互流程

```
┌─────────────┐                    ┌─────────────┐
│   Client    │                    │ Hydra-Wall  │
│   App       │                    │   Server    │
└─────────────┘                    └─────────────┘
       │                                 │
       │  1. configure(apiKey)           │
       │ ───────────────────────────────►│
       │                                 │
       │  2. SDK 获取 Campaign 配置       │
       │   (App 启动时/缓存)             │
       │ ◄────────────────────────────── │
       │                                 │
       │  3. register("start_workout")   │
       │ ───────────────────────────────►│
       │                                 │
       │  4. 评估 Audience + Experiment   │
       │                                 │
       │  5. 返回 Paywall / 执行功能      │
       │ ◄────────────────────────────── │
       │                                 │
       │  6. 用户购买/关闭                │
       │  7. 购买成功 → 记录 Transaction │
       │ ───────────────────────────────►│
```

---

## 6. 付费墙模板 (MVP)

### 6.1 模板列表

| 模板名 | 布局 | 适用场景 |
|--------|------|----------|
| **Centered Card** | 居中卡片 | 简洁功能展示 |
| **Feature List** | 功能列表 | 多功能对比 |
| **Hero Banner** | 顶部大图 | 视觉冲击力 |
| **Minimalist** | 极简文字 | 克制风格 App |
| **Dark Mode** | 深色主题 | 夜间模式 App |

### 6.2 模板可配置项

- Logo 图片
- 主标题 / 副标题
- 功能描述 (3-5 条)
- 商品价格 (周/月/年)
- CTA 按钮文字
- 背景色 / 强调色
- 隐私政策链接
- 恢复购买按钮

---

## 7. 数据模型

### 7.1 App
```json
{
  "id": "app_xxx",
  "name": "My Fitness App",
  "platform": "ios",
  "apiKey": "hw_live_xxx",
  "createdAt": "2026-01-01"
}
```

### 7.2 Campaign
```json
{
  "id": "camp_xxx",
  "appId": "app_xxx",
  "name": "Premium Upsell",
  "status": "active",
  "placements": ["start_workout", "added_entry"],
  "createdAt": "2026-01-01"
}
```

### 7.3 Audience
```json
{
  "id": "aud_xxx",
  "campaignId": "camp_xxx",
  "name": "Non-subscribers",
  "filters": [
    {"field": "subscription_status", "operator": "==", "value": "none"}
  ],
  "paywalls": [
    {"paywallId": "pw_xxx", "percentage": 100}
  ],
  "order": 1
}
```

### 7.4 Paywall
```json
{
  "id": "pw_xxx",
  "appId": "app_xxx",
  "name": "Premium Paywall",
  "template": "centered_card",
  "config": {
    "title": "Unlock Premium",
    "subtitle": "Get access to all features",
    "features": ["Feature A", "Feature B"],
    "products": ["price_weekly", "price_monthly"]
  },
  "featureGating": "non_gated"
}
```

### 7.5 Transaction
```json
{
  "id": "txn_xxx",
  "userId": "user_xxx",
  "appId": "app_xxx",
  "paywallId": "pw_xxx",
  "placement": "start_workout",
  "productId": "price_monthly",
  "revenue": 9.99,
  "currency": "USD",
  "status": "completed",
  "createdAt": "2026-01-01"
}
```

---

## 8. 成功指标

### 8.1 开发者指标

| 指标 | 目标 |
|------|------|
| SDK 集成时间 | < 30 分钟 |
| Campaign 创建时间 | < 5 分钟 |
| 付费墙曝光延迟 | < 100ms (本地判断) |

### 8.2 用户指标

| 指标 | 定义 |
|------|------|
| Paywall 展示率 | 展示次数 / Placement 触发次数 |
| 转化率 | 购买次数 / 展示次数 |
| 每用户平均收入 (ARPU) | 总收入 / 付费用户数 |

---

## 9. 技术约束

- **客户端 SDK 最小版本**: iOS 14+, Android API 21+
- **服务端可用性**: 99.9% uptime
- **SDK 配置缓存**: 本地缓存 1 小时
- **付费墙配置推送**: 变更后 5 分钟内生效

---

## 10. 竞品对比

| 功能 | Superwall | Hydra-Wall MVP |
|------|------------|----------------|
| SDK 集成 | ✅ | ✅ |
| Campaign 管理 | ✅ | ✅ |
| Paywall Editor | ✅ | ✅ |
| 模板市场 | ✅ (100+) | ✅ (5+) |
| A/B Testing | ✅ | ❌ (v2.0) |
| Web Paywalls | ✅ | ❌ (v2.0) |
| Deep Links | ✅ | ❌ (v2.0) |
| Localization | ✅ (AI) | ❌ (v2.0) |
| 自托管 | ❌ | ✅ |
| 开源 | ❌ | ✅ (计划) |

---

## 11. 依赖关系

```
Hydra-Wall MVP
├── 依赖 Hydra-Pay
│   ├── 商品管理 (Plans/Offers)
│   ├── 购买流程
│   └── 订阅状态查询
│
└── 依赖 客户端 SDK
    ├── iOS SDK
    ├── Android SDK
    └── (可选) Web SDK
```
