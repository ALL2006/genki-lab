# Cloudflare Free 运行门

## Collector 预算

| 控制项 | 生产上限 |
| --- | ---: |
| 每次自动化来源 | 3 |
| 单来源结果 | 2 |
| 总外部请求预算 | 8 |
| 单来源超时 | 8 秒 |
| 单响应正文 | 1 MB |

Worker 生产 bundle 不包含 `node:fs`、Express、Cheerio 或 fast-xml-parser。采集使用有界 fetch、AbortController 与保守正文提取；来源失败最多重试一次。

## 真实生产验证

2026-08-09 16:15 UTC，Cloudflare Cron 实际执行一次完整流程：3 个来源、1 条新增、2 条跨任务重复、0 条失败，AutomationRun 总耗时 3986 ms。Pepsi 正文 3462 字符并生成 1 个待处理批次。任务没有因 CPU、subrequest、内存或 timeout 限制被平台中断，也没有启用任何自动付费升级。

当前网络无法维持 `wrangler tail` WebSocket，因此没有宣称取得平台 CPU 分位数。Free Plan 兼容结论依据实际 Cloudflare 生产调用成功与应用级完整运行记录；预算继续保持保守，不扩大来源或抓取深度。
