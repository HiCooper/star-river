# Hydra-Wall 架构设计文档

> 付费墙服务 - 自建 Superwall

## 一、产品定位

Hydra-Wall 是一套自建的付费墙服务（类比 Superwall），旨在帮助开发者以极低研发成本快速实现付费功能，同时提供强大的变现优化工具。

### 核心价值

| 维度 | 描述 |
|------|------|
| **降低研发成本** | 接入方无需自建付费墙 UI，通过托管页面或 SDK 即可完成付费入口 |
| **提升转化率** | 内置 A/B 测试、免费试用、行为触发等策略优化工具 |
| **可视化配置** | 提供付费墙编辑器，可实时预览和调整付费墙外观行为 |
| **数据分析** | 内置收入分析、实验追踪、漏斗分析等变现洞察 |

### 对标 Superwall 的关键能力

| Superwall | Hydra-Wall 实现 |
|-----------|-----------------|
| Paywall Editor | 可视化付费墙编辑器，拖拽配置 |
| Behavioral Targeting | 行为触发规则引擎 |
| A/B Testing | 内置实验框架 |
| Paywall Preview | 实时预览调试 |
| Revenue Analytics | 收入分析面板 |
| Remote Config | 运行时规则配置 |
| Webhook 触发 | 事件驱动的付费墙展示 |

### 目标用户

- **移动应用开发者**：iOS/Android/Flutter 应用
- **Web 产品**：需要快速集成付费功能的 SaaS 产品
- **游戏开发者**：需要应用内购功能的游戏

---

## 二、系统架构

### 2.1 高层架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          客户端 SDK                                     │
│   iOS SDK  ·  Android SDK  ·  Web SDK  ·  Flutter SDK  ·  Unity SDK    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   Full Hosted      │           │   Embedded SDK    │
        │   (托管模式)        │           │   (嵌入模式)       │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    ▼                               ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                    Hydra API Gateway                          │
        │              (统一入口 / 路由 / 鉴权 / 限流)                   │
        └─────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │   wall-frontend   │           │   wall-service    │
        │   (托管前端)       │           │   (后端服务)       │
        │                   │           │                   │
        │  React SSR/CSR    │           │  Go               │
        │  独立部署          │           │  独立部署          │
        └───────────────────┘           └───────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │  wall-admin       │           │   wall-db         │
        │  (开发者后台)     │           │   PostgreSQL      │
        │                   │           └───────────────────┘
        │  - 付费墙编辑器   │                    │
        │  - A/B 测试       │                    ▼
        │  - 数据分析       │           ┌───────────────────┐
        │  - 规则配置       │           │   Redis           │
        └───────────────────┘           │   (缓存/队列)     │
                                        └───────────────────┘
