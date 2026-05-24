# 订单超时关单方案

## 当前方案：Scheduled Tasks 表 + 定时 Tick

### 原理

三触点模型：**下单记任务、回调消任务、Tick 执行任务**。

```
下单 → INSERT scheduled_tasks (execute_at = now + 15min, status = pending)
  ↓
回调到达 → UPDATE status = 'cancelled'  （即时取消，不再触发）
  ↓
Tick(30s) → SELECT * FROM scheduled_tasks
            WHERE status = 'pending' AND execute_at <= now()
            LIMIT 50
            ↓
            逐笔调渠道 GetPaymentStatus
            ↓
            TRADE_CLOSED → 更新 payments.status = 'failed'
            TRADE_SUCCESS → 兜底补 paid + 取消任务
            ↓
            UPDATE task.status = 'done'
```

### 数据模型

```sql
CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(64) NOT NULL,    -- order_timeout
    reference_id UUID NOT NULL,        -- payments.id
    execute_at TIMESTAMP NOT NULL,
    status VARCHAR(32) DEFAULT 'pending', -- pending / done / cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_pending ON scheduled_tasks(status, execute_at)
    WHERE status = 'pending';
```

表极轻：正常路径下回调先到 → `cancelled`，只剩「超时未支付」的订单会走到 `done`，绝大多数行在 15 分钟内变成终态。

### 代码位置

| 文件 | 职责 |
|------|------|
| `internal/model/scheduled_task.go` | 模型定义 |
| `internal/repository/scheduled_task_repo.go` | CRUD：Create / CancelByReference / FetchDue / MarkDone |
| `internal/service/payment_service.go:160` | 下单时 Create 任务 |
| `internal/service/payment_service.go:218` | 回调时 CancelByReference |
| `internal/service/order_sync.go` | Tick 触发：取到期任务 → 调渠道查询 → 同步状态 |
| `cmd/server/main.go:67` | `time.NewTicker(30s)` 驱动 SyncExpiredOrders |

### 适合的量级

| 并发订单 | 15 分钟积压待处理任务 | 单次 Tick 扫行数 | 评估 |
|---|---|---|---|
| 10 笔/秒 | ~9000 | ≤50 | ✅ 完全胜任 |
| 100 笔/秒 | ~90,000 | ≤50（分多 Tick 消化） | ✅ 可用 |
| 1000 笔/秒 | ~900,000 | ≤50（需 ~18,000 个 Tick 消化完） | ⚠️ 吃紧 |

**当前方案适合日订单量 10 万以下的场景**。单次 Tick 限 50 设计是故意限流，避免渠道 API 被打爆。Tick 间隔 30s 配合 LIMIT 50 意味着 30 秒最多处理 50 笔到期任务 — 只要每 30 秒到期的任务不超过 50 笔，系统就是稳定的。

瓶颈不在数据库（`scheduled_tasks` 有过滤索引、Scan 行数恒定），而在渠道 `GetPaymentStatus` 的 RTT（单笔 ~500ms，50 笔串行 ~25s）。如果任务积压，Tick 会持续消化直到清空。

---

## 量级增长后的改进路径

### 第一步：渠道查询并行化（x5-x10 倍）

当前逐笔串行查。改为 goroutine 并发：

```go
var wg sync.WaitGroup
sem := make(chan struct{}, 10) // 最多 10 并发
for _, task := range tasks {
    sem <- struct{}{}
    wg.Add(1)
    go func(t ScheduledTask) {
        defer wg.Done()
        defer func() { <-sem }()
        // query channel
    }(task)
}
wg.Wait()
```

50 笔串行 ~25s → 10 并发 ~2.5s。LIMIT 可以放大到 200。

### 第二步：Redis Sorted Set 替代数据库轮询（x10-x100 倍）

```
下单 → ZADD order_timeouts execute_at payment_id
回调 → ZREM order_timeouts payment_id
Tick → ZRANGEBYSCORE order_timeouts -inf now LIMIT 200
      → 执行 → ZREM
```

- 数据库不再承担轮询职责，只做持久化和灾难恢复
- Redis 的 ZSET 操作 O(log N)，百万级条目毫秒响应
- Worker 可以水平扩展，多个实例抢同一 ZSET（ZPOPMIN 原子操作）

### 第三步：时间轮（千万级）

当 Redis 本身成为瓶颈（百万 QPS），引入内存时间轮压到极致：

```
多级时间轮（秒/分/时）
  ↓ tick
到期槽 → channel 发批量消息
  ↓
Worker pool 消费 → 并发查渠道
```

支付宝、微信内部用的就是这个思路。但对 hydra-pay 来说，大概率永远不会到这个量级。

### 演进路线图

```
日订单 1 万       → 当前方案（单 tick 串行）      ✅ 够用
日订单 10 万      → 加并发（10 goroutine）        ✅ 微改
日订单 100 万     → Redis ZSET + 多 worker       🔧 中等改动
日订单 1000 万+   → 时间轮 + 消息队列             🏗️ 架构升级
```

**核心原则**：只对量级需要的复杂度付费。当前第一档。
