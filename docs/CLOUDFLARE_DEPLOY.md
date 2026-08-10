# Cloudflare 生产部署

正式地址：[https://genki-lab.genki-lab.workers.dev](https://genki-lab.genki-lab.workers.dev)

## 自动化部署

完成一次 `npx wrangler login` 后，执行 `npm run cloudflare:setup`。脚本会幂等完成 D1 检测/创建、写入真实 `database_id`、远端 migration、JSON seed 生成与导入、远端基线验证、production build、Worker/Static Assets 部署与必要 Secret 配置。seed 使用 `INSERT OR IGNORE`，不会覆盖已有生产数据。

`npm run cloudflare:secrets` 会检查远端 Secret，只为缺失的必要项生成并上传值。已存在的 Secret 保持不变；本次实际设置的可恢复值保存在被 Git 忽略的 `.wrangler/production-secrets.local.json`，不会打印到终端。

## 环境与 Secret

必要 Secret：`AUTOMATION_SECRET`、`AI_IMPORT_SECRET`、`JOB_SECRET`。

可选：`ARK_API_KEY`、`ARK_MODEL_ID`、`MIAODA_WEBHOOK_URL`、`FEISHU_NOTIFICATION_WEBHOOK`。它们未配置时，对应 readiness 会显示未配置；系统不会伪装成自动模型分析已启用。

非敏感运行限制位于 `wrangler.jsonc`：`MAX_SOURCES_PER_AUTOMATION`、`MAX_FETCHES_PER_SOURCE`、`MAX_TOTAL_EXTERNAL_FETCHES`、`SOURCE_TIMEOUT_MS`、`MAX_RESPONSE_BYTES`、`AUTOMATION_STALE_MS`、`BUILD_VERSION`。Cron 为 `0 1 * * *`，即北京时间每天 09:00。

## 命令

```bash
npm run cf:dev
npm run cf:dev:scheduled
npm run cf:test
npm run cloudflare:setup
npm run cloudflare:secrets
npm run cloudflare:verify
npm run cf:tail
```

本地开发仍运行 `npm run dev`，使用 Express 与 JSON Repository。Cloudflare 生产不读取 `DATA_DIR`、不写 Worker 本地文件，也不运行 Express `listen()`；持久化全部进入 D1。