```

### 2.2 完整功能架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        开发者后台 (wall-admin)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ 付费墙编辑器 │  │ A/B 测试    │  │ 数据分析    │  │ 规则配置    │  │
│  │ Paywall     │  │ Experiments │  │ Analytics   │  │ Rules       │  │
│  │ Editor      │  │             │  │             │  │             │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          wall-service                                    │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │ Paywall Engine  │  │  Targeting      │  │  Experiment    │       │
│  │ (付费墙引擎)     │  │  (行为触发)     │  │  (实验框架)     │       │
│  │                │  │                │  │                │       │
│  │ - 规则匹配      │  │ - 用户分群      │  │ - A/B 分组     │       │
│  │ - 展示决策      │  │ - 行为事件      │  │ - 指标追踪     │       │
│  │ - 模板渲染      │  │ - 触发条件      │  │ - 统计显著性   │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │ Entitlement     │  │  Offer Manager  │  │  Analytics     │       │
│  │ (权限管理)       │  │  (商品管理)      │  │  (事件采集)     │       │
│  │                │  │                │  │                │       │
│  │ - 订阅状态      │  │ - Plans        │  │ - 漏斗分析     │       │
│  │ - 试用管理      │  │ - Offers       │  │ - 收入追踪     │       │
│  │ - 权限判定      │  │ - 促销规则      │  │ - 实时监控     │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐                             │
│  │ Remote Config   │  │  Integration    │                             │
│  │ (远程配置)       │  │  (外部集成)      │                             │
│  │                │  │                │                             │
│  │ - 热更新规则    │  │ - Hydra-Pay    │                             │
│  │ - 功能开关      │  │ - Webhook      │                             │
│  │ -渐进式发布     │  │ - Analytics    │                             │
│  └─────────────────┘  └─────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 组件说明

| 组件 | 职责 | 技术选型 |
|------|------|----------|
| **wall-admin** | 开发者后台（付费墙编辑器、A/B测试、数据分析） | React + Ant Design |
| **wall-frontend** | 托管付费墙页面渲染 | React + Vite |
| **wall-service** | 付费墙业务逻辑 | Go |
| **wall-db** | 持久化存储 | PostgreSQL |
| **Redis** | 缓存/队列/会话 | Redis Cluster |

---

## 三、工程结构

```
hydra-wall/
├── wall-service/                 # 后端服务 (Go)
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── api/
│   │   │   ├── handler/
│   │   │   │   ├── paywall_handler.go
│   │   │   │   ├── entitlement_handler.go
│   │   │   │   ├── experiment_handler.go
│   │   │   │   └── analytics_handler.go
│   │   │   ├── middleware/
│   │   │   │   ├── auth.go
│   │   │   │   ├── ratelimit.go
│   │   │   │   └── logging.go
│   │   │   └── router.go
│   │   ├── service/
│   │   │   ├── paywall_engine.go      # 付费墙引擎
│   │   │   ├── targeting.go           # 行为触发
│   │   │   ├── experiment.go           # A/B 测试
│   │   │   ├── entitlement.go          # 权限管理
│   │   │   ├── offer.go               # 商品管理
│   │   │   ├── analytics.go            # 数据分析
│   │   │   └── remote_config.go        # 远程配置
│   │   ├── domain/
│   │   │   ├── paywall_config.go
│   │   │   ├── plan.go
│   │   │   ├── entitlement.go
│   │   │   ├── experiment.go
│   │   │   ├── user_event.go
│   │   │   └── targeting_rule.go
│   │   ├── repository/
│   │   │   ├── plan_repo.go
│   │   │   ├── entitlement_repo.go
│   │   │   ├── experiment_repo.go
│   │   │   └── event_repo.go
│   │   ├── integration/
│   │   │   └── hydra_pay.go           # 调用 Hydra-Pay
│   │   └── worker/
│   │       ├── subscription_expirer.go # 订阅过期检查
│   │       └── experiment_calculator.go # 实验统计计算
│   ├── pkg/
│   │   ├── errors/
│   │   ├── validator/
│   │   └── crypto/
│   ├── migrations/
│   └── config/
│
├── wall-frontend/                # 托管付费墙页面
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PaywallPage.tsx
│   │   │   ├── SuccessPage.tsx
│   │   │   └── CancelPage.tsx
│   │   ├── components/
│   │   │   ├── PaywallCard.tsx
│   │   │   ├── PlanCard.tsx
│   │   │   ├── PricingTable.tsx
│   │   │   ├── TrialBadge.tsx
│   │   │   └── CheckoutButton.tsx
│   │   ├── templates/               # 付费墙模板
│   │   │   ├── Standard.tsx
│   │   │   ├── Minimal.tsx
│   │   │   └── FeatureList.tsx
│   │   └── sdk/
│   │       ├── index.ts
│   │       ├── hydra-wall.ts
│   │       └── embedded.ts
│   └── vite.config.ts
│
├── wall-admin/                    # 开发者后台
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # 数据概览
│   │   │   ├── PaywallEditor.tsx    # 付费墙编辑器
│   │   │   ├── Plans.tsx            # 商品管理
│   │   │   ├── Experiments.tsx      # A/B 测试
│   │   │   ├── Rules.tsx            # 规则配置
│   │   │   └── Settings.tsx         # 应用设置
│   │   ├── components/
│   │   │   ├── PaywallPreview.tsx   # 付费墙预览
│   │   │   ├── DraggableBlocks.tsx  # 拖拽组件
│   │   │   ├── PlanSelector.tsx
│   │   │   └── RuleBuilder.tsx
│   │   └── hooks/
│   └── package.json
│
├── wall-sdk/                      # 客户端 SDK
│   ├── ios/
│   ├── android/
│   ├── web/
│   ├── flutter/
│   └── unity/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── SDK.md
│
└── docker/
```

---

## 四、核心功能模块

### 4.1 Paywall Engine（付费墙引擎）

负责决定用户应该看到什么样的付费墙，是整个系统的核心。

```go
// internal/service/paywall_engine.go
type PaywallEngine interface {
    // Evaluate 评估用户应该看到什么付费墙
    Evaluate(ctx context.Context, req *PaywallEvaluationRequest) (*PaywallEvaluationResult, error)
    
    // Render 渲染付费墙配置
    Render(ctx context.Context, config *PaywallConfig) (*RenderedPaywall, error)
}

type PaywallEvaluationRequest struct {
    AppID      string            `json:"app_id"`
    UserID     string            `json:"user_id"`
    UserTraits *UserTraits       `json:"user_traits"`      // 用户属性
    UserEvents []*UserEvent      `json:"user_events"`      // 用户历史事件
    Trigger    *TriggerEvent     `json:"trigger"`          // 触发事件
    SessionID  string            `json:"session_id"`
}

