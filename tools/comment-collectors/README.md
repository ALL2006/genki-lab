# 评论采集工具（GitHub Actions 运行）

本目录的采集器设计为在 **GitHub Actions runner** 上运行：runner 位于海外机房，可直连
`play.google.com`，不依赖本地网络与代理。

## Google Play 评论采集

`google-play.mjs` 匿名调用 Google Play 公开接口（详情页 + `getreviews`），无需登录。

### 手动触发

1. 推送本目录与 workflow 到 GitHub：
   `git add .github/workflows/google-play-reviews.yml tools/comment-collectors`
2. 到仓库 Actions 页面 → **Google Play Reviews** → **Run workflow**。

### 结果

- 数据写入 `data/comments/google-play/google-play-reviews.jsonl`（workflow 自动提交回仓库，无变化时不提交）。
- 每次运行的原始 HTML 存为 artifact（`google-play-raw`），解析异常时用于调试。
- 默认每周一 02:00 UTC 自动运行；不需要定时可在 workflow 里删掉 `schedule` 段。

### 本地运行

需要能直连 `play.google.com` 的网络：

```bash
npm install --prefix tools/comment-collectors
node tools/comment-collectors/google-play.mjs
```

可通过环境变量调整：`MAX_PAGES`（默认 6）、`OUTPUT_JSONL`、`RAW_DIR`。
