# 云闪付（银联）渠道接入技术方案

本文档记录 hydra-pay 云闪付渠道的技术方案，包括 SDK 设计、分层架构、签名机制、回调处理和集成要点。

## 渠道概述

云闪付是中国银联推出的统一支付应用，覆盖扫码支付、App 内支付、H5 支付等场景。通过银联全渠道系统对接，商户可以接入云闪付作为收款渠道。

| 维度 | 说明 |
|------|------|
| 渠道名称 | `unionpay` |
| Trade No 渠道码 | `03` |
| 对接系统 | 银联全渠道系统 (UnionPay All-Channel System) |
| 签名方式 | RSA-SHA256 |
| 回调格式 | `application/x-www-form-urlencoded` |
| Go SDK | `github.com/hydra/unionpay-go`（自研，无官方 Go SDK） |

## 分层架构

参照 wechatpay-go 的分层模式，云闪付接入分为两层：

```
┌─────────────────────────────────────────────────┐
│              Adapter 层 (280 行)                  │
│  channel/unionpay/adapter.go                    │
│  ┌───────────────────────────────────────────┐  │
│  │ Sentinel · Otel · Prometheus · 模型映射    │  │
│  │ channel.Adapter 接口实现                    │  │
│  └───────────────┬───────────────────────────┘  │
│                  │  import                       │
│  ┌───────────────▼───────────────────────────┐  │
│  │        SDK 层 (~400 行，零外部依赖)         │  │
│  │  unionpay-go/                              │  │
│  │  ┌─────────────────────────────────────┐  │   │
│  │  │ Client · Signer · NotifyHandler     │  │   │
│  │  │ PayService · QueryService · Refund  │  │   │
│  │  └─────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

| 层级 | 职责 | 对标 |
|------|------|------|
| **SDK** (`unionpay-go`) | HTTP 网关通信、RSA 签名/验签、密钥加载、回调解析 | `wechatpay-go` |
| **Adapter** (`channel/unionpay`) | Sentinel 熔断、Otel 追踪、Prometheus 指标、模型映射 | `channel/alipay` `channel/wechat` |

## SDK 设计 (unionpay-go)

### 工程结构

```
unionpay-go/                       ← 独立 Go 模块（零 hydra-pay 依赖）
├── go.mod                         github.com/hydra/unionpay-go
├── client.go                      Client + Service + NewClient(ctx, opts...)
├── option.go                      Functional Options (WithMchID, WithPrivateKey...)
├── sign.go                        RSA-SHA256 签名/验签 (对标 signer/verifier)
├── pay.go                         PayService: QRCodePay / AppPay / H5Pay
├── query.go                       QueryService: QueryOrder
├── refund.go                      RefundService: Refund
├── notify.go                      NotifyHandler: Parse (对标 core/notify)
├── utils.go                       LoadPrivateKeyPEM / LoadPublicKeyPEM
└── client_test.go                 9 个单元测试
```

### 设计模式

SDK 完全对标 wechatpay-go 的核心设计模式：

| 模式 | wechatpay-go | unionpay-go |
|------|-------------|-------------|
| Client 初始化 | `NewClient(ctx, opts...)` | `NewClient(ctx, opts...)` |
| 配置注入 | `core.ClientOption` 接口 | `Option` 接口 |
| 服务基类 | `services.Service { Client }` | `Service { Client }` |
| API 方法 | `NativeApiService.Prepay(ctx, req)` | `PayService.QRCodePay(ctx, req)` |
| 回调处理 | `notify.Handler.ParseNotifyRequest()` | `NotifyHandler.Parse(body)` |
| 工具函数 | `utils.LoadPrivateKey()` | `LoadPrivateKeyPEM()` |

### 核心 API

```go
// 创建 Client
client, _ := unionpay.NewClient(ctx,
    unionpay.WithMchID("777290058110048"),
    unionpay.WithPrivateKey(privateKey),
    unionpay.WithPublicKey(publicKey),   // 可选，用于回调验签
    unionpay.WithSandbox(true),
)

// 支付
paySvc := &unionpay.PayService{Service: unionpay.Service{Client: client}}
resp, _ := paySvc.QRCodePay(ctx, &unionpay.QRCodePayReq{...})
resp, _ := paySvc.AppPay(ctx, &unionpay.AppPayReq{...})
html, _ := paySvc.H5Pay(ctx, &unionpay.H5PayReq{...})

