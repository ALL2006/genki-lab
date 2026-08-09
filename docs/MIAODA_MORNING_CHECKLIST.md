# 妙搭早晨配置清单（10分钟）

- [ ] 1分钟：打开 `GET /api/system/readiness`，确认 `server`、`repository`、`dataDirectoryWritable` 为 `true`。
- [ ] 2分钟：在妙搭创建每天一次的定时触发器，时区选择 Asia/Shanghai。
- [ ] 2分钟：添加 `POST https://<部署域名>/api/automation/daily` HTTP节点。
- [ ] 1分钟：用妙搭密钥变量设置 `X-AUTOMATION-SECRET`，不要写进截图或普通文本字段。
- [ ] 1分钟：设置 `Idempotency-Key=daily-{{yyyy-MM-dd}}` 与 `{"triggerType":"miaoda"}`。
- [ ] 1分钟：失败分支只重试1次；`partial_success`与二次失败发送通知。
- [ ] 2分钟：手动试跑一次，记录 `automationRunId`，再次用相同幂等键调用并确认 `skipped=true`。

完整字段与响应示例见 `docs/MIAODA_DAILY_AUTOMATION_SETUP.md`。
