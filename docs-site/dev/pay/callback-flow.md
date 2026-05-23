# 回调处理流程

本文档描述 hydra-pay 如何处理支付渠道（以支付宝为例）的异步回调通知，包括回调参数、处理流程、数据模型选择和设计决策。

## 支付宝异步通知参数

支付宝通过 `POST application/x-www-form-urlencoded` 发送异步通知，完整参数如下：

| 参数 | 示例值 | 说明 |
|------|--------|------|
| `notify_time` | `2026-05-23 17:42:44` | 通知发送时间 |
| `notify_type` | `trade_status_sync` | 通知类型，固定值 |
| `notify_id` | `notify_20240523001` | 通知唯一 ID，支付宝侧用于去重 |
| `sign_type` | `RSA2` | 签名算法，固定 `RSA2`（SHA256WithRSA） |
| `sign` | `d6DrRT9ZgGtL...` | RSA2 签名（base64）。对所有参数按 key 升序排列后拼接，用支付宝私钥签名 |
| `out_trade_no` | `58edcf81-...` | 商户订单号，即 hydra-pay 生成的 `payment_id` |
| `trade_no` | `2026052322001418720508426247` | 支付宝交易号，退款/对账的核心凭证 |
| `trade_status` | `TRADE_SUCCESS` | 交易状态：`TRADE_SUCCESS`（支付成功）、`TRADE_FINISHED`（交易结束）、`TRADE_CLOSED`（交易关闭）、`WAIT_BUYER_PAY`（等待付款） |
| `total_amount` | `0.01` | 订单金额（元） |
| `subject` | `测试订单` | 商品标题 |
| `body` | `测试订单` | 商品描述 |
| `gmt_create` | `2026-05-23 17:37:47` | 交易创建时间 |
| `gmt_payment` | `2026-05-23 17:42:44` | 交易付款时间 |
| `app_id` | `9021000164603147` | 应用 ID |
| `seller_id` | `2088721101618715` | 卖家支付宝用户 ID |
| `seller_email` | `emg***@sandbox.com` | 卖家支付宝账号（脱敏） |
| `buyer_id` | `2088722101618725` | 买家支付宝用户 ID |
| `buyer_logon_id` | `mgn***@sandbox.com` | 买家支付宝账号（脱敏） |
| `receipt_amount` | `0.01` | 实收金额（元） |
| `invoice_amount` | `0.01` | 开票金额（元） |
| `buyer_pay_amount` | `0.01` | 买家实付金额（元） |
| `point_amount` | `0.00` | 积分支付金额（元） |
| `fund_bill_list` | `[{"amount":"0.01","fundChannel":"ALIPAYACCOUNT"}]` | 支付渠道明细（JSON 数组） |
| `charset` | `utf-8` | 字符编码 |
| `version` | `1.0` | 接口版本 |

### 交易状态映射

| 支付宝 trade_status | hydra-pay 内部状态 | 处理方式 |
|---------------------|-------------------|---------|
| `TRADE_SUCCESS` | `paid` | 标记已支付，触发 webhook |
| `TRADE_FINISHED` | `paid` | 同上（交易结束，不可退款） |
| `TRADE_CLOSED` | `failed` | 标记失败 |
| `WAIT_BUYER_PAY` | `pending` | 不更新状态，仅记录事件 |

---

## 微信支付异步通知参数

微信支付 V3 回调通过 `POST application/json` 发送，商户需要从加密的 `resource` 中解密出交易数据。

### 通知外层结构

| 字段 | 示例值 | 说明 |
|------|--------|------|
| `id` | `ev-20240115120500001` | 通知唯一 ID |
| `create_time` | `2024-01-15T12:05:00+08:00` | 通知创建时间（RFC3339） |
| `event_type` | `TRANSACTION.SUCCESS` | 事件类型，支付成功为 `TRANSACTION.SUCCESS` |
| `resource_type` | `encrypt-resource` | 固定值 |
| `summary` | `支付成功` | 事件摘要 |

### 验签 HTTP Header

微信支付回调验签不在 body 中，而在 HTTP Header 中：

| Header | 示例值 | 说明 |
|--------|--------|------|
| `Wechatpay-Timestamp` | `1705291500` | 签名时间戳（Unix 秒） |
| `Wechatpay-Nonce` | `5K8264ILTKCH16CQ2502SI8ZNMTM67VS` | 签名随机串 |
| `Wechatpay-Signature` | `WECHATPAY/SHA256withRSA ...` | RSA 签名（base64） |
| `Wechatpay-Serial` | `5157F09EFDC096DE15EBE81A47057A7232F1B8E1` | 平台证书序列号 |

**验签算法**：构造消息 `timestamp\nnonce\nbody\n`，用微信支付平台证书公钥验证 RSA-SHA256 签名。平台证书由 SDK 从微信服务器自动下载并自动刷新。

### resource 加密字段（AEAD_AES_256_GCM 解密后）

