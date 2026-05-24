# 回调处理流程

本文档描述 hydra-pay 如何处理支付宝和微信支付的异步回调通知，包括回调参数、处理流程、数据模型和设计决策。

## 商户订单号格式

hydra-pay 生成的交易号（TradeNo）为 22 位纯数字，同时用作渠道下单的 `out_trade_no`：

```
{YYYYMMDD}{channel2位}{HHmmss}{随机6位}

渠道编码: 00=支付宝, 01=微信, 02=Stripe
示例: 2024052400143520123456 (支付宝)
```

## 支付宝异步通知参数

支付宝通过 `POST application/x-www-form-urlencoded` 发送异步通知，全部参数均存入 `alipay_callbacks` 表：

| 参数 | 示例值 | 说明 |
|------|--------|------|
| `notify_time` | `2026-05-23 17:42:44` | 通知发送时间 |
| `notify_type` | `trade_status_sync` | 通知类型 |
| `notify_id` | `notify_20240523001` | 通知唯一 ID，用作幂等排重 |
| `sign_type` | `RSA2` | 签名算法 |
| `sign` | `d6DrRT9ZgGtL...` | RSA2 签名（base64） |
| `out_trade_no` | `2024052400143520123456` | 商户订单号 = hydra-pay TradeNo |
| `trade_no` | `2026052322001418720508426247` | 支付宝交易号，退款/对账的核心凭证 |
| `trade_status` | `TRADE_SUCCESS` | 交易状态 |
| `total_amount` | `0.01` | 订单金额（元，字符串） |
| `subject` | `测试订单` | 商品标题 |
| `receipt_amount` | `0.01` | 实收金额（元） |
| `buyer_pay_amount` | `0.01` | 买家实付金额（元） |
| `point_amount` | `0.00` | 积分支付金额（元） |
| `invoice_amount` | `0.00` | 开票金额（元） |
| `buyer_id` | `2088722101618725` | 买家支付宝用户 ID |
| `buyer_logon_id` | `mgn***@sandbox.com` | 买家支付宝账号（脱敏） |
| `gmt_create` | `2026-05-23 17:37:47` | 交易创建时间 |
| `gmt_payment` | `2026-05-23 17:42:44` | 交易付款时间 |
| `gmt_close` | — | 交易关闭时间（如有） |
| `fund_bill_list` | `[{"amount":"0.01","fundChannel":"ALIPAYACCOUNT"}]` | 支付渠道明细（JSONB） |
| `voucher_detail_list` | — | 优惠券信息（JSONB） |
| `passback_params` | — | 回传参数 |

### 交易状态映射

| 支付宝 trade_status | hydra-pay 内部状态 | 处理方式 |
|---------------------|-------------------|---------|
| `TRADE_SUCCESS` | `paid` | 标记已支付，触发 webhook |
| `TRADE_FINISHED` | `paid` | 同上（交易结束，不可退款） |
| `TRADE_CLOSED` | `failed` | 标记失败 |
| `WAIT_BUYER_PAY` | `pending` | 不更新状态 |

---

## 微信支付异步通知参数

微信支付 V3 回调通过 `POST application/json` 发送，需从加密的 `resource` 中解密出交易数据。解密后的全部字段存入 `wechat_callbacks` 表。

### 通知外层结构

| 字段 | 示例值 | 说明 |
|------|--------|------|
| `id` | `ev-20240115120500001` | 通知唯一 ID，用作幂等排重 |
| `create_time` | `2024-01-15T12:05:00+08:00` | 通知创建时间（RFC3339） |
| `event_type` | `TRANSACTION.SUCCESS` | 事件类型 |
| `resource_type` | `encrypt-resource` | 固定值 |
| `resource` | `{algorithm, ciphertext, ...}` | AES-GCM 加密的交易数据 |

### 验签 HTTP Header

| Header | 示例值 | 说明 |
|--------|--------|------|
| `Wechatpay-Timestamp` | `1705291500` | Unix 时间戳（秒） |
| `Wechatpay-Nonce` | `5K8264ILTKCH16CQ...` | 签名随机串 |
| `Wechatpay-Signature` | `WECHATPAY/SHA256withRSA ...` | RSA-SHA256 签名（base64） |
| `Wechatpay-Serial` | `5157F09EFDC096DE...` | 平台证书序列号 |

