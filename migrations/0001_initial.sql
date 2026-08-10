PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  collection_mode TEXT NOT NULL,
  health_status TEXT,
  updated_at TEXT,
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_data_sources_enabled_mode ON data_sources(enabled, collection_mode);
CREATE INDEX IF NOT EXISTS idx_data_sources_health ON data_sources(health_status);

CREATE TABLE IF NOT EXISTS raw_items (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  status TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  published_at TEXT,
  content_hash TEXT NOT NULL UNIQUE,
  normalized_url TEXT NOT NULL UNIQUE,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_raw_items_source ON raw_items(source_id);
CREATE INDEX IF NOT EXISTS idx_raw_items_status ON raw_items(status);
CREATE INDEX IF NOT EXISTS idx_raw_items_fetched ON raw_items(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_items_demo ON raw_items(is_demo);

CREATE TABLE IF NOT EXISTS trend_signals (
  id TEXT PRIMARY KEY,
  review_status TEXT NOT NULL,
  reviewed_at TEXT,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_trend_signals_status ON trend_signals(review_status);
CREATE INDEX IF NOT EXISTS idx_trend_signals_demo ON trend_signals(is_demo);

CREATE TABLE IF NOT EXISTS product_concepts (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_product_concepts_status ON product_concepts(status);

CREATE TABLE IF NOT EXISTS validation_responses (
  id TEXT PRIMARY KEY,
  product_concept_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_validation_responses_product ON validation_responses(product_concept_id);

CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  source_id TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON job_runs(status);
CREATE INDEX IF NOT EXISTS idx_job_runs_source ON job_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_job_runs_started ON job_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS ai_batches (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_ai_batches_status ON ai_batches(status);
CREATE INDEX IF NOT EXISTS idx_ai_batches_created ON ai_batches(created_at DESC);

CREATE TABLE IF NOT EXISTS ai_analysis_records (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  evidence_role TEXT NOT NULL,
  review_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_ai_records_batch ON ai_analysis_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_ai_records_item ON ai_analysis_records(item_id);
CREATE INDEX IF NOT EXISTS idx_ai_records_role ON ai_analysis_records(evidence_role);
CREATE INDEX IF NOT EXISTS idx_ai_records_status ON ai_analysis_records(review_status);
CREATE INDEX IF NOT EXISTS idx_ai_records_demo ON ai_analysis_records(is_demo);

CREATE TABLE IF NOT EXISTS ai_analysis_runs (
  id TEXT PRIMARY KEY,
  batch_id TEXT,
  provider TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_ai_runs_batch ON ai_analysis_runs(batch_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_started ON ai_analysis_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS ai_result_imports (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  result_hash TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  UNIQUE(batch_id, result_hash)
);
CREATE INDEX IF NOT EXISTS idx_ai_imports_batch ON ai_result_imports(batch_id);

CREATE TABLE IF NOT EXISTS trend_candidates (
  id TEXT PRIMARY KEY,
  review_status TEXT NOT NULL,
  evidence_role TEXT,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_trend_candidates_status ON trend_candidates(review_status);
CREATE INDEX IF NOT EXISTS idx_trend_candidates_demo ON trend_candidates(is_demo);

CREATE TABLE IF NOT EXISTS evaluation_runs (
  id TEXT PRIMARY KEY,
  split TEXT NOT NULL,
  started_at TEXT NOT NULL,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_split ON evaluation_runs(split);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_started ON evaluation_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  is_demo INTEGER NOT NULL CHECK (is_demo IN (0, 1)),
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_automation_idempotency ON automation_runs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_automation_single_running ON automation_runs((1)) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_automation_status ON automation_runs(status);
CREATE INDEX IF NOT EXISTS idx_automation_started ON automation_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS validation_flags (
  id TEXT PRIMARY KEY,
  analysis_record_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_validation_flags_record ON validation_flags(analysis_record_id);
CREATE INDEX IF NOT EXISTS idx_validation_flags_status ON validation_flags(status);
CREATE INDEX IF NOT EXISTS idx_validation_flags_created ON validation_flags(created_at DESC);

CREATE TABLE IF NOT EXISTS experiment_runs (
  id TEXT PRIMARY KEY,
  experiment_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  started_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload))
);
CREATE INDEX IF NOT EXISTS idx_experiment_runs_type ON experiment_runs(experiment_type);
CREATE INDEX IF NOT EXISTS idx_experiment_runs_started ON experiment_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
