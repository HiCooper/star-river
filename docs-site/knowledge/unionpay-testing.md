# 云闪付（银联）渠道测试指南

本文档记录 hydra-pay 云闪付渠道的测试流程，涵盖环境配置、启动、支付测试及回调验证的全链路步骤。

## 与支付宝/微信支付测试的区别

云闪付（银联）的测试环境与支付宝、微信有显著不同：

| 维度 | 支付宝 | 微信支付 | 云闪付（银联） |
|------|--------|----------|---------------|
| 沙箱环境 | CLI 一键创建 (`alipay sandbox create`) | 需单独申请测试商户号 | **测试网关** `gateway.test.95516.com` |
| 测试 APP | 沙箱支付宝 APK (Android) | 微信沙箱 APP | **无独立测试 APP**，通过测试网关验证 |
| 测试账号 | 自动生成买家/卖家账号 | 需联系微信支付运营 | 测试网关返回模拟响应 |
| API 签名 | RSA2 (应用私钥) | APIv3 签名 + 回调 AES 解密 | **RSA-SHA256** 签名 + 验签 |
| 回调验证 | 支付宝公钥验签 | 微信平台证书验签 | **银联公钥** 验签 |
| 模拟支付 | 沙箱 APP 扫码 | 沙箱 APP 扫码 | 通过 **Admin 模拟回调** 工具 |

::: info 核心思路
云闪付没有端到端沙箱 APP，测试重点在 **API 签名/验签正确性** + **服务端流程完整性**。支付创建和查询走银联测试网关验证签名逻辑，回调通过 Admin 工具模拟。
:::

## 环境准备

### 依赖清单

| 依赖 | 版本要求 | 用途 |
|------|----------|------|
| Go | >= 1.21 | 编译运行 hydra-pay 服务 |
| PostgreSQL | 16 | 支付数据持久化 |
| Docker | - | 运行 PostgreSQL 容器 |
| 银联测试证书 | - | RSA 密钥对（用于签名和验签） |

### 1. 启动 PostgreSQL

```bash
cd star-river
docker compose -f docker-compose.infra.yml up -d postgres
```

### 2. 准备测试 RSA 密钥对

银联全渠道接口使用 RSA-SHA256 签名，需要一对 RSA 密钥：

```bash
# 生成 RSA 私钥（2048 位）
openssl genrsa -out unionpay_test_private.pem 2048

# 导出公钥
openssl rsa -in unionpay_test_private.pem -pubout -out unionpay_test_public.pem
```

::: warning
以上生成的是**自签名测试密钥**，仅用于本地验证签名/验签逻辑。真实对接银联时需要使用 CFCA 签发的正式证书。
:::

## 服务配置

### .env 文件

编辑 `hydra-pay/service/.env`：

```bash
# Server
PORT=8081
GIN_MODE=debug

# Database
DATABASE_URL=postgres://hydra:hydra_secret@localhost:5432/hydra_pay?sslmode=disable

# 云闪付（银联）测试
UNIONPAY_APP_ID=test_app_001
UNIONPAY_SECRET=test_secret_key_for_local_dev
UNIONPAY_MCH_ID=777290058110048
UNIONPAY_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
<粘贴上面生成的 unionpay_test_private.pem 内容>
-----END RSA PRIVATE KEY-----
UNIONPAY_UNIONPAY_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----
<粘贴上面生成的 unionpay_test_public.pem 内容>
-----END PUBLIC KEY-----
UNIONPAY_SANDBOX=true
UNIONPAY_NOTIFY_URL=http://localhost:8081/v1/payments/callback/unionpay
```

| 配置项 | 说明 |
|------|------|
| `UNIONPAY_APP_ID` | 测试阶段可使用任意标识 |
| `UNIONPAY_SECRET` | 测试阶段可使用任意字符串 |
| `UNIONPAY_MCH_ID` | **银联测试商户号**（15位），需向银联申请或使用测试环境默认值 |
| `UNIONPAY_PRIVATE_KEY` | RSA 私钥 PEM（用于签名请求） |
| `UNIONPAY_UNIONPAY_PUBLIC_KEY` | RSA 公钥 PEM（用于验签回调和响应） |
| `UNIONPAY_SANDBOX=true` | 使用测试网关 `gateway.test.95516.com` |

### 准备测试 API Key

确保数据库中存在测试应用：

```bash
docker exec postgres psql -U hydra -d hydra_pay \
  -c "INSERT INTO apps (name, api_key, status) VALUES ('Test App', 'test-pay-key-001', 'active') ON CONFLICT DO NOTHING"
```

