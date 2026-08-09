# Cloudflare Free 运行门

## Collector 审计

| 本地实现 | Worker 风险 | 生产处理 |
| --- | --- | --- |
| RSSCollector + fast-xml-parser | 可运行但会解析完整 XML 树，CPU/内存随 feed 增长 | WorkerCollector 使用有界文本提取，只取最多 2 条 |
| GenericArticleCollector + Cheerio | 大 DOM 构建对 Free CPU 有风险 | WorkerCollector 使用流式字节上限和保守正文区块提取 |
| ConfigurableListCollector | 列表再逐页请求，subrequest 易放大 | 列表最多 2 条，总请求受 8 次全局预算限制 |
| LiveHttpClient | Node 运行可用；限频等待会占 Worker 生命周期 | Worker 直接使用 fetch + AbortController，不做无边界等待 |

Worker 路径的 production dry-run bundle 不包含 `node:fs`、Express、Cheerio 或 fast-xml-parser。默认门限：来源 3、单源结果 2、总外部请求 8、超时 8 秒、响应 1 MB；失败来源由 Orchestrator 最多重试一次。重定向仍可能增加平台 subrequest，故总预算保持保守。

本地 workerd runtime 已通过 API、D1、Cron、SPA 与锁测试。Free Plan 真实 CPU、subrequest、内存和远端日志仍必须在认证后的真实 workers.dev 部署验证；当前状态不是“Free 已通过”。不会自动升级付费套餐。
