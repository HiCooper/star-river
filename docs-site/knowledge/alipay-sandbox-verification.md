# 支付宝沙箱环境验证测试

本文档记录 hydra-pay 支付宝渠道的沙箱环境验证流程，涵盖环境准备、配置、启动、支付测试及回调验证的全链路步骤。

## 环境准备

### 依赖清单

| 依赖 | 版本要求 | 用途 |
|------|----------|------|
| Go | >= 1.21 | 编译运行 hydra-pay 服务 |
| PostgreSQL | 16 | 支付数据持久化 |
| Docker | - | 运行 PostgreSQL 容器 |
| ngrok | >= 3.x | 暴露本地服务公网地址（接收支付宝异步通知） |
| 支付宝 CLI | 0.2.x | 快速创建沙箱环境 |

### 1. 启动 PostgreSQL

项目根目录提供 `docker-compose.infra.yml`，可直接启动基础设施：

```bash
cd star-river
docker compose -f docker-compose.infra.yml up -d postgres
```

验证数据库连通性：

```bash
docker exec postgres psql -U hydra -d postgres \
  -c "SELECT 1 FROM pg_database WHERE datname='hydra_pay'"
```

若 `hydra_pay` 数据库不存在，手动创建：

```bash
docker exec postgres psql -U hydra -d postgres -c "CREATE DATABASE hydra_pay"
```

### 2. 安装支付宝沙箱 CLI

```bash
curl -fsSL https://mdn.alipayobjects.com/nexuspaybase_saas/uri/file/as/alipaycli-install.sh | sh
```

验证安装：

```bash
alipay version
# 输出: alipay-cli version 0.2.0
```

### 3. 安装 ngrok

注册账号后获取 authtoken，安装并配置：

```bash
# macOS
brew install ngrok
# 或直接下载
curl -sLO https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip
unzip ngrok-v3-stable-darwin-amd64.zip -d /usr/local/bin/

# 配置 authtoken
ngrok config add-authtoken <your-authtoken>
```

## 沙箱环境创建

### 创建沙箱应用

```bash
S1="订单码支付" alipay sandbox create
```

创建成功后会返回完整的沙箱环境信息，包括应用配置、商家账号、买家账号等。

### 沙箱配置校验要点

| 字段 | 说明 | Go 服务端使用 |
|------|------|---------------|
| `appId` | 沙箱应用 ID | `ALIPAY_APP_ID` |
| `appPrivatePkcsKey` | 应用私钥 PKCS#1（非 JAVA 语言使用） | `ALIPAY_PRIVATE_KEY` |
| `alipayPublicKey` | 支付宝公钥（用于验签） | `ALIPAY_ALIPAY_PUBLIC_KEY` |
| 商家账号 | 沙箱商家登录信息 | 不参与服务端配置 |
| 买家账号 | 沙箱买家测试账号 | 用于扫码支付测试 |

::: warning 私钥格式
Go 语言属于非 JAVA 语言，使用 `appPrivatePkcsKey`（PKCS#1 格式）。smartwalle/alipay SDK 支持原始 base64 格式和 PEM 格式两种，无需手动添加 `-----BEGIN RSA PRIVATE KEY-----` 头尾。
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

# Hydra-Wall 集成
WALL_WEBHOOK_URL=http://localhost:8080/api/v1/webhooks/payment

# 支付宝沙箱
ALIPAY_APP_ID=<沙箱返回的 appId>
ALIPAY_PRIVATE_KEY=<沙箱返回的 appPrivatePkcsKey>
ALIPAY_ALIPAY_PUBLIC_KEY=<沙箱返回的 alipayPublicKey>
ALIPAY_SANDBOX=true
ALIPAY_NOTIFY_URL=https://<ngrok-url>/v1/payments/callback/alipay
ALIPAY_RETURN_URL=https://<ngrok-url>
```

::: danger 安全提醒
`.env` 文件已在 `.gitignore` 中排除，切勿将包含真实私钥的 `.env` 提交到 Git 仓库。生产环境应使用 `ALIPAY_PRIVATE_KEY_PATH` + K8s Secrets 文件挂载方式。
:::

### 准备测试 API Key

确保数据库中存在测试应用：

```bash
docker exec postgres psql -U hydra -d hydra_pay \
  -c "INSERT INTO apps (name, api_key, status) VALUES ('Test App', 'test-pay-key-001', 'active') ON CONFLICT DO NOTHING"