## 启动服务

```bash
cd hydra-pay/service
set -a && source .env && set +a
go run cmd/server/main.go
```

验证服务状态：

```bash
curl http://localhost:8081/health
# {"checks":{"database":"ok"},"status":"ok"}
```

验证云闪付配置加载：

```bash
curl http://localhost:8081/api/admin/config \
  -H "X-Admin-Key: admin-dev-key"
```

响应中应包含 `unionpay` 配置段：

```json
{
  "unionpay": {
    "app_id": "test****",
    "mch_id": "7772****",
    "key_loaded": true,
    "pub_loaded": true,
    "notify_url": "http://localhost:8081/v1/payments/callback/unionpay",
    "return_url": ""
  }
}
```

## 验证测试

### 1. 创建云闪付支付订单

```bash
curl -s -X POST http://localhost:8081/v1/payments/create \
  -H "X-API-Key: test-pay-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "amount": 1,
    "channel": "unionpay",
    "trade_type": "native",
    "description": "云闪付测试订单"
  }' | python3 -m json.tool
```

**预期响应**：

```json
{
    "success": true,
    "data": {
        "payment_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "trade_no": "20260602xxxxxx",
        "channel": "unionpay",
        "amount": 1,
        "currency": "CNY",
        "status": "processing",
        "qr_code_url": "https://qr.95516.com/...",
        "payment_url": ""
    }
}
```

| 响应验证点 | 说明 |
|-----------|------|
| `channel: "unionpay"` | 渠道正确识别 |
| `status: "processing"` | 支付处理中 |
| `trade_no` 以 `03` 开头的日期段 | 云闪付渠道码为 `03`（如 `2026060203...`） |

### 2. 查询支付状态

```bash
curl -s http://localhost:8081/v1/payments/<payment_id> \
  -H "X-API-Key: test-pay-key-001" | python3 -m json.tool
```

| 字段 | 预期值 |
|------|--------|
| `status` | `processing`（支付前） |
| `channel` | `unionpay` |
| `currency` | `CNY` |

### 3. 模拟回调通知

由于云闪付测试环境下无法通过 APP 真实支付，使用 Admin 工具模拟回调：

```bash
curl -s -X POST http://localhost:8081/api/admin/tools/simulate-callback \
  -H "X-Admin-Key: admin-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "<payment_id 或 trade_no>",
    "status": "paid"
  }' | python3 -m json.tool
```

**预期响应**：

```json
{
    "success": true,
    "data": {
        "message": "callback simulated",
        "payment": {
            "status": "paid",
            ...
        }
    }
}
```

### 4. 验证回调记录持久化

模拟回调后，验证云闪付回调记录已写入数据库：

```bash
docker exec postgres psql -U hydra -d hydra_pay \
  -c "SELECT id, query_id, order_id, txn_amt, resp_code, created_at FROM unionpay_callbacks ORDER BY created_at DESC LIMIT 5"
```

### 5. 验证回调幂等性

重复发送相同回调，确认幂等保护生效：

```bash
# 再次模拟同一笔回调
curl -s -X POST http://localhost:8081/api/admin/tools/simulate-callback \
  -H "X-Admin-Key: admin-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "<同一 payment_id>",
    "status": "paid"
  }'
```

**预期响应**：

```json
{"success":true,"data":{"message":"already paid","payment":{...}}}
```

### 6. 验证订单详情中的回调信息

```bash
curl -s http://localhost:8081/api/admin/orders/<payment_id> \
  -H "X-Admin-Key: admin-dev-key" | python3 -m json.tool
```

响应中应包含 `unionpay_callbacks` 数组。

### 7. 测试不同支付方式

#### App 支付

```bash
curl -s -X POST http://localhost:8081/v1/payments/create \
  -H "X-API-Key: test-pay-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "amount": 1,
    "channel": "unionpay",
    "trade_type": "app",
    "description": "云闪付 App 支付测试"
  }'
```

响应中 `payment_url` 包含 TN（交易流水号），用于客户端 UPSDK 调起支付。

#### H5 支付

```bash
curl -s -X POST http://localhost:8081/v1/payments/create \
  -H "X-API-Key: test-pay-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "amount": 1,
    "channel": "unionpay",
    "trade_type": "h5",
    "description": "云闪付 H5 支付测试"
  }'
```

响应中 `payment_url` 为银联 H5 收银台 HTML 自动提交表单。

### 8. 验证签名/验签逻辑