验签消息格式：`timestamp\nnonce\nbody\n`

### resource 解密后交易字段（AEAD_AES_256_GCM）

| 参数 | 示例值 | 说明 |
|------|--------|------|
| `out_trade_no` | `2024052400143520123456` | 商户订单号 = hydra-pay TradeNo |
| `transaction_id` | `4200002564202405241234567890` | 微信支付交易号，退款/对账核心凭证 |
| `trade_state` | `SUCCESS` | 交易状态 |
| `trade_state_desc` | `支付成功` | 交易状态描述 |
| `trade_type` | `NATIVE` | 交易类型（NATIVE/JSAPI/APP） |
| `bank_type` | `OTHERS` | 付款银行 |
| `success_time` | `2024-01-15T12:05:00+08:00` | 支付完成时间 |
| `amount.total` | `1` | 订单金额（分，int64） |
| `amount.currency` | `CNY` | 币种 |
| `amount.payer_total` | `1` | 用户实付金额（分） |
| `amount.payer_currency` | `CNY` | 用户支付币种 |
| `payer.openid` | `oUpF8uMuAJO_...` | 支付用户 OpenID |
| `mchid` | `1234567890` | 商户号 |
| `appid` | `wx1234567890` | 应用 ID |
| `attach` | — | 附加数据 |
| `sp_mchid` | — | 服务商户号（服务商模式） |
| `sp_appid` | — | 服务商 AppID（服务商模式） |
| `sub_mchid` | — | 子商户号（服务商模式） |
| `sub_appid` | — | 子商户 AppID（服务商模式） |
| `promotion_detail` | — | 优惠功能（JSONB） |

### 交易状态映射

| 微信 trade_state | hydra-pay 内部状态 | 处理方式 |
|-----------------|-------------------|---------|
| `SUCCESS` | `paid` | 标记已支付，触发 webhook |
| `NOTPAY` / `USERPAYING` / `ACCEPT` | `pending` | 仅记录 |
| `CLOSED` / `PAYERROR` / `REVOKED` | `failed` | 标记失败 |
| `REFUND` | `refunded` | 标记已退款 |

---

## 支付宝 vs 微信回调对比

| 维度 | 支付宝 | 微信支付 V3 |
|------|--------|-------------|
| Content-Type | `application/x-www-form-urlencoded` | `application/json` |
| 签名位置 | body 中的 `sign` 参数 | HTTP Header `Wechatpay-Signature` |
| 签名算法 | RSA2（SHA256WithRSA） | RSA-SHA256 |
| 数据加密 | 明文，签名保护 | AEAD_AES_256_GCM 加密 `resource` |
| 验签公钥 | 商户配置 `ALIPAY_ALIPAY_PUBLIC_KEY` | SDK 自动下载平台证书 |
| 成功响应 | `success` 纯文本 | `{"code":"SUCCESS"}` JSON |
| 交易号字段 | `trade_no` | `transaction_id` |
| 金额类型 | 元（字符串） | 分（int64） |
| 排重依据 | `notify_id` | 通知 `id` |
| 回调存储 | `alipay_callbacks` 表 | `wechat_callbacks` 表 |

---

## 回调处理全流程

