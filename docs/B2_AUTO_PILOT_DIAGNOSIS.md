# B2-AUTO-PILOT-DIAGNOSIS

诊断范围固定为 Manual Pilot 的原 6 条资料。未运行 development 或 holdout，未修改任何输入资料。人工参考角色只依据来源性质与既有业务规则，不以 Manual 输出为答案。

## Pilot-01 六条逐项对照

| itemId | sourceKind | title | Manual evidenceRole | Ark evidenceRole | humanReferenceRole | roleJudgement | Ark signalType | eligibleForConceptGeneration | quoteCount | quoteValidationStatus | validationFlags | finalStatus |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| R001 | consumer_comment | 元气森林茉莉青柠味含气苏打水评论 | consumer_evidence | consumer_evidence | consumer_evidence | 一致；真实用户评价甜度、气泡和调饮体验 | consumer_preference | true | 3 | exact | weak_relevance/warning | validationStatus=validated；humanReviewStatus=pending |
| R006 | consumer_comment | 元气森林可乐味气泡水评论 | consumer_evidence | consumer_evidence | consumer_evidence | 一致；真实用户评价山寨可乐感和气泡 | consumer_preference | true | 2 | exact | weak_relevance/warning | validationStatus=validated；humanReviewStatus=pending |
| raw-07d8beea6ce57283 | raw_item / brand_news | Keurig Dr Pepper Announces Flavorful New Innovation Across Its Refreshment Portfolio | market_evidence | background_evidence | market_evidence | A：Manual 更合理，Ark 把官方新品组合误降为背景证据 | product_launch | false | 2 | 1 exact / 1 not_found | quote_mismatch/high；weak_relevance/warning | validationStatus=rejected；历史 reviewStatus=rejected |
| raw-46e9ad9f8081cf10 | raw_item / rss | Small and Micro Food Business Operator (FBO) Tracking Survey: Wave 5 | background_evidence | irrelevant | background_evidence | A：Manual 更合理；官方监管议题资料属于背景证据，虽然饮料相关性弱 | other | false | 1 | exact | 无 | validationStatus=validated；humanReviewStatus=pending |
| raw-5b2dcbb100894040 | raw_item / industry_article | 2024年曲靖市经济运行情况 | irrelevant | background_evidence | background_evidence 或 irrelevant | C：两者均合理；有饮料零售额宏观数据，但缺少产品细节 | other | false | 0 | empty / not_found | quote_mismatch/high | validationStatus=rejected；历史 reviewStatus=rejected |
| raw-ae96ad5170086080 | raw_item / brand_news | Coca-Cola Marks America’s 250th Anniversary With Nationwide Celebration and Community Initiatives | market_evidence | background_evidence | market_evidence | A：Manual 更合理；官方品牌活动、包装与营销动作属于市场证据 | other | false | 7 | exact | 无 | validationStatus=validated；humanReviewStatus=pending |

## 四个角色差异的原文依据

1. **KDP：A，Manual 合理、Ark 错误。** 原文是品牌官方新品组合发布：`debuting innovations across its carbonated soft drinks (CSDs), teas, waters, energy and juice drinks portfolios`，并列出 35 个以上新品与零糖、能量饮料方向。因此应为 `market_evidence`，绝不能因为原文出现 `what consumers want most` 而变成消费者证据。
2. **FSA：A，Manual 合理、Ark 错误。** 原文明确是 `tracking views of small and micro food businesses on regulatory issues and trust in the FSA`。证据性质来自官方监管机构，饮料相关性虽弱，仍优先是 `background_evidence`。
3. **曲靖：C，规则存在合理边界。** 原文包含 `全年限额以上单位粮油食品类、饮料类和烟酒类商品零售额分别增长21.8%、21.1%、13.3%。` 它可作为宏观背景，也可因缺乏具体产品与消费者信息而不纳入。`background_evidence` 和 `irrelevant` 均可接受，但不得归为消费者证据。
4. **Coca-Cola：A，Manual 合理、Ark 错误。** 原文是公司宣布的全国品牌活动，包括 `limited-edition packaging, creative storytelling and community impact initiatives`。这是品牌营销和包装动作，应为 `market_evidence`，不能成为消费者偏好证据。

