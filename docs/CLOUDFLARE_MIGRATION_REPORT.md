# Cloudflare 迁移状态

## DONE_LOCAL

- 建立 `cloudflare-production` 分支。
- 保留 Express + JSON 本地模式，增加 Worker fetch/scheduled 入口与 D1Repository。
- D1 版本化 Schema、prepared statement/binding、JSON payload 类型还原与索引完成。
- Automation running lock、Idempotency-Key 和 stale_failed 改为 Repository claim；D1 由唯一约束保证多实例互斥。
- 增加 Worker 专用有界 Collector、Static Assets SPA 路由、Cloudflare readiness/health 与结构化日志。
- JSON→D1 幂等 seed、完整计数及 B2 抽样验证通过。
- Worker bundle、本地 D1 API、Manual daily、Cron、holdout lock 与 SPA runtime 测试通过。

## DONE_REMOTE

无。没有真实 workers.dev URL，也没有执行远端 D1 或 LIVE collection。

## BLOCKED_EXTERNAL

- `wrangler whoami` 返回 `You are not authenticated`。
- 状态：`BLOCKED_BY_CLOUDFLARE_AUTH`。
- 解除方式：只需先执行 `npx wrangler login`；随后重新运行 `npm run cloudflare:setup`。

## NOT_STARTED

- 创建/确认远端 `genki-lab-production` D1 并写入真实 database_id。
- 设置必要 Secret、应用远端 migration、导入与计数验证。
- 部署 Worker/Static Assets、验证 workers.dev、真实 LIVE collection、Cron 和 Free Plan 日志。
