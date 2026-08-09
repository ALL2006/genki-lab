# 数据源配置指南

数据源保存在 `DataSource` 中。实时来源至少配置：

```json
{
  "collectionMode": "live",
  "collectorType": "rss",
  "entryUrl": "https://example.org/feed",
  "collectorConfig": { "maxItems": 10 }
}
```

## 采集器选择

- `mock`：固定 DEMO 样本，只能用于 `collectionMode=demo`。
- `rss`：自动识别 RSS 2.0 与 Atom，支持相对链接、常见正文和日期字段。
- `generic_article`：读取单篇公开 HTML，优先使用配置选择器，再使用 `article/main` 等通用结构。
- `configurable_list`：先按 `itemSelector` 读取列表，再根据相对/绝对链接获取正文。适合结构稳定的品牌新闻中心。

## 列表字段

`collectorConfig` 可包含 `maxItems, itemSelector, titleSelector, linkSelector, dateSelector, summarySelector, contentSelector, removeSelectors`。所有选择器都是服务端配置，禁止把页面内容或采集规则硬编码进 React。

## 当前来源

| ID | 模式 | 类型 | 采集器 |
| --- | --- | --- | --- |
| `source-demo-industry` | DEMO | demo | mock |
| `source-rss-fsa-research` | LIVE | RSS 研究资料 | rss |
| `source-brand-coca-media` | LIVE | 品牌官方媒体中心 | configurable_list |
| `source-industry-qj-statistics` | LIVE | 政府公开统计文章 | generic_article |
| `source-brand-pepsico-prebiotic-cola` | LIVE | 品牌官方新品发布（主来源，当前直连返回 403） | generic_article |
| `source-brand-kdp-innovation-2026` | LIVE | 品牌官方新品发布（B2 备用来源） | generic_article |

品牌来源只配置 `roleHint / selectionRole = market_candidate`，表示市场证据候选；正式 `evidenceRole` 仍由真实分析结果、证据校验与人工审核决定。品牌宣传表述不得直接转写为消费者真实偏好。

新增来源前先人工确认公开访问、robots/使用条款、页面稳定性、采集必要性和合理频率。遇到登录、验证码、403 或明确禁止时应停用来源，不做绕过。
