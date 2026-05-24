# 星河哨兵

星河哨兵（Star-River Sentinel）是星河支付的 **AI 自动化 Issue 监控与自愈平台**。

## 它解决什么问题？

现有的 Prometheus + Grafana + AlertManager 监控体系只能做到**指标告警**，但无法回答：

- 这个错误是否已经出现过？出现了多少次？
- 相同模式的错误是否应该归并为一个 Issue？
- 这个 bug 的严重程度如何？影响范围多大？
- 哪些 bug 可以自动修复？哪些需要人工介入？

星河哨兵在传统监控之上，补齐了从 **"错误发生 → 智能分诊 → 自动修复 → PR 闭环"** 的全链路自动化。

## 核心能力

```
错误日志 ──→ 智能采集 ──→ AI 分诊 ──→ 自动修复 ──→ PR 闭环
              (Sidecar)   (LLM)      (Coding Agent)  (GitHub)
                                  │
                                  ├── 低风险 → 自动提 PR
                                  └── 高风险 → Dashboard 人工审批
```

| 能力 | 说明 |
|------|------|
| **通用采集** | 新服务接入只需一个 `sentinel.yaml` 配置文件 |
| **智能去重** | Error Signature 算法归并同类错误，避免告警风暴 |
| **AI 分诊** | LLM 自动分类、评估严重性、判断是否可自动修复 |
| **自动修复** | 低风险 bug 自动生成代码修复并提交 PR |
| **安全边界** | 6 层防护，支付/结算/认证代码绝不自动修改 |
| **审批工作流** | 高风险 issue 推送 Dashboard，人工 Approve/Reject/Assign |
| **持续学习** | 人工决策反馈优化 AI 模型，越用越准 |

## 系统概览

| 组件 | 技术栈 | 职责 |
|------|--------|------|
| sentinel-sidecar | Go | 旁路日志采集、错误富化、签名计算 |
| Log Ingest Pipeline | Go | 日志入库 (ClickHouse)、签名聚合、阈值触发 |
| AI Triage Engine | Python (FastAPI) | LLM 错误分类、严重性评估、修复建议 |
| Auto Fix Pipeline | Python + Shell | 代码自动修复、测试验证、PR 创建 |
| Management Dashboard | Next.js + React | Issue 看板、审批队列、统计面板 |

## 快速导航

| 文档 | 说明 |
|------|------|
| [架构设计](./architecture) | 整体架构、组件设计、数据流、安全设计 |
| [sentinel.yaml 参考](./sentinel-yaml-reference) | 服务适配器配置完整参考 |
| [安全规则配置](./safety-rules) | 安全边界配置指南 |
| [自动修复详解](./auto-fix-workflow) | 自动修复完整流程 |
| [服务接入指南](./integration-guide) | 新服务接入星河哨兵 |
| [Dashboard 指南](./dashboard-guide) | 管理后台使用说明 |
| [API 参考](./api-reference) | 平台 API 文档 |
| [排障指南](./troubleshooting) | 常见问题排查 |

## 实施计划

| 阶段 | 目标 | 预计时间 |
|------|------|----------|
| Phase 1 | 日志采集 + 基础看板（"能看见"） | Week 1-2 |
| Phase 2 | AI 分类 + 智能告警（"能判断"） | Week 3-4 |
| Phase 3 | 自动修复 + 审批流（"能自愈"） | Week 5-7 |
| Phase 4 | 持续优化扩展（"更聪明"） | Week 8+ |