type PaywallEvaluationResult struct {
    PaywallID      string            `json:"paywall_id"`
    Config         *PaywallConfig    `json:"config"`
    Experiment     *ExperimentAssignment `json:"experiment"` // A/B 分组
    TargetingMatch *TargetingMatch   `json:"targeting_match"`
    RenderedPaywall *RenderedPaywall  `json:"rendered_paywall"`
}

type RenderedPaywall struct {
    Template   string                 `json:"template"`
    Theme      *ThemeConfig           `json:"theme"`
    Plans      []*PlanDisplay         `json:"plans"`
    Strings    *LocalizedStrings      `json:"strings"`
    Assets     *AssetConfig           `json:"assets"`
    Animations *AnimationConfig       `json:"animations"`
}
```

### 4.2 Targeting Engine（行为触发引擎）

基于用户行为和属性，决定何时展示付费墙。

```go
// internal/service/targeting.go
type TargetingEngine interface {
    // Evaluate 评估触发条件
    Evaluate(ctx context.Context, userID string, trigger *TriggerEvent, rules []TargetingRule) (*TargetingMatch, error)
    
    // MatchUser 评估用户是否符合条件
    MatchUser(ctx context.Context, userID string, rule *TargetingRule) (bool, error)
}

type TriggerEvent struct {
    Type    string                 `json:"type"`    // paywall_shown, feature_used, screen_viewed, etc.
    Name    string                 `json:"name"`
    Params  map[string]interface{}  `json:"params"`
    Count   int                    `json:"count"`    // 事件触发次数
}

type TargetingRule struct {
    ID          string          `json:"id"`
    Name        string          `json:"name"`
    Description string          `json:"description"`
    Conditions  []Condition     `json:"conditions"`
    Operator    string          `json:"operator"`  // AND / OR
    Priority    int             `json:"priority"`
}

type Condition struct {
    Type      string      `json:"type"`
    Field     string      `json:"field"`
    Operator  string      `json:"operator"`  // equals, contains, greater_than, etc.
    Value     interface{} `json:"value"`
}

type TargetingMatch struct {
    RuleID      string   `json:"rule_id"`
    RuleName    string   `json:"rule_name"`
    Matched     bool     `json:"matched"`
    Conditions  []ConditionMatch `json:"conditions"`
}
```

#### 触发条件类型

| 触发类型 | 说明 | 配置参数 |
|----------|------|----------|
| **paywall_shown** | 付费墙已展示 N 次 | count, max_total |
| **feature_used** | 某功能被使用 | feature_name, count, max_total |
| **screen_viewed** | 访问某页面 | screen_name, count |
| **subscription_expired** | 订阅过期 | grace_period_days |
| **first_session** | 首次会话 | session_number = 1 |
| **returning_user** | 回访用户 | days_since_signup |
| **paywall_dismissed** | 付费墙被关闭 | count |
| **custom_event** | 自定义事件 | event_name, params |

### 4.3 Experiment Framework（A/B 测试框架）

内置实验框架，支持付费墙的对比实验。

```go
// internal/service/experiment.go
type ExperimentService interface {
    // Assign 分配实验分组
    Assign(ctx context.Context, userID string, experimentID string) (*ExperimentAssignment, error)
    
    // Track 记录实验事件
    Track(ctx context.Context, event *ExperimentEvent) error
    
    // Calculate 计算实验结果
    Calculate(ctx context.Context, experimentID string) (*ExperimentResult, error)
}

type Experiment struct {
    ID          string       `json:"id"`
    Name        string       `json:"name"`
    Description string       `json:"description"`
    Status      string       `json:"status"`       // draft, running, paused, completed
    StartAt     time.Time    `json:"start_at"`
    EndAt       *time.Time   `json:"end_at"`
    Variants    []*Variant   `json:"variants"`
    Metrics     []*Metric    `json:"metrics"`
    Targetings  []string     `json:"targetings"`    // 目标用户规则 ID
}

type Variant struct {
    ID          string     `json:"id"`
    Name        string     `json:"name"`          // Control, Variant A, Variant B
    Weight      int        `json:"weight"`         // 分组权重 (e.g., 50/50)
    PaywallID   string     `json:"paywall_id"`    // 该分组使用的付费墙配置
}

type Metric struct {
    ID       string `json:"id"`
    Name     string `json:"name"`    // purchase_count, revenue, conversion_rate
    Currency string `json:"currency"`
    Goal     string `json:"goal"`    // maximize, minimize
}

type ExperimentResult struct {
    ExperimentID   string            `json:"experiment_id"`
    Status         string            `json:"status"`       // running, significance_reached
    Variants       []*VariantResult  `json:"variants"`
    Recommended    string            `json:"recommended"`  // 推荐的分组
    Confidence     float64           `json:"confidence"`   // 置信度
    PValue         float64           `json:"p_value"`
}

