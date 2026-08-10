# 夜间冲刺早晨验收清单（15—20分钟）

1. 安装与静态检查（5分钟）
   - [ ] `npm install`
   - [ ] `npm run check`

2. 批次与保护（3分钟）
   - [ ] `npm run ai:prepare-development`
   - [ ] 查看 `data/batches/b2-development-manifest.json`：39条、10/10/10/9、`holdoutIncluded=false`
   - [ ] 未设置开关时运行 `npm run ai:evaluate-holdout`，应明确拒绝

3. 自动化演练（4分钟）
   - [ ] `npm run automation:daily:dry`
   - [ ] 输出列出所有 enabled LIVE 来源、Provider状态和下一步动作
   - [ ] 如允许真实网络：设置 `ENABLE_LIVE_COLLECTION=true` 后运行 `npm run automation:daily`

4. 页面快速查看（3分钟）
   - [ ] 运行页显示最近自动运行、下一次妙搭触发、配置状态
   - [ ] 分析批次页显示待自动分析、待复核、自动通过、自动修复
   - [ ] 系统状态显示公网部署、自动采集、妙搭、豆包、通知配置口径

5. 边界（2分钟）
   - [ ] `git diff -- video video-remotion` 无输出
   - [ ] 页面与日志没有密钥
   - [ ] 未配置项显示“未配置/部分就绪”，不显示为成功

6. 妙搭配置（按需，10分钟以内）
   - [ ] 按 `docs/MIAODA_MORNING_CHECKLIST.md` 完成线上定时任务
