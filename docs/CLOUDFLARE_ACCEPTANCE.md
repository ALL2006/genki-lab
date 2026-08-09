# Cloudflare 验收清单

- [x] Worker production bundle 与 Static Assets dry-run
- [x] 本地 D1 migration 与幂等双导入
- [x] 远端 D1 创建、migration、seed 导入和基线计数匹配
- [x] `/api/health` 与 `/api/system/readiness` 的 Worker runtime 测试
- [x] `/` 与前端路由的 Static Assets SPA fallback
- [x] 未知 `/api/*` 返回 JSON 404，不被 SPA 吞掉
- [x] 未授权 automation 返回 401
- [x] Manual automation Idempotency-Key 重放返回同一 run（workerd + D1）
- [x] D1 running 唯一锁与 stale recovery
- [x] scheduled handler 直接调用 Orchestrator 并落 AutomationRun
- [x] 10 条 holdout 可见但不可选
- [x] 真实 workers.dev URL 与 Worker/Assets 部署
- [x] Cloudflare 生产 Cron 实际触发
- [x] 真实 LIVE collection 的新增、去重和 pending batch
- [x] Cron 恢复为 `0 1 * * *`
- [x] 生产任务无采集失败、超时或平台限制中断
- [ ] 从当前中国网络直连 workers.dev 并读取完整 tail CPU/subrequest 明细

最后一项受本机 DNS/TLS/WebSocket 网络路径限制。Cloudflare 边缘已经实际执行相同生产 Worker，并把成功 AutomationRun、三个 JobRun、LIVE RawItem 与 pending batch 写入远端 D1；这项限制不阻塞部署 READY。