type VariantResult struct {
    VariantID      string    `json:"variant_id"`
    Name           string    `json:"name"`
    Users          int       `json:"users"`
    Conversions    int       `json:"conversions"`
    Revenue        int64     `json:"revenue"`
    ConversionRate float64  `json:"conversion_rate"`
}
```

### 4.4 Entitlement Service（权限管理）

管理用户的订阅状态和权限。

```go
// internal/service/entitlement.go
type EntitlementService interface {
    Check(ctx context.Context, userID string, feature string) (bool, error)
    GetStatus(ctx context.Context, userID string) (*EntitlementStatus, error)
    Grant(ctx context.Context, req *GrantRequest) (*Entitlement, error)
    Revoke(ctx context.Context, userID string, planID string) error
    ExpireSubscriptions(ctx context.Context) error
    ProcessSubscriptionRenewal(ctx context.Context, subscriptionID string) error
}

type Entitlement struct {
    ID          string     `json:"id"`
    UserID      string    `json:"user_id"`
    PlanID      string    `json:"plan_id"`
    Status      string    `json:"status"`       // active, expired, cancelled, trial
    TrialEnd    *time.Time `json:"trial_end"`
    ExpiresAt   *time.Time `json:"expires_at"`
    AutoRenew   bool      `json:"auto_renew"`
    CancelledAt  *time.Time `json:"cancelled_at"`
    CreatedAt   time.Time `json:"created_at"`
}

type EntitlementStatus struct {
    UserID         string    `json:"user_id"`
    HasAccess      bool      `json:"has_access"`
    ActivePlans    []string  `json:"active_plans"`
    TrialAvailable bool      `json:"trial_available"`
    GracePeriod    bool      `json:"grace_period"`    // 宽限期
    GracePeriodEnd *time.Time `json:"grace_period_end"`
}
```

### 4.5 Offer Manager（商品管理）

管理商品 Plans 和促销 Offers。

```go
// internal/service/offer.go
type OfferManager interface {
    ListPlans(ctx context.Context, appID string) ([]*Plan, error)
    GetPlan(ctx context.Context, planID string) (*Plan, error)
    CreatePlan(ctx context.Context, plan *Plan) error
    UpdatePlan(ctx context.Context, plan *Plan) error
    
    ListOffers(ctx context.Context, appID string) ([]*Offer, error)
    CalculatePrice(ctx context.Context, planID string, userID string, offerID string) (*PriceInfo, error)
}

type Plan struct {
    ID           string    `json:"id"`
    AppID        string    `json:"app_id"`
    Name         string    `json:"name"`
    Description  string    `json:"description"`
    Price        int64     `json:"price"`
    Currency     string    `json:"currency"`
    Interval     string    `json:"interval"`      // monthly, yearly, lifetime
    TrialDays    int       `json:"trial_days"`
    ProductID    string    `json:"product_id"`    // Hydra-Pay product ID
    Features     []string  `json:"features"`
    SortOrder    int       `json:"sort_order"`
    Status       string    `json:"status"`         // active, inactive
    CreatedAt    time.Time `json:"created_at"`
}

type Offer struct {
    ID           string    `json:"id"`
    AppID        string    `json:"app_id"`
    PlanID       string    `json:"plan_id"`
    Name         string    `json:"name"`
    Type         string    `json:"type"`          // percent_off, fixed_price, free_trial
    Discount     int64     `json:"discount"`       // 折扣值
    Price        int64     `json:"price"`          // 折后价格
    Duration     int       `json:"duration"`       // 持续天数
    MaxRedemptions int     `json:"max_redemptions"`
    Status       string    `json:"status"`
    StartsAt     time.Time `json:"starts_at"`
    EndsAt       time.Time `json:"ends_at"`
}
```

### 4.6 Analytics（数据分析）

内置收入分析和漏斗追踪。

```go
// internal/service/analytics.go
type AnalyticsService interface {
    // TrackEvent 记录事件
    TrackEvent(ctx context.Context, event *UserEvent) error
    
    // GetRevenue 获取收入数据
    GetRevenue(ctx context.Context, req *RevenueRequest) (*RevenueReport, error)
    
    // GetFunnel 获取漏斗数据
    GetFunnel(ctx context.Context, req *FunnelRequest) (*FunnelReport, error)
    
    // GetMetrics 获取实时指标
    GetMetrics(ctx context.Context, appID string) (*RealTimeMetrics, error)
}

type RevenueRequest struct {
    AppID      string    `json:"app_id"`
    StartDate  time.Time `json:"start_date"`
    EndDate    time.Time `json:"end_date"`
    Granularity string   `json:"granularity"`  // daily, weekly, monthly
}

