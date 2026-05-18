# A/B 测试

## 概述

Hydra-Wall 内置 A/B 测试框架，支持对付费墙的不同设计方案进行对比实验，找出最优方案提升转化率。

## 核心概念

| 概念 | 说明 |
|------|------|
| **Experiment** | 实验，包含多个 Variant |
| **Variant** | 分组，如 Control（对照组）、Variant A（变体 A） |
| **Metric** | 指标，如转化率、收入 |
| **Assignment** | 用户被分配到的分组 |

## 创建实验

```typescript
interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  metrics: Metric[];
  targeting: string[];  // 目标用户规则 ID
}

interface Variant {
  id: string;
  name: string;           // Control, Variant A, Variant B
  weight: number;          // 分组权重，如 50 表示 50%
  paywallId: string;       // 该分组使用的付费墙配置
}

interface Metric {
  id: string;
  name: 'purchase_count' | 'revenue' | 'conversion_rate';
  goal: 'maximize' | 'minimize';
}
```

## 实验示例

### 付费墙 A/B 测试

```json
{
  "name": "Paywall CTA Test",
  "description": "测试不同按钮文案的转化率",
  "status": "running",
  "variants": [
    {
      "id": "control",
      "name": "Control",
      "weight": 50,
      "paywallId": "pw_control"
    },
    {
      "id": "variant_a",
      "name": "Variant A",
      "weight": 50,
      "paywallId": "pw_variant_a"
    }
  ],
  "metrics": [
    { "name": "conversion_rate", "goal": "maximize" }
  ],
  "targeting": []
}
```

## SDK 使用

### 触发实验分配

```typescript
// SDK 自动处理实验分配
const result = await hydra.wall.evaluate({
  userId: 'user_123',
  trigger: { type: 'feature_used', name: 'premium_editor', count: 5 }
});

// result 中包含实验分组信息
console.log(result.experiment);
// { id: 'exp_xxxx', variant: 'variant_a' }
```

### 追踪实验事件

```typescript
// 追踪转化事件
hydra.wall.trackExperimentEvent({
  experimentId: 'exp_xxxx',
  variantId: 'variant_a',
  eventName: 'purchase_completed',
  revenue: 9900
});
```

## 统计分析

### 关键指标

| 指标 | 说明 |
|------|------|
| **Users** | 各分组用户数 |
| **Conversions** | 各分组转化次数 |
| **Conversion Rate** | 转化率 = 转化次数 / 用户数 |
| **P-Value** | 统计显著性，越小越好 |
| **Confidence** | 置信度，通常 > 95% 才认为显著 |

### 统计显著性判断

通常采用 95% 置信度：
- P-Value < 0.05 认为差异显著
- 推荐转化率更高的分组

## 最佳实践

1. **一次只测试一个变量** - 避免多变量互相干扰
2. **保证足够的样本量** - 通常每组需要 1000+ 用户
3. **设置实验期限** - 避免无限期运行
4. **记录所有相关事件** - 包括展示、点击、转化

## 下一步

- [收入分析](/guide/analytics/dashboard)
- [核心模块设计](/dev/wall/core-modules)
