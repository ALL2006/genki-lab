# GENKI LAB MVP 架构

## 目标

在第一阶段闭环上，把采集入口扩展为 DEMO / LIVE 双模式，同时保持 AI、飞书和视频边界不变。

## 运行结构

```text
React/Vite
  └─ /api → Express API
              ├─ JobService（业务编排、计时、异常）
              ├─ DataRepository
              │    ├─ MockRepository（当前，JSON 持久化）
              │    └─ FeishuBitableRepository（占位）
              ├─ CollectorRouter
              │    ├─ MockCollector（DEMO）
              │    ├─ RSSCollector（RSS / Atom）
              │    ├─ GenericArticleCollector（单篇文章）
              │    └─ ConfigurableListCollector（列表 + 正文）
              ├─ LiveHttpClient（超时、重试、限频、正文上限）
              └─ AIProvider
                   ├─ MockAIProvider（离线基线，DEMO）
                   ├─ ArkDoubaoAIProvider（Responses API）
                   ├─ MiaodaWebhookAIProvider（仅 HTTP 适配）
                   └─ ManualJsonAIProvider（导出 / 导入）
              ├─ AIAnalysisService（批次、Schema、逐字引文、幂等、审核）
              └─ EvaluationService（冻结 39/10 评测与指标）
```

生产环境使用同一业务 Service，但替换运行适配器：

```text
React dist ── Workers Static Assets
/api/*     ── worker/index.ts ── Service ── D1Repository ── D1
Cron 01:00 UTC ──────────────── DailyAutomationOrchestrator
```

本地 `MockRepository` 与 Node Collector 保留；Worker 使用受请求数、响应字节和超时约束的 Web API Collector。两种运行时共享 `DataRepository`、`JobService`、`AIAnalysisService` 与每日自动化逻辑。D1 的部分唯一索引负责 running lock 和 Idempotency-Key，不依赖 Worker 进程内状态。

## 关键边界

- 前端只依赖 HTTP API，不读取 `server/` 或运行时 JSON。
- `JobService` 不感知飞书妙搭；后续由妙搭通过 HTTP 调用受保护任务端点。
- 正式任务端点验证 `X-JOB-SECRET`。本地网页使用可关闭的 `/api/demo/jobs/*`。
- Repository、Collector、AIProvider 通过接口替换，页面和核心流程不绑定具体平台。
- LIVE 来源失败按来源隔离；一次批任务同时记录总指标与 `sourceResults`。
- 实时采集默认关闭，不支持登录态、验证码、绕过反爬或社交平台抓取。
- `ProductConcept → ProductVideoConfig` 不属于第一阶段。
- `video-remotion/` 不依赖本系统运行，也未在本阶段修改。

## 持久化与并发

默认数据库文件是 `data/mock-db.json`，首次访问时写入数据源配置和明确标记的模拟验证反馈。每次写入进入串行队列，避免同一进程内并发写互相覆盖。该实现适合单机 Demo，不适合作为生产数据库。

## 任务生命周期

1. 先保存 `status=running` 的 JobRun。
2. 执行业务步骤并累计 fetched/new/duplicate/processed/failed。
3. 采集任务逐源执行，每个来源单独保存耗时、计数和错误。
4. 部分成功时总任务为 success，同时保留失败源的 errorMessage；全部失败时总任务为 failed。
5. 所有结果保存 finishedAt 与 durationMs。

## 每日自动化与安全持久化

妙搭后续只调用一次 `POST /api/automation/daily`。`DailyAutomationOrchestrator` 在GENKI LAB内部完成来源枚举、逐源采集、有限重试、去重、AutomationRun汇总和待分析批次准备。AutomationRun描述整条工作流，JobRun继续描述单个采集业务任务，两者不混用。

同一进程和持久化running记录共同阻止并发执行；相同 `Idempotency-Key` 返回已有结果。超时running记录只标记 `stale_failed`，不删除。所有JSON通过 `DataPathResolver(DATA_DIR)` 定位，并使用临时文件+rename原子替换；损坏文件保留并阻止覆盖。

AI导入提供STRICT和AUTOMATED两种校验：STRICT任一失败整批拒绝；AUTOMATED逐条产生validated/auto_repaired/needs_review/rejected，并用确定性ValidationFlag把异常送入人工复核。

## 部署演进

第二阶段 A 已完成公开采集。第二阶段 B1 已完成可替换 AI 基础设施、证据校验、Manual JSON 兜底、49 条评论评测集和 39/10 冻结评测；本机无 Ark 凭证，因此 Ark 在线成功调用仍是 B2 前置验证。飞书 Repository、妙搭云端编排、问卷和视频转换仍不在 B1 范围。