type RevenueReport struct {
    MRR           int64     `json:"mrr"`            // Monthly Recurring Revenue
    ARR           int64     `json:"arr"`
    ARPU          float64   `json:"arpu"`           // Average Revenue Per User
    ChurnRate     float64   `json:"churn_rate"`
    LTV           float64   `json:"ltv"`            // Lifetime Value
    
    NewMRR        int64     `json:"new_mrr"`
    ExpansionMRR  int64     `json:"expansion_mrr"`
    ChurnedMRR    int64     `json:"churned_mrr"`
    
    TimeSeries    []*RevenueDataPoint `json:"time_series"`
}

type FunnelRequest struct {
    AppID      string    `json:"app_id"`
    Steps      []string  `json:"steps"`    // ["paywall_shown", "plan_selected", "purchase_started", "purchase_completed"]
    StartDate  time.Time `json:"start_date"`
    EndDate    time.Time `json:"end_date"`
}

type FunnelReport struct {
    Steps      []*FunnelStep `json:"steps"`
    TotalUsers int           `json:"total_users"`
    Drop-offs  []*DropOff    `json:"drop_offs"`
}

type FunnelStep struct {
    Name       string  `json:"name"`
    Users      int     `json:"users"`
    ConvRate   float64 `json:"conv_rate"`    // 上一步转化率
}
```

### 4.7 Remote Config（远程配置）

运行时热更新付费墙规则，无需发版。

```go
// internal/service/remote_config.go
type RemoteConfigService interface {
    // GetConfig 获取应用配置
    GetConfig(ctx context.Context, appID string) (*AppConfig, error)
    
    // UpdateConfig 更新配置（热更新）
    UpdateConfig(ctx context.Context, appID string, config *AppConfig) error
    
    // FeatureFlag 特性开关
    IsFeatureEnabled(ctx context.Context, appID string, flag string) (bool, error)
}

type AppConfig struct {
    AppID           string           `json:"app_id"`
    Version         int              `json:"version"`     // 配置版本
    PaywallIDs      []string         `json:"paywall_ids"` // 启用的付费墙
    FeatureFlags    map[string]bool  `json:"feature_flags"`
    TargetingRules  []string         `json:"targeting_rules"`
    UpdatedAt       time.Time        `json:"updated_at"`
}
```

---

## 五、开发者后台（wall-admin）

### 5.1 功能模块

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        wall-admin 开发者后台                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐     │
│  │ 📊 数据概览       │  │ 🎨 付费墙编辑器   │  │ 📋 商品管理       │     │
│  │ Dashboard        │  │ Paywall Editor   │  │ Plans & Offers   │     │
│  │                  │  │                  │  │                  │     │
│  │ - MRR / ARR       │  │ - 拖拽编辑       │  │ - 创建 Plans     │     │
│  │ - 转化率趋势      │  │ - 模板选择       │  │ - 配置 Offers    │     │
│  │ - 付费用户数      │  │ - 实时预览       │  │ - 定价策略       │     │
│  │ - 漏斗分析        │  │ - 主题配置       │  │                  │     │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘     │
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐     │
│  │ 🔬 A/B 测试       │  │ ⚡ 规则配置       │  │ ⚙️ 应用设置       │     │
│  │ Experiments       │  │ Rules            │  │ Settings         │     │
│  │                  │  │                  │  │                  │     │
│  │ - 创建实验        │  │ - 触发规则       │  │ - API Keys       │     │
│  │ - 分配分组        │  │ - 目标用户       │  │ - Webhooks      │     │
│  │ - 查看结果        │  │ - 优惠规则       │  │ - 集成设置       │     │
│  │ - 统计显著性      │  │                  │  │                  │     │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 付费墙编辑器（Paywall Editor）

```typescript
// 拖拽编辑器的数据结构
interface PaywallLayout {
  id: string
  name: string
  template: 'standard' | 'minimal' | 'feature_list'
  sections: PaywallSection[]
  theme: ThemeConfig
  strings: LocalizedStrings
}

interface PaywallSection {
  id: string
  type: 'header' | 'plans' | 'features' | 'testimonials' | 'footer'
  order: number
  props: Record<string, any>
}

interface DraggableBlock {
  id: string
  type: string
  label: string
  icon: string
  defaultProps: Record<string, any>
}

