# 付费墙配置

## 概述

Hydra-Wall 提供可视化编辑器配置付费墙的外观和行为。付费墙配置存储在 `paywall_configs` 表中。

## 配置结构

```typescript
interface PaywallConfig {
  id: string;
  name: string;
  template: 'standard' | 'minimal' | 'feature_list';
  layout: PaywallLayout;
  theme: ThemeConfig;
  rules: TargetingRule[];
}
```

## 模板类型

| 模板 | 说明 | 适用场景 |
|------|------|----------|
| `standard` | 标准模板，展示商品卡片 + 特性列表 | 大多数 App |
| `minimal` | 极简模板，只展示核心信息 | 追求简洁的产品 |
| `feature_list` | 功能列表模板，列出所有解锁功能 | 强调功能差异 |

## 主题配置

```typescript
interface ThemeConfig {
  primaryColor: string;      // 主色调，如 '#0070f3'
  backgroundColor: string;    // 背景色
  fontFamily: string;         // 字体
  borderRadius: number;       // 圆角
  buttonStyle: 'filled' | 'outlined';
}
```

## 示例配置

```json
{
  "id": "pw_xxxx",
  "name": "Premium Paywall",
  "template": "standard",
  "theme": {
    "primaryColor": "#0070f3",
    "backgroundColor": "#ffffff",
    "fontFamily": "Inter",
    "borderRadius": 12,
    "buttonStyle": "filled"
  },
  "layout": {
    "header": {
      "title": "升级 Premium",
      "subtitle": "解锁所有高级功能"
    },
    "plans": [
      {
        "id": "monthly",
        "name": "月费会员",
        "price": 9900,
        "originalPrice": 12900,
        "interval": "monthly"
      },
      {
        "id": "yearly",
        "name": "年费会员",
        "price": 99000,
        "originalPrice": 155000,
        "interval": "yearly",
        "badge": "推荐"
      }
    ],
    "features": [
      { "text": "无广告体验", "included": true },
      { "text": "高级数据分析", "included": true },
      { "text": "优先客服支持", "included": true }
    ]
  }
}
```

## 通过 API 管理配置

### 获取付费墙配置

```
GET /v1/apps/{app_id}/paywall
```

### 更新付费墙配置

```
PUT /v1/apps/{app_id}/paywall/{paywall_id}
```

```json
{
  "name": "New Paywall",
  "template": "minimal",
  "theme": {
    "primaryColor": "#1e293b"
  }
}
```

## 下一步

- [行为触发规则](/guide/wall/behavioral-targeting)
- [A/B 测试](/guide/wall/ab-testing)