```bash
# 启动服务，直接 POST 到回调端点（无签名参数）
curl -s -X POST http://localhost:8081/v1/payments/callback/unionpay \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "orderId=TEST001"

# 预期返回 INVALID_SIGNATURE 错误
```

**预期响应**：

```json
{"success":false,"error":{"code":"INVALID_SIGNATURE","message":"callback verification failed"}}
```

无签名的回调请求被正确拒绝，说明验签逻辑生效。

### 9. 测试连接性检查

```bash
curl -s http://localhost:8081/api/admin/tools/connectivity \
  -H "X-Admin-Key: admin-dev-key" | python3 -m json.tool
```

响应中应包含云闪付测试和生产的网关连通性结果：

```json
{
  "results": [
    ...
    { "channel": "unionpay", "gateway": "gateway.test.95516.com", "status": "HTTP 200" },
    { "channel": "unionpay", "gateway": "gateway.95516.com", "status": "HTTP 200" }
  ]
}
```

## 托管结算页 (Checkout) 测试

### V1 页面

```bash
# 创建 checkout session
curl -s -X POST http://localhost:8081/v1/checkout/sessions \
  -H "X-API-Key: test-pay-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "amount": 1,
    "description": "云闪付结算测试",
    "success_url": "http://localhost:8081/pay/success"
  }'

# 浏览器打开
open http://localhost:8081/pay/checkout/<session_id>
```

在结算页面选择「云闪付」后点击支付，验证 `POST /v1/payments/create` 是否以 `channel=unionpay` 激活。

### V2 页面

```bash
open http://localhost:8081/pay/v2/checkout/<session_id>
```

V2 结算页面同样应显示云闪付支付方式卡片。

## 验证 checklist

| 序号 | 验证项 | 通过标准 | 状态 |
|------|--------|----------|------|
| 1 | 服务启动 | `GET /health` 返回 `{"status":"ok"}` | ☐ |
| 2 | 支付创建 (Native) | 返回 `channel: "unionpay"`，`status: "processing"` | ☐ |
| 3 | 支付创建 (App) | 返回 `payment_url`（TN 号） | ☐ |
| 4 | 支付创建 (H5) | 返回 `payment_url`（HTML 表单） | ☐ |
| 5 | Trade No 渠道码 | `trade_no` 日期后两位为 `03` | ☐ |
| 6 | 回调验签保护 | 无签名 POST 回调返回 `INVALID_SIGNATURE` | ☐ |
| 7 | 模拟支付成功 | `simulate-callback` 返回 `"already paid"` (二次调用) | ☐ |
| 8 | 状态更新 | 支付后查询返回 `status: "paid"` | ☐ |
| 9 | 回调记录持久化 | `unionpay_callbacks` 表有记录 | ☐ |
| 10 | 回调幂等 | 重复推送不重复处理 | ☐ |
| 11 | 连接性检查 | `gateway.test.95516.com` 可达 | ☐ |
| 12 | 结算页渠道显示 | V1/V2 页面显示云闪付选项 | ☐ |
| 13 | Admin 配置页 | `/api/admin/config` 显示 `unionpay` 配置 | ☐ |

## 常见问题

### 支付创建返回「私钥加载失败」

**现象**：`UNIONPAY_PRIVATE_KEY` 相关错误。

**解决**：确认私钥为 PEM 格式（`-----BEGIN RSA PRIVATE KEY-----` 头尾），不是 DER 二进制。用以下命令验证：

```bash
openssl rsa -in unionpay_test_private.pem -check -noout
# RSA key ok
```

### 沙箱网关连接超时

**现象**：创建支付时长时间等待后超时。

**排查**：

1. 确认 `UNIONPAY_SANDBOX=true`
2. 手动验证网关可达：
   ```bash
   curl -v https://gateway.test.95516.com
   ```
3. 部分网络环境可能需要代理访问银联测试网关

### 端口被占用

```bash
lsof -ti :8081 | xargs kill -9
```

### 公钥格式不正确

**现象**：日志报 `failed to parse public key`。

**解决**：确认公钥为 PEM 格式（`-----BEGIN PUBLIC KEY-----` 头尾），不是 base64 裸串。

```bash
# 验证公钥格式
openssl rsa -pubin -in unionpay_test_public.pem -text -noout
```

## 相关文档

- [hydra-pay 架构设计](/dev/pay/service-architecture)
- [渠道适配器设计](/dev/pay/channel-adapters)
- [回调处理流程](/dev/pay/callback-flow)
- [支付宝沙箱验证](/knowledge/alipay-sandbox-verification)
- [微信支付接入准备](/knowledge/wechat-pay-setup)