// 可拖拽的组件块
const DRAGGABLE_BLOCKS: DraggableBlock[] = [
  { id: 'header', type: 'header', label: '标题区', icon: 'title' },
  { id: 'plan_selector', type: 'plans', label: '商品选择', icon: 'credit_card' },
  { id: 'feature_list', type: 'features', label: '功能列表', icon: 'list' },
  { id: 'testimonial', type: 'testimonials', label: '用户评价', icon: 'quote' },
  { id: 'trial_badge', type: 'trial_badge', label: '试用徽章', icon: 'badge' },
  { id: ' CTA_button', type: 'cta', label: '购买按钮', icon: 'button' },
]
```

### 5.3 实时预览

```
┌─────────────────────────────────────────┐
│  付费墙编辑器                              │
├─────────────────────────────────────────┤
│                                          │
│  ┌─────────────────┐  ┌───────────────┐ │
│  │ 可拖拽组件面板   │  │  实时预览     │ │
│  │                 │  │               │ │
│  │ [标题区]        │  │ ┌───────────┐ │ │
│  │ [商品选择]  ◀───┼──┼─│ 预览窗口  │ │ │
│  │ [功能列表]       │  │ │           │ │ │
│  │ [用户评价]       │  │ │  [标题]   │ │ │
│  │ [试用徽章]       │  │ │           │ │ │
│  │ [购买按钮]       │  │ │ [Plan A]  │ │ │
│  │                 │  │ │ [Plan B]  │ │ │
│  │ ─────────────── │  │ │           │ │ │
│  │  模板:          │  │ │ [购买]    │ │ │
│  │  ○ Standard     │  │ └───────────┘ │ │
│  │  ● Minimal      │  │               │ │
│  │  ○ Feature List │  │  [刷新预览]  │ │
│  └─────────────────┘  └───────────────┘ │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │  属性配置                            │ │
│  │  标题: [Premium 会员]               │ │
│  │  主色调: [#0070f3]                  │ │
│  │  试用期: [7] 天                     │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 六、API 设计

### 6.1 客户端 SDK API

#### 触发付费墙评估

```
POST /v1/apps/{app_id}/evaluate
```

Request:
```json
{
  "user_id": "user_xxxx",
  "user_traits": {
    "email": "user@example.com",
    "signup_date": "2026-01-01",
    "country": "CN",
    "device": "ios"
  },
  "trigger": {
    "type": "feature_used",
    "name": "premium_feature_x",
    "count": 3
  },
  "session_id": "sess_xxxx"
}
```

Response:
```json
{
  "paywall_id": "pw_xxxx",
  "show_paywall": true,
  "config": {
    "template": "standard",
    "theme": { "primary_color": "#0070f3" },
    "plans": [...]
  },
  "experiment": {
    "id": "exp_xxxx",
    "variant": "variant_a"
  }
}
```

#### 获取付费墙配置

```
GET /v1/apps/{app_id}/paywall
```

#### 检查权限

```
POST /v1/entitlements/check
```

### 6.2 管理后台 API

#### 付费墙配置

```
GET/POST /admin/apps/{app_id}/paywalls
GET/PUT/DELETE /admin/apps/{app_id}/paywalls/{paywall_id}
```

#### 实验管理

```
GET/POST /admin/apps/{app_id}/experiments
PUT /admin/apps/{app_id}/experiments/{exp_id}/start
PUT /admin/apps/{app_id}/experiments/{exp_id}/pause
GET /admin/apps/{app_id}/experiments/{exp_id}/results
```

#### 数据分析

```
GET /admin/apps/{app_id}/analytics/revenue
GET /admin/apps/{app_id}/analytics/funnel
GET /admin/apps/{app_id}/analytics/realtime
```

### 6.3 内部 API

#### Hydra-Pay Webhook 回调

```
POST /internal/v1/webhooks/payment
```

```json
{
  "event": "payment.completed",
  "payment_id": "pay_xxxx",
  "channel": "alipay",
  "amount": 9900,
  "user_id": "user_xxxx",
  "plan_id": "plan_monthly"
}
```

---

## 七、数据库设计

### 7.1 Schema

```sql
-- apps 应用表
CREATE TABLE apps (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(32) NOT NULL,
    api_key VARCHAR(128) UNIQUE NOT NULL,
    secret_key VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- plans 商品计划表
CREATE TABLE plans (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    interval VARCHAR(32) NOT NULL,
    trial_days INT DEFAULT 0,
    product_id VARCHAR(64),
    features JSONB DEFAULT '[]',
    sort_order INT DEFAULT 0,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- offers 促销表
CREATE TABLE offers (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    plan_id VARCHAR(32) NOT NULL REFERENCES plans(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL,
    discount INT,
    price INT,
    duration INT,
    max_redemptions INT,
    status VARCHAR(32) DEFAULT 'active',
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- paywall_configs 付费墙配置表
CREATE TABLE paywall_configs (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template VARCHAR(32) DEFAULT 'standard',
    layout JSONB DEFAULT '{}',
    theme JSONB DEFAULT '{}',
    strings JSONB DEFAULT '{}',
    targeting_rules JSONB DEFAULT '[]',
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- entitlements 用户权限表
CREATE TABLE entitlements (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    plan_id VARCHAR(32) NOT NULL REFERENCES plans(id),
    status VARCHAR(32) NOT NULL,
    trial_end TIMESTAMP,
    expires_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, app_id, plan_id)
);

-- user_events 用户事件表
CREATE TABLE user_events (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    event_type VARCHAR(64) NOT NULL,
    event_name VARCHAR(128),
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- experiments 实验表
CREATE TABLE experiments (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) DEFAULT 'draft',
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    variants JSONB NOT NULL,
    metrics JSONB NOT NULL,
    targeting JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- experiment_assignments 实验分组分配记录
CREATE TABLE experiment_assignments (
    id BIGSERIAL PRIMARY KEY,
    experiment_id VARCHAR(32) NOT NULL REFERENCES experiments(id),
    user_id VARCHAR(64) NOT NULL,
    variant_id VARCHAR(32) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(experiment_id, user_id)
);

-- targeting_rules 触发规则表
CREATE TABLE targeting_rules (
    id VARCHAR(32) PRIMARY KEY,
    app_id VARCHAR(32) NOT NULL REFERENCES apps(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    operator VARCHAR(8) DEFAULT 'AND',
    priority INT DEFAULT 0,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_user_events_user_app ON user_events(user_id, app_id);
CREATE INDEX idx_user_events_type ON user_events(event_type, event_name);
CREATE INDEX idx_user_events_created ON user_events(created_at);
CREATE INDEX idx_entitlements_user_app ON entitlements(user_id, app_id);
CREATE INDEX idx_entitlements_expires ON entitlements(expires_at) WHERE status = 'active';
CREATE INDEX idx_experiments_app ON experiments(app_id);
CREATE INDEX idx_experiment_assignments_user ON experiment_assignments(user_id);
```

### 7.2 Redis 缓存设计

```
# 用户权限缓存 (TTL: 5分钟)
wall:entitlement:{app_id}:{user_id} -> EntitlementStatus JSON

# 付费墙配置缓存 (TTL: 5分钟)
wall:paywall:{app_id}:{paywall_id} -> PaywallConfig JSON

# 实验分配缓存 (TTL: 24小时)
wall:experiment:{exp_id}:{user_id} -> VariantID

# 用户特征缓存 (TTL: 10分钟)
wall:user_traits:{app_id}:{user_id} -> UserTraits JSON

# 应用配置缓存 (TTL: 1分钟)
wall:config:{app_id} -> AppConfig JSON
```

---

## 八、客户端 SDK 设计

### 8.1 全托管模式（推荐）

```typescript
import { HydraWall } from '@hydra/wall-sdk';

const wall = new HydraWall({ appId: 'your_app_id' });

// 触发付费墙评估
const result = await wall.evaluate({
  userId: 'user_123',
  userTraits: {
    email: 'user@example.com',
    signupDate: '2026-01-01',
    country: 'CN'
  },
  trigger: {
    type: 'feature_used',
    name: 'premium_editor',
    count: 5
  }
});

// 如果应该展示付费墙，显示托管页面
if (result.showPaywall) {
  await wall.redirectToPaywall({
    sessionId: result.sessionId,
    paywallId: result.paywallId,
    successUrl: 'https://yourapp.com/purchase/success',
    cancelUrl: 'https://yourapp.com/pricing'
  });
}
```

### 8.2 嵌入式 SDK

```typescript
import { HydraWall } from '@hydra/wall-sdk';

const wall = new HydraWall({ appId: 'your_app_id' });

// 嵌入付费墙组件
wall.mountPaywall({
  container: '#paywall-container',
  userId: 'user_123',
  trigger: { type: 'paywall_shown', name: 'settings', count: 0 },
  onPurchaseInit: async (planId) => {
    const payment = await wall.createPayment({ planId });
    return payment;
  },
  onPurchaseComplete: (result) => {
    console.log('Purchase complete:', result);
  }
});
```

### 8.3 权限检查

```typescript
const status = await wall.checkEntitlement({
  userId: 'user_123',
  feature: 'premium_content'
});

if (status.hasAccess) {
  // 显示高级功能
} else if (status.trialAvailable) {
  // 显示试用提示
} else {
  // 显示付费墙
}
```

---

## 九、事件追踪

### 9.1 核心事件

| 事件名 | 触发时机 | 属性 |
|--------|----------|------|
| `paywall_shown` | 付费墙展示 | paywall_id, plan_count, trigger_type |
| `plan_selected` | 选择商品 | plan_id, price |
| `purchase_started` | 开始购买流程 | plan_id, channel |
| `purchase_completed` | 购买完成 | plan_id, channel, revenue |
| `purchase_failed` | 购买失败 | plan_id, channel, error |
| `paywall_dismissed` | 关闭付费墙 | paywall_id, dismiss_type |
| `feature_used` | 功能使用 | feature_name, usage_count |
| `subscription_renewed` | 订阅续费 | plan_id, amount |
| `subscription_cancelled` | 订阅取消 | plan_id, cancellation_reason |
| `trial_started` | 试用开始 | plan_id, trial_days |
| `trial_converted` | 试用转化 | plan_id |

### 9.2 事件追踪 SDK

```typescript
// 自动追踪关键事件
wall.track('paywall_shown', {
  paywall_id: result.paywallId,
  plan_count: result.config.plans.length,
  trigger: trigger.type
});

// 手动追踪自定义事件
wall.track('level_completed', {
  level: 10,
  score: 5000
});
```

---

## 十、安全设计

### 10.1 鉴权机制

```go
type SignatureValidator struct {
    secretKey []byte
}

func (v *SignatureValidator) Validate(req *http.Request) error {
    sig := req.Header.Get("X-Hydra-Signature")
    timestamp := req.Header.Get("X-Hydra-Timestamp")
    
    if time.Since(parseTimestamp(timestamp)) > 5*time.Minute {
        return errors.New("timestamp expired")
    }
    
    expectedSig := v.computeSignature(req, timestamp)
    if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
        return errors.New("invalid signature")
    }
    
    return nil
}
```

### 10.2 限流策略

```yaml
rate_limit:
  default: 100/minute
  per_app:
    free: 50/minute
    pro: 500/minute
  endpoints:
    /v1/evaluate: 100/minute
    /v1/entitlements: 200/minute
    /admin: 30/minute
```

---

## 十一、部署架构

### 11.1 容器化部署

```yaml
version: '3.8'

services:
  wall-service:
    build: ./wall-service
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:5432/hydra_wall
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  wall-frontend:
    build: ./wall-frontend
    ports:
      - "3000:80"

  wall-admin:
    build: ./wall-admin
    ports:
      - "3001:80"
    environment:
      - API_BASE_URL=http://wall-service:8080

  postgres:
    image: postgres:15-alpine
    volumes:
      - wall-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
```

### 11.2 生产环境架构

```
                          ┌─────────────────┐
                          │   Cloudflare   │
                          └────────┬────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
          ┌─────────────────┐          ┌─────────────────┐
          │  wall-admin     │          │   API Gateway   │
          │  (Vercel/CDN)   │          │   (Kong)       │
          └─────────────────┘          └────────┬────────┘
                                               │
                    ┌──────────────────────────┴─────────────────┐
                    ▼                                              ▼
          ┌─────────────────┐                            ┌─────────────────┐
          │  wall-service   │◄───────────────────────────│  wall-service   │
          └────────┬────────┘                            └────────┬────────┘
                   │                                              │
         ┌─────────┴─────────┐                        ┌──────────┴──────────┐
         ▼                   ▼                        ▼                     ▼
┌───────────────┐   ┌───────────────┐        ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │   │     Redis     │        │  PostgreSQL   │    │     Redis     │
│  (Primary)    │   │  (Cluster)    │        │  (Standby)    │    │  (Cluster)    │
└───────────────┘   └───────────────┘        └───────────────┘    └───────────────┘
```

---

## 十二、监控与可观测性

### 12.1 关键指标

| 指标 | 描述 | 告警阈值 |
|------|------|----------|
| paywall_show_rate | 付费墙展示率 | < 30% |
| purchase_conversion_rate | 购买转化率 | < 3% |
| trial_conversion_rate | 试用转化率 | < 15% |
| entitlement_error_rate | 权限服务错误率 | > 0.1% |
| experiment_significance | 实验达成统计显著性 | < 95% confidence |
| api_latency_p99 | API P99 延迟 | > 300ms |

### 12.2 实时监控面板

- **收入指标**：MRR, ARR, New MRR, Churned MRR
- **用户漏斗**：paywall_shown → plan_selected → purchase_started → purchase_completed
- **实验结果**：各分组转化率、置信度、推荐分组
- **实时事件**：最新事件流、异常检测

---

## 十三、路线图

### Phase 1: MVP (4-6 周)

- [ ] 基础 wall-service + wall-frontend
- [ ] 基本 Entitlement Service
- [ ] Web SDK + 全托管付费墙页面
- [ ] 基本 PostgreSQL + Redis

### Phase 2: 开发者工具 (4 周)

- [ ] wall-admin 基础框架
- [ ] 付费墙编辑器（拖拽）
- [ ] Plans & Offers 管理
- [ ] 事件追踪 SDK

### Phase 3: 高级变现 (4 周)

- [ ] A/B 测试框架
- [ ] Targeting Engine（行为触发）
- [ ] Revenue Analytics（收入分析）
- [ ] Remote Config（远程配置）

### Phase 4: 多平台 SDK (4 周)

- [ ] iOS SDK
- [ ] Android SDK
- [ ] Flutter SDK
- [ ] Unity SDK

### Phase 5: Enterprise (4 周)

- [ ] 自定义域名
- [ ] 白标功能
- [ ] 私有化部署
- [ ] 高级权限管理