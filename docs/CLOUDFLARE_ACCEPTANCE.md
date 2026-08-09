# Cloudflare 验收清单

- [x] Worker production bundle 与 Static Assets dry-run
- [x] 本地 D1 migration 与幂等双导入
- [x] `/api/health` 返回 Worker runtime 且不泄露 Secret
- [x] `/api/system/readiness` 返回 D1/Static/Cron/持久化状态
- [x] `/` 与 `/trends` SPA 刷新可用
- [x] 未知 `/api/*` 返回 JSON 404，不被 SPA 吞掉
- [x] 未授权 automation 返回 401
- [x] Manual automation Idempotency-Key 重放返回同一 run
- [x] D1 running 唯一锁与 stale_failed 恢复
- [x] scheduled handler 直接调用 Orchestrator 并落 AutomationRun
- [x] 10 条 holdout 在批次目录可见但全部不可选
- [x] JSON/D1 所有动态实体计数匹配
- [ ] 真实 workers.dev URL
- [ ] 远端 D1 读写与计数匹配
- [ ] 真实 LIVE collection、新增/去重与 pending batch
- [ ] 真实相同 Idempotency-Key 重放
- [ ] 远端 Worker 日志无 CPU/subrequest/memory/timeout 限制错误

未勾选项因 Cloudflare CLI 未认证而未执行，不能宣称已通过。