// 查询
querySvc := &unionpay.QueryService{Service: unionpay.Service{Client: client}}
resp, _ := querySvc.QueryOrder(ctx, &unionpay.QueryReq{...})

// 退款
refundSvc := &unionpay.RefundService{Service: unionpay.Service{Client: client}}
resp, _ := refundSvc.Refund(ctx, &unionpay.RefundReq{...})

// 回调
handler := unionpay.NewNotifyHandler(client)
result, _ := handler.Parse(callbackBody)
```

### 关键技术决策

**决策：自研 SDK，不使用第三方库。**

**理由**：
- 无官方 Go SDK（银联仅提供 Java/PHP SDK）
- 社区库（`shima-park/unionpay`）最后更新于 2018 年，API 版本过旧
- 银联全渠道 HTTP 表单 API 足够简单，`crypto/rsa` + `net/http` 标准库即可覆盖
- SDK 作为独立模块发布，可以被其他 Go 项目直接引用

**决策：使用全渠道证书签名，不使用 OAuth2 Token 模式。**

**理由**：
- 证书签名不依赖 Token，避免了 Token 过期、缓存、刷新的复杂性
- 证书签名是银联推荐的商户对接方式，更稳定

## API 架构

### 网关地址

| 环境 | 基础网关 |
|------|----------|
| 生产 | `https://gateway.95516.com/gateway/api` |
| 测试 | `https://gateway.test.95516.com/gateway/api` |

### 接口端点

| 用途 | 路径 | txnType |
|------|------|---------|
| 二维码支付 / 退款 | `backTransReq.do` | `01` (消费) / `04` (退货) |
| App 支付 | `appTransReq.do` | `01` |
| H5/WAP 支付 | `frontTransReq.do` | `01` |
| 订单查询 | `queryTrans.do` | `00` |

### 支付场景细分

| 场景 | tradeType | txnSubType | bizType | 响应关键字段 |
|------|-----------|------------|---------|-------------|
| 扫码支付 (Native) | `native` | `07` | `000201` | `qrCode` (二维码链接) |
| App 支付 | `app` | `01` | `000000` | `tn` (供 UPSDK 调起) |
| H5/WAP 支付 | `h5` / `jsapi` | `01` | `000201` | HTML 自动提交表单 |

## 签名机制

### 请求签名

银联全渠道使用 RSA-SHA256 签名，由 SDK 的 `sign.go` 负责：

```go
// 1. 将请求参数按 key 字母序排序（排除 signature 和 signMethod）
signingStr := BuildSigningString(params)
//  → "bizType=000201&merId=777290058110048&orderId=xxx&txnAmt=100&..."

// 2. SHA256 哈希
hashed := sha256.Sum256([]byte(signingStr))

// 3. RSA-SHA256 签名
sigBytes, _ := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, hashed[:])

// 4. Base64 编码
signature := base64.StdEncoding.EncodeToString(sigBytes)
```

### 回调验签

由 SDK 的 `NotifyHandler.Parse()` 自动完成：

```go
// 1. 从回调参数中提取 signature，移除 signature 和 signMethod
// 2. 对剩余参数按 key 字母序排序，拼接 signingStr
// 3. SHA256 + RSA-SHA256 验签
// 4. 验签通过后解析所有字段到 CallbackResult
```

## 适配器实现

### 代码结构

```
hydra-pay/service/internal/channel/unionpay/
└── adapter.go       # 适配器 (~280 行)
```

### 适配器结构体

```go
type Adapter struct {
    client    *unionpay.Client        // SDK 客户端
    paySvc    *unionpay.PayService     // 支付服务
    querySvc  *unionpay.QueryService   // 查询服务
    refundSvc *unionpay.RefundService  // 退款服务
    notifyH   *unionpay.NotifyHandler  // 回调处理器
    notifyURL string
    returnURL string
}
```

### 各方法职责

适配器实现了 `channel.Adapter` 接口，每个方法遵循相同的模式：

```
参数校验 → Sentinel Entry → Otel Span → SDK 调用 → Prometheus 计时 → 结果映射
```

| 方法 | SDK 调用 | 业务逻辑 |
|------|---------|---------|
| `CreatePayment` | `paySvc.QRCodePay / AppPay / H5Pay` | 按 tradeType 分发，映射到 `CreatePaymentResponse` |
| `VerifyCallback` | `notifyH.Parse(body)` | 构建 `UnionpayCallback`，double-check 查询，返回 `CallbackResult` |
| `GetPaymentStatus` | `querySvc.QueryOrder` | 状态码映射 (`00`→paid, `03/04/05`→pending) |
| `Refund` | `refundSvc.Refund` | Sentinel 保护，映射到 `RefundResponse` |

