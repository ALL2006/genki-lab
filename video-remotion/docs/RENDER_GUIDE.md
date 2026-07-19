# 预览与渲染指南

## 1. 进入工程

```powershell
Set-Location -LiteralPath 'E:\元气森林\genki-lab\video-remotion'
```

## 2. 安装依赖

```powershell
npm install
```

## 3. 检查素材

```powershell
npm run check:assets
```

脚本检查十二项产品配置素材与四项归档创意素材的存在性、可读性、文件大小、尺寸，以及五项透明衍生素材的有效 Alpha，并更新 `docs/ASSET_MANIFEST.md`。失败时退出码为 1。

## 4. 打开 Studio

```powershell
npm run dev
```

`predev` 会自动执行素材检查和 TypeScript 检查。Studio 中选择 `AssetCheck` 或 `QingtiJasmineAd`。

## 5. 渲染素材检查图

```powershell
npm run still:assets
```

输出：`out/asset-check.png`。

## 6. 渲染七张正式静帧

```powershell
npm run stills:ad
```

输出：`out/stills/`。必须检查产品比例、标签可见性、字体、安全区、透明边缘、乱码和占位内容。

## 7. 渲染正式视频

```powershell
npm run render:ad
```

输出：`out/qingti-jasmine-ad.mp4`。`prerender:ad` 会再次执行素材与类型门禁。

## 8. 验证文件

```powershell
ffprobe -v error -count_frames -select_streams v:0 `
  -show_entries stream=codec_name,width,height,r_frame_rate,nb_read_frames `
  -show_entries format=duration `
  -of json out/qingti-jasmine-ad.mp4
```

期望：H.264、1080×1920、60fps、900 帧、15.000 秒，并包含可读取的音频流。
