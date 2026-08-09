# 数据模型

统一类型定义位于 `shared/types.ts`，前端与后端共同引用。

## DataSource

数据源配置在原字段上新增：`collectionMode, collectorType, collectorConfig, lastError, lastRunNewCount`。旧 JSON 数据启动时自动迁移，不改变原字段语义。

`roleHint` 与 `selectionRole` 仅是后续人工选证据时的候选角色建议，可取 `consumer_candidate / market_candidate / background_candidate`。它们不是正式 `evidenceRole`，不得绕过模型输出校验和人工审核。品牌官方发布默认只能建议为 `market_candidate`，不能直接证明消费者偏好。

`publisherName, displaySummary, roleGuidance` 是分析批次页面的显示元数据。候选接口同时返回原始标题、中文摘要、来源名称和建议角色，但不返回预设 `evidenceRole`。

## RawItem

原始资料新增：`collectorType, httpStatus, contentLength, qualityStatus, failureReason`；`publishedAt` 允许为 `null`，避免伪造不存在的发布日期。

- `normalizedUrl` 删除 hash、常见跟踪参数和尾斜杠。
- `contentHash` 是规范化正文的 SHA-256。
- `status` 为 `pending / processed / failed`。

## TrendSignal

趋势信号：`id, sourceItemIds, trendName, brand, productCategory, flavors, consumerNeeds, scenes, sentiment, signalType, confidence, evidence, risk, reviewStatus, reviewer, reviewedAt, isDemo`。

`evidence` 每条包含 `sourceItemId` 与支持判断的 `quote`，用于回到 RawItem 标题、链接和原文。AI 默认只能写入 `pending`。

## ProductConcept

产品概念：`id, sourceSignalIds, productName, flavorCombination, targetAudience, scenes, valueProposition, sellingPoints, risks, aiScore, humanScore, status, isDemo`。

AI 生成默认 `candidate`；只有人工操作可以改成 `selected`。同一时刻只保留一个 selected 产品。

## ValidationResponse

验证反馈：`id, productConceptId, flavorInterest, packagePreference, sceneMatch, purchaseIntent, priceAcceptance, rejectionReasons, openFeedback, submittedAt, isDemo`。

第一阶段仅保存模拟反馈。真实问卷接入时必须增加同意说明、匿名化与数据用途记录。

## JobRun

任务日志新增 `collectionMode` 与 `sourceResults[]`。每个来源子结果记录状态、获取/新增/重复/失败数、错误与耗时。

每次任务从 running 开始，成功或失败都必须落盘并记录耗时。

## B1 AI 数据

- `AIBatch`：Provider、模型、固定 prompt/schema 版本、输入编号、状态、导入哈希与 demo 标记。
- `AIAnalysisRecord`：不可覆盖的 `originalAIOutput`、校验后的 `parsedAIOutput`、可选 `finalHumanVersion`、审核人与字段级修改列表。
- `AIAnalysisRun`：调用模式、耗时、成功/失败、重试、Schema/引文计数、输入输出字符、token 和错误；未知成本为 `null`。
- `AIResultImport`：批次、SHA-256 内容哈希、导入时间与生成的记录编号，用于幂等。
- `TrendCandidate`：正向、反向、市场、背景证据分栏；B1 只建立数据契约和校验，不批量生成趋势。
- `EvaluationRun`：数据集版本、development/holdout、Provider、模型、质量与工程指标、真实性声明。

`EvidenceAnalysisData` 的所有枚举和必填字段由 `server/ai/evidenceSchema.ts` 同时提供 Zod 校验和 JSON Schema 导出。趋势可进入概念生成前至少需要两个独立资料编号，并且必须包含消费者证据；没有反向证据时只能展示“当前样本未发现”，不能写成“没有反向证据”。

## 自动化与实验模型

- `AutomationRun`：整条每日工作流，包含triggerType、幂等键、状态、JobRun/分析批次编号、采集/分析汇总、通知状态、错误摘要、耗时和isDemo。它不替代JobRun。
- `ValidationFlag`：分析记录上的确定性异常，包含type、severity、message、field、status和createdAt。
- `QuoteRepairResult`：originalQuote、RawItem真实连续原文repairedQuote、repairMethod、唯一匹配位置和是否自动修复。
- `ExperimentRun`：experimentType、manual/ai_assisted模式、起止时间、durationMs、样本量、备注与操作者。没有实验就不生成效率结论。
- `DataSource`健康字段：healthStatus、lastFailureAt、consecutiveFailures、lastHttpStatus，并沿用lastError和lastRunNewCount。