### 与支付宝/微信适配器的对比

| 特性 | 支付宝 | 微信支付 | 云闪付 |
|------|--------|----------|--------|
| SDK | `smartwalle/alipay/v3` | `wechatpay-go` | **`unionpay-go`（自研）** |
| API 风格 | SDK 封装 | RESTful + SDK | **HTTP 表单 POST** |
| 签名方式 | RSA2 (SDK 内置) | APIv3 签名头 | **RSA-SHA256（SDK 内置）** |
| 回调格式 | form-encoded | JSON (AES-GCM 加密) | **form-encoded (明文 + 签名)** |
| 金额单位 | 元（内部转分） | 分 | **分**（与内部一致） |
| Adapter 行数 | ~400 | ~720 | **~280** |

## 数据模型

### 渠道回调记录

支付回调成功后，`unionpay_callbacks` 表记录完整回调数据：

```sql
CREATE TABLE unionpay_callbacks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id    UUID NOT NULL,
    -- 通知标识
    query_id      VARCHAR(64) UNIQUE,  -- 银联查询流水号（幂等键）
    -- 交易信息
    order_id      VARCHAR(64),         -- 商户订单号
    txn_time      VARCHAR(32),         -- 订单发送时间 (YYYYMMDDHHmmss)
    txn_amt       BIGINT,              -- 交易金额（分）
    resp_code     VARCHAR(8),          -- 响应码 ("00"=成功)
    resp_msg      VARCHAR(256),        -- 响应信息
    -- 清算信息
    settle_amt           BIGINT,       -- 清算金额（分）
    settle_currency_code VARCHAR(3),   -- 清算币种
    settle_date          VARCHAR(8),   -- 清算日期 (MMDD)
    -- 跟踪信息
    trace_no      VARCHAR(64),         -- 系统跟踪号
    trace_time    VARCHAR(32),         -- 交易传输时间
    -- 签名
    signature     VARCHAR(512),        -- 银联应答签名
    sign_method   VARCHAR(8),          -- 签名方法 ("01"=RSA)
    -- 原始数据
    raw_body      TEXT,
    created_at    TIMESTAMP
);
```

### 商户扩展

`merchants` 表新增字段以支持服务商（间联）模式：

```sql
ALTER TABLE merchants ADD COLUMN unionpay_sub_mer_id VARCHAR(64);
```

## 服务层集成点

适配器通过以下集成点接入支付服务体系：

### GetAdapter (适配器工厂)

```go
// internal/service/payment_service.go
func GetAdapter(name string, cfg *config.Config) (channel.Adapter, error) {
    switch name {
    case model.ChannelAlipay:   return alipay.NewAdapter(&cfg.Alipay)
    case model.ChannelWechat:   return wechat.NewAdapter(&cfg.Wechat)
    case model.ChannelUnionpay:  return unionpay.NewAdapter(&cfg.Unionpay)
    }
}
```

### 回调去重

```go
// 通过 query_id 唯一性保证幂等
if result.UnionpayCallback.QueryID != "" {
    db.Model(&model.UnionpayCallback{}).
        Where("query_id = ?", result.UnionpayCallback.QueryID).Count(&count)
}
```

### 回调响应

云闪付和支付宝一样，回调成功后返回纯文本 `"success"`：

```go
// internal/handler/payment_handler.go
if channelName == model.ChannelAlipay || channelName == model.ChannelUnionpay {
    c.String(http.StatusOK, "success")
}
```

## 配置

### 环境变量

```bash
UNIONPAY_APP_ID=               # 银联分配的接入方 ID
UNIONPAY_SECRET=               # 接入方密钥
UNIONPAY_MCH_ID=               # 商户号（15位数字）
UNIONPAY_PRIVATE_KEY=          # RSA 私钥 PEM
UNIONPAY_UNIONPAY_PUBLIC_KEY=  # 银联公钥 PEM（回调验签）
UNIONPAY_NOTIFY_URL=           # 回调通知地址
UNIONPAY_RETURN_URL=           # H5 支付前端返回地址
UNIONPAY_SANDBOX=false         # 测试环境开关
```

### 配置结构体

