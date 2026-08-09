# 妙搭每日自动化配置

状态：代码已就绪，仍需完成公网部署、密钥设置与妙搭节点配置。本手册不会把“代码已就绪”描述为“线上已运行”。

## 前置条件

1. GENKI LAB 已部署到可由妙搭访问的 HTTPS 域名。
2. 服务端设置 `ENABLE_LIVE_COLLECTION=true`。
3. 服务端设置强随机 `X_AUTOMATION_SECRET`，不要放入前端代码或仓库。
4. 用 `GET https://<部署域名>/api/system/readiness` 确认服务、Repository 和数据目录可用。

## 妙搭节点（截图占位）

1. 新建定时任务，建议每天 08:30（Asia/Shanghai）。
2. 添加 HTTP 请求节点。
3. 方法：`POST`。
4. URL：`https://<部署域名>/api/automation/daily`。
5. Headers：

```text
Content-Type: application/json
X-AUTOMATION-SECRET: <在妙搭密钥变量中引用>
Idempotency-Key: daily-{{yyyy-MM-dd}}
```

6. Body：

```json
{
  "triggerType": "miaoda"
}
```

7. 分支判断：HTTP 2xx 且 `success=true` 为可继续；`data.status=partial_success` 时发送需关注通知；`success=false` 或 HTTP 非 2xx 时进入失败分支。
8. 失败分支最多重试 1 次。第二次仍失败则发飞书通知，不继续循环。

> 截图占位：定时触发器、HTTP URL、密钥变量 Header、成功/部分成功/失败分支各一张。截图时遮盖密钥值。

## 响应示例

成功：

```json
{
  "success": true,
  "data": {
    "success": true,
    "automationRunId": "automation-...",
    "status": "success",
    "collection": { "sources": 4, "fetched": 18, "new": 5, "duplicates": 13, "failed": 0 },
    "analysis": { "status": "pending_provider_configuration", "pendingItems": 5, "createdBatches": 1 },
    "durationMs": 3200
  },
  "meta": { "timestamp": "2026-08-09T00:30:00.000Z" }
}
```

部分成功：

```json
{
  "success": true,
  "data": {
    "success": true,
    "automationRunId": "automation-...",
    "status": "partial_success",
    "collection": { "sources": 4, "fetched": 12, "new": 2, "duplicates": 10, "failed": 1 },
    "analysis": { "status": "pending_provider_configuration", "pendingItems": 2, "createdBatches": 1 },
    "durationMs": 6100
  }
}
```

失败（密钥错误示例）：

```json
{
  "success": false,
  "error": { "code": "INVALID_AUTOMATION_SECRET", "message": "X-AUTOMATION-SECRET 缺失或无效。" },
  "meta": { "timestamp": "2026-08-09T00:30:00.000Z" }
}
```

并发或重复触发会返回 `data.skipped=true`，原因分别为 `automation_already_running` 或 `idempotency_key_replayed`，不应再次重试。

## 测试与验收

本地先运行：

```bash
npm run automation:daily:dry
```

部署后用一次性幂等键调用，再检查：

```bash
curl -X POST "https://<部署域名>/api/automation/daily" \
  -H "Content-Type: application/json" \
  -H "X-AUTOMATION-SECRET: <secret>" \
  -H "Idempotency-Key: acceptance-2026-08-09" \
  -d '{"triggerType":"miaoda"}'
```

验收点：生成一条 `AutomationRun`；每个来源有对应 `JobRun`；失败来源只重试一次；`new=0` 不建分析批次；未配置自动 Provider 时只建 pending 批次；重复幂等键不重复执行。
