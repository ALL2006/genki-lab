# D1 迁移报告

迁移时间：2026-08-09。来源：`data/mock-db.json`。目标：Cloudflare D1 `genki-lab-production`（`cf94786f-d4cd-4c0d-adc7-84f76fff35de`）。生成 SQL 使用 `INSERT OR IGNORE`；本地空库连续执行两次与远端首次导入均成功，已有记录不会被覆盖。

| entity | JSON 基线 | 远端导入后 | 匹配 |
| --- | ---: | ---: | --- |
| DataSource | 6 | 6 | true |
| RawItem | 23 | 23 | true |
| TrendSignal | 17 | 17 | true |
| ProductConcept | 3 | 3 | true |
| ValidationResponse | 10 | 10 | true |
| JobRun | 22 | 22 | true |
| AIBatch | 2 | 2 | true |
| AIAnalysisRecord | 6 | 6 | true |
| AIAnalysisRun | 1 | 1 | true |
| AIResultImport | 1 | 1 | true |
| TrendCandidate | 0 | 0 | true |
| EvaluationRun | 4 | 4 | true |
| AutomationRun | 1 | 1 | true |
| ValidationFlag | 3 | 3 | true |
| ExperimentRun | 0 | 0 | true |

抽样验证：5 个 RawItem、6 个 B2 非 DEMO 分析结果、3 个对应 ValidationFlag、最近 1 个 AutomationRun 均存在。固定 49 条评论与 39/10 split 继续作为只读 bundle fixture，不作为动态 D1 行迁移。

导入后生产 Cron 正常写入增量，因此当前远端至少增加了 1 个 RawItem、3 个 JobRun、1 个 AIBatch 与 1 个 AutomationRun。远端验证采用“不得低于种子基线 + 固定样本完整存在”，避免把合法生产增量误报为迁移不一致。
