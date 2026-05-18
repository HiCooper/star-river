---
title: 架构总览
description: Hydra 支付基础设施架构总览、Wall/Pay 详细架构
---

# Hydra 架构总览

## Hydra 支付基础设施架构总览

<div class="diagram-canvas">
  <div class="diagram-header">
    <h1 class="diagram-title">Hydra 支付基础设施架构总览</h1>
    <p class="diagram-subtitle">hydra-wall & hydra-pay system architecture</p>
  </div>

  <div class="independence-diagram">
    <div class="service-box service-box--wall">
      <div class="service-header service-header--wall">
        <span class="badge badge--filled">付费墙</span>
        Hydra-Wall (自建 Superwall)
      </div>
      <div class="service-body">
        <div class="service-item">
          <span class="item-label">代码仓库</span>
          <span class="item-value">hydra-wall</span>
        </div>
        <div class="service-item">
          <span class="item-label">端口</span>
          <span class="item-value">8080</span>
        </div>
        <div class="service-item">
          <span class="item-label">数据库</span>
          <span class="item-value">wall_db</span>
        </div>
        <div class="service-item">
          <span class="item-label">主要功能</span>
          <span class="item-value">付费墙引擎 / 权限管理 / A/B测试</span>
        </div>
      </div>
    </div>

    <div class="service-box service-box--pay">
      <div class="service-header service-header--pay">
        <span class="badge badge--filled">支付网关</span>
        Hydra-Pay (自建 Stripe)
      </div>
      <div class="service-body">
        <div class="service-item">
          <span class="item-label">代码仓库</span>
          <span class="item-value">hydra-pay</span>
        </div>
        <div class="service-item">
          <span class="item-label">端口</span>
          <span class="item-value">8081</span>
        </div>
        <div class="service-item">
          <span class="item-label">数据库</span>
          <span class="item-value">pay_db</span>
        </div>
        <div class="service-item">
          <span class="item-label">主要功能</span>
          <span class="item-value">支付路由 / 渠道适配 / 账务系统</span>
        </div>
      </div>
    </div>
  </div>

  <h3 style="margin-top: 32px; font-size: 14px;">客户端 SDK 支持</h3>
  <table class="sdk-table">
    <thead>
      <tr>
        <th>SDK 平台</th>
        <th>iOS SDK</th>
        <th>Android SDK</th>
        <th>Web SDK</th>
        <th>Flutter SDK</th>
        <th>Unity SDK</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th>Hydra-Wall</th>
        <td>Swift</td>
        <td>Kotlin</td>
        <td>TypeScript</td>
        <td>Dart</td>
        <td>C#</td>
      </tr>
      <tr>
        <th>Hydra-Pay</th>
        <td>Swift</td>
        <td>Kotlin</td>
        <td>TypeScript</td>
        <td>Dart</td>
        <td>C#</td>
      </tr>
    </tbody>
  </table>

  <h3 style="margin-top: 32px; font-size: 14px;">Hydra-Pay 支持的支付渠道</h3>
  <div class="channel-grid">
    <div class="channel-item">
      <div class="channel-name">Alipay</div>
      <div class="channel-desc">支付宝</div>
    </div>
    <div class="channel-item">
      <div class="channel-name">WeChat Pay</div>
      <div class="channel-desc">微信支付</div>
    </div>
    <div class="channel-item">
      <div class="channel-name">Stripe</div>
      <div class="channel-desc">国际支付</div>
    </div>
    <div class="channel-item">
      <div class="channel-name">Apple IAP</div>
      <div class="channel-desc">应用内购买</div>
    </div>
    <div class="channel-item">
      <div class="channel-name">Google Billing</div>
      <div class="channel-desc">应用内购买</div>
    </div>
  </div>
</div>

## Hydra-Wall 详细架构

