# 行为触发

## 概述

行为触发（Behavioral Targeting）引擎根据用户的行为和属性，决定何时向用户展示付费墙。通过精准触发时机提升转化率。

## 触发流程

```
用户行为事件
    │
    ▼
Targeting Engine 评估
    │
    ▼
匹配触发规则
    │
    ▼
决定是否展示付费墙
```

## 触发类型

| 触发类型 | 说明 | 配置参数 |
|----------|------|----------|
| `paywall_shown` | 付费墙已展示次数 | `count`, `max_total` |
| `feature_used` | 某功能被使用次数 | `feature_name`, `count`, `max_total` |
| `screen_viewed` | 访问某页面次数 | `screen_name`, `count` |
| `returning_user` | 回访用户 | `days_since_signup`, `min_days` |
| `subscription_expired` | 订阅过期 | `grace_period_days` |
| `first_session` | 首次会话 | `session_number = 1` |
| `paywall_dismissed` | 付费墙被关闭 | `count` |
| `custom_event` | 自定义事件 | `event_name`, `params` |

## 触发规则配置

```typescript
interface TargetingRule {
  id: string;
  name: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
  priority: number;
}

interface Condition {
  type: 'trigger' | 'user_trait' | 'subscription_status';
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}
```

## 配置示例

### 示例 1：用户使用某功能 5 次后展示付费墙

```json
{
  "name": "Feature Usage Trigger",
  "conditions": [
    {
      "type": "trigger",
      "field": "feature_used",
      "operator": "greater_than",
      "value": { "feature_name": "premium_editor", "count": 4 }
    }
  ],
  "operator": "AND",
  "priority": 100
}
```

### 示例 2：回访用户且订阅过期

```json
{
  "name": "Returning Expired User",
  "conditions": [
    {
      "type": "trigger",
      "field": "returning_user",
      "operator": "greater_than",
      "value": { "days_since_signup": 7 }
    },
    {
      "type": "trigger",
      "field": "subscription_expired",
      "operator": "equals",
      "value": true
    }
  ],
  "operator": "AND",
  "priority": 200
}
```

## SDK 使用

### 触发付费墙评估

```typescript
const result = await hydra.wall.evaluate({
  userId: 'user_123',
  userTraits: {
    signupDate: '2026-01-01',
    country: 'CN'
  },
  trigger: {
    type: 'feature_used',
    name: 'premium_editor',
    count: 5
  }
});

if (result.showPaywall) {
  await hydra.wall.redirectToPaywall({ ... });
}
```

### 自定义事件追踪

```typescript
// 追踪自定义事件
hydra.wall.track('level_completed', {
  level: 10,
  score: 5000
});
```

## 最佳实践

1. **不要过度打扰用户** - 设置合理的触发阈值
2. **结合试用期** - 用户试用期快结束时再展示付费墙
3. **A/B 测试触发规则** - 测试不同触发策略的转化率
4. **记录用户反馈** - 追踪 `paywall_dismissed` 事件优化策略

## 下一步

- [A/B 测试](/guide/wall/ab-testing)
- [核心模块设计](/dev/wall/core-modules)