```

## 启动服务

### 启动 ngrok

```bash
ngrok http 8081 --log=stdout &
```

获取公网地址：

```bash
curl -s http://127.0.0.1:4040/api/tunnels | \
  python3 -c "import sys,json; tunnels=json.load(sys.stdin)['tunnels']; [print(t['public_url']) for t in tunnels if t['proto']=='https']"
```

将输出的公网地址更新到 `.env` 的 `ALIPAY_NOTIFY_URL` 中。

### 启动 hydra-pay

```bash
cd hydra-pay/service
set -a && source .env && set +a
go run cmd/server/main.go
```

验证服务状态：

```bash
curl http://localhost:8081/health
# {"status":"ok"}
```

## 验证测试

### 1. 创建支付订单

```bash
curl -s -X POST http://localhost:8081/v1/payments/create \
  -H "X-API-Key: test-pay-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "2088722101618725",
    "amount": 1,
    "channel": "alipay",
    "trade_type": "native",
    "description": "测试订单"
  }' | python3 -m json.tool
```

**预期响应**（真实沙箱交互）：

```json
{
    "success": true,
    "data": {
        "payment_id": "885bc95d-dcb8-454a-954e-b2c15b4312cc",
        "channel": "alipay",
        "amount": 1,
        "status": "processing",
        "qr_code_url": "https://qr.alipay.com/bax08695hqshner5dstr00e2",
        "payment_url": ""
    }
}
```

| 响应验证点 | 说明 |
|-----------|------|
| `success: true` | API 调用成功 |
| `status: processing` | 支付处理中 |
| `qr_code_url` | 真实支付宝沙箱二维码（`qr.alipay.com` 域名） |
| `payment_url: ""` | Native 扫码支付无跳转 URL |

::: tip 辨别新旧代码
旧桩代码 `qr_code_url` 是 `api.qrserver.com` 域名；新适配器返回的是 `qr.alipay.com`。
:::

### 2. 查询支付状态

```bash
curl -s http://localhost:8081/v1/payments/<payment_id> \
  -H "X-API-Key: test-pay-key-001" | python3 -m json.tool
```

| 字段 | 预期值 |
|------|--------|
| `status` | `processing`（支付前）/ `paid`（支付后） |
| `channel` | `alipay` |
| `external_id` | 与 `payment_id` 相同（支付前） |

### 3. 验证回调端点可公网访问

```bash
curl -s -X POST https://<ngrok-url>/v1/payments/callback/alipay \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "test=1"
```

**预期响应**（验签保护正常）：

```json
{"success":false,"error":{"code":"INVALID_SIGNATURE","message":"callback verification failed"}}
```

无签名的请求被正确拒绝，说明验签逻辑生效。

### 4. 执行支付

**沙箱支付宝 APP 仅支持 Android**，根据手机系统选择对应方式：

#### Android 用户 — 扫码支付（Native）

1. 手机安装**沙箱版支付宝 APP**（从支付宝开放平台下载 APK）
2. 使用沙箱买家账号登录：

   | 字段 | 值 |
   |------|-----|
   | 账号 | `<沙箱返回的买家 email>` |
   | 登录密码 | `111111` |
   | 支付密码 | `111111` |

3. 扫描步骤 1 Native 支付返回的 `qr_code_url` 对应二维码
4. 确认支付 0.01 元

#### iOS 用户 — H5/WAP 支付

iOS 无法安装沙箱支付宝 APP（仅提供 Android APK），改用 H5/WAP 支付。沙箱 H5 支付通过支付宝沙箱网页收银台完成，在 iPhone Safari 浏览器中即可操作，无需安装任何 APP。

**步骤 1：创建 H5 支付订单**

```bash
curl -s -X POST http://localhost:8081/v1/payments/create \
  -H "X-API-Key: test-pay-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "2088722101618725",
    "amount": 1,
    "channel": "alipay",
    "trade_type": "h5",
    "success_url": "https://<ngrok-url>",
    "description": "测试订单"
  }' | python3 -m json.tool
