# Hydra-Wall MVP 开发计划

## 概览

| 项目 | 说明 |
|------|------|
| 目标 | 完成 Hydra-Wall MVP 版本，具备与 Superwall 基础功能对标能力 |
| 预计工期 | **12 周** |
| 团队规模 | 后端 2 人 + 前端 2 人 + 移动 SDK 1 人 |
| 交付物 | wall-service 后端、wall-admin 管理后台、客户端 SDK (iOS/Android) |

---

## 第一阶段：基础设施 (Week 1-2)

### Week 1: 项目初始化

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| Go 项目脚手架 | backend | wall-service 代码结构 | - |
| React 项目脚手架 | frontend | wall-admin 代码结构 | - |
| PostgreSQL Schema 设计 | backend | 完整 ER 图 + DDL | - |
| Redis 缓存设计 | backend | 缓存策略文档 | - |
| CI/CD 流程搭建 | devops | GitHub Actions 配置 | 代码仓库 |

### Week 2: 核心 API 框架

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| API Router 搭建 | backend | RESTful API 路由 | Week 1 |
| 认证中间件 | backend | JWT 鉴权 | Week 1 |
| 数据库连接层 | backend | GORM 配置 | Week 1 |
| 错误处理封装 | backend | 统一错误码 | Week 1 |
| App CRUD | backend | App 管理 API | Week 1 |

**DB Schema 核心表**:

```sql
-- Apps
CREATE TABLE apps (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50),
  api_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES apps(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'inactive',
  created_at TIMESTAMP
);

-- Placements
CREATE TABLE placements (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  event_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP
);

-- Audiences
CREATE TABLE audiences (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  name VARCHAR(255),
  filters JSONB,
  sort_order INT,
  created_at TIMESTAMP
);

-- Paywalls
CREATE TABLE paywalls (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES apps(id),
  name VARCHAR(255),
  template VARCHAR(100),
  config JSONB,
  feature_gating VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Audience-Paywall Mapping (with percentage)
CREATE TABLE audience_paywalls (
  id UUID PRIMARY KEY,
  audience_id UUID REFERENCES audiences(id),
  paywall_id UUID REFERENCES paywalls(id),
  percentage INT DEFAULT 100
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  app_id UUID REFERENCES apps(id),
  paywall_id UUID REFERENCES paywalls(id),
  placement VARCHAR(255),
  product_id VARCHAR(255),
  revenue DECIMAL(10,2),
  currency VARCHAR(10),
  status VARCHAR(50),
  created_at TIMESTAMP
);
```

---

## 第二阶段：服务端核心 (Week 3-5)

### Week 3: Campaign & Placement API

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| Campaign CRUD API | backend | 增删改查 + 状态切换 | Week 2 |
| Placement API | backend | Placement 绑定到 Campaign | Week 2 |
| Audience API | backend | Audience 创建/更新/排序 | Week 2 |
| Paywall API | backend | Paywall 增删改查 | Week 2 |

### Week 4: 付费墙引擎核心

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| Audience 过滤引擎 | backend | 支持多条件组合 | Week 3 |
| Experiment 路由 | backend | 流量分配逻辑 | Week 3 |
| Paywall 配置返回 | backend | 返回完整 Paywall 配置 | Week 3 |
| Feature Gating 逻辑 | backend | Gated/Non-Gated | Week 3 |

**Placement 评估流程**:

```go
func (e *PaywallEngine) Evaluate(placement string, user *UserContext) (*PaywallDecision, error) {
  // 1. 获取该 placement 所属 Campaign
  campaign := e.getCampaignByPlacement(placement)
  if campaign == nil {
    return &PaywallDecision{Action: "execute_feature"}, nil
  }

  // 2. 按顺序评估 Audiences
  for _, audience := range campaign.Audiences {
    if e.matchesAudience(user, audience) {
      // 3. 在 Audience 内按百分比选 Paywall
      paywall := e.selectPaywall(audience)
      return &PaywallDecision{
        Action:      "show_paywall",
        Paywall:     paywall,
        FeatureGate: paywall.FeatureGating,
      }, nil
    }
  }

  // 4. 无匹配 Audience，执行功能
  return &PaywallDecision{Action: "execute_feature"}, nil
}
```

### Week 5: 事件 & 分析

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| 事件上报 API | backend | 付费墙展示/点击/购买事件 | Week 4 |
| Transaction 记录 | backend | 交易记录写入 | Week 4 |
| Analytics 数据聚合 | backend | 基础统计指标 | Week 4 |
| Redis 队列 | backend | 异步事件处理 | Week 4 |

---

## 第三阶段：管理后台 (Week 6-8)

### Week 6: 基础管理界面

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| App 列表/创建 | frontend | App 管理页面 | Week 2 |
| Campaign 列表/详情 | frontend | Campaign 管理 | Week 5 |
| Audience 可视化编辑器 | frontend | 条件组合 UI | Week 5 |
| Paywall 列表 | frontend | Paywall 列表页 | Week 5 |

