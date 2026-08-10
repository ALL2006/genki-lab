# 部署说明

## 本地

```bash
npm install
copy .env.example .env
npm run dev
```

## 构建检查

```bash
npm run check
```

网页产物为 `dist/`。`npm run start:prod`启动Express并同源托管前端与 `/api`，浏览器不需要直接访问8787之外的第二地址。JSON数据目录必须挂载到持久卷。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| PORT | 否 | API 端口，默认 8787 |
| X_JOB_SECRET | 部署必填 | 正式任务共享密钥 |
| DATA_DIR | 否 | 所有JSON持久化根目录，默认`./data`，容器建议`/data` |
| ENABLE_DEMO_ACTIONS | 部署必填 | 正式环境设为 false |
| AI_PROVIDER | 否 | mock / ark-doubao / miaoda-webhook / manual-json |
| ARK_API_KEY | Ark 必填 | 仅服务端读取 |
| ARK_MODEL_ID | Ark 必填 | 实际端点或模型编号 |
| ARK_BASE_URL | 否 | 默认方舟北京 `api/v3` |
| ARK_TIMEOUT_MS / ARK_MAX_RETRIES | 否 | AI 超时与有限重试 |
| AI_IMPORT_SECRET | 部署必填 | AI 回调/手工导入独立密钥 |
| AI_BATCH_CALLBACK_URL | 妙搭模式必填 | 妙搭接收批次的 HTTPS 地址 |
| X_AUTOMATION_SECRET | 自动化必填 | 每日自动化入口独立密钥 |
| FEISHU_NOTIFICATION_WEBHOOK | 否 | 自动化摘要通知；未配置时使用Noop |
| AUTOMATION_STALE_MS | 否 | running任务超时标记阈值 |
| ENABLE_HOLDOUT_EVALUATION | 否 | 默认false；冻结提示词后一次性评测才启用 |

## 部署建议

第一阶段可采用“静态前端 + Node API + 持久卷”。若跨域部署，需在反向代理层将 `/api` 转发到 API，或显式配置受控 CORS。不要只部署 GitHub Pages：静态 Pages 无法提供本阶段 API 与持久化。

上线前：设置长随机密钥、关闭 DEMO 操作入口、限制请求体、启用 HTTPS、配置日志保留与备份。第二阶段切换飞书后，Mock JSON 仅保留为本地演示后备。

## Docker

```bash
docker compose build
docker compose up -d
curl http://localhost:8787/api/health
```

compose把命名卷挂载到`/data`。`.env`不会进入镜像；密钥由运行时环境注入。当前JSON Repository只支持单实例进程，不能水平扩容多个写入副本。
