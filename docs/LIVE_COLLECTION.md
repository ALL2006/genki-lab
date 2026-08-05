# 真实公开数据采集

## 能力与边界

第二阶段 A 只替换采集入口，不改变 Repository、模拟 AI、人工审核或视频工程。`ENABLE_LIVE_COLLECTION` 默认为 `false`；实时运行必须显式开启。系统不提供登录、Cookie、验证码处理、代理池或访问控制绕过。

流程固定为：请求 → 提取 → 文本规范化 → 质量检查 → URL 标准化 → SHA-256 正文哈希 → 双重去重 → JSON 持久化 → JobRun。

## 环境变量

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `ENABLE_LIVE_COLLECTION` | `false` | 实时采集总开关 |
| `LIVE_COLLECTION_USER_AGENT` | 原型标识 | 应替换为可识别且带联系信息的 UA |
| `LIVE_COLLECTION_TIMEOUT_MS` | `10000` | 单次请求超时 |
| `LIVE_COLLECTION_MAX_RETRIES` | `2` | 额外重试次数 |
| `LIVE_COLLECTION_REQUEST_INTERVAL_MS` | `1000` | 同域名两次请求的最小间隔 |

单个响应正文上限为 2 MB。只对网络异常、超时及 408/425/429/5xx 等短暂错误做有限退避重试；普通 4xx 不重试。

## 运行

PowerShell：

```powershell
$env:ENABLE_LIVE_COLLECTION='true'
$env:LIVE_COLLECTION_USER_AGENT='GENKI-LAB/0.2 (+your-contact)'
npm run test:live
```

可通过 `LIVE_COLLECTION_SOURCE_IDS` 指定逗号分隔的来源。`npm run test:live` 是可选联网冒烟测试，不包含在 `npm run check` 中。

## 2026-08-05 实跑记录

- 第一次：政府公开统计文章成功新增 1 条；Nestlé RSS 与 PepsiCo 新闻中心返回 403。总任务保持部分成功，两个来源错误均落盘。没有尝试绕过 403。
- 调整为可公开访问来源后：3 个来源全部成功，获取 12 条、新增 11 条、重复 1 条、失败 0，耗时 1814 ms。
- 来源构成：英国食品标准局研究 RSS 10 条、The Coca-Cola Company 官方媒体中心 1 条、曲靖市政府统计文章 1 条。
- 以上数字是采集运行事实，不是趋势结论、消费者反馈或市场验证结果。

本地数据库已保留这两次运行记录；再次运行通常会产生重复命中，这是预期行为。
