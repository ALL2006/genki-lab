# D1 Schema

版本化 migration 位于 `migrations/0001_initial.sql`，只使用 `CREATE TABLE/INDEX IF NOT EXISTS`，不 DROP 生产数据。

| TypeScript 模型 | D1 表 | 独立查询列 |
| --- | --- | --- |
| DataSource | data_sources | id, type, enabled, collection_mode, health_status |
| RawItem | raw_items | id, source_id, status, fetched_at, published_at, content_hash, normalized_url, is_demo |
| TrendSignal | trend_signals | id, review_status, reviewed_at, is_demo |
| ProductConcept | product_concepts | id, status, is_demo |
| ValidationResponse | validation_responses | id, product_concept_id, submitted_at, is_demo |
| JobRun | job_runs | id, job_type, source_id, status, started_at, finished_at, is_demo |
| AIBatch | ai_batches | id, provider, status, created_at, updated_at, is_demo |
| AIAnalysisRecord | ai_analysis_records | id, batch_id, item_id, provider, evidence_role, review_status, created_at, is_demo |
| AIAnalysisRun | ai_analysis_runs | id, batch_id, provider, started_at, finished_at, is_demo |
| AIResultImport | ai_result_imports | id, batch_id, result_hash, imported_at |
| TrendCandidate | trend_candidates | id, review_status, evidence_role, is_demo |
| EvaluationRun | evaluation_runs | id, split, started_at, is_demo |
| AutomationRun | automation_runs | id, idempotency_key, trigger_type, status, started_at, finished_at, is_demo |
| ValidationFlag | validation_flags | id, analysis_record_id, type, severity, status, created_at |
| ExperimentRun | experiment_runs | id, experiment_type, mode, started_at |

每行的完整业务对象保存在 `payload` JSON TEXT，Repository 负责类型化解析；布尔值独立列固定为 0/1。高频过滤字段另列并建立索引。`raw_items.content_hash` 与 `normalized_url` 唯一；AI 导入以 `(batch_id,result_hash)` 唯一；AutomationRun 对非空 `idempotency_key` 唯一，并以部分唯一索引保证全库最多一个 `status='running'`。
