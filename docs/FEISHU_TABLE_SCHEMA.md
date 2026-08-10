# 飞书多维表格 Schema

第二阶段建议建立一个 Base，按下列数据表映射。字段名优先使用英文 API 名，中文作为显示名。

## 1. DataSources｜数据源配置

主键 `id`。字段：name、type（单选）、entryUrl（URL）、crawlMethod、keywords（多选）、schedule、enabled（复选框）、lastSuccessAt（日期时间）、failureCount（数字）、notes（多行文本）。

## 2. RawItems｜原始资料

主键 `id`。sourceId 关联 DataSources；title、rawText、summary、publishedAt、fetchedAt、originalUrl、normalizedUrl、contentHash、rawPayload、status、isDemo。对 normalizedUrl、contentHash 建唯一性检查视图。

## 3. TrendSignals｜趋势信号

主键 `id`。sourceItemIds 关联 RawItems；trendName、brand、productCategory、flavors、consumerNeeds、scenes、sentiment、signalType、confidence、evidence（JSON 文本或子表）、risk、reviewStatus、reviewer、reviewedAt、isDemo。

建议视图：待审核、已确认、需修订、已拒绝；默认按 confidence 降序，但不能自动确认。

## 4. ProductConcepts｜产品概念

主键 `id`。sourceSignalIds 关联 TrendSignals；productName、flavorCombination、targetAudience、scenes、valueProposition、sellingPoints、risks、aiScore、humanScore、status、isDemo。

## 5. ValidationResponses｜用户反馈

主键 `id`。productConceptId 关联 ProductConcepts；flavorInterest、packagePreference、sceneMatch、purchaseIntent、priceAcceptance、rejectionReasons、openFeedback、submittedAt、isDemo。

## 6. JobRuns｜运行日志

主键 `id`。jobType、sourceId、startedAt、finishedAt、status、fetchedCount、newCount、duplicateCount、processedCount、failedCount、errorMessage、durationMs、isDemo。

建议视图：今日失败、连续失败数据源、最近 7 天成功率、耗时异常。

## 7. EfficiencyExperiments｜效率实验

第二阶段新增：experimentId、workflow、manualDurationMs、aiAssistedDurationMs、humanEdits、outputAccepted、operator、startedAt、finishedAt、notes、isDemo。真实实验与演示计时必须分开。

## 写入规则

- 所有 demo 记录保留 `isDemo=true`，不得与真实数据合并计算。
- 日期统一 ISO-8601；多选字段写数组；原始正文不覆盖。
- AI 写入趋势和候选时保留模型版本、promptVersion 和 traceId（可作为后续扩展字段）。
- 审核人、审核时间由人工操作写入，不由模型伪造。
