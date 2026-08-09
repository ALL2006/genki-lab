# D1 迁移报告

本地验证时间：2026-08-09。来源：`data/mock-db.json`。生成 SQL 使用 `INSERT OR IGNORE`，已在同一空本地 D1 连续执行两次，第二次未新增重复记录、未覆盖已存在行。

| entity | jsonCount | localD1Count | matched |
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

抽样验证：5 个 RawItem、6 个 B2 非 DEMO 分析结果、全部 3 个对应 ValidationFlag、最近 1 个 AutomationRun 均存在。固定 49 条评论与 39/10 split 继续作为只读 bundle fixture，不作为动态 D1 行迁移。远端计数尚未执行，原因是 Wrangler 当前未认证；不得把本地匹配描述成远端完成。