```
支付宝 POST form-encoded body             微信 POST JSON body (AES-GCM encrypted)
  {out_trade_no, trade_no, sign, ...}       {id, event_type, resource: {ciphertext, ...}}
        │                                         │
        ▼                                         ▼
┌─ Handler (payment_handler.go) ───────────────────────────────────┐
│                                                                   │
│  1. 读取 raw body（io.ReadAll，不绑定 JSON）                       │
│  2. 收集 HTTP Headers（WeChat V3 验签需要）                        │
│  3. 构造 CallbackData{RawBody, Headers}                          │
│  4. 调用 service.HandleCallback()                                │
│  5. 返回渠道特定成功响应（支付宝 "success" / 微信 JSON）            │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─ Adapter.VerifyCallback ─────────────────────────────────────────┐
│                                                                   │
│ 支付宝 (alipay.go):                                               │
│   1. url.ParseQuery(rawBody) → url.Values                         │
│   2. SDK VerifySign(values) → RSA2 验签                           │
│   3. 提取全部参数 → 填充 AlipayCallback 结构体                      │
│   4. 反查 alipay.trade.query（防重放攻击）                          │
│   5. 返回 CallbackResult{..., AlipayCallback}                     │
│                                                                   │
│ 微信 (wechat.go):                                                 │
│   1. JSON Unmarshal → 通知外层（id, event_type）                    │
│   2. 验证 HTTP Header 签名（timestamp\nnonce\nbody\n）             │
│   3. AES-GCM 解密 resource.ciphertext → 交易 JSON                  │
│   4. 提取全部字段 → 填充 WeChatCallback 结构体                      │
│   5. 返回 CallbackResult{..., WeChatCallback}                     │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─ PaymentService.HandleCallback (payment_service.go) ─────────────┐
│                                                                   │
│  1. 验签通过后立即排重:                                            │
│     │ checkDedup() → 查 alipay_callbacks.notify_id              │
│     │             → 查 wechat_callbacks.notification_id          │
│     │ 已存在 → 直接 return（幂等，不重复处理）                      │
│                                                                   │
│  2. 按 TradeNo 查 payments 表                                     │
│     │ 找不到记录 → 返回 NOT_FOUND                                │
│                                                                   │
│  3. 保存渠道回调记录:                                              │
│     │ saveCallback() → INSERT INTO alipay_callbacks              │
│     │                → INSERT INTO wechat_callbacks              │
│     │ 全部字段入库，零丢失                                          │
│                                                                   │
│  4. 业务幂等检查:                                                  │
│     │ status 已是 paid / refunded → 跳过状态更新                   │
│                                                                   │
│  5. 状态转换（原子 CAS）:                                          │
│     │ MarkPaidIfPending:                                          │
│     │   UPDATE payments                                           │
│     │   SET status='paid', external_id=channel_tx_id,            │
│     │       paid_at=NOW()                                         │
│     │   WHERE id=? AND status IN ('pending','processing')        │
│     │ 原子 WHERE 防止并发回调竞态                                   │
│                                                                   │
│  6. 记录事件: status_changed（from → to）                          │
│                                                                   │
│  7. 异步通知 webhook:                                             │
│     │ go safeNotifyWall()                                         │
│     │ 3 次重试: 1s → 5s → 15s                                   │
│     │ 记录事件: webhook_sent                                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 数据模型设计

### 三表结构

```
payments (订单主表)                  payment_events (事件日志，纯追加)
┌────────────────────────┐          ┌──────────────────────────────┐
│ id (PK, UUID)          │◄─────────│ payment_id                   │
│ trade_no (22位, unique) │          │ type:                        │
│ app_id, user_id        │          │   created         → 下单     │
│ amount, currency       │          │   channel_request → 渠道响应  │
│ channel                │          │   status_changed  → 状态变更 │
│ status (唯一权威状态)    │          │   webhook_sent    → Webhook │
│ external_id (渠道交易号) │          │ channel                      │
│ metadata (JSONB)       │          │ raw_body（渠道请求原始响应）   │
│ paid_at                │          │ result（解析摘要，JSONB）      │
└────────────────────────┘          │ error（错误信息）              │
                                    └──────────────────────────────┘

