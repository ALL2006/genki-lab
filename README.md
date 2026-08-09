# GENKI LAB｜元气创新引擎

面向“2026 AI先锋未来人才大赛｜元气森林企业命题”的可运行 MVP。第一阶段闭环保留不变，第二阶段 A 已加入真实公开数据采集；第二阶段 B1 已加入真实 AI 接入基础设施、严格证据校验、Manual JSON 导入和冻结评论评测集。

> 真实性边界：`MockCollector`、`MockAIProvider` 和验证反馈仍为 DEMO；真实采集资料标记为 LIVE。当前环境未配置 Ark 密钥，因此没有声称已经完成豆包在线调用。公开资料、消费者评论证据和市场背景严格分层；青提茉莉仍是待验证的概念产品。

## 当前完成范围

- 六个 API 驱动页面：运行、数据源、趋势、产品概念、用户验证、模型评测。旧路由保持不变。
- Express + TypeScript API，统一成功/失败响应格式。
- JSON 文件持久化的 `MockRepository`，刷新与重启后数据仍保留。
- 可替换采集层：保留 `MockCollector`，新增 RSS/Atom、普通文章、配置式列表页采集器。
- 实时采集安全边界：超时、有限重试与退避、按域名间隔、明确 User-Agent、HTTP 状态检查、2 MB 响应上限、单源失败隔离。
- 公开来源配置：英国食品标准局研究 RSS、The Coca-Cola Company 官方媒体中心、政府公开统计文章。
- 四种 AI 路径：Mock、Ark Responses API、妙搭 Webhook、Manual JSON 批次导出/导入。
- Zod strict Schema、itemId 对齐、逐字引文、证据角色与概念资格校验；整批拒绝与内容哈希幂等。
- 49 条冻结人工评论评测集，固定 39 条 development / 10 条 holdout，记录质量、耗时、失败与重试指标。
- 趋势人工审核与产品人工评分/入围机制。
- 每次任务记录状态、数量、异常与 `durationMs`。
- 可替换的 Repository、Collector、AI Provider 接口及飞书/豆包占位实现。

本阶段没有接入飞书多维表格、用户问卷、产品转视频或妙搭云端编排；Ark 适配器已实现，但因本机没有凭证尚未完成在线 smoke。没有修改 `video-remotion` 或 `video`。

## 技术栈

- 前端：React、Vite、TypeScript、React Router、Lucide React、普通 CSS。
- 后端：Node.js、Express、TypeScript。
- 采集：Node 原生 Fetch、Cheerio、fast-xml-parser。
- 持久化：本地 JSON 文件（默认 `data/mock-db.json`）。
- 验证：TypeScript、ESLint、Node 集成测试、Vite production build。

## 快速启动

环境要求：Node.js 20+，npm 10+。

```bash
npm install
copy .env.example .env
npm run dev
```

默认地址：

- 网页：`http://localhost:5173`
- API：`http://localhost:8787`

`npm run dev` 同时启动网页与 API。Vite 将 `/api` 代理到 8787 端口。

### 启用真实采集

在 `.env` 中设置 `ENABLE_LIVE_COLLECTION=true`，并把 `LIVE_COLLECTION_USER_AGENT` 改成带有团队联系信息的标识。界面上的实时数据源按钮会调用服务端采集，密钥不会进入前端。生产或外部演示环境应关闭 `/api/demo/jobs/*`，由受保护正式端点触发。

## 正式任务密钥

以下任务端点必须携带 `X-JOB-SECRET`：

```bash
curl -X POST http://localhost:8787/api/jobs/collect \
  -H "Content-Type: application/json" \
  -H "X-JOB-SECRET: your-secret" \
  -d '{"mode":"live","sourceIds":["source-rss-fsa-research"]}'
```

密钥只读取服务端环境变量 `X_JOB_SECRET`，不会进入前端源码。网页中的按钮调用 `/api/demo/jobs/*`，仅用于本地演示；部署前应设置 `ENABLE_DEMO_ACTIONS=false`。

## 推荐演示顺序

1. 在“运行”页点击“运行采集”，看到新增 5 条。
2. 再运行一次采集，看到重复 5 条、新增 0 条。
3. 点击“运行分析”，进入“趋势”查看证据并人工确认。
4. 进入“产品概念”，生成 3 款候选，人工评分并选择入围。
5. 进入“用户验证”，展示明确标记的模拟反馈、V1/V2 和保留/修改/淘汰建议。

完整 3—5 分钟脚本见 [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)。

## 工程命令

```bash
npm run dev          # 同时启动 API 与 Vite
npm run dev:api      # 仅 API
npm run dev:web      # 仅网页
npm run lint         # ESLint
npm run typecheck    # 前端、服务端和测试类型检查
npm run test:api     # API 闭环集成测试
npm run test:collectors # 本地 fixtures 与采集安全测试（不联网）
npm run test:ai      # Schema、引文、Ark 重试/超时、导入幂等、39/10 隔离
npm run test:live    # 可选公网冒烟测试，要求显式启用 LIVE
npm run test:automation # 自动化、幂等、校验、批次与holdout保护测试
npm run automation:daily:dry # 只读展示每日自动化计划
npm run automation:daily # 执行每日真实自动化链路
npm run ai:prepare-development # 固定生成39条development的4个批次文件
npm run ai:evaluate-holdout # 仅在显式解锁后运行holdout
npm run start:prod   # Express托管dist与API
npm run build        # TypeScript + Vite production build
npm run check        # 依次执行全部检查
```

## 目录

```text
shared/                 前后端共享数据契约
server/                 API、任务服务、适配器与工具
src/                    React 页面、组件和 API 客户端
data/mock-db.json       运行时 DEMO 数据（已 gitignore）
tests/                  API 闭环集成测试
docs/                   复赛背景、架构、接口、部署与演示文档
video-remotion/         现有正式视频工程，本阶段不修改
video/                  历史 HyperFrames 工程，独立保留
```

## 文档索引

- [比赛背景](docs/COMPETITION_BACKGROUND.md)
- [系统架构](docs/ARCHITECTURE.md)
- [总工作台视觉与文案规范](docs/WORKSPACE_VISUAL_COPY_GUIDE.md)
- [真实采集运行说明](docs/LIVE_COLLECTION.md)
- [数据源配置指南](docs/DATA_SOURCE_CONFIG.md)
- [数据合规边界](docs/DATA_COMPLIANCE.md)
- [API](docs/API.md)
- [数据模型](docs/DATA_MODEL.md)
- [飞书表结构](docs/FEISHU_TABLE_SCHEMA.md)
- [妙搭自动化](docs/MIAODA_AUTOMATION.md)
- [妙搭每日配置手册](docs/MIAODA_DAILY_AUTOMATION_SETUP.md)
- [妙搭早晨清单](docs/MIAODA_MORNING_CHECKLIST.md)
- [AI Provider](docs/AI_PROVIDER.md)
- [评论评测集](docs/EVALUATION_DATASET.md)
- [部署](docs/DEPLOYMENT.md)
- [Demo 脚本](docs/DEMO_SCRIPT.md)
- [12 天路线图](docs/ROADMAP_12_DAYS.md)
- [夜间冲刺报告](docs/OVERNIGHT_SPRINT_REPORT.md)
- [早晨验收清单](docs/MORNING_ACCEPTANCE_CHECKLIST.md)