```

| 参数 | 说明 |
|------|------|
| `trade_type: "h5"` | 手机网站支付（`alipay.trade.wap.pay`），返回可直接在浏览器打开的支付地址 |
| `success_url` | 支付成功后返回的页面地址（设为 ngrok 公网地址即可） |
| `amount: 1` | 支付金额，单位分（1 = 0.01 元） |

**预期响应**：

```json
{
    "success": true,
    "data": {
        "payment_id": "eda6b6bd-b9bf-4dac-95f5-3dd1bdd1439a",
        "payment_url": "https://openapi-sandbox.dl.alipaydev.com/gateway.do?app_id=9021000164603147&biz_content=...&method=alipay.trade.wap.pay&sign=...&sign_type=RSA2&version=1.0",
        "status": "processing"
    }
}
```

验证 `payment_url` 中域名必须是 `openapi-sandbox.dl.alipaydev.com`（沙箱网关），`method=alipay.trade.wap.pay` 表示 H5 支付。

**步骤 2：将 payment_url 发送到 iPhone**

`payment_url` 约 1500 字符，通过以下任一方式发到 iPhone：

| 方式 | 操作 |
|------|------|
| **AirDrop（推荐）** | Mac 上选中 URL → 右键 → 共享 → 隔空投送 → 选择你的 iPhone |
| **信息 / iMessage** | 复制 URL → 打开 Mac 信息 App → 粘贴发送给自己 |
| **备忘录** | Mac 备忘录中粘贴 URL → iCloud 自动同步到 iPhone |
| **邮件** | 发送到自己的邮箱，iPhone 上收取邮件后点击链接 |

> Mac 和 iPhone 用同一个 Apple ID 登录时，备忘录 / iMessage 秒级同步。

**步骤 3：在 iPhone Safari 中打开支付页面**

1. iPhone 上收到 URL 后，**长按链接** → 选择「在 Safari 中打开」
2. Safari 加载后，进入支付宝沙箱的**手机网站支付收银台**

   页面顶部显示：商品名「测试订单」、金额「0.01 元」、商户名

3. 在收银台页面选择：点击 **「支付宝账户支付」**（用沙箱买家账号余额支付）

**步骤 4：登录沙箱买家账号**

收银台跳转到登录页面：

1. 在登录页面，选择 **「账户登录」**

   | 字段 | 填入值 |
   |------|--------|
   | 账户名 | `<沙箱返回的买家 email>`（如 `mgnhdr0257@sandbox.com`） |
   | 登录密码 | `111111` |

2. 点击「登录」

**步骤 5：确认支付**

登录成功回到收银台确认页面：

1. 核对订单信息：商品名「测试订单」、金额 **0.01 元**、支付方式「账户余额」
2. 点击 **「确认支付」**
3. 弹出支付密码输入框 → 输入支付密码 **`111111`**
4. 点击「确定」

> 沙箱买家账号初始余额为 **1,000,000.00 元**（仅供测试）。

**步骤 6：支付完成**

1. 支付成功后，页面显示 **「支付成功」**，展示支付宝交易号
2. 数秒后自动跳转到 `success_url` 配置的地址（ngrok 公网根路径）

   > ⚠️ ngrok 根路径（如 `https://xxxx.ngrok-free.app/`）没有注册路由，浏览器显示 **404 是正常的**。支付结果不依赖此页面，而是看下一步的回调日志和数据库状态。

