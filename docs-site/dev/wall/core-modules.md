# 核心模块

Hydra-Wall 包含多个核心模块协同工作，提供完整的付费墙能力。

## 模块概览

```
hydra-wall
├── paywall-engine          # 付费墙渲染和决策核心
├── entitlement-service      # 用户权限管理
├── targeting-engine        # 行为定向
├── experiment-framework    # A/B 实验框架
├── remote-config           # 远程配置
├── analytics-service       # 数据分析
└── wall-admin              # 管理后台
```

## Paywall Engine

付费墙引擎是系统的核心，负责决策和渲染。

### 核心职责

1. **规则评估**: 根据用户属性、行为、实验分组评估展示策略
2. **版本选择**: 从多个付费墙版本中选择最佳展示
3. **渲染输出**: 生成客户端可解析的付费墙配置

### 决策流程

```
请求进来 → 检查缓存 → 规则匹配 → 实验分组 → 选择版本 → 返回配置
```

### 缓存策略

| 数据类型 | 缓存位置 | TTL |
|---------|---------|-----|
| 用户权限 | Redis | 5 分钟 |
| 实验分组 | Redis | 与实验共存 |
| 付费墙配置 | Redis | 1 分钟 |

## Entitlement Service

用户权限管理，确保正确的人看正确的内容。

### 核心功能

- **权限查询**: `CheckEntitlement(userID, feature)` → bool
- **权限授予**: 支付成功后自动授予
- **权限撤销**: 订阅过期后自动撤销
- **权限验证**: 内容访问时的权限校验

### 订阅状态

| 状态 | 说明 |
|------|------|
| `active` | 有效订阅 |
| `expired` | 已过期 |
| `cancelled` | 已取消（到期后失效） |
| `trial` | 试用中 |
| `refunded` | 已退款（权限立即撤销） |

### 与支付服务交互

Entitlement Service 监听来自 hydra-pay 的 webhook 通知：

```
支付成功 → webhook → entitlement-service → 更新用户权限
```

## Targeting Engine

行为定向引擎，根据用户行为决定展示策略。

### 行为事件

| 事件 | 触发时机 |
|------|---------|
| `page_view` | 用户访问内容页 |
| `scroll_depth` | 滚动深度达到阈值 |
| `time_on_page` | 页面停留时间 |
| `cta_click` | 点击了 CTA 按钮 |
| `search_query` | 用户发起搜索 |
| `add_to_cart` | 将内容加入待购 |

### 定向条件

支持多种定向条件的组合：

```yaml
targeting:
  - condition: scroll_depth >= 70%
    action: show_paywall  # 滚动70%后展示付费墙
  - condition: time_on_page >= 120s AND returning_user
    action: show_paywall  # 老用户停留120秒后展示
  - condition: search_count >= 3
    action: show_banner   # 搜索3次后展示Banner
```

### 实时计算 vs 批量计算

| 模式 | 适用场景 | 延迟 |
|------|---------|-----|
| 实时计算 | 关键行为触发 | < 100ms |
| 批量计算 | 用户画像构建 | 分钟级 |

## Experiment Framework

A/B 实验框架，支持流量分割和效果统计。

### 分桶算法

使用一致性哈希保证用户每次请求都落在同一桶：

```go
bucket := crc32.ChecksumIEEE([]byte(userID + experimentID)) % 100
```

### 分桶配置

| 分组 | 流量占比 | 说明 |
|------|---------|------|
| Control (A) | 50% | 原版付费墙 |
| Variant (B) | 50% | 新版付费墙 |

### 实验约束

- 一个用户同时只能在一个实验的某个变体中
- 实验应该设置终止条件（时间/样本量）
- 避免同时运行相同目标的多个实验

## Remote Config

远程配置支持热更新，无需发版即可修改规则。

### 配置类型

| 类型 | 示例 | 更新频率 |
|------|------|---------|
| 付费墙规则 | 触发条件、版本内容 | 实时 |
| 功能开关 | 是否启用某功能 | 实时 |
| 灰度发布 | 特定用户群配置 | 按需 |

### 版本管理

- 支持回滚到任意历史版本
- 变更记录完整审计
- 支持蓝绿发布

## Analytics Service

数据分析服务，收集和处理各模块数据。

### 事件类型

| 事件类别 | 示例事件 |
|---------|---------|
| 曝光事件 | `paywall_view`, `banner_view` |
| 交互事件 | `paywall_click`, `cta_click` |
| 转化事件 | `checkout_start`, `payment_success` |
| 实验事件 | `experiment_exposed`, `variant_assigned` |

### 数据管道

```
客户端 SDK → Analytics Service → Kafka → 消费处理 → PostgreSQL / 导出
```

## Wall-Admin

管理后台，提供可视化配置界面。

### 功能模块

- **实验管理**: 创建、修改、终止 A/B 实验
- **付费墙配置**: 编辑付费墙内容、样式、触发规则
- **数据看板**: 查看实验数据和转化漏斗
- **用户管理**: 查询用户权限和订阅状态

### 权限控制

| 角色 | 权限范围 |
|------|---------|
| Admin | 全部功能 |
| Operator | 运营相关（配置、实验） |
| Analyst | 只读（数据看板） |
