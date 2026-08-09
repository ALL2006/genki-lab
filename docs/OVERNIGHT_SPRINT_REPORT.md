# GENKI LAB 夜间工程冲刺报告

日期：2026-08-09。口径：本报告区分代码、实际本地执行和外部配置，不把“代码就绪”写成“线上已跑通”。

## DONE

- 建立 `DailyAutomationOrchestrator`：逐个运行所有 enabled LIVE 来源、单来源失败隔离、最多重试一次、汇总采集指标。
- 新增 `POST /api/automation/daily` 与 `X-AUTOMATION-SECRET` 校验；新增 CLI 正式/干跑入口。
- 新增独立 `AutomationRun`，保留各来源 `JobRun`；支持运行锁、`Idempotency-Key` 和超时任务 `stale_failed` 标记。
- 数据源健康状态支持 healthy/warning/failing/disabled、最近失败、连续失败、HTTP状态及最近新增量。
- `DATA_DIR`、统一路径解析、目录自动创建、原子临时文件+rename写入、损坏JSON保留和错误日志已实现。
- 新增 `NotificationProvider`、Noop与飞书Webhook实现；未配置Webhook时正常使用Noop。
- 找到本机真实 `B2-PILOT-01-result.json`，原文件未改动，只读复制到 `data/manual-batches/`；SHA-256一致。
- 使用 AUTOMATED 校验模式导入6条B2结果：6条保存，1处唯一Unicode引号差异自动修复，产生3个确定性Flag；未把人工豆包结果标成自动化。
- 引文规范化/修复支持直弯引号、NBSP、连续空白、换行及Unicode规范化；只在唯一命中时修复，并保存原始引文、真实连续原文、方法与位置。
- AUTOMATED逐条校验支持 validated/auto_repaired/needs_review/rejected 和批次 success/partial_success/failed；STRICT原有整批拒绝语义保留。
- `ValidationFlag`持久化与查询已完成；规则覆盖引文差异、角色冲突和弱相关，分析批次页增加轻量异常计数。
- 39条development已固定生成4批（10/10/10/9）及manifest；不含holdout。
- holdout默认锁定，只有 `ENABLE_HOLDOUT_EVALUATION=true` 且专用命令/API路径才可运行。
- `TrendAggregationService`骨架只读取非DEMO、validated/auto_repaired、consumer_evidence；不足2个不同消费者itemId时返回 `insufficient_evidence`，不生成虚假趋势。
- `ExperimentRun`模型、JSON持久化和最小GET/POST API已建立，尚未写入虚假效率实验。
- Dockerfile、docker-compose、健康检查、同源Express静态托管和 `/data` 持久卷准备完成。
- 三处最小UI补全：运行自动化状态、分析校验状态、系统就绪状态；未做整体视觉扩展。

## CODE READY BUT NOT CONFIGURED

- `/api/automation/daily` 已可用，但正式环境需要强随机密钥、公网域名与 `ENABLE_LIVE_COLLECTION=true`。
- 妙搭只需配置一个每日HTTP节点；操作手册已生成，但本地无法替用户登录配置。
- Feishu Webhook通知适配器已完成；未设置 `FEISHU_NOTIFICATION_WEBHOOK` 时使用Noop。
- Ark Doubao自动Provider路径沿用现有实现；只有设置API Key和Model ID后才可自动执行。未配置时自动化只创建pending/manual批次。
- Docker配置已完成；是否能在目标云平台成功启动仍需使用实际平台与持久盘验收。

## BLOCKED BY EXTERNAL CREDENTIAL

- 妙搭在线定时节点：需要用户飞书账号登录。
- 公网部署：需要目标云平台账号、域名/HTTPS和环境变量配置。
- Ark Doubao自动调用：需要有效付费/授权凭证。
- 飞书机器人通知：需要有效Webhook地址。

## NOT STARTED

- 正式候选产品生成、真实用户问卷、产品V2和Remotion生产链路，本轮按范围明确未启动。
- 复杂二模型审核Agent未启动；当前只使用可审计的确定性Flag。
- 真实效率提升结论未计算；仅建立ExperimentRun记录基础设施。

## 测试与证据

- `npm run ai:prepare-development`：成功，39条，10/10/10/9，holdoutIncluded=false。
- B2导入：成功保存6条非DEMO Manual Doubao记录；1处引文自动修复；3个Flag。
- 自动化集成测试覆盖来源枚举、失败隔离、单次重试、零新增、新增建pending批次、Provider未配置、并发锁、幂等、DATA_DIR、Noop、引文修复、partial success、manifest、holdout隔离和趋势证据阈值。
- 真实联网daily：`automation-f87491a0-9c17-496b-933f-b785ff7469ef`，5个来源，获取13、新增5、重复8、失败1，耗时36665ms；结果为`partial_success`。Pepsi来源两次均在10000ms超时，真实错误已记录，其他来源未被阻断。
- 真实daily新增5条时只创建1个pending Manual批次（5条），状态`pending_provider_configuration`，没有伪造自动AI成功。
- 使用相同 `Idempotency-Key=overnight-2026-08-09` 重放返回`skipped=true / idempotency_key_replayed`，未再次采集。
- 生产同源冒烟：`GET /api/health`返回200 JSON，`GET /`返回200 HTML。
- B2原文件与只读副本SHA-256均为`E714C2AF756CAD2D57A8D6F7A150D796A6577B580408D39FB771760FD7614302`。

## 明早必须完成

1. 运行 `npm run check` 并查看本报告验收结果。
2. 选择公网部署目标，挂载持久盘到 `/data`，设置强随机服务端密钥。
3. 按 `MIAODA_MORNING_CHECKLIST.md` 配置一个每日HTTP任务。
4. 如需自动豆包，设置Ark凭证；否则继续使用已完成的Manual Doubao导出/导入路径。
5. 设置飞书Webhook并进行一次只含摘要的通知测试。

预计代码本地验收15—20分钟；妙搭配置额外不超过10分钟；公网平台部署时间取决于账号与域名状态。

## 验收结果

- `npm run check`：通过。
- lint：通过。
- typecheck：通过。
- collector测试：通过。
- API测试：通过（含readiness、自动化密钥拒绝、holdout锁、ExperimentRun）。
- AI测试：通过，STRICT行为保持。
- 分析批次测试：通过。
- automation测试：通过。
- production build：通过，1809 modules transformed。
- `npm run automation:daily:dry`：通过，列出5个enabled LIVE来源并正确显示Provider未就绪后的动作。
- 真实automation daily：部分成功，实际结果见上文。
- holdout默认锁：专用命令在未设置开关时按预期拒绝。
- Express同源静态托管与健康接口：通过。
- `git diff --check`：通过。
- `git diff -- video video-remotion`：无输出，修改数量0。
- Docker镜像实构建：未验证；本机没有`docker`命令。Dockerfile与compose代码已就绪，需在装有Docker的环境运行验收。
