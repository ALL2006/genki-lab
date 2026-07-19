# 故障排查

## 找不到素材

运行 `npm run check:assets`，日志会给出具体字段和完整项目相对路径。确认文件位于项目自己的 `public/`，不要引用上级网页工程。

## 路径错误地包含 public

`staticFile()` 接收相对于 `public/` 的路径。正确：`assets/products/...`；错误：`public/assets/...` 或 `/public/assets/...`。

## 文件名含空格、括号或大小写不一致

源文件可保留原名，但正式副本必须与配置完全一致。当前青提簇正式名为 `grape-cluster.png`。

## 图片仍有棋盘格

这表示棋盘格已经烘焙进 RGB 图像。停止正式渲染，重新进行背景提取，并在 AssetCheck 的深灰/品红分割背景中复核。只增加 Alpha 通道不能消除烘焙棋盘格。

## 产品图片变形或标签被裁切

产品图必须使用 `Img` 和 `objectFit: "contain"`，宽高由原始比例决定。不要使用 `cover`，不要单独拉伸宽度或高度，也不要用图层遮住品牌和产品名。

## 未检测到思源黑体

安装思源黑体加粗字体后完全关闭并重新启动 Studio。`FontGate` 不会回退到微软雅黑、Arial、Inter 或 Noto Sans；正式渲染会显示指定中文错误并退出。

## Studio 无法启动

确认 Node/npm 可用，在 `video-remotion` 内运行 `npm install`、`npm run check:assets` 和 `npm run typecheck`。检查端口占用和终端中的首个错误。

## 浏览器下载失败

Remotion 首次渲染需要 Chrome Headless Shell。确认可访问日志给出的 Google Storage 地址后重试。不要跳过字体和素材门禁去使用其他截图工具代替正式渲染。

## 视频输出为空或渲染连续失败

先单独渲染 `AssetCheck` 和一张正式静帧。确认入口为 `src/index.ts`、Composition ID 正确、素材可读、字体命中。连续失败时停止并保留完整错误日志。

## 中文乱码

源文件统一保存为 UTF-8，字体必须命中 `Source Han Sans SC` 等允许家族之一。不要把乱码文本复制到配置中；在 AssetCheck 顶部对照四行中文测试文字。

## 透明边缘出现品红或主体被削弱

在深灰与品红背景分别检查。若主体轮廓、白色花瓣或半透明水花发生变化，只允许一次针对性修正；仍不合格则停止正式 MP4。