R001 原文包含“不是特别甜”“气泡很足”“可以尝试做气泡咖啡”；R006 原文包含“山寨可乐的味道”“加多了气泡”。二者都是实际用户体验，应为 `consumer_evidence`。

## 两条 Quote 失败

### raw-07d8beea6ce57283

- Ark 原 quote：`Keurig Dr Pepper is entering 2026 with an unrivaled commitment to flavor leadership, debuting innovations across its carbonated soft drinks (CSDs), teas, waters, energy and juice drinks portfolios.`
- 对应 rawText：`Keurig Dr Pepper (NASDAQ: KDP) is entering 2026 with an unrivaled commitment to flavor leadership, debuting innovations across its carbonated soft drinks (CSDs), teas, waters, energy and juice drinks portfolios.`
- 分类：`quote_spliced`
- 原因：模型删除了原文中间的 `(NASDAQ: KDP)`，结果不是连续字符串。不能自动修复。

### raw-5b2dcbb100894040

- Ark 原 quote：无，模型返回 `evidenceQuotes=[]`
- 对应 rawText：`全年限额以上单位粮油食品类、饮料类和烟酒类商品零售额分别增长21.8%、21.1%、13.3%。`
- 分类：`quote_not_found`
- 原因：模型没有提供任何可校验引文。不能自动修复。

`QuoteNormalizer` 已覆盖 Unicode 单双引号、NBSP、连续空白、换行与 NFKC 等确定性等价转换；中英文标点不会互换。`QuoteRepairService` 只在规范化后存在唯一定位时回填原始连续文本，不进行语义模糊匹配。Pilot-01 的 14 条可定位引文全部 exact；KDP 是拼接、曲靖无输入 quote，所以 autoRepair=0。测试明确保证标点改写与删除中间文本不会通过。

曾发现并已修复一个校验器问题：空 `evidenceQuotes` 最初会被错误计为 quoteValid。Pilot-01 的持久化统计已按原始输出重新校正为 Quote 4/6、rejected 2；本轮没有发现新的 QuoteNormalizer/QuoteRepairService 缺陷。

## 状态语义

- `validationStatus`：机器校验，取值 `validated / auto_repaired / needs_review / rejected`。
- `humanReviewStatus`：API 持久化字段名仍为兼容既有数据的 `reviewStatus`，取值 `pending / confirmed / needs_revision / rejected`。

Pilot-01 的“待人工审核 4”是四条机器结果没有发生硬拒绝、但尚未人工确认；它们的机器状态是 `validated`，不是 `needs_review`。Pilot-01 的两条历史机器拒绝记录曾同步写成 `reviewStatus=rejected`，这是两个维度混写的旧行为；遵守“不修改真实数据”的边界，本轮没有回写历史记录。代码已修正为机器拒绝只写 `validationStatus=rejected`，`reviewStatus` 保持 `pending`，直到人工明确操作。页面现已分别显示“机器校验”和“人工审核”，报告与 API 文档采用同一口径。

## Prompt v2.1 与 Token 诊断

Pilot-01 的 9,020 input tokens 由三次 Ark 子请求的重复 system prompt、重复 structured-output schema、六条原始正文及 JSON 包装组成；2,506 output tokens 的主要冗余来自 KDP 大量枚举字段和 Coca-Cola 七条引文。原始正文不做 AI 预摘要，也不截断关键证据。