<div class="diagram-canvas">
  <div class="diagram-header">
    <h1 class="diagram-title">Hydra-Wall 详细架构</h1>
    <p class="diagram-subtitle">paywall service architecture</p>
  </div>

  <div class="arch-grid">
    <div class="arch-column">
      <div class="arch-section">
        <div class="arch-section-header">
          <span class="badge">Layer 1</span>
          客户端 SDK
        </div>
        <div class="arch-section-body">
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">iOS SDK</div>
              <div class="node-desc">Swift / UIKit / SwiftUI</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Android SDK</div>
              <div class="node-desc">Kotlin / Jetpack Compose</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Web SDK</div>
              <div class="node-desc">TypeScript / React / Vue</div>
            </div>
          </div>
        </div>
      </div>

      <div class="arch-section">
        <div class="arch-section-header">
          <span class="badge">Mode</span>
          接入模式
        </div>
        <div class="arch-section-body">
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Full Hosted 托管模式</div>
              <div class="node-desc">一行代码跳转，无需自建 UI</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Embedded SDK 嵌入模式</div>
              <div class="node-desc">组件嵌入，灵活定制</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="arch-column">
      <div class="arch-section">
        <div class="arch-section-header">
          <span class="badge">Core</span>
          核心服务 (wall-service)
        </div>
        <div class="arch-section-body">
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Paywall Engine</div>
              <div class="node-desc">规则匹配 / 展示决策 / 模板渲染</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Entitlement Service</div>
              <div class="node-desc">订阅状态 / 权限判定 / 试用管理</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Targeting Engine</div>
              <div class="node-desc">行为触发 / 用户分群 / 条件规则</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Experiment Service</div>
              <div class="node-desc">A/B 测试 / 分组分配 / 统计计算</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Offer Manager</div>
              <div class="node-desc">Plans / Offers / 促销规则</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Analytics</div>
              <div class="node-desc">收入分析 / 漏斗追踪 / 实时监控</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flow-section">
    <div class="flow-title">付费流程</div>
    <div class="flow-diagram">
      <div class="flow-step flow-step--wall">用户触发</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--wall">Wall评估</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--wall">托管付费墙</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--pay">Pay托管结算</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--wall">更新权限</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--wall">success_url</div>
    </div>
  </div>
</div>

## Hydra-Pay 详细架构

<div class="diagram-canvas">
  <div class="diagram-header">
    <h1 class="diagram-title">Hydra-Pay 详细架构</h1>
    <p class="diagram-subtitle">payment gateway architecture</p>
  </div>

  <div class="arch-grid">
    <div class="arch-column">
      <div class="arch-section">
        <div class="arch-section-header">
          <span class="badge">Layer 1</span>
          客户端 SDK
        </div>
        <div class="arch-section-body">
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">iOS SDK</div>
              <div class="node-desc">Swift</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Android SDK</div>
              <div class="node-desc">Kotlin</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Web SDK</div>
              <div class="node-desc">TypeScript</div>
            </div>
          </div>
        </div>
      </div>

      <div class="arch-section">
        <div class="arch-section-header">
          <span class="badge">Mode</span>
          接入模式
        </div>
        <div class="arch-section-body">
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Full Hosted</div>
              <div class="node-desc">一行代码跳转托管结算页</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Embedded SDK</div>
              <div class="node-desc">支付表单 iframe 嵌入</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">API Only</div>
              <div class="node-desc">纯 API，接入方自建 UI</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="arch-column">
      <div class="arch-section">
        <div class="arch-section-header">
          <span class="badge">Core</span>
          核心服务 (pay-service)
        </div>
        <div class="arch-section-body">
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Payment Router</div>
              <div class="node-desc">智能路由 / 失败重试 / 熔断降级</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Ledger Service</div>
              <div class="node-desc">订单管理 / 交易流水 / 对账清算</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Webhook Manager</div>
              <div class="node-desc">回调处理 / 事件投递 / 重试机制</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-icon">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="node-info">
              <div class="node-name">Risk Control</div>
              <div class="node-desc">风控规则 / 反欺诈 / 限流</div>
            </div>
          </div>
        </div>
      </div>

      <div class="arch-section">
        <div class="arch-section-header">
          <span class="badge">Adapter</span>
          渠道适配器 (插件化)
        </div>
        <div class="arch-section-body">
          <div class="node-row">
            <div class="node-info">
              <div class="node-name">Alipay Adapter</div>
              <div class="node-desc">扫码 / App / JSAPI</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-info">
              <div class="node-name">WeChat Adapter</div>
              <div class="node-desc">扫码 / JSAPI / 小程序</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-info">
              <div class="node-name">Stripe Adapter</div>
              <div class="node-desc">Checkout / Payment Intent</div>
            </div>
          </div>
          <div class="node-row">
            <div class="node-info">
              <div class="node-name">Apple IAP Adapter</div>
              <div class="node-desc">应用内购买 / 订阅验证</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flow-section">
    <div class="flow-title">支付流程</div>
    <div class="flow-diagram">
      <div class="flow-step flow-step--pay">POST /v1/payments/create</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--pay">Router 路由</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--pay">Channel Adapter</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--pay">渠道扣款</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--pay">Webhook</div>
      <div class="flow-arrow">-></div>
      <div class="flow-step flow-step--pay">更新订单</div>
    </div>
  </div>

  <div class="flow-section">
    <div class="flow-title">熔断降级策略</div>
    <table class="sdk-table">
      <thead>
        <tr>
          <th>条件</th>
          <th>Primary</th>
          <th>Fallback 1</th>
          <th>Fallback 2</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>区域内：中国</td>
          <td>Alipay</td>
          <td>WeChat Pay</td>
          <td>Stripe</td>
        </tr>
        <tr>
          <td>区域内：海外</td>
          <td>Stripe</td>
          <td>Alipay</td>
          <td>-</td>
        </tr>
        <tr>
          <td>Apple 设备订阅</td>
          <td>Apple IAP</td>
          <td>Stripe</td>
          <td>-</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<style>
