# Cloudflare 生产迁移报告

更新时间：2026-08-10（Asia/Shanghai）

## DONE_REMOTE

- Cloudflare account：`9f259245a1a3139c5929c659deb34791`。
- D1：`genki-lab-production`，database ID `cf94786f-d4cd-4c0d-adc7-84f76fff35de`，区域 APAC。
- 已远端应用 `0001_initial.sql`，共执行 54 条 migration 命令。
- 已从 `data/mock-db.json` 生成幂等 SQL 并导入；100 条查询写入 519 行，导入后 D1 约 0.50 MB。
- 导入完成时全部 15 类动态实体与 JSON 基线计数一致；5 条 RawItem、6 条 B2 分析记录、3 条 ValidationFlag 和最近 AutomationRun 抽样全部存在。
- Worker 与 57 个 Static Assets 已部署到 [https://genki-lab.genki-lab.workers.dev](https://genki-lab.genki-lab.workers.dev)。当前确认版本：`f810498e-e5b3-4a13-b533-e9b637604108`。
- workers.dev 账户子域 `genki-lab` 已启用；Worker 的 workers.dev 与 preview 均启用。
- 已配置服务端 Secrets：`AUTOMATION_SECRET`、`AI_IMPORT_SECRET`、`JOB_SECRET`。值未写入 Git、前端 bundle 或日志。
- Cron 已配置并恢复为 `0 1 * * *`（UTC，即北京时间每天 09:00）。
- 已让 Cloudflare 生产 Cron 实际触发一次完整 LIVE 流程。AutomationRun `automation-193541e4-d321-4f7d-b13f-90ebff2dd1c9` 状态 `success`，3 个来源、1 条新增、0 条失败、耗时 3986 ms。
- 真实采集验证同时覆盖新增与跨任务去重：Coca-Cola 与 KDP 各命中 1 条重复；Pepsi 新增 1 条 LIVE 资料。
- 新增 RawItem：`raw-1bc2cc12d5b45747`，Pepsi 官方标题，正文 3462 字符，发布日期 `2025-07-21`，`qualityStatus=good`，`isDemo=false`。
- 新增待处理批次：`ai-batch-07af6fa0-466d-4dfd-aa91-3605a3a49183`，1 条项目，`provider=manual-json`，`isDemo=false`。未伪装成已自动完成的模型分析。
- 生产运行未出现采集失败、超时或平台限制中断；Free Plan 保守预算仍为最多 3 个来源、8 次外部请求、单响应 1 MB、单来源 8 秒。

## DONE_LOCAL

- Express + JSON 本地模式继续保留；Cloudflare Worker 使用独立 fetch/scheduled 入口、D1Repository 与 Static Assets。
- D1 schema、prepared statement、唯一锁、Idempotency-Key、stale recovery 和 Worker 有界 Collector 已通过测试。
- 本地 D1 seed 连续导入两次，不覆盖已有行、不产生重复行。
- Worker bundle、本地 workerd API、D1、Manual daily、Cron、holdout lock 和 SPA fallback 测试通过。
- 远端 D1 校验允许生产新增行，但要求所有实体不得低于种子基线，且固定抽样必须完整存在。
- Secret 配置脚本只为缺失项生成值；已存在的远端 Secret 绝不覆盖，也不会生成虚假的本地恢复值。

## BLOCKED_EXTERNAL

- 当前中国网络对 `*.workers.dev` 的系统 DNS/TLS 路径异常，导致本机无法稳定直连公网 URL，也无法保持 `wrangler tail` WebSocket。DoH 返回 Cloudflare 正确地址，但本地直连仍被重置。
- 该网络限制不影响 Cloudflare 边缘执行：真实生产 Cron 已由 Cloudflare 调用 Worker，并把完整成功记录、LIVE RawItem 和待处理批次写入远端 D1。
- 因上述限制，本机未取得完整 tail/GraphQL CPU 明细；报告不把缺失的平台指标伪装成已读取。

## NOT_STARTED

- `ARK_API_KEY` / `ARK_MODEL_ID` 尚未配置，自动化分析维持 `pending_provider_configuration`，不影响 Manual Doubao 工作流。
- `MIAODA_WEBHOOK_URL` 与 `FEISHU_NOTIFICATION_WEBHOOK` 尚未配置；它们是后续通知/编排能力，不是本次 Worker、D1、Static Assets、Cron 上线的必要条件。
- 自定义域名尚未绑定；当前正式体验地址使用 workers.dev。

## 结论

Cloudflare Worker、Static Assets、D1、远端 migration、JSON 数据迁移、生产 Cron 与真实 LIVE 采集均已完成。部署状态为 **READY**。唯一未能从当前本机完成的是 workers.dev 公网链路与 tail WebSocket 的直接访问复核，原因是本地网络限制，不是生产执行失败。