3. 此时服务端终端出现回调日志（见 [5. 观察回调日志](#_5-观察回调日志)）
4. 验证支付结果：

   ```bash
   curl http://localhost:8081/v1/payments/<payment_id> -H "X-API-Key: test-pay-key-001"
   # status: "paid"
   # external_id: "2026052322001418720508426247"（支付宝真实交易号）
   ```

::: warning iPhone 操作常见问题

| 现象 | 解决 |
|------|------|
| Safari 页面白屏 | 刷新页面，或重新复制完整 URL（确保未截断） |
| 登录提示「账户不存在」 | 确认是沙箱买家账号（`@sandbox.com`），不是真实支付宝账号 |
| 支付密码错误 | 沙箱默认支付密码是 `111111`，与登录密码相同 |
| 页面提示「系统繁忙」 | 沙箱网关偶发波动，刷新重试即可 |

:::

::: tip Native vs H5 对比
| | Native（Android） | H5（iOS） |
|------|------|------|
| API 接口 | `alipay.trade.precreate` | `alipay.trade.wap.pay` |
| 请求字段 | `"trade_type": "native"` | `"trade_type": "h5"` |
| 支付方式 | 沙箱 APP 扫码 | Safari 网页收银台 |
| 返回字段 | `qr_code_url`（二维码链接） | `payment_url`（跳转链接） |
| 需要 APP | 沙箱支付宝 APK | 不需要任何 APP |
| 适用平台 | 仅 Android | iOS / Android 均可 |
| `success_url` | 不需要 | 必须配置 `success_url` 参数 |
| `ALIPAY_RETURN_URL` | 不需要 | 必须在 `.env` 中配置 |
:::

### 5. 观察回调日志

支付成功后，服务端会收到支付宝异步通知。观察终端日志：

```
[GIN] 2026/05/23 - 17:20:30 | 200 | POST /v1/payments/callback/alipay
[alipay] callback verified: out_trade_no=885bc95d..., trade_no=2024052322001..., notify_id=...
```

同时查询支付状态确认变化：

```bash
curl -s http://localhost:8081/v1/payments/<payment_id> \
  -H "X-API-Key: test-pay-key-001"
# status: "paid", external_id: "支付宝交易号"
```

## 验证 checklist

| 序号 | 验证项 | 通过标准 | 状态 |
|------|--------|----------|------|
| 1 | 服务启动 | `GET /health` 返回 `{"status":"ok"}` | ☐ |
| 2 | 支付创建 | 返回 `qr.alipay.com` 域名的真实二维码 | ☐ |
| 3 | 沙箱网关 | 响应来自沙箱而非生产环境 | ☐ |
| 4 | 回调公网可达 | ngrok URL 返回 `INVALID_SIGNATURE`（非 404/超时） | ☐ |
| 5 | 回调验签 | 无签名请求被拒绝 | ☐ |
| 6 | 执行支付 | Android: 沙箱 APP 扫码 → 支付确认；iOS: Safari 打开 H5 payment_url → 网页收银台 | ☐ |
| 7 | 异步通知 | 支付后服务端日志打印 `callback verified` | ☐ |
| 8 | 状态更新 | 支付后查询接口返回 `status: paid` | ☐ |
| 9 | 幂等回调 | 重复推送同一订单 → 日志 `callback ignored: already in terminal state` | ☐ |

## 常见问题

### 支付创建返回 production 网关

**现象**：`payment_url` 为 `https://openapi.alipay.com/gateway.do` 而非沙箱地址。

**解决**：检查 `ALIPAY_SANDBOX=true` 是否配置。hydra-pay 代码中 `alipay.New(appID, privateKey, !cfg.IsSandbox)`，`!cfg.IsSandbox` 确保沙箱模式时 SDK 传入 `production=false`。

### 回调收不到通知

**排查顺序**：

1. 确认 ngrok 运行中：`curl http://127.0.0.1:4040/api/tunnels`
2. 确认 `.env` 中 `ALIPAY_NOTIFY_URL` 与 ngrok 公网地址一致
3. 确认回调端点可达：`curl -X POST https://<ngrok-url>/v1/payments/callback/alipay`
4. 沙箱环境回调可能延迟 1-5 分钟

### 沙箱创建后私钥字段为 null

**现象**：`appPrivateKey` 和 `appPrivatePkcsKey` 均为 `null`。

**解决**：重新运行 `S1="订单码支付" alipay sandbox create`。快速沙箱偶发服务波动，重试通常可解决。

### H5 支付创建失败（缺少 return_url）

**现象**：`trade_type: "h5"` 支付返回 `CHANNEL_ERROR`。

**解决**：H5 支付需要配置 `ALIPAY_RETURN_URL`。在 `.env` 中设置：

```bash
ALIPAY_RETURN_URL=https://<ngrok-url>
```

重启服务后重试。

### iOS 没有沙箱支付宝 APP

**现象**：沙箱支付宝 APP 只提供 Android APK，iOS 无法安装。

**解决**：使用 H5 支付方式代替 Native 扫码支付。将 `trade_type` 设为 `"h5"`，`payment_url` 可在 iOS Safari 中直接打开沙箱网页收银台完成支付。详见上文「iOS 用户 — H5/WAP 支付」。

### 端口被占用

```bash
lsof -ti :8081 | xargs kill -9
```

## 相关文档

- [hydra-pay 架构设计](/dev/pay/service-architecture)
- [渠道适配器设计](/dev/pay/channel-adapters)
- [hydra-pay API 参考](/dev/pay/api)
- [本地开发环境](/dev/deployment/dev-env)