| 参数 | 示例值 | 说明 |
|------|--------|------|
| `out_trade_no` | `58edcf81-...` | 商户订单号，即 hydra-pay 生成的 `payment_id` |
| `transaction_id` | `4200001234567890` | 微信支付交易号，退款/对账的核心凭证 |
| `trade_state` | `SUCCESS` | 交易状态（见下方状态说明） |
| `trade_state_desc` | `支付成功` | 交易状态描述 |
| `trade_type` | `NATIVE` | 交易类型（NATIVE/JSAPI/APP/MINIPROGRAM） |
| `bank_type` | `OTHERS` | 付款银行 |
| `success_time` | `2024-01-15T12:05:00+08:00` | 支付完成时间 |
| `amount.total` | `1` | 订单金额（分） |
| `amount.currency` | `CNY` | 币种 |
| `amount.payer_total` | `1` | 用户实付金额（分） |
| `payer.openid` | `oUpF8uMuAJO_M2pxb1Q9zNjWeS6o` | 支付用户 OpenID |
| `mchid` | `1234567890` | 商户号 |

### 交易状态映射

| 微信 trade_state | hydra-pay 内部状态 | 处理方式 |
|-----------------|-------------------|---------|
| `SUCCESS` | `paid` | 标记已支付，触发 webhook |
| `NOTPAY` | `pending` | 不更新，仅记录事件 |
| `USERPAYING` | `pending` | 不更新，仅记录事件 |
| `CLOSED` | `failed` | 标记失败 |
| `PAYERROR` | `failed` | 标记失败 |
| `REFUND` | `refunded` | 标记已退款 |

### 支付宝 vs 微信回调对比

| 维度 | 支付宝 | 微信支付 V3 |
|------|--------|-------------|
| Content-Type | `application/x-www-form-urlencoded` | `application/json` |
| 签名位置 | body 中的 `sign` 参数 | HTTP Header `Wechatpay-Signature` |
| 签名算法 | RSA2（SHA256WithRSA） | RSA-SHA256，签名消息 `timestamp\nnonce\nbody\n` |
| 数据加密 | 明文，签名保护 | AEAD_AES_256_GCM 加密 `resource`，需 APIv3 密钥解密 |
| 验签公钥 | 商户配置 `ALIPAY_ALIPAY_PUBLIC_KEY` | SDK 自动下载微信平台证书 |
| 成功响应 | `success` 纯文本 | `{"code":"SUCCESS","message":"ok"}` JSON |
| 交易号字段 | `trade_no` | `transaction_id` |

## 回调处理全流程

```
支付宝 POST form-encoded body
  {out_trade_no, trade_no, trade_status, sign, ...}
        │
        ▼
┌─ Handler (payment_handler.go:139) ──────────────────────────────┐
│                                                                   │
│  1. 读取 raw body（io.ReadAll，不绑定 JSON）                       │
│     │ 支付宝回调是 form-encoded，WeChat 是 JSON，各渠道自行解析   │
│  2. 收集 HTTP Headers（WeChat 验签需要）                          │
│  3. 构造 CallbackData{RawBody, Headers}                          │
│  4. 调用 service.HandleCallback()                                │
│  5. 返回 "success" 纯文本                                         │
│     │ 支付宝收到 success 后停止重复通知                            │
│     │ WeChat 返回 JSON {"code":"SUCCESS"}                        │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─ AlipayAdapter.VerifyCallback (alipay.go:165) ──────────────────┐
│                                                                   │
│  1. url.ParseQuery(rawBody) → url.Values                         │
│                                                                   │
│  2. SDK VerifySign(values) → RSA2 验签                           │
│     │                                                             │
│     │ 验签算法:                                                   │
│     │   a. 过滤 sign / sign_type / alipay_cert_sn               │
│     │   b. 其余参数按 key 字母顺序升序排列                         │
│     │   c. 拼接为 key1=value1&key2=value2&...                    │
│     │   d. 用 ALIPAY_ALIPAY_PUBLIC_KEY 验证 RSA-SHA256 签名     │
│     │   e. 签名不匹配 → 返回 INVALID_SIGNATURE，流程终止         │
│     │                                                             │
│  3. 提取关键字段: out_trade_no, trade_no, total_amount,           │
│     trade_status, notify_id                                       │
│                                                                   │
│  4. 反查 alipay.trade.query（防重放攻击）                         │
│     │ 回调可能被伪造重放，主动查询确认交易真实存在                  │
│     │ 查询失败 → 回退使用回调中的 trade_status                   │
│                                                                   │
│  5. 返回 CallbackResult{                                         │
│       ChannelTxID: trade_no（支付宝交易号）,                      │
│       PaymentID:   out_trade_no（订单 ID）,                      │
│       Status:      paid / failed / pending,                      │
│       Amount:      金额（分）,                                    │
│     }                                                             │
└────────────────────┬──────────────────────────────────────────────┘
                     │
                     ▼
┌─ PaymentService.HandleCallback (payment_service.go:163) ─────────┐
│                                                                   │
│  1. 记录事件: callback_received（原始 body + 解析结果）           │
│                                                                   │
│  2. uuid.Parse(result.PaymentID) → 查数据库                       │
│     │ 找不到记录 → 返回 NOT_FOUND                                │
│                                                                   │
│  3. 幂等检查:                                                    │
│     │ status 已是 paid 或 refunded → 跳过，返回 success          │
│     │ 日志: callback ignored: already in terminal state          │
│     │ 为什么重要: 支付宝可能重复推送同一通知                       │
│                                                                   │
│  4. 状态转换（原子操作）:                                        │
│     │ MarkPaidIfPending:                                          │
│     │   UPDATE payments                                           │
│     │   SET status='paid', external_id=trade_no, paid_at=NOW()   │
│     │   WHERE id=? AND status IN ('pending','processing')        │
│     │                             │                               │
│     │ 原子 WHERE 条件防止并发回调竞态                              │
│     │ 返回 RowsAffected=0 → 已被另一回调处理，安全跳过            │
│                                                                   │
│  5. 记录事件: status_changed（from → to）                         │
│                                                                   │
│  6. 异步通知 hydra-wall:                                         │
│     │ go safeNotifyWall()                                         │
│     │ POST wall_webhook_url                                       │
│     │ 3 次重试: 1s → 5s → 15s                                   │
│     │ 成功/失败均记录事件: webhook_sent                           │
└──────────────────────────────────────────────────────────────────┘
```

