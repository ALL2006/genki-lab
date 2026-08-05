# 评论评测集 consumer-comments-v1

## 来源与冻结规则

- 人工修订标签：`E:/飞书大赛/数据分析样本.xlsx` 的“清洗后评论”。
- 修订前标签与核验记录：`E:/飞书大赛/多平台饮料真实评论数据.xlsx`。
- 两个源文件只读，SHA-256 写入 `data/evaluation/consumer-comments-v1.json`。
- 原表 50 条清洗评论；R038 的“分析纳入=否”，理由是来源产品标注与评论口味描述疑似错配，因此冻结集为 49 条。
- 源文件没有独立“标签修订记录”表。`revisionNotes` 由两份工作簿同编号的口味、场景、健康、包装、价格、购买意愿、情绪和备注字段逐项对比生成。

这 49 条来自团队已收集且修订的真实评论样本，但它不是概率抽样，也不代表总体市场。

> 本评测仅用于GENKI LAB原型阶段内部回归和工作流质量验证，不代表模型总体能力。

## 字段映射

每条保存 `id, rawText, platform, brand, product, humanSentiment, humanFlavorTags, humanSceneTags, humanPainPointTags, humanPurchaseIntent, revisionNotes`，并保留健康标签和来源 URL。`未提及` 映射为空数组或 `null`；情绪统一为 `positive / neutral / negative`。

痛点标签只取人工字段中的显式负向口味标签，以及“价格偏高、关注甜味剂、关注添加剂”，不从原文额外推断。

## 39 / 10 隔离

`data/evaluation/split-v1.json` 用固定种子一次性洗牌并冻结：

- development：39 条，用于提示词和规则调试。
- holdout：10 条，只用于最终回归。

运行时只按冻结编号选择，不重新洗牌，也不会把人工标签传给 Provider。测试会检查数量、交集为空和版本一致。

## 指标口径

- JSON Schema 成功率、itemId 匹配率、逐字引文通过率。
- 情绪一致率。
- 口味、场景、痛点的 exact match 与 micro precision / recall / F1。
- 失败率、低置信度率、重试、总耗时和平均耗时。
- 页面上的“人工修改率”在没有真实逐条复核操作时，是模型结果相对冻结人工标签的“估算修改需求率”，不是已发生的实际修改率；实际审核率由 `AIAnalysisRecord.editedFields` 另行统计。

MockAIProvider 指标只证明评测和日志链路能运行，不代表真实模型质量。没有 Ark 凭证时不得把 Mock 回归结果写成豆包实测。