alipay_callbacks (支付宝回调)         wechat_callbacks (微信回调)
┌────────────────────────┐          ┌──────────────────────────────┐
│ id (PK, UUID)          │          │ id (PK, UUID)                │
│ payment_id → payments  │          │ payment_id → payments        │
│ notify_id (unique) ⭐   │          │ notification_id (unique) ⭐   │
│ notify_type, notify_time│         │ event_type                   │
│ trade_no (index)       │          │ transaction_id (index)       │
│ out_trade_no (index)   │          │ out_trade_no (index)         │
│ trade_status           │          │ trade_type, trade_state      │
│ subject                │          │ trade_state_desc             │
│ total_amount (元)       │          │ amount_total (分, int64)     │
│ receipt_amount         │          │ amount_payer_total           │
│ buyer_pay_amount       │          │ amount_currency              │
│ point_amount           │          │ payer_openid (index)         │
│ invoice_amount         │          │ mchid, appid                │
│ buyer_id (index)       │          │ sp_mchid (index)             │
│ buyer_logon_id         │          │ sub_mchid (index)            │
│ gmt_create             │          │ sp_appid, sub_appid          │
│ gmt_payment            │          │ bank_type, success_time      │
│ gmt_close              │          │ attach                       │
│ fund_bill_list (JSONB) │          │ promotion_detail (JSONB)     │
│ voucher_detail_list    │          │ raw_body (text)              │
│ passback_params        │          │ created_at                   │
│ raw_body (text)        │          └──────────────────────────────┘
│ created_at             │
└────────────────────────┘
```

### 设计决策

**Q: 为什么每个渠道单独建回调表？**

支付宝和微信的回调参数差异很大：

- 支付宝金额是**元（字符串）**，微信金额是**分（int64）**
- 支付宝有 `buyer_id` / `buyer_logon_id`，微信有 `payer.openid`
- 支付宝有 `fund_bill_list` 资金渠道明细，微信有 `promotion_detail` 优惠
- 支付宝排重用 `notify_id`，微信排重用通知 `id`
- 微信服务商模式有 `sp_mchid` / `sub_mchid` / `sub_appid`

硬塞进统一 JSONB 字段会丢失类型安全，无法建索引，排重靠应用层而非数据库约束。独立建表后：
- 每个字段都有明确的 Go 类型和数据库类型
- 可为关键字段建索引（`trade_no`、`buyer_id`、`payer_openid`）
- `notify_id` / `notification_id` 建 unique index 实现数据库级排重

**Q: 为什么去掉了 `callback_received` 事件？**

之前回调到达时写两条记录：`payment_events` 里一条摘要 + JSONB。现在渠道回调表已完整存储了所有参数 + 原始报文，`callback_received` 事件成为冗余。去掉后事件时间线为：

```
created → channel_request → status_changed → webhook_sent
```

回调详情直接查 `alipay_callbacks` / `wechat_callbacks` 表。

**Q: 排重是怎么做的？**

两层保护：

1. **数据库层**：`notify_id` / `notification_id` 建 unique index，重复入库报唯一约束错误
2. **应用层**：`checkDedup()` 在验签通过后先查回调表是否已有该通知 ID，有则直接返回，不再执行后续的状态更新和 webhook

即使支付宝/微信重复推送同一通知，hydra-pay 也只处理一次。

**Q: payment_events 记录哪些事件？**

| 事件类型 | 触发时机 | 记录内容 |
|---------|---------|---------|
| `created` | 订单创建 | 无 |
| `channel_request` | 渠道 API 响应 | 渠道返回的原始数据 |
| `status_changed` | 状态变更 | from → to |
| `webhook_sent` | Webhook 推送 | payload + 重试次数 / 错误 |

## 代码索引

| 文件 | 职责 |
|------|------|
| `internal/handler/payment_handler.go` | Callback 入口，读 raw body，分发到 service |
| `internal/channel/adapter.go` | Adapter 接口 + CallbackResult（含渠道回调模型） |
| `internal/channel/alipay/alipay.go` | 支付宝适配器：表单解析、RSA2 验签、反查、全部字段提取 |
| `internal/channel/wechat/wechat.go` | 微信适配器：JSON 解析、V3 签名验证、AES-GCM 解密、全部字段提取 |
| `internal/service/payment_service.go` | HandleCallback：排重、保存回调、幂等检查、原子状态更新、Webhook |
| `internal/repository/payment_repo.go` | MarkPaidIfPending：原子 CAS 更新 |
| `internal/repository/event_repo.go` | RecordEvent：追加事件日志 |
| `internal/model/payment.go` | Payment 模型（trade_no 字段） |
| `internal/model/payment_event.go` | PaymentEvent 事件模型 |
| `internal/model/alipay_callback.go` | AlipayCallback 模型（全部支付宝参数） |
| `internal/model/wechat_callback.go` | WeChatCallback 模型（全部微信参数） |
| `pkg/tradeno/tradeno.go` | TradeNo 生成器（22位渠道编码交易号） |
