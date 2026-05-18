# Hydra-Wall 产品介绍

## 什么是 Hydra-Wall

Hydra-Wall 是一套自建的付费墙服务，类比 Superwall，旨在帮助开发者以极低研发成本快速实现付费功能。

## 核心功能

### 1. 托管付费墙页面

提供完整的付费墙托管页面，接入方无需自建 UI：

```typescript
// 一行代码跳转托管付费墙
await hydra.wall.redirectToPaywall({
  planId: 'monthly_premium',
  successUrl: 'https://myapp.com/success'
});
```

### 2. 可视化编辑器

通过开发者后台配置付费墙外观和行为：

- 拖拽式页面布局
- 实时预览
- 多种模板选择
- 主题定制

### 3. 行为触发引擎

基于用户行为决定何时展示付费墙：

| 触发类型 | 说明 |
|----------|------|
| `feature_used` | 某功能被使用 N 次 |
| `paywall_shown` | 付费墙已展示 N 次 |
| `screen_viewed` | 访问某页面 N 次 |
| `returning_user` | 回访用户 |
| `subscription_expired` | 订阅过期 |

### 4. A/B 测试

内置实验框架，支持：

- 多分组对比
- 转化率统计
- 统计显著性计算
- 自动推荐最优分组

### 5. 权限管理

管理用户的订阅状态和权限：

```typescript
const status = await hydra.wall.checkEntitlement({
  feature: 'premium_content'
});

if (status.hasAccess) {
  // 显示 Premium 功能
} else if (status.trialAvailable) {
  // 显示试用入口
}
```

### 6. 收入分析

实时监控收入数据：

- MRR/ARR
- 转化率趋势
- 漏斗分析
- 用户留存

## 产品优势

| 优势 | 说明 |
|------|------|
| 降低研发成本 | 无需自建付费墙 UI |
| 提升转化率 | A/B 测试 + 行为触发优化 |
| 快速迭代 | 支持热更新的远程配置 |
| 数据驱动 | 内置收入分析和漏斗追踪 |

## 下一步

- [付费墙配置](/guide/wall/paywall-config)
- [行为触发规则](/guide/wall/behavioral-targeting)
- [A/B 测试](/guide/wall/ab-testing)
- [Hydra-Wall 技术架构](/dev/wall/service-architecture)
