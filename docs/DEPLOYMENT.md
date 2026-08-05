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

网页产物为 `dist/`。当前 API 使用 `tsx server/index.ts` 运行，适合本地或单进程 Node 服务。JSON 数据文件必须挂载到持久卷。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| PORT | 否 | API 端口，默认 8787 |
| X_JOB_SECRET | 部署必填 | 正式任务共享密钥 |
| MOCK_DB_PATH | 否 | JSON 数据文件路径 |
| ENABLE_DEMO_ACTIONS | 部署必填 | 正式环境设为 false |
| AI_PROVIDER | 否 | mock / ark-doubao / miaoda-webhook / manual-json |
| ARK_API_KEY | Ark 必填 | 仅服务端读取 |
| ARK_MODEL_ID | Ark 必填 | 实际端点或模型编号 |
| ARK_BASE_URL | 否 | 默认方舟北京 `api/v3` |
| ARK_TIMEOUT_MS / ARK_MAX_RETRIES | 否 | AI 超时与有限重试 |
| AI_IMPORT_SECRET | 部署必填 | AI 回调/手工导入独立密钥 |
| AI_BATCH_CALLBACK_URL | 妙搭模式必填 | 妙搭接收批次的 HTTPS 地址 |

## 部署建议

第一阶段可采用“静态前端 + Node API + 持久卷”。若跨域部署，需在反向代理层将 `/api` 转发到 API，或显式配置受控 CORS。不要只部署 GitHub Pages：静态 Pages 无法提供本阶段 API 与持久化。

上线前：设置长随机密钥、关闭 DEMO 操作入口、限制请求体、启用 HTTPS、配置日志保留与备份。第二阶段切换飞书后，Mock JSON 仅保留为本地演示后备。
