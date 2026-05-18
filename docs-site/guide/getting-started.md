# 快速开始

## 环境要求

- Node.js 18+
- npm 9+ 或 pnpm 8+

## 安装

```bash
# 克隆文档仓库
git clone https://github.com/hydra-pay/docs.git
cd docs/docs-site

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 查看文档。

## 项目结构

```
docs-site/
├── .vitepress/
│   └── config.ts      # VitePress 配置
├── guide/            # 产品指南
│   ├── wall/         # Hydra-Wall
│   ├── pay/         # Hydra-Pay
│   └── analytics/   # 数据分析
├── dev/              # 技术文档
│   ├── architecture/ # 架构
│   ├── wall/         # Hydra-Wall 详细设计
│   ├── pay/          # Hydra-Pay 详细设计
│   ├── sdk/          # SDK 集成
│   └── deployment/   # 部署运维
├── knowledge/        # 内部知识
│   └── adr/         # 架构决策记录
├── public/           # 静态资源
└── index.md          # 文档首页
```

## 编辑文档

### 创建新文档

在对应目录下创建 `.md` 文件：

```bash
# 创建产品指南
touch guide/new-feature.md

# 创建技术文档
touch dev/architecture/new-module.md
```

### 添加到导航

编辑 `.vitepress/config.ts` 添加链接：

```typescript
sidebar: {
  '/guide/': [
    {
      text: '新功能',
      items: [
        { text: '功能介绍', link: '/guide/new-feature' },
      ],
    },
  ],
}
```

### 文档格式

```markdown
# 页面标题

## 章节标题

内容...

## 代码示例

```typescript
const hydra = new HydraWall({ appId: 'xxx' });
```
```

## 构建发布

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 下一步

- [整体架构](/dev/architecture/)
- [Hydra-Wall 架构](/dev/wall/service-architecture)
- [Hydra-Pay 架构](/dev/pay/service-architecture)
