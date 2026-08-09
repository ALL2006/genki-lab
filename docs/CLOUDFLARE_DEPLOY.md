# Cloudflare 生产部署

## 用户第一次只需做三件事

1. 注册或登录 Cloudflare。
2. 在项目目录执行 `npx wrangler login` 完成一次浏览器授权。
3. 按提示设置必要 Secret：`npx wrangler secret put AUTOMATION_SECRET` 与 `npx wrangler secret put AI_IMPORT_SECRET`。

完成授权后执行 `npm run cloudflare:setup`。脚本会幂等完成 D1 检测/创建、把真实 `database_id` 写入 `wrangler.jsonc`、远端 migration、JSON seed 生成与导入、计数验证、production build、Worker/Static Assets 部署和公网 smoke test。已有 D1 数据使用 `INSERT OR IGNORE`，不会被 seed 覆盖。

## 生产 Secret

必要：`AUTOMATION_SECRET`、`AI_IMPORT_SECRET`。为受保护的 Manual Batch 写操作配置 `JOB_SECRET`。可选：`ARK_API_KEY`、`ARK_MODEL_ID`、`MIAODA_WEBHOOK_URL`、`FEISHU_NOTIFICATION_WEBHOOK`。Secret 不写入 `wrangler.jsonc`、前端 bundle、Git 或日志。

## 非敏感运行限制

`wrangler.jsonc` 默认限制单次自动化最多 3 个来源、单源最多 2 个结果、总外部请求 8、来源超时 8 秒、单响应 1 MB。Cron 是 `0 1 * * *`，Cloudflare 按 UTC 解释，即北京时间每天 09:00。

## 常用命令

```bash
npm run cf:dev
npm run cf:dev:scheduled
npm run cf:test
npm run cloudflare:setup
npm run cloudflare:verify
npm run cf:tail
```

本地开发仍运行 `npm run dev`，使用 Express 与 JSON Repository。Cloudflare 生产不读取 `DATA_DIR`，不写本地文件，也不运行 Express `listen()`。
