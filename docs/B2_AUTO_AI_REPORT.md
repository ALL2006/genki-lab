# B2-AUTO-PILOT-01 生产试运行报告

执行时间：2026-08-09 17:45 UTC

运行环境：Cloudflare Workers + D1 + Ark Responses API

批次：`B2-AUTO-PILOT-01`

对照 Manual 批次：`ai-batch-5b688cdb-c90b-4e1f-9360-789aa6805587`

## 生产配置确认

生产 `/api/system/readiness` 通过 Cloudflare 内部服务绑定返回 HTTP 200：`arkConfigured=true`、`d1Writable=true`、`overall=ready`。实际模型为 `doubao-seed-2-1-pro-260628`。Prompt 与 Schema 均锁定为 `evidence-analysis-v2`。

正式成功 run：`ai-run-15b3d216-f678-416a-850d-e81989f73021`。六条输入按 7000 字符上限拆为 3 个并行 Ark structured-output 请求，关闭深度思考，最终调用与校验耗时 22,881 ms，无重试、无应用错误。

## 硬指标

| 指标 | 结果 | 状态 |
| --- | ---: | --- |
| Schema | 6/6，100% | 通过 |
| itemId | 6/6，100% | 通过 |
| evidenceQuotes 逐字校验 | 4/6，66.7% | 未通过 |
| 自动修复 | 0 | 未发生 |
| needs_review | 0 | 无 |
| rejected | 2 | 需处理 |
| Ark usage | input 9,020 / output 2,506 / total 11,526 tokens | 已返回 |

Quote Repair 共检查 15 条模型引文：14 条 exact、1 条 not_found、0 条 normalized_unique 自动修复；另有 1 条结果未返回任何 evidenceQuotes。空引文已按高风险 quote_mismatch 拒绝，不修改模型原始输出。

## 六条结果与 Manual 对照

| itemId | Ark 证据角色 | Ark 状态 | Manual 证据角色 | 结论 |
| --- | --- | --- | --- | --- |
| R001 | consumer_evidence | validated / pending review | consumer_evidence | 角色一致，引文通过 |
| R006 | consumer_evidence | validated / pending review | consumer_evidence | 角色一致，引文通过 |
| raw-07d8beea6ce57283 | background_evidence | rejected | market_evidence | 1 条引文不在原文，已拒绝 |
| raw-46e9ad9f8081cf10 | irrelevant | validated / pending review | background_evidence | 角色不同，引文通过 |
| raw-5b2dcbb100894040 | background_evidence | rejected | irrelevant | evidenceQuotes 为空，已拒绝 |
| raw-ae96ad5170086080 | background_evidence | validated / pending review | market_evidence | 角色不同，7 条引文通过 |

证据角色与 Manual 一致 2/6。Ark 结果单独存于 Ark batch；Manual batch 仍为 6 条，原创建时间与记录未变，没有覆盖。

## ValidationFlag

- quote_mismatch / high：2 条。
- weak_relevance / warning：3 条。
- open flags 合计：5 条。

## 运行边界

- D1 中 provider=`ark-doubao` 的记录恰好 6 条、6 个不同 itemId。
- 没有运行 39 条 development；既有 evaluation run 数量保持迁移前的 4 条。
- 没有运行 holdout。
- 成功调用使用 3 个 Ark 子请求，未触发 Cloudflare CPU、subrequest、memory 或 timeout 限制。
- 临时内部 runner 已从 Cloudflare 删除；正式 Cron 仍为 `0 1 * * *`。

## Gate 结论

Pilot 为 `partial_success`。Schema 与 itemId 达到 100%，但 quote 硬指标只有 66.7%，因此 **不通过自动扩大到 development 的门槛**。本轮已停止，没有继续运行 development 或 holdout。