### Week 7: 付费墙编辑器

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| 模板选择器 | frontend | 5 个模板预览 | Week 6 |
| 可视化编辑器 | frontend | 拖拽/编辑组件 | Week 6 |
| 实时预览 | frontend | 设备模拟器 | Week 6 |
| 商品关联 | frontend | 关联 Hydra-Pay 商品 | Week 6 |

**编辑器组件**:

| 组件 | 可配置项 |
|------|----------|
| TextBlock | 标题、副标题、描述文字 |
| ImageBlock | Logo、背景图 |
| FeatureList | 功能点列表 |
| PricingBlock | 商品价格显示 |
| CTAButton | 按钮文字、颜色 |
| TermsBlock | 隐私政策、恢复购买 |

### Week 8: 数据分析 Dashboard

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| Overview 指标卡 | frontend | 用户/展示/转化/收入 | Week 5 |
| Campaign 报表 | frontend | 按 Campaign 查看数据 | Week 5 |
| 时间筛选器 | frontend | 7d/30d/自定义 | Week 5 |
| Recent Transactions | frontend | 最近交易列表 | Week 5 |

---

## 第四阶段：客户端 SDK (Week 9-10)

### Week 9: iOS SDK

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| SDK 初始化 | mobile | `HydraWall.configure()` | Week 2 |
| 用户身份管理 | mobile | `identify()` / `reset()` | Week 2 |
| Placement 注册 | mobile | `register()` 实现 | Week 4 |
| 订阅状态获取 | mobile | entitlement 检查 | Week 4 |
| 本地缓存 | mobile | 配置缓存逻辑 | Week 4 |

**iOS SDK 接口**:

```swift
// 配置
HydraWall.configure(apiKey: "hw_xxx", options: nil)

// 用户身份
HydraWall.shared.identify(userId: "user_123")
HydraWall.shared.setUserAttributes(["plan": "free"])
HydraWall.shared.reset()

// 注册 Placement
HydraWall.shared.register(placement: "premium_feature") {
  // Feature code here
}

// 订阅状态
let info = HydraWall.shared.customerInfo
```

### Week 10: Android SDK + Web SDK

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| Android SDK | mobile | Kotlin SDK | Week 9 |
| Web SDK | mobile | JavaScript SDK | Week 9 |
| SDK 文档 | mobile | 集成指南 | Week 9 |

---

## 第五阶段：集成 & 测试 (Week 11-12)

### Week 11: Hydra-Pay 集成

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| 商品同步 | backend | 从 Hydra-Pay 获取商品 | Week 4 |
| 购买回调 | backend | 订阅状态更新 | Week 4 |
| Webhook 处理 | backend | 订阅事件监听 | Week 4 |

### Week 12: 端到端测试 & 优化

| 任务 | 负责人 | 交付物 | 依赖 |
|------|--------|--------|------|
| 集成测试 | all | iOS + Android 完整流程 | Week 10 |
| 性能测试 | backend | 压测付费墙渲染 | Week 4 |
| Bug 修复 | all | 修复发现的问题 | Week 11 |
| 文档完善 | all | API 文档 + 集成指南 | Week 10 |

---

## 里程碑

| 里程碑 | 日期 | 交付内容 |
|--------|------|----------|
| M1 基础设施 | Week 2 末 | DB Schema、API 框架、CI/CD |
| M2 核心服务 | Week 5 末 | Campaign/Placement/Audience API、付费墙引擎 |
| M3 管理后台 | Week 8 末 | 付费墙编辑器、数据分析 |
| M4 客户端 SDK | Week 10 末 | iOS/Android SDK |
| M5 MVP 完成 | Week 12 末 | 端到端可用、文档完善 |

---

## 团队分工

| 角色 | 人员 | 主要职责 |
|------|------|----------|
| Backend Lead | Developer A | wall-service 架构、付费墙引擎 |
| Backend Dev | Developer B | API 开发、数据分析、Redis |
| Frontend Lead | Developer C | wall-admin 架构、编辑器 |
| Frontend Dev | Developer D | 组件开发、Dashboard |
| Mobile SDK | Developer E | iOS/Android/Web SDK |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 付费墙编辑器复杂度高 | 时间延迟 | Week 6 集中开发，使用现有组件库 |
| SDK 平台兼容性 | 质量问题 | 使用跨平台框架 (Swift/Kotlin) |
| Hydra-Pay 集成依赖 | 阻塞 | 预留 1 周 buffer，同时推进 |
| A/B 测试统计准确性 | 业务影响 | MVP 阶段先不做，v2.0 实现 |

---

## 后续迭代计划

### v2.0 (MVP 后 4 周)
- A/B Testing 框架
- Web Paywalls (Stripe 集成)
- Deep Links

### v3.0 (MVP 后 8 周)
- AI Localization
- Demand Score 定价
- Flows 多步流程