:root {
  --c-bg: #f8fafc;
  --c-canvas: #ffffff;
  --c-border: #cbd5e1;
  --c-text-main: #0f172a;
  --c-text-sub: #64748b;
  --c-wall: #1e293b;
  --c-pay: #334155;
  --font-ui: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', Monaco, Consolas, monospace;
}

.diagram-canvas {
  background: var(--c-canvas);
  border: 2px solid var(--c-border);
  padding: 32px;
  max-width: 1400px;
  margin: 0 auto 40px auto;
}

.diagram-header {
  border-bottom: 1px solid var(--c-border);
  padding-bottom: 16px;
  margin-bottom: 32px;
}

.diagram-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--c-text-main);
}

.diagram-subtitle {
  font-size: 12px;
  font-weight: 500;
  color: var(--c-text-sub);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.badge {
  display: inline-block;
  font-size: 9px;
  font-family: var(--font-mono);
  padding: 2px 6px;
  border: 1px solid var(--c-text-main);
  text-transform: uppercase;
  font-weight: 500;
}

.badge--filled {
  background: var(--c-text-main);
  color: var(--c-canvas);
}

.badge--wall {
  background: var(--c-wall);
  color: var(--c-canvas);
  border-color: var(--c-wall);
}

.badge--pay {
  background: var(--c-pay);
  color: var(--c-canvas);
  border-color: var(--c-pay);
}

.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}

.arch-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.arch-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.arch-section {
  border: 1px solid var(--c-border);
}

.arch-section-header {
  background: #f1f5f9;
  padding: 8px 12px;
  border-bottom: 1px solid var(--c-border);
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.arch-section-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.node-row:last-child {
  border-bottom: none;
}

.node-icon {
  width: 32px;
  height: 32px;
  border: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-icon svg {
  width: 16px;
  height: 16px;
  stroke: var(--c-text-sub);
  stroke-width: 1.5;
  fill: none;
}

.node-info {
  flex: 1;
}

.node-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--c-text-main);
}

.node-desc {
  font-size: 11px;
  color: var(--c-text-sub);
  margin-top: 2px;
}

.flow-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--c-border);
}

.flow-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
}

.flow-diagram {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.flow-step {
  border: 1px solid var(--c-border);
  padding: 8px 12px;
  font-size: 12px;
  text-align: center;
  min-width: 100px;
}

.flow-step--wall {
  border-color: var(--c-wall);
  background: #f8fafc;
}

.flow-step--pay {
  border-color: var(--c-pay);
  background: #f8fafc;
}

.flow-arrow {
  font-size: 16px;
  color: var(--c-text-sub);
}

.independence-diagram {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 24px;
}

.service-box {
  border: 2px solid var(--c-border);
}

.service-box--wall {
  border-color: var(--c-wall);
}

.service-box--pay {
  border-color: var(--c-pay);
}

.service-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
  font-weight: 600;
  font-size: 14px;
}

.service-header--wall {
  background: var(--c-wall);
  color: white;
}

.service-header--pay {
  background: var(--c-pay);
  color: white;
}

.service-body {
  padding: 12px;
  font-size: 12px;
}

.service-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.service-item:last-child {
  border-bottom: none;
}

.item-label {
  color: var(--c-text-sub);
}

.item-value {
  font-family: var(--font-mono);
  font-size: 11px;
}

.sdk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 16px;
}

.sdk-table th,
.sdk-table td {
  border: 1px solid var(--c-border);
  padding: 8px 12px;
  text-align: left;
}

.sdk-table th {
  background: #f1f5f9;
  font-weight: 600;
}

.sdk-table td {
  font-family: var(--font-mono);
  font-size: 11px;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.channel-item {
  border: 1px solid var(--c-border);
  padding: 8px;
  text-align: center;
  font-size: 11px;
}

.channel-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.channel-desc {
  font-size: 10px;
  color: var(--c-text-sub);
}
</style>
