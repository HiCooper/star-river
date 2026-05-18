---
title: 系统架构
description: Hydra 支付基础设施整体分层架构图
---

# Hydra 系统架构

<div class="diagram-canvas">
  <div class="diagram-header">
    <h1 class="diagram-title">Hydra 支付基础设施整体架构图</h1>
    <p class="diagram-subtitle">system architecture with interactions</p>
  </div>

  <!-- Layer Architecture -->
  <div class="layer-architecture">
    
    <!-- Layer 1: Client Applications -->
    <div class="layer">
      <div class="layer-header layer-header--client">
        <span class="badge badge--filled">Layer 1</span>
        <span>客户端应用层 (Client Applications)</span>
        <span class="mono" style="margin-left: auto; color: var(--c-text-sub);">接入方产品</span>
      </div>
      <div class="layer-body">
        <div class="service-box service-box--client">
          <div class="service-header service-header--client">
            <span class="badge badge--client">iOS</span>
            iOS App
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
              </div>
              <div>
                <div class="service-item-name">iOS Application</div>
                <div class="service-item-desc">iPhone / iPad 应用</div>
              </div>
            </div>
          </div>
        </div>

        <div class="service-box service-box--client">
          <div class="service-header service-header--client">
            <span class="badge badge--client">Android</span>
            Android App
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
              </div>
              <div>
                <div class="service-item-name">Android Application</div>
                <div class="service-item-desc">手机 / 平板 应用</div>
              </div>
            </div>
          </div>
        </div>

        <div class="service-box service-box--client">
          <div class="service-header service-header--client">
            <span class="badge badge--client">Web</span>
            Web App
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
              </div>
              <div>
                <div class="service-item-name">Web Application</div>
                <div class="service-item-desc">PC / 移动端 H5</div>
              </div>
            </div>
          </div>
        </div>

        <div class="service-box service-box--client">
          <div class="service-header service-header--client">
            <span class="badge badge--client">Flutter</span>
            Flutter App
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/></svg>
              </div>
              <div>
                <div class="service-item-name">Flutter Application</div>
                <div class="service-item-desc">跨平台移动应用</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Layer 2: SDK Layer -->
    <div class="layer">
      <div class="layer-header layer-header--sdk">
        <span class="badge badge--filled">Layer 2</span>
        <span>SDK 层 (Client SDKs)</span>
        <span class="mono" style="margin-left: auto; color: var(--c-text-sub);">一行代码接入</span>
      </div>
      <div class="layer-body">
        <div class="service-box service-box--client">
          <div class="service-header service-header--client">
            <span class="badge badge--client">SDK</span>
            Hydra SDK
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              </div>
              <div>
                <div class="service-item-name">HydraWall SDK</div>
                <div class="service-item-desc">付费墙 SDK</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              </div>
              <div>
                <div class="service-item-name">HydraPay SDK</div>
                <div class="service-item-desc">支付 SDK</div>
              </div>
            </div>
          </div>
        </div>

        <div class="service-box" style="border-color: var(--c-border);">
          <div class="service-header" style="background: #f1f5f9;">
            <span class="badge">Mode</span>
            接入模式
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-name">Full Hosted</div>
              <div class="service-item-desc">一行代码跳转托管页面</div>
            </div>
            <div class="service-item">
              <div class="service-item-name">Embedded SDK</div>
              <div class="service-item-desc">组件嵌入，灵活定制</div>
            </div>
            <div class="service-item">
              <div class="service-item-name">API Only</div>
              <div class="service-item-desc">纯 API 调用</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Layer 3: Hydra Services -->
    <div class="layer">
      <div class="layer-header layer-header--hydra">
        <span class="badge badge--filled">Layer 3</span>
        <span>Hydra 服务层 (Hydra Services)</span>
        <span class="mono" style="margin-left: auto; color: var(--c-text-sub);">独立服务，独立部署</span>
      </div>
      <div class="layer-body">
        <div class="service-box service-box--wall" style="max-width: 320px;">
          <div class="service-header service-header--wall">
            <span class="badge badge--wall">付费墙</span>
            Hydra-Wall
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
              </div>
              <div>
                <div class="service-item-name">Paywall Engine</div>
                <div class="service-item-desc">规则匹配 / 展示决策</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/></svg>
              </div>
              <div>
                <div class="service-item-name">Entitlement</div>
                <div class="service-item-desc">订阅状态 / 权限管理</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91"/></svg>
              </div>
              <div>
                <div class="service-item-name">Targeting Engine</div>
                <div class="service-item-desc">行为触发 / 用户分群</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/></svg>
              </div>
              <div>
                <div class="service-item-name">Experiment</div>
                <div class="service-item-desc">A/B 测试 / 统计分析</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
              </div>
              <div>
                <div class="service-item-name">Analytics</div>
                <div class="service-item-desc">收入分析 / 漏斗追踪</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
              </div>
              <div>
                <div class="service-item-name">wall-frontend</div>
                <div class="service-item-desc">托管付费墙页面</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Communication Arrow between Wall and Pay -->
        <div style="display: flex; align-items: center; justify-content: center; padding: 0 16px;">
          <div style="text-align: center;">
            <div class="interaction-arrow" style="font-size: 24px;">&lt;- -&gt;</div>
            <div style="font-size: 10px; color: var(--c-text-sub); margin-top: 4px;">API 调用</div>
            <div style="font-size: 9px; color: var(--c-text-sub);">HTTP / gRPC</div>
          </div>
        </div>

        <div class="service-box service-box--pay" style="max-width: 320px;">
          <div class="service-header service-header--pay">
            <span class="badge badge--pay">支付网关</span>
            Hydra-Pay
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06"/></svg>
              </div>
              <div>
                <div class="service-item-name">Payment Router</div>
                <div class="service-item-desc">智能路由 / 熔断降级</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/></svg>
              </div>
              <div>
                <div class="service-item-name">Ledger</div>
                <div class="service-item-desc">订单 / 交易流水 / 对账</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div>
                <div class="service-item-name">Webhook</div>
                <div class="service-item-desc">回调处理 / 事件投递</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <div class="service-item-name">Risk Control</div>
                <div class="service-item-desc">风控 / 反欺诈</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
              </div>
              <div>
                <div class="service-item-name">pay-frontend</div>
                <div class="service-item-desc">托管结算页面</div>
              </div>
            </div>
            <div class="service-item">
              <div class="service-item-icon">
                <svg viewBox="0 0 24 24"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
              </div>
              <div>
                <div class="service-item-name">Channel Adapters</div>
                <div class="service-item-desc">插件化渠道适配</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Layer 4: External Integrations -->
    <div class="layer">
      <div class="layer-header layer-header--external">
        <span class="badge badge--filled">Layer 4</span>
        <span>外部集成层 (External Integrations)</span>
        <span class="mono" style="margin-left: auto; color: var(--c-text-sub);">支付渠道 / 数据库</span>
      </div>
      <div class="layer-body">
        <div class="service-box service-box--channel">
          <div class="service-header service-header--channel">
            <span class="badge badge--channel">CN</span>
            国内渠道
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-name">Alipay</div>
              <div class="service-item-desc">支付宝</div>
            </div>
            <div class="service-item">
              <div class="service-item-name">WeChat Pay</div>
              <div class="service-item-desc">微信支付</div>
            </div>
          </div>
        </div>

        <div class="service-box service-box--channel">
          <div class="service-header service-header--channel">
            <span class="badge badge--channel">INTL</span>
            国际渠道
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-name">Stripe</div>
              <div class="service-item-desc">国际卡支付</div>
            </div>
            <div class="service-item">
              <div class="service-item-name">PayPal</div>
              <div class="service-item-desc">PayPal 支付</div>
            </div>
          </div>
        </div>

        <div class="service-box service-box--channel">
          <div class="service-header service-header--channel">
            <span class="badge badge--channel">IAP</span>
            应用内购买
          </div>
          <div class="service-body">
            <div class="service-item">
              <div class="service-item-name">Apple IAP</div>
              <div class="service-item-desc">iOS 应用内购买</div>
            </div>
            <div class="service-item">
              <div class="service-item-name">Google Billing</div>
              <div class="service-item-desc">Android 应用内购买</div>
            </div>
          </div>
        </div>

        <div class="service-box service-box--db">
          <div class="service-header service-header--db">
            <span class="badge badge--db">DB</span>
            数据库
          </div>
          <div class="service-body">
            <div class="db-box">
              <div class="db-icon">
                <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              </div>
              <div>
                <div class="service-item-name">wall_db</div>
                <div class="service-item-desc">PostgreSQL</div>
              </div>
            </div>
            <div class="db-box">
              <div class="db-icon">
                <svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              </div>
              <div>
                <div class="service-item-name">pay_db</div>
                <div class="service-item-desc">PostgreSQL</div>
              </div>
            </div>
          </div>
        </div>

        <div class="service-box service-box--db">
          <div class="service-header service-header--db">
            <span class="badge badge--db">Cache</span>
            缓存
          </div>
          <div class="service-body">
            <div class="db-box">
              <div class="db-icon">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
              </div>
              <div>
                <div class="service-item-name">Redis Cluster</div>
                <div class="service-item-desc">缓存 / 会话</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Interaction Flows -->
  <div class="interaction-section">
    <div class="interaction-title">核心交互流程</div>

    <!-- Flow 1: Paywall Evaluation -->
    <div class="interaction-flow">
      <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px;">1. 付费墙评估流程</div>
      <div class="interaction-step">
        <div class="interaction-node interaction-node--client">Client App</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--wall">Hydra-Wall</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--wall">Evaluate Paywall</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--wall">返回配置</div>
      </div>
      <div class="interaction-step">
        <div style="font-size: 9px; color: var(--c-text-sub); padding-left: 8px;">SDK: wall.evaluate({userId, trigger})</div>
      </div>
    </div>

    <div style="height: 16px;"></div>

    <!-- Flow 2: Purchase Flow -->
    <div class="interaction-flow">
      <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px;">2. 购买完整流程</div>
      <div class="interaction-step">
        <div class="interaction-node interaction-node--client">Client</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--wall">redirectToPaywall()</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--wall">Wall 托管页</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--pay">Pay 托管页</div>
      </div>
      <div class="interaction-step">
        <div class="interaction-node interaction-node--pay">Channel 扣款</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--channel">Alipay / WeChat</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--pay">Webhook</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--wall">更新 Entitlement</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--client">success_url</div>
      </div>
    </div>

    <div style="height: 16px;"></div>

    <!-- Flow 3: Entitlement Check -->
    <div class="interaction-flow">
      <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px;">3. 权限检查流程</div>
      <div class="interaction-step">
        <div class="interaction-node interaction-node--client">Client</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--wall">checkEntitlement()</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--wall">Redis Cache</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--wall">hasAccess</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--client">返回权限</div>
      </div>
    </div>

    <div style="height: 16px;"></div>

    <!-- Flow 4: Channel Payment -->
    <div class="interaction-flow">
      <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px;">4. 支付渠道调用</div>
      <div class="interaction-step">
        <div class="interaction-node interaction-node--pay">Router 路由</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-label">地区/金额/成功率</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--channel">Alipay Adapter</div>
        <div class="interaction-arrow">-&gt;</div>
        <div class="interaction-node interaction-node--channel">Alipay API</div>
      </div>
      <div class="interaction-step">
        <div class="interaction-node interaction-node--pay">Ledger 记账</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--channel">返回结果</div>
        <div class="interaction-arrow">&lt;-</div>
        <div class="interaction-node interaction-node--pay">更新 Order</div>
      </div>
    </div>
  </div>

  <!-- SDK Integration -->
  <div class="interaction-section">
    <div class="interaction-title">SDK 接入示例</div>
    <div class="sdk-integration">
      <div class="sdk-card">
        <div class="sdk-card-header">
          <span class="badge badge--client">Full Hosted</span>
          托管模式接入
        </div>
        <div class="sdk-card-body">
          <div class="sdk-method">
            <span class="sdk-method-name">Swift</span>
            <span>wall.redirectToPaywall()</span>
          </div>
          <div class="sdk-method">
            <span class="sdk-method-name">Kotlin</span>
            <span>wall.redirectToPaywall()</span>
          </div>
          <div class="sdk-method">
            <span class="sdk-method-name">TS</span>
            <span>wall.redirectToPaywall()</span>
          </div>
        </div>
      </div>

      <div class="sdk-card">
        <div class="sdk-card-header">
          <span class="badge badge--client">Embedded</span>
          嵌入模式接入
        </div>
        <div class="sdk-card-body">
          <div class="sdk-method">
            <span class="sdk-method-name">Swift</span>
            <span>wall.mountPaywall(container)</span>
          </div>
          <div class="sdk-method">
            <span class="sdk-method-name">Kotlin</span>
            <span>wall.mountPaywall(container)</span>
          </div>
          <div class="sdk-method">
            <span class="sdk-method-name">TS</span>
            <span>wall.mountPaywall(container)</span>
          </div>
        </div>
      </div>

      <div class="sdk-card">
        <div class="sdk-card-header">
          <span class="badge badge--client">API</span>
          API 模式接入
        </div>
        <div class="sdk-card-body">
          <div class="sdk-method">
            <span class="sdk-method-name">Swift</span>
            <span>pay.createPayment()</span>
          </div>
          <div class="sdk-method">
            <span class="sdk-method-name">Kotlin</span>
            <span>pay.createPayment()</span>
          </div>
          <div class="sdk-method">
            <span class="sdk-method-name">TS</span>
            <span>pay.createPayment()</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Key Note -->
  <div class="callout">
    <div class="callout-title">核心设计原则</div>
    <div class="callout-body">
      Hydra-Wall 和 Hydra-Pay 是两个独立服务，通过 HTTP/gRPC API 通信。各自有独立数据库（wall_db / pay_db）。
      接入方可以单独使用 Hydra-Pay（已有自建付费墙），或同时使用 Hydra-Wall + Hydra-Pay（完整解决方案）。
    </div>
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
  --c-client: #475569;
  --c-channel: #64748b;
  --c-db: #94a3b8;
  --font-ui: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', Monaco, Consolas, monospace;
}