`evidence-analysis-v2.1` 只针对真实失败强化通用规则：来源性质决定角色；消费者评论通常为消费者证据；品牌官方材料为市场证据且永不因品牌表述成为消费者证据；监管、政策和宏观统计优先为背景证据；无实质饮料创新信息才归为 irrelevant；只有消费者证据可进入概念生成；每条返回 1–3 条最重要的逐字连续引文，禁止翻译、改写、修标点、拼接和省略号。Prompt 未包含六条 Pilot 的 itemId、标题或预期答案。

为减少重复上下文，单次输入字符上限从 7,000 调整为 12,000；相同六条预计由 3 个子请求降为 2 个。Structured Output 已约束的字段没有在 prompt 中重复罗列。

## Pilot-01 vs Pilot-02

Pilot-02 批次：`B2-AUTO-PILOT-02`；run：`ai-run-c0886531-0a0b-4551-aa4d-11bc261ea088`；模型：`doubao-seed-2-1-pro-260628`；Prompt：`evidence-analysis-v2.1`；Schema：`evidence-analysis-v2`。两次 Pilot 的输入 itemId 与顺序完全一致，Manual 和 Pilot-01 均未覆盖。

| 指标 | Pilot-01 | Pilot-02 |
| --- | ---: | ---: |
| Schema | 6/6（100%） | 6/6（100%） |
| itemId | 6/6（100%） | 6/6（100%） |
| Quote | 4/6（66.7%） | 6/6（100%） |
| autoRepair | 0 | 0（15 条全部 exact） |
| rejected | 2 | 0 |
| needsReview（机器校验） | 0 | 0 |
| hardRoleErrors（人工业务规则） | 3：KDP、FSA、Coca-Cola | 1：FSA |
| usageInput | 9,020 | 8,751 |
| usageOutput | 2,506 | 2,551 |
| totalTokens | 11,526 | 11,302 |
| latency | 22,881 ms | 32,352 ms |
| ArkSubrequests | 3 | 2 |

输入 token 减少 269（-3.0%），输出增加 45（+1.8%），总 token 减少 224（-1.9%）。分片从 3 次降为 2 次，没有重试；本次持久化 run 没有应用错误，未观察到 Cloudflare CPU 或 subrequest 限制错误。

| itemId | Pilot-01 role | Pilot-02 role | human reference | 最终判断 |
| --- | --- | --- | --- | --- |
| R001 | consumer_evidence | consumer_evidence | consumer_evidence | 通过 |
| R006 | consumer_evidence | consumer_evidence | consumer_evidence | 通过 |
| raw-07d8beea6ce57283 | background_evidence | market_evidence | market_evidence | Pilot-02 修正，通过 |
| raw-46e9ad9f8081cf10 | irrelevant | irrelevant | background_evidence | 仍未修正；官方监管资料角色硬冲突 |
| raw-5b2dcbb100894040 | background_evidence | background_evidence | background_evidence 或 irrelevant | 允许，通过 |
| raw-ae96ad5170086080 | background_evidence | market_evidence | market_evidence | Pilot-02 修正，通过 |

Pilot-02 的 15 条引文全部为 rawText 中的 exact 连续字符串，Quote unresolved=0、Schema rejected=0、公开资料误判 consumer=0、消费者评论误判 market/background=0、market/background eligible=true=0、rejected=0。机器 ValidationFlag 只有 2 条 `weak_relevance/warning`，没有高风险 flag。

但 FSA 仍被模型以“与饮料创新直接相关信息不足”为由归为 `irrelevant`。这忽略了“官方监管来源的证据性质优先于相关性强弱”的业务规则。它不是通用校验器能仅凭 `sourceKind=raw_item` 自动判定的冲突，需要下一轮以通用方式让监管来源元数据进入角色校验，或进一步明确“有监管主题即 background”的 prompt 边界；不得写入该条 Pilot 的答案。

## Gate 结论

**NOT_READY_FOR_DEV**。Quote、Schema、itemId 和概念生成边界均达标，但仍有 1 个明确的角色硬冲突（FSA）。按任务约束停止，不运行 development、holdout，也不创建第三个自动 Pilot。
