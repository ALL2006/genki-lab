# GENKI LAB 协作约束

## 项目事实边界

- `MockCollector`、`MockAIProvider`、模拟验证反馈必须显示 `DEMO DATA` / `isDemo: true`。
- 青提茉莉气泡茶是候选概念，不是已完成研发或市场验证的产品。
- 未接入的飞书、妙搭云端编排和问卷能力不得写成已完成。Ark 豆包仅可描述为“适配器已实现”；没有凭证和成功 smoke 时不得描述为“在线接入成功”。
- 所有 AI 输出必须保留证据编号；人工审核节点不得自动跳过。

## 工程边界

- 根目录是业务前端与 API 工程。
- `video-remotion/` 是独立正式视频工程；除非任务明确要求，否则不要修改。
- `video/` 是历史 HyperFrames 工程，独立保留。
- 任务调度属于飞书妙搭或外部调度器，不写入核心业务服务。

## 开发规则

- 前后端共享类型放在 `shared/types.ts`。
- 页面不得硬编码主要业务数据，统一通过 `src/services/api.ts` 读取 API。
- 数据访问必须通过 `DataRepository`，AI 通过 `AIProvider`，采集通过 `Collector`。
- 正式任务路由必须验证 `X-JOB-SECRET`，密钥不得进入浏览器代码或仓库。
- AI 导入必须验证独立的 `X-AI-IMPORT-SECRET`；不得记录或返回任何密钥。
- 每次任务必须创建 `JobRun`，捕获错误并记录 `durationMs`。
- 新增页面必须提供 loading、empty、error 状态。
- 不开发登录、多租户或复杂权限系统。

## 提交前检查

```bash
npm run lint
npm run typecheck
npm run test:api
npm run build
```

若改变数据契约、接口或演示顺序，同步更新 `docs/` 中对应文档。
