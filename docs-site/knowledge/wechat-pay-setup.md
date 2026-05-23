# 微信支付接入准备

本文档记录 hydra-pay 微信支付渠道接入的前置准备、凭证获取和配置方法。

## 前置条件

微信支付没有独立的沙箱环境（沙箱 AppID 仅支持 Native 扫码支付，不支持 JSAPI 和小程序）。测试和正式环境共用同一套 API 端点：

| 环境 | 网关地址 |
|------|---------|
| 正式 / 测试 | `https://api.mch.weixin.qq.com` |

## 所需凭证

微信支付 V3 需要以下 5 项凭证：

| 凭证 | 环境变量 | 说明 |
|------|---------|------|
| 商户号 | `WECHAT_MCH_ID` | 微信支付分配的商户号（10 位数字） |
| APIv3 密钥 | `WECHAT_API_V3_KEY` | 32 字节字符串，用于回调解密和请求签名 |
| 证书序列号 | `WECHAT_SERIAL_NO` | 商户 API 证书序列号（16 进制字符串） |
| 商户私钥 | `WECHAT_PRIVATE_KEY` | 商户 API 证书对应的私钥（PEM 格式） |
| 通知地址 | `WECHAT_NOTIFY_URL` | 回调通知 URL，需公网可达（ngrok） |

### 凭证获取流程

1. 注册微信支付商户平台：https://pay.weixin.qq.com
2. 进入「账户中心」→「API 安全」
3. 设置 APIv3 密钥 → 随机生成 32 位字符串，**务必保存**
4. 下载商户 API 证书（`.pem` 格式）→ 获取证书序列号和私钥
5. 获取关联的 AppID（公众号或小程序，Native 支付也需要）

::: warning 商户注册要求
微信支付商户号注册需要中国大陆营业执照、法人身份证、对公银行账户。海外企业需联系微信支付跨境业务。
:::

## 服务配置

### .env 配置

编辑 `hydra-pay/service/.env`：

```bash
# ============ WeChat Pay (微信支付) ============
WECHAT_MCH_ID=1234567890
WECHAT_API_V3_KEY=your-32-byte-apiv3-key-here!
WECHAT_SERIAL_NO=5157F09EFDC096DE15EBE81A47057A7232F1B8E1
WECHAT_PRIVATE_KEY_PATH=/path/to/apiclient_key.pem
WECHAT_NOTIFY_URL=https://<ngrok-url>/v1/payments/callback/wechat
```

### 私钥格式

微信商户私钥是 PKCS#8 格式的 PEM 文件：

```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEF...
-----END PRIVATE KEY-----
```

支持两种配置方式：

| 方式 | 配置 | 适用场景 |
|------|------|---------|
| 文件路径 | `WECHAT_PRIVATE_KEY_PATH=/path/to/key.pem` | 生产环境（K8s Secret 挂载） |
| 环境变量 | `WECHAT_PRIVATE_KEY=<完整 PEM 内容>` | 开发/测试 |

::: tip 私钥安全
生产环境建议使用 `WECHAT_PRIVATE_KEY_PATH` + K8s Secret 文件挂载方式。`.env` 文件已在 `.gitignore` 中排除。
:::

## 微信支付 AppID 说明

微信支付需要关联一个 AppID，不同交易类型对应不同 AppID：

| trade_type | 所需 AppID 类型 | 说明 |
|-----------|----------------|------|
| `native` | 商户 AppID 或服务商 AppID | 扫码支付 |
| `jsapi` | 公众号 AppID（服务号） | 微信内网页支付，需要用户 OpenID |
| `miniapp` | 小程序 AppID | 小程序内支付，需要用户 OpenID |
| `app` | 移动应用 AppID | APP 内支付 |

Native 扫码支付的 AppID 只需是已认证的公众号/小程序 AppID 即可，不需要用户 OpenID。JSAPI 和小程序支付需要先通过微信 OAuth 获取用户 OpenID。

## 测试验证步骤

拿到凭证后，按以下步骤验证：

### 1. 启动 ngrok

```bash
ngrok http 8081
```

### 2. 配置 .env 并启动服务

```bash
cd hydra-pay/service
export $(grep -v '^#' .env | xargs)
go run cmd/server/main.go
```

### 3. 创建 Native 扫码支付

```bash
curl -s -X POST http://localhost:8081/v1/payments/create \
  -H "X-API-Key: test-pay-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "amount": 1,
    "channel": "wechat",
    "trade_type": "native",
    "channel_app_id": "wx1234567890",
    "description": "微信支付测试"
  }' | python3 -m json.tool
```

**预期响应**：

```json
{
    "success": true,
    "data": {
        "payment_id": "...",
        "channel": "wechat",
        "amount": 1,
        "status": "processing",
        "qr_code_url": "weixin://wxpay/bizpayurl?pr=..."
    }
}
```

### 4. 扫码支付

将 `qr_code_url` 生成二维码，用微信扫码支付。

### 5. 观察回调

支付成功后服务端日志应打印：

```
[wechat] callback verified: out_trade_no=..., transaction_id=420000..., state=SUCCESS
```

### 6. 验证支付状态

```bash
curl http://localhost:8081/v1/payments/<payment_id> \
  -H "X-API-Key: test-pay-key-001"
# status: "paid"
# external_id: "4200001234567890"
```

## 验证 checklist

| 序号 | 验证项 | 通过标准 |
|------|--------|----------|
| 1 | 适配器初始化 | 服务日志打印 `[wechat] adapter initialized` |
| 2 | Native 支付创建 | 返回 `weixin://wxpay/bizpayurl` 二维码 |
| 3 | 回调公网可达 | ngrok URL 可达 |
| 4 | V3 签名验证 | 非微信来源请求返回 `INVALID_SIGNATURE` |
| 5 | 扫码支付 | 微信扫码 → 支付确认 |
| 6 | 异步通知 | `callback verified` + `transaction_id` |
| 7 | 状态更新 | `status: paid` |
| 8 | 事件记录 | `payment_events` 表有 `callback_received` 记录（含原始 body） |
| 9 | 幂等回调 | 重复通知 → `callback ignored` |

## 常见问题

### Native 支付返回 "appid and mch_id not match"

AppID 和商户号之间需要先建立绑定关系。登录商户平台 →「产品中心」→「APPID 授权管理」→ 绑定 AppID。

### 回调收不到

- 确认 `WECHAT_NOTIFY_URL` 是公网可达的 HTTPS 地址
- 微信支付回调要求 HTTPS，ngrok 提供的正是 HTTPS
- 回调 URL 不能带自定义端口号

### JSAPI 支付提示 "openid is required"

JSAPI 和小程序支付需要先通过微信 OAuth 流程获取用户 OpenID，将 OpenID 通过 `open_id` 参数传入。

## 相关文档

- [回调处理流程](/dev/pay/callback-flow)
- [支付宝沙箱验证](/knowledge/alipay-sandbox-verification)
- [服务架构](/dev/pay/service-architecture)
- [API 参考](/dev/pay/api)