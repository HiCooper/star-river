import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default withMermaid(defineConfig({
  vite: {},
  title: 'Hydra',
  description: 'Hydra 支付基础设施 - 付费墙 + 统一支付网关',
  base: '/',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['link', { rel: 'stylesheet', href: '/custom-mermaid.css' }],
    ['script', { src: '/mermaid-zoom.js' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '产品指南', link: '/guide/', activeMatch: '^/guide/' },
      { text: '技术文档', link: '/dev/', activeMatch: '^/dev/' },
      { text: '内部知识', link: '/knowledge/', activeMatch: '^/knowledge/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '产品指南',
          items: [
            { text: '产品概述', link: '/guide/what-is-hydra' },
            { text: '快速开始', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Hydra-Wall',
          items: [
            { text: '产品介绍', link: '/guide/wall/introduction' },
            { text: '付费墙配置', link: '/guide/wall/paywall-config' },
            { text: '行为触发', link: '/guide/wall/behavioral-targeting' },
            { text: 'A/B 测试', link: '/guide/wall/ab-testing' },
          ],
        },
        {
          text: 'Hydra-Pay',
          items: [
            { text: '产品介绍', link: '/guide/pay/introduction' },
            { text: '支付渠道', link: '/guide/pay/channels' },
            { text: '托管结算页', link: '/guide/pay/hosted-checkout' },
          ],
        },
        {
          text: '收入分析',
          items: [
            { text: '数据看板', link: '/guide/analytics/dashboard' },
            { text: '漏斗分析', link: '/guide/analytics/funnel' },
          ],
        },
      ],
      '/dev/': [
        {
          text: '架构总览',
          items: [
            { text: '架构图集', link: '/dev/diagrams/' },
            { text: '整体架构', link: '/dev/architecture/' },
            { text: '服务独立部署', link: '/dev/architecture/independence' },
            { text: '数据模型', link: '/dev/architecture/data-model' },
          ],
        },
        {
          text: 'Hydra-Wall 架构',
          items: [
            { text: '服务架构', link: '/dev/wall/service-architecture' },
            { text: '核心模块', link: '/dev/wall/core-modules' },
            { text: 'API 参考', link: '/dev/wall/api' },
          ],
        },
        {
          text: 'Hydra-Pay 架构',
          items: [
            { text: '服务架构', link: '/dev/pay/service-architecture' },
            { text: '支付路由', link: '/dev/pay/payment-router' },
            { text: '渠道适配器', link: '/dev/pay/channel-adapters' },
            { text: 'API 参考', link: '/dev/pay/api' },
          ],
        },
        {
          text: '行业参考',
          items: [
            { text: 'Superwall 付费墙渲染流程', link: '/dev/diagrams/superwall-render-flow' },
          ],
        },
        {
          text: 'SDK 集成',
          items: [
            { text: 'SDK 概览', link: '/dev/sdk/' },
            { text: 'iOS SDK', link: '/dev/sdk/ios-sdk' },
            { text: 'Android SDK', link: '/dev/sdk/android-sdk' },
            { text: 'Web SDK', link: '/dev/sdk/web-sdk' },
            { text: 'Flutter SDK', link: '/dev/sdk/flutter-sdk' },
          ],
        },
        {
          text: '集成指南',
          items: [
            { text: '快速集成', link: '/dev/integration/quick-start' },
            { text: '托管模式', link: '/dev/integration/hosted-mode' },
            { text: 'SDK 模式', link: '/dev/integration/sdk-mode' },
          ],
        },
        {
          text: '部署运维',
          items: [
            { text: '开发环境', link: '/dev/deployment/dev-env' },
            { text: '生产部署', link: '/dev/deployment/production' },
            { text: '监控告警', link: '/dev/deployment/monitoring' },
          ],
        },
      ],
      '/knowledge/': [
        {
          text: '内部知识',
          items: [
            { text: '服务访问入口', link: '/knowledge/service-endpoints' },
            { text: '架构决策记录', link: '/knowledge/adr/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hydra-pay' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/hydra-pay/docs/edit/main/:path',
      text: '在 GitHub 上编辑此页',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    outline: {
      level: [2, 3],
      label: '页面导航',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
  },

  markdown: {
    lineNumbers: true,
  },

  mermaid: {
    theme: 'base',
  },

  ignoreDeadLinks: true,
}))