```go
type UnionpayConfig struct {
    AppID                 string
    Secret                string
    MchID                 string
    PrivateKey            string
    UnionpayPublicKey     string
    NotifyURL             string
    ReturnURL             string
    IsSandbox             bool
}
```

## 前端集成

### 托管结算页

云闪付作为第三个支付渠道，已集成到 V1 和 V2 结算页面：

| 页面 | 组件 |
|------|------|
| V1 (`CheckoutPage.jsx`) | `ChannelCard channel="unionpay"` |
| V2 (`CheckoutPageV2.jsx`) | 内联云闪付支付方式卡片 |

Logo 使用 `unionpay_logo.svg`，与支付宝/微信 Logo 保持统一的 SVG 渲染方式。

### Admin 管理后台

- **订单列表** — 渠道筛选下拉框包含「云闪付」选项
- **配置页** — 显示云闪付配置状态（App ID、商户号、密钥加载状态）
- **订单详情** — 展示 `unionpay_callbacks` 回调记录
- **连接性检查** — 测试云闪付生产/测试网关可达性

## 运维可观测性

### Sentinel 熔断

```go
e, b := sentinel.Entry("unionpay")
// 云闪付适配器所有外部调用均受 Sentinel 保护
```

### OpenTelemetry 追踪

```go
ctx, span := otel.Tracer("hydra-pay").Start(ctx, "unionpay.native",
    trace.WithSpanKind(trace.SpanKindClient),
    trace.WithAttributes(
        attribute.String("channel", "unionpay"),
        attribute.String("operation", "native"),
    ),
)
```

### Prometheus 指标

| 指标 | 标签 |
|------|------|
| `channel_api_request_duration_seconds` | `channel=unionpay`, `operation` |
| `channel_api_request_total` | `channel=unionpay`, `operation`, `status` |

## 相关文件清单

### SDK (unionpay-go)

| 文件 | 说明 |
|------|------|
| `unionpay-go/go.mod` | 独立模块声明 |
| `unionpay-go/client.go` | Client + Service + NewClient |
| `unionpay-go/option.go` | Functional Options |
| `unionpay-go/sign.go` | RSA-SHA256 签名/验签 |
| `unionpay-go/pay.go` | PayService: QRCodePay/AppPay/H5Pay |
| `unionpay-go/query.go` | QueryService: QueryOrder |
| `unionpay-go/refund.go` | RefundService: Refund |
| `unionpay-go/notify.go` | NotifyHandler: 回调解析 |
| `unionpay-go/utils.go` | 密钥加载工具 |
| `unionpay-go/client_test.go` | SDK 单元测试 (9 cases) |

### Adapter & 服务层

| 文件 | 说明 |
|------|------|
| `internal/model/payment.go` | `ChannelUnionpay` 常量 |
| `internal/model/unionpay_callback.go` | 回调数据模型 |
| `internal/model/merchant.go` | `UnionpaySubMerID` 字段 |
| `internal/config/config.go` | `UnionpayConfig` 配置 |
| `internal/channel/adapter.go` | `CallbackResult.UnionpayCallback` 字段 |
| `internal/channel/unionpay/adapter.go` | 适配器实现 (~280行) |
| `internal/database/database.go` | AutoMigrate 注册 |
| `pkg/tradeno/tradeno.go` | `"unionpay": "03"` 渠道码 |
| `internal/service/payment_service.go` | GetAdapter / checkDedup / saveCallback |
| `internal/handler/payment_handler.go` | 回调响应 / 子商户解析 |
| `internal/admin/handler.go` | 配置展示 / 订单详情 / 连接性检查 |
| `internal/router/router.go` | Logo 静态文件路由 |

### 前端

| 文件 | 说明 |
|------|------|
| `pay-frontend/src/components/ChannelLogos.jsx` | UnionpayLogo 组件 |
| `pay-frontend/src/components/ChannelCard.jsx` | 支付渠道卡片配置 |
| `pay-frontend/src/pages/CheckoutPage.jsx` | V1 结算页渠道选择 |
| `pay-frontend/src/pages/CheckoutPageV2.jsx` | V2 结算页渠道选择 |
| `admin/src/views/Orders.jsx` | 订单列表渠道筛选 |

## 相关文档

- [云闪付渠道测试指南](/knowledge/unionpay-testing)
- [渠道适配器设计](/dev/pay/channel-adapters)
- [回调处理流程](/dev/pay/callback-flow)
- [支付宝沙箱验证](/knowledge/alipay-sandbox-verification)
