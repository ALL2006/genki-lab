# 飞书妙搭自动化设计

妙搭只承担云端触发、HTTP 编排、失败重试、日志和飞书通知，不承担网页生成、复杂爬虫或核心分析逻辑。

## 建议流程

1. 定时触发（例如每日 08:30）。
2. 只调用 `POST /api/automation/daily`，请求头使用保密变量 `X-AUTOMATION-SECRET`，并按日期设置 `Idempotency-Key`。
3. GENKI LAB内部完成逐源采集、一次有限重试、去重、AutomationRun保存与待分析批次准备。
4. 检查HTTP状态、`success`与`data.status`；失败只重试1次。
5. `partial_success`或第二次失败时发送飞书通知；`skipped=true`不重试。

详细节点配置、body和响应示例见 `MIAODA_DAILY_AUTOMATION_SETUP.md`。

## 失败策略

- 401：密钥配置错误，不重试，立即通知管理员。
- 4xx 业务错误：不自动重试；例如没有 confirmed 趋势。
- 5xx/超时：妙搭层最多额外重试 1 次；GENKI内部对单来源也只重试1次。
- 连续失败达到 3 次：停用对应自动化分支，通知人工检查。

## 安全

- 密钥只存妙搭秘密变量和服务端环境变量。
- 日志不得输出密钥、飞书凭证或模型密钥。
- 正式环境关闭 `ENABLE_DEMO_ACTIONS`。