## 数据模型设计

### 为什么拆成两张表

```
payments (订单主表)                    payment_events (事件日志表)
┌──────────────────────────┐          ┌──────────────────────────────┐
│ id                       │◄─────────│ payment_id                   │
│ app_id, user_id          │          │ type:                        │
│ amount, currency         │          │   created         → 下单     │
│ channel                  │          │   channel_request → 渠道响应  │
│ status（唯一权威状态）     │          │   callback_received→ 回调到达 │
│ external_id（支付宝交易号）│          │   status_changed  → 状态变更 │
│ metadata                 │          │   webhook_sent    → Wall通知 │
│ paid_at                  │          │ channel                      │
└──────────────────────────┘          │ raw_body（完整原始回调参数）   │
                                      │ result（解析结果，JSONB）      │
                                      │ error（错误信息）              │
                                      │ created_at                   │
                                      └──────────────────────────────┘
```

### 设计决策

**Q: 为什么不把回调数据放在 payments 表的一个 JSONB 字段里？**

一笔支付订单可能收到多次回调（支付宝重推、网络重试），放在单表 JSONB 里会被覆盖，丢失以下信息：

- 支付宝一共回调了几次？
- 第一次和第二次回调的参数是否一致？
- 有没有验签失败的回调？失败那次 sign 值是什么？

这些问题在对账、纠纷排查、安全审计时至关重要。

**Q: payment_events 记录哪些事件？**

| 事件类型 | 触发时机 | 记录内容 |
|---------|---------|---------|
| `created` | 订单创建（Insert） | 无 |
| `channel_request` | 支付宝 API 响应 | 渠道返回的原始数据 |
| `callback_received` | 回调到达且验签通过 | **完整原始回调 body** + 解析结果 |
| `status_changed` | 状态变更 | from → to |
| `webhook_sent` | 通知 Wall 成功/失败 | webhook payload + 重试次数 / 错误 |

**Q: 事件表是只追加的吗？**

是。`payment_events` 只有 INSERT，没有 UPDATE 或 DELETE。每笔支付从创建到完成的所有关键动作都保留完整记录，可重建完整时间线。

## 回调验证的安全性

### 验签链路

```
支付宝私钥 → sign 参数                              hydra-pay 侧
     │                                                   │
     ▼                                                   ▼
sorted_params = "key1=val1&key2=val2&..."    ALIPAY_ALIPAY_PUBLIC_KEY
sign = RSA_SHA256(privateKey, sorted_params)  →  VerifySign(values)
                                                     │
                                               ┌──────┴──────┐
                                               │ 通过 → 继续   │
                                               │ 失败 → 拒绝   │
                                               └─────────────┘
```

### 防重放

验签通过后，反查 `alipay.trade.query` 确认交易真实存在于支付宝侧。攻击者无法伪造支付宝的查询响应，也无法重放历史回调（sign 和时间窗口绑定）。

### 幂等保护

```sql
UPDATE payments SET status='paid', ... 
WHERE id=? AND status IN ('pending','processing')
```

WHERE 条件保证同一条订单不会被重复标记为已支付。即使支付宝重复推送同一通知，第二次回调进入时 `status='paid'` 已被跳过。

## 代码索引

| 文件 | 职责 |
|------|------|
| `internal/handler/payment_handler.go:139` | Callback 入口，读 raw body，分发到 service |
| `internal/channel/alipay/alipay.go:165` | 支付宝适配器：表单解析、RSA2 验签、反查、状态映射 |
| `internal/channel/wechat/wechat.go:200` | 微信适配器：JSON 解析、V3 签名验证、AEAD 解密 |
| `internal/service/payment_service.go:163` | HandleCallback：事件记录、幂等检查、原子状态更新、Webhook |
| `internal/repository/payment_repo.go:75` | MarkPaidIfPending：原子 CAS 更新 |
| `internal/repository/event_repo.go:30` | RecordEvent：追加事件日志 |
| `internal/model/payment_event.go` | PaymentEvent 模型定义 |