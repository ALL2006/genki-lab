# GENKI LAB 竖屏饮料新品广告模板

这是一个独立的 Remotion 工程，用配置和本地素材批量生成 1080×1920、60fps 的消费者向饮料新品广告。当前示例为“元气森林青提茉莉气泡茶”概念产品，正式成片包含本地音效，不依赖 API Key。

## Composition

- `AssetCheck`：3 秒素材、透明度与字体预检。
- `QingtiJasmineAd`：15 秒、900 帧的快节奏竖屏新品广告。

正式模板采用 7 个短段落，并用瓶身贴镜、原料掠镜、液体穿屏和气泡扩张遮住切点。口味段仍由同一 `FlavorScene` 配置化重复调用。

当前正式 Composition 不再使用旧版全屏商业底片。产品原图始终使用 `contain`，并额外作为贴近镜头的遮挡转场元素。青提与茉莉口味段使用专为 9:16 运动设计的无包装、无品牌、无文字视觉底板，再由 Remotion 叠加推镜、横移、代码气泡、液体曲线与拖影。

正式时间线使用 `Sequence` 与自定义 `OcclusionTransition` 编排，在遮挡峰值执行硬切，避免 PPT 式滑页。画面系统使用 `@remotion/shapes`、`@remotion/noise` 与 `@remotion/motion-blur`；音效由本地 `public/assets/sfx/` 驱动。核心场景不依赖实时随机数，逐帧结果可复现。

运动以 30fps 设计时间编排，再由 `useDesignFrame()` 在 60fps Composition 中进行双倍采样；这样不改变15秒节拍，同时让推镜、漂移、气泡、流体和穿屏转场获得更连续的中间帧。产品图使用正常混合、收窄柔边遮罩、暗青轮廓光、接触阴影和单向移动高光强化前后景分离。

## 快速开始

```powershell
Set-Location -LiteralPath 'E:\元气森林\genki-lab\video-remotion'
npm install
npm run check:assets
npm run dev
```

渲染预检与成片：

```powershell
npm run still:assets
npm run stills:ad
npm run render:ad
```

输出位置：

- `out/asset-check.png`
- `out/stills/*.png`
- `out/qingti-jasmine-ad.mp4`

## 新增一款产品

1. 在 `public/assets/products/<slug>/` 放置产品、原料和背景素材。
2. 复制 `src/data/qingti-jasmine.ts`，只替换产品文案、颜色、素材路径和时长。
3. 所有产品图保持原比例，正式路径通过配置传给 `staticFile()`。
4. 在 `src/Root.tsx` 注册新的 Composition，复用 `BeverageProductAd`。
5. 依次运行素材检查、字体检查、七张静帧检查，再渲染 MP4。

详细步骤见 [批量模板指南](docs/BATCH_TEMPLATE_GUIDE.md) 与 [渲染指南](docs/RENDER_GUIDE.md)。

原创视觉底片的用途和提示词摘要见 [原创视觉素材说明](docs/CREATIVE_ASSETS.md)。

## 合规说明

本工程不生成价格、销量、奖项、上市日期、配方含量或营养功效结论。用户提供的包装画面仍需在正式发布前完成品牌、研发和合规复核。
