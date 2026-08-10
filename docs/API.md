# API 说明

基地址：本地 `http://localhost:8787`。所有响应均为：

```json
{"success":true,"data":{},"meta":{"timestamp":"ISO-8601","isDemo":true}}
```

错误响应：

```json
{"success":false,"error":{"code":"CODE","message":"说明"},"meta":{"timestamp":"ISO-8601"}}
```

## 正式任务接口

下列接口必须携带请求头 `X-JOB-SECRET`：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| POST | `/api/jobs/collect` | 按 DEMO / LIVE 模式采集，可指定一个或多个来源 |
| POST | `/api/jobs/analyze` | 读取 pending RawItem，生成 TrendSignal |
| POST | `/api/jobs/generate-products` | 读取 confirmed 趋势，生成最多 3 款候选 |
| POST | `/api/jobs/weekly-report` | 生成当前周报快照并记录任务 |
| POST | `/api/ai-batches` | 创建待分析批次；可选 `{itemIds}`，缺省只选待分析 LIVE 资料 |
| GET | `/api/ai-batches/pending` | 查询 pending / dispatched 批次 |
| GET | `/api/ai-batches/candidates` | 查询RawItem与冻结评论的批次资格、两类状态和禁用原因 |
| GET | `/api/ai-batches/:id/export` | 导出固定 prompt、Schema、原文与编号 |
| POST | `/api/ai-batches/:id/execute` | 用当前同步 Provider 执行，或向妙搭 Webhook 派发 |
| POST | `/api/ai-pilots/b2-auto` | 受 `X-JOB-SECRET` 保护；仅复制已完成的原 6 条 Manual Pilot 到获准的 `B2-AUTO-PILOT-01/02/03` 并用 Ark 执行，不自动扩大到 development/holdout |
| POST | `/api/evaluations/run` | `{split:"development"|"holdout"}`，运行受保护评测 |

缺少或错误密钥返回 `401 INVALID_JOB_SECRET`。

`POST /api/ai-batches` 支持 `{itemIds, provider:"manual-doubao"}`。资格判断不使用 `RawItem.status` 代表模型状态：processed资料仍可进入真实分析；有效Manual/Ark结果、活动批次、空原文、无效资料和holdout会被拒绝。development评论与RawItem可以组成同一批次。

采集请求体：

```json
{
  "mode": "live",
  "sourceIds": ["source-rss-fsa-research", "source-brand-coca-media"]
}
```

- `mode` 可为 `demo` 或 `live`，缺省为 `demo`，兼容第一阶段调用。
- `sourceIds` 可省略；省略时运行该模式下所有 `enabled=true` 的来源。
- 为兼容第一阶段，也接受单个 `sourceId`。
- `live` 只有在 `ENABLE_LIVE_COLLECTION=true` 时可运行。
- 多源任务返回 `run.sourceResults[]`；单源失败不会中断其他来源。若所有来源失败，`JobRun.status=failed`，错误仍会持久化。

## 查询与人工操作

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/api/health` | 健康状态与当前适配器 |
| GET | `/api/dashboard` | 看板聚合数据 |
| GET | `/api/job-runs` | 任务日志 |
| GET | `/api/data-sources` | 数据源配置 |
| GET | `/api/raw-items` | 原始资料；可选 `?status=pending` |
| GET | `/api/trend-signals` | 趋势与证据 |
| PATCH | `/api/trend-signals/:id/review` | `{reviewStatus, reviewer}` |
| GET | `/api/product-concepts` | 候选产品 |
| PATCH | `/api/product-concepts/:id` | `{humanScore?, status?}` |
| GET | `/api/validation-summary` | 模拟验证汇总 |
| GET | `/api/ai-analysis-records` | AI 原始输出、解析结果、人工最终版本与来源标记 |
| PATCH | `/api/ai-analysis-records/:id/review` | `{reviewStatus,reviewer,reviewComment?,finalHumanVersion?}` |

AI 分析记录包含两个独立状态维度：`validationStatus` 是机器校验状态，只能为 `validated / auto_repaired / needs_review / rejected`；`reviewStatus` 是人工审核状态，只能为 `pending / confirmed / needs_revision / rejected`。机器校验通过不等于人工已确认，API 与页面不得将两者合并统计。
| GET | `/api/ai-analysis-runs` | AI 调用、导入、耗时、重试、Schema/引文与错误日志 |
| GET | `/api/evaluations` | 冻结评测集摘要与 development / holdout 运行记录 |
| GET | `/api/trend-candidates` | B1 趋势候选数据契约；当前不批量生成 |
| POST | `/api/automation/daily` | 每日采集、去重、运行记录与待分析批次准备；`X-AUTOMATION-SECRET` |
| GET | `/api/automation-runs` | 自动化工作流运行记录 |
| GET | `/api/system/readiness` | 只返回配置布尔值和overall，不返回密钥 |
| GET | `/api/validation-flags` | 确定性校验异常队列 |
| GET | `/api/trend-aggregation/status` | 返回候选聚合或`insufficient_evidence`，不伪造趋势 |
| GET | `/api/experiment-runs` | 效率实验计时记录 |
| POST | `/api/experiment-runs` | 新建实验记录；`X-JOB-SECRET` |

## AI 结果导入

`POST /api/ai-results/import` 使用独立请求头 `X-AI-IMPORT-SECRET`，不接受 `X-JOB-SECRET` 替代。请求体：

```json
{
  "batchId": "ai-batch-...",
  "provider": "manual-doubao",
  "model": "实际模型或端点编号",
  "mode": "manual_import",
  "results": [{"itemId":"raw-...","evidenceRole":"background_evidence","...":"其余必填字段"}]
}
```

服务端对整个请求做稳定序列化后计算 SHA-256。相同批次与相同内容重放返回 `idempotent=true` 且不重复写入；已完成批次的新内容被拒绝。默认STRICT模式下Schema、编号或逐字引文任一失败会整批拒绝并留下失败运行记录；受控AUTOMATED模式逐条校验并允许partial success。

审核状态：`pending / confirmed / needs_revision / rejected`。产品状态：`candidate / selected / rejected`。人工评分范围为 0—100。

## 本地 DEMO 操作入口

当 `ENABLE_DEMO_ACTIONS=true` 时，网页可调用：

- `POST /api/demo/jobs/collect`
- `POST /api/demo/jobs/analyze`
- `POST /api/demo/jobs/generate-products`
- `POST /api/demo/jobs/weekly-report`
- `POST /api/demo/evaluations/run`（只允许 `AI_PROVIDER=mock`）

这些入口复用同一个 JobService，但不要求浏览器持有任务密钥；本地界面也通过它手动运行单个 LIVE 来源。部署或外部演示环境应关闭，并由妙搭调用正式任务接口。
