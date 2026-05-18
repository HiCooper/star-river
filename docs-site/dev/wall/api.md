# Wall API 参考

Hydra-Wall 提供 RESTful API 供客户端 SDK 和服务端调用。

## 基础信息

| 项目 | 说明 |
|------|------|
| 基础 URL | `https://api.hydra.com/v1/wall` |
| 认证方式 | API Key (`X-API-Key` header) |
| 响应格式 | JSON |

## 认证

所有请求需要包含 API Key：

```http
GET /v1/wall/config
X-API-Key: your_api_key_here
```

## 接口列表

### 获取付费墙配置

获取指定用户的付费墙展示配置。

```http
GET /v1/wall/config
```

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 是 | 用户唯一标识 |
| `device_type` | string | 是 | `ios` / `android` / `web` |
| `app_id` | string | 是 | 应用 ID |
| `page_type` | string | 否 | 页面类型，如 `article`、`video` |
| `experiment_id` | string | 否 | 强制指定实验 ID |

**响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "should_show": true,
    "paywall_version": "v2",
    "paywall_type": "metered",
    "config": {
      "title": "解锁全部内容",
      "description": "订阅 Premium 会员",
      "cta_text": "立即订阅",
      "price": "¥9.9/月",
      "features": [
        "无限制访问",
        "去除广告",
        "专属客服"
      ]
    },
    "experiment": {
      "id": "exp_123",
      "variant": "B"
    },
    "entitlement": {
      "is_subscribed": false,
      "remaining_views": 2
    }
  }
}
```

### 上报事件

上报用户行为事件。

```http
POST /v1/wall/events
Content-Type: application/json
```

**请求体**

```json
{
  "user_id": "user_456",
  "app_id": "app_abc",
  "event_name": "page_view",
  "event_properties": {
    "page_type": "article",
    "page_id": "article_789",
    "scroll_depth": 45
  },
  "timestamp": "2024-12-18T10:30:00Z"
}
```

**事件名称**

| 事件名 | 说明 | 必需属性 |
|--------|------|---------|
| `page_view` | 页面浏览 | `page_type`, `page_id` |
| `scroll_depth` | 滚动深度 | `depth` (0-100) |
| `time_on_page` | 页面停留 | `seconds` |
| `cta_click` | CTA 点击 | `cta_id` |
| `paywall_view` | 付费墙展示 | `paywall_version` |
| `paywall_click` | 付费墙点击 | `paywall_version` |
| `checkout_start` | 进入结算 | `paywall_version` |

### 验证权限

服务端调用，验证用户是否有权访问特定内容。

```http
GET /v1/wall/entitlement/{user_id}
```

**响应示例**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user_id": "user_456",
    "is_subscribed": true,
    "subscription": {
      "plan_id": "premium_monthly",
      "status": "active",
      "expire_at": "2025-01-18T10:30:00Z"
    },
    "features": ["all_content", "no_ads", "priority_support"]
  }
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| `0` | 成功 |
| `10001` | 参数错误 |
| `10002` | 认证失败 |
| `10003` | 用户不存在 |
| `20001` | 服务内部错误 |

## 限流

| 端点 | 限制 |
|------|------|
| `/v1/wall/config` | 1000 RPM |
| `/v1/wall/events` | 5000 RPM |
