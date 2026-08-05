# AI Provider 与证据校验

## 当前实现

`AIProvider` 的 B1 主入口是 `analyzeEvidence(items)`。旧的第一阶段 `analyzeLegacy` 与 `generateProducts` 只由 `MockAIProvider` 保留，避免把旧 DEMO 趋势误认为真实 AI 结果。

| Provider | `AI_PROVIDER` | 传输 | 自动化 | 真实性边界 |
| --- | --- | --- | --- | --- |
| MockAIProvider | `mock` | 同步 | 是 | `DEMO AI`，固定关键词基线 |
| ArkDoubaoAIProvider | `ark-doubao` | 同步 HTTPS | 是 | 只有配置真实密钥并成功调用才是 LIVE AI |
| MiaodaWebhookAIProvider | `miaoda-webhook` | Webhook + 回调导入 | 是 | B1 仅实现 HTTP 适配器，不实现妙搭编排 |
| ManualJsonAIProvider | `manual-json` | 批次导出 / JSON 导入 | 否 | 可用于豆包企业版人工操作，记录为 `manual-doubao` |

服务端记录 provider、model、mode、是否自动化、是否 demo、输入/输出字符数、token（响应存在时）、重试、耗时、失败、Schema 与引文通过数。无法从响应确定的成本保持 `null`，不做猜测。

## 火山方舟接口选择

B1 使用火山方舟 OpenAI 兼容的 Responses 路径：

- Base URL：`https://ark.cn-beijing.volces.com/api/v3`
- Endpoint：`POST /responses`
- 鉴权：`Authorization: Bearer $ARK_API_KEY`
- 模型：由 `ARK_MODEL_ID` 显式配置，不在代码中写死“最新模型”
- 结构化输出：请求体使用 `text.format.type=json_schema` 与 strict Schema

依据是火山方舟[官方快速入门](https://www.volcengine.com/docs/82379/1795150)和[官方 Structured Output 文档](https://www.volcengine.com/docs/82379/1958523)。由于本机当前没有 `ARK_API_KEY` 与 `ARK_MODEL_ID`，B1 只完成离线请求契约、重试/超时测试和 Manual JSON 真实可用路径；正式模型兼容性必须在有凭证后运行 smoke test确认，不能写成已调用成功。

## 证据 Schema

每条结果严格包含：

`itemId, evidenceRole, relevanceScore, relevanceReason, brands, productCategories, flavors, consumerNeeds, scenes, positiveSignals, negativeSignals, riskSignals, signalType, evidenceQuotes, confidence, eligibleForConceptGeneration`。

服务端进行第二层确定性校验：

1. Zod strict object，缺字段、额外字段、错误 enum 或越界分数均失败。
2. `itemId` 必须与批次输入逐项一致，不能缺失、重复或跨批次。
3. 每个 `evidenceQuotes.quote` 必须是原始正文在空白规范化后的连续子串；空引文失败。
4. 公开 `RawItem` 和品牌官方新闻不得标为 `consumer_evidence`。
5. 只有 `consumer_evidence` 可直接设置 `eligibleForConceptGeneration=true`。
6. `irrelevant` 的 `signalType` 必须为 `other`。

任一条失败会拒绝整次导入，不写入部分有效结果；失败仍写 `AIAnalysisRun`。原始 AI JSON 保存在 `originalAIOutput`，人工审核版本另存为 `finalHumanVersion`，不能覆盖原输出。

## 超时与重试

Ark 默认 30 秒超时、最多 2 次重试。仅网络失败、超时、408、425、429 和常见 5xx 进入有限指数退避；Schema、JSON 解析和业务证据错误不盲目重试。测试覆盖 429、500、重试成功和 Abort 超时。

## 配置示例

```env
AI_PROVIDER=ark-doubao
ARK_API_KEY=server-only-secret
ARK_MODEL_ID=your-endpoint-or-model-id
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_TIMEOUT_MS=30000
ARK_MAX_RETRIES=2
AI_IMPORT_SECRET=another-server-only-secret
```

密钥只存在于后端环境变量。健康接口只返回 Provider 元数据，不返回任何密钥；前端也不持有 `X-JOB-SECRET` 或 `AI_IMPORT_SECRET`。
