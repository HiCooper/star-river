# 技术文档

## 概述

本节包含 Hydra 支付基础设施的详细技术文档。

## 内容导航

### 架构总览

- [整体架构](/dev/architecture/) - 系统整体架构设计
- [服务独立部署](/dev/architecture/independence) - 两个服务的独立部署设计
- [数据模型](/dev/architecture/data-model) - 核心数据模型设计

### Hydra-Wall 架构

- [服务架构](/dev/wall/service-architecture) - Wall Service 架构设计
- [核心模块](/dev/wall/core-modules) - Paywall Engine、Entitlement Service 等
- [API 参考](/dev/wall/api) - REST API 详细文档

### Hydra-Pay 架构

- [服务架构](/dev/pay/service-architecture) - Pay Service 架构设计
- [支付路由](/dev/pay/payment-router) - 智能路由和熔断降级
- [渠道适配器](/dev/pay/channel-adapters) - 插件化渠道适配
- [API 参考](/dev/pay/api) - REST API 详细文档

### SDK 集成

- [SDK 概览](/dev/sdk/) - 客户端 SDK 简介
- [iOS SDK](/dev/sdk/ios-sdk) - Swift SDK 使用指南
- [Android SDK](/dev/sdk/android-sdk) - Kotlin SDK 使用指南
- [Web SDK](/dev/sdk/web-sdk) - TypeScript SDK 使用指南
- [Flutter SDK](/dev/sdk/flutter-sdk) - Dart SDK 使用指南

### 集成指南

- [快速集成](/dev/integration/quick-start) - 快速接入指南
- [托管模式](/dev/integration/hosted-mode) - Full Hosted 模式接入
- [SDK 模式](/dev/integration/sdk-mode) - SDK 嵌入模式接入

### 部署运维

- [开发环境](/dev/deployment/dev-env) - 本地开发环境搭建
- [生产部署](/dev/deployment/production) - 生产环境部署
- [监控告警](/dev/deployment/monitoring) - 监控和告警配置

## 快速链接

- [整体架构](/dev/architecture/) - 开始了解技术架构
