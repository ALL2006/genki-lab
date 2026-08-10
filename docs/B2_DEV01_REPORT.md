# B2-DEV-01 真实 Ark 评测报告

- 生成时间：2026-08-10
- 模型：`doubao-seed-2-1-pro-260628`
- Prompt：`evidence-analysis-v2.2`
- Schema：`evidence-analysis-v2`（沿用实际 Structured Output 契约，未伪装版本）
- analysisText：`v1`

## 运行边界

- Pilot-04 使用原 6 条资料，Schema 6/6、itemId 6/6、Quote 6/6、traceable Quote 6/6、hard role error 0、rejected 0，Pilot 阶段正式冻结。
- DEV-01 只使用冻结 development ID 列表的前 10 条：R001、R002、R003、R004、R005、R006、R007、R009、R010、R011。
- 未读取或运行剩余 29 条 development；未读取或运行 holdout。
- 首批 45 秒请求发生 4 次超时；调整 Worker 的请求超时窗口后，一次响应出现截断 JSON，随后真实调用成功。成功运行耗时 71,051ms，Ark subrequests 1，tokens 为 input 1,842、output 3,933、total 5,775。
- 临时分钟触发器在首个 71 秒请求完成前产生一次重叠执行。首个成功结果保留为正式 `B2-DEV-01`；第二组 10 条未删除、未覆盖，完整隔离为 `B2-DEV-01-DUPLICATE-RUN`，不计入本报告。

## 工程与真实评测指标

| 指标 | 结果 |
| --- | ---: |
| Schema pass | 10/10（100%） |
| itemId pass | 10/10（100%） |
| Quote pass | 10/10（100%） |
| traceable quote pass | 10/10（100%） |
| EvidenceRole accuracy | 10/10（100%） |
| Sentiment accuracy | 6/10（60%） |
| Flavor micro-F1 | 0% |
| Scene exact accuracy | 0/10（0%） |
| Pain-point exact accuracy | 0/10（0%） |
| validated | 10 |
| auto_repaired | 0 |
| needs_review | 0 |
| rejected | 0 |
| high flags | 0 |

这里的 Flavor、Scene、Pain-point 指标按 development 人工标签做严格字符串集合比较，不使用 Manual Pilot 作为 ground truth，也没有修改人工标签。低分的主要原因不是引文或 Schema 失败，而是模型输出自由文本与评测集受控标签本体不一致：例如模型输出具体口味“茉莉青柠味/可乐味”，人工标签使用“甜味不足/后味明显/其他”；模型生成自然语言场景和风险描述，而人工标签使用标准化短标签。该结果说明下一步应先建立不泄漏 holdout 的确定性标签映射或受控枚举输出，再扩大 development，不能把自由文本做模糊匹配以抬高分数。

## 逐条人工标签对照

| itemId | EvidenceRole | Sentiment | Flavor exact | Scene exact | Pain-point exact | 主要差异 |
| --- | --- | --- | --- | --- | --- | --- |
| R001 | match | mismatch（neutral→positive） | mismatch | mismatch | mismatch | 将口味实体写入 flavors，未输出“甜味不足/气泡感强”标签 |
| R002 | match | match | mismatch | mismatch | mismatch | 具体葡萄/白桃/橙味与人工“其他”本体不一致 |
| R003 | match | match | mismatch | mismatch | mismatch | 具体口味与人工“其他”不一致；场景自由文本未命中“控糖减脂” |
| R004 | match | mismatch（negative→neutral） | mismatch | mismatch | mismatch | 正负信号计数打平导致 neutral；未映射“后味明显/口味寡淡” |
| R005 | match | mismatch（negative→neutral） | mismatch | mismatch | mismatch | 同时抽取推荐竞品正向信号，导致计数打平 |
| R006 | match | mismatch（negative→neutral） | mismatch | mismatch | mismatch | 气泡正向与山寨可乐负向计数打平 |
| R007 | match | match | mismatch | mismatch | mismatch | 自由文本正确表达虚甜，但未映射“甜味不足/关注甜味剂” |
| R009 | match | match | mismatch | mismatch | mismatch | 自由文本表达价格与复购风险，但未命中标准短标签 |
| R010 | match | match | mismatch | mismatch | mismatch | 识别价格偏高语义，但没有输出标准标签“价格偏高” |
| R011 | match | match | mismatch | mismatch | mismatch | 正确表达代糖/香精问题，但未映射标准标签本体 |

## 结论

引文链路已经达到生产门槛，证据角色在本组消费者评论上也稳定。当前不建议直接运行剩余 29 条：应先在 development 范围内确定标签本体对齐方案，补充并发执行锁，保留严格 Quote 与 traceability 规则不变；完成后再运行下一批 development，holdout 继续冻结。