.layer-architecture {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.layer {
  border: 1px solid var(--c-border);
}

.layer-header {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--c-border);
}

.layer-header--client {
  background: #f1f5f9;
}

.layer-header--sdk {
  background: #e2e8f0;
}

.layer-header--hydra {
  background: #cbd5e1;
}

.layer-header--external {
  background: #e2e8f0;
}

.layer-body {
  padding: 16px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.service-box {
  border: 2px solid var(--c-border);
  min-width: 200px;
  flex: 1;
}

.service-box--client {
  border-color: var(--c-client);
}

.service-box--wall {
  border-color: var(--c-wall);
}

.service-box--pay {
  border-color: var(--c-pay);
}

.service-box--channel {
  border-color: var(--c-channel);
  min-width: 140px;
}

.service-box--db {
  border-color: var(--c-db);
  min-width: 160px;
}

.service-header {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-header--client {
  background: var(--c-client);
  color: white;
}

.service-header--wall {
  background: var(--c-wall);
  color: white;
}

.service-header--pay {
  background: var(--c-pay);
  color: white;
}

.service-header--channel {
  background: var(--c-channel);
  color: white;
}

.service-header--db {
  background: var(--c-db);
  color: white;
}

.service-body {
  padding: 12px;
  font-size: 11px;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.service-item:last-child {
  border-bottom: none;
}

.service-item-icon {
  width: 20px;
  height: 20px;
  border: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-item-icon svg {
  width: 12px;
  height: 12px;
  stroke: var(--c-text-sub);
  stroke-width: 1.5;
  fill: none;
}

.service-item-name {
  font-weight: 500;
}

.service-item-desc {
  color: var(--c-text-sub);
  font-size: 10px;
}

.interaction-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 2px solid var(--c-border);
}

.interaction-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 24px;
}

.interaction-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.interaction-step {
  display: flex;
  align-items: center;
  gap: 12px;
}

.interaction-node {
  border: 1px solid var(--c-border);
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 500;
  min-width: 100px;
  text-align: center;
}

.interaction-node--client {
  border-color: var(--c-client);
  background: #f8fafc;
}

.interaction-node--wall {
  border-color: var(--c-wall);
  background: #f8fafc;
}

.interaction-node--pay {
  border-color: var(--c-pay);
  background: #f8fafc;
}

.interaction-node--channel {
  border-color: var(--c-channel);
  background: #f8fafc;
}

.interaction-arrow {
  font-size: 14px;
  color: var(--c-text-sub);
  flex-shrink: 0;
}

.interaction-label {
  font-size: 9px;
  color: var(--c-text-sub);
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 2px;
}

.callout {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  padding: 12px 16px;
  margin-top: 24px;
  font-size: 11px;
}

.callout-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #92400e;
}

.callout-body {
  color: #a16207;
}

.sdk-integration {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 24px;
}

.sdk-card {
  border: 1px solid var(--c-border);
  padding: 12px;
}

.sdk-card-header {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sdk-card-body {
  font-size: 10px;
  color: var(--c-text-sub);
}

.sdk-method {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.sdk-method-name {
  font-family: var(--font-mono);
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 9px;
}

.db-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.db-icon {
  width: 24px;
  height: 24px;
  border: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.db-icon svg {
  width: 14px;
  height: 14px;
  stroke: var(--c-text-sub);
  stroke-width: 1.5;
  fill: none;
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

.badge--client {
  background: var(--c-client);
  color: var(--c-canvas);
  border-color: var(--c-client);
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

.badge--channel {
  background: var(--c-channel);
  color: var(--c-canvas);
  border-color: var(--c-channel);
}

.badge--db {
  background: var(--c-db);
  color: var(--c-canvas);
  border-color: var(--c-db);
}

.mono {
  font-family: var(--font-mono);
  font-size: 11px;
}
</style>
