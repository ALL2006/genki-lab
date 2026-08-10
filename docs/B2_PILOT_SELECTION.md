# B2 试运行选择

分析批次页面由用户手动选择 6 条候选资料，不自动补足或改变用途。选择状态以 `itemId` 为主键保存在当前页面状态中，切换数据类型和筛选条件不会清空。这里只保存选择建议，不预设正式 `evidenceRole`；最终角色由 Manual Doubao 结构化输出、证据校验和人工审核共同确定。

## 当前实际选择

### 消费者证据候选（2条）

- `R001`：development 评论。
- `R002`：development 评论。

### 市场证据候选（2条）

- `source-brand-coca-media` 下的可用 LIVE RawItem：Coca-Cola 官方资料。
- 优先选择 `source-brand-pepsico-prebiotic-cola`；若官方页面未形成可用 RawItem，则选择 `source-brand-kdp-innovation-2026` 的 LIVE RawItem 作为官方备用资料。

品牌官方资料只显示“市场证据候选”，不得预设为 `market_evidence`，更不得作为 `consumer_evidence`。

### 背景证据候选（2条）

- `source-rss-fsa-research` 下最先可用的两条 LIVE 资料。

## 当前运行事实

- PepsiCo 主页面在公开浏览器中可查看，但 GENKI LAB 的现有通用 HTTP 采集链路正式运行超时，未生成 RawItem。
- KDP 官方备用页面成功采集并保存为 `raw-07d8beea6ce57283`，因此当前“市场资料2”使用 KDP 备用来源。
- 如果后续 PepsiCo 官方页面能够由同一通用采集器稳定读取，用户可以在市场候选筛选中手动选择该 RawItem。

## 页面预分类边界

- `roleHint`：集中规则给出的轻量建议，不能写入正式分析结果。
- `selectionRole`：用户为当前抽样设置的本批用途，支持消费者、市场、背景、待判断和不纳入本批。
- `evidenceRole`：模型分析后产生并经过人工审核的正式证据角色，页面预分类不能覆盖它。

批次名称包含 `B2-PILOT` 时，页面只校验并提示是否符合消费者2、市场2、背景2；不符合时允许用户明确确认后继续创建。
