# GENKI LAB｜元气创新引擎

GENKI LAB 是面向“2026 AI先锋未来人才大赛——元气森林命题”的前端系统原型，覆盖“趋势洞察—产品定义—营销内容—用户验证—数据回流”的饮品创新链路。

> 当前版本为开题阶段前端框架，不代表完整市场研究和真实产品研发结果。

## 当前阶段目标

- 建立视觉完整、结构清晰、响应式的前端框架。
- 明确页面、组件、数据类型和服务层边界。
- 为后续研究资料、候选产品、内容资产和验证结果提供可替换接口。
- 保持零 API Key 依赖，避免使用任何虚构行业数据、评论和结论。

## 页面结构

| 路由 | 页面 | 当前内容 |
| --- | --- | --- |
| `#/dashboard` | 首页 | 系统流程和五个模块入口 |
| `#/research` | 资料与洞察 | 报告、竞品、评论和洞察空状态 |
| `#/trends` | 趋势雷达 | 趋势分析图表框架与三张机会卡 |
| `#/concepts` | 产品概念工坊 | 概念列表、详情、对比和评分框架 |
| `#/content` | 营销内容工厂 | 内容生产流程和资产占位区 |
| `#/validation` | 用户验证与结果 | 测试表单和结果面板框架 |

项目使用 HashRouter，部署到 GitHub Pages 后无需额外配置服务端路由回退。

## 安装

建议使用 Node.js 20 或更高版本。

```bash
npm install
```

## 本地运行

```bash
npm run dev
```

根据终端显示的本地地址在浏览器中打开项目。

## 构建

```bash
npm run build
```

构建产物位于 `dist` 目录。可用以下命令本地预览：

```bash
npm run preview
```

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy-pages.yml`：

1. 将本项目作为仓库根目录推送到 GitHub，并确保默认分支为 `main`。
2. 在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。
3. 推送到 `main`，工作流会安装依赖、构建并部署 `dist`。
4. 也可以在 Actions 页面手动运行该工作流。

`vite.config.ts` 使用相对资源路径，因此无需提前知道仓库名。

## 替换研究数据

1. 核对资料来源并确定团队可以使用。
2. 依据 `src/types/index.ts` 中的 `ResearchSource` 或 `UserComment` 接口整理字段。
3. 将数据加入 `src/data/researchSources.ts` 或 `src/data/comments.ts`。
4. 文件素材放入对应的 `public/assets` 子目录。
5. 后续改为 CSV、飞书或数据库时，只替换 `src/services/researchService.ts`，页面组件可保持不变。

更详细的来源和内容要求见 `docs/CONTENT_GUIDE.md`。

## 添加产品概念

1. 在趋势研究和团队评审完成后，按 `ProductConcept` 接口整理字段。
2. 将候选概念加入 `src/data/products.ts`，每个概念使用唯一 `id`。
3. 包装或产品素材放入 `public/assets/products`。
4. 通过 `productService` 读取，不要在页面组件内硬编码产品数据。

当前“示例产品占位卡”只展示结构，不代表任何具体新品方向。

## 后续接入飞书数据

建议先由飞书多维表格导出 CSV，并在服务层完成字段映射和校验。确认权限、合规、加载状态和错误处理后，再评估飞书开放平台 API。规划详见 `docs/FEISHU_PLAN.md`。

## 当前尚未实现

- 真实行业报告、竞品资料和用户评论。
- 爬虫、真实 AI 模型 API 和真实数据库。
- 飞书开放平台 API、飞书表单连接和 WorkBuddy 自动化。
- 具体研究结论、候选新品和市场模拟数据。
- 海报成品、营销视频、视频播放器、脚本成品和 HyperFrames 工程。
- 真实用户测试提交、统计和结果回流。

## 技术栈

React、Vite、TypeScript、React Router、Lucide React、Recharts、普通 CSS，以及为后续本地测试预留的 localStorage 工具。
