# 9:16 饮料新品广告模板

这是一个由单一 JSON 配置驱动的 HyperFrames 竖屏饮料广告模板。示例配置为“元气森林青提茉莉气泡茶”，定位是面向消费者的概念新品介绍广告，不呈现研发流程、系统架构或项目汇报内容。

## 输出规格

- 1080 × 1920，9:16
- 30fps
- 示例总时长 27 秒
- 简体中文，无旁白与音乐
- MP4，适合抖音、小红书与微信视频号预览
- 重要标题位于顶部 160px 以下，免责声明位于底部 100px 以上

## 目录

```text
video/
├─ assets/                         # 产品、口味、背景与生活场景素材
├─ compositions/beverage-product-ad/
│  ├─ composition.js              # VerticalVideoComposition 动态编排
│  ├─ components/                 # 通用视觉组件
│  ├─ scenes/                     # 通用场景组件
│  ├─ styles.css                  # 9:16 统一设计系统
│  └─ types.ts                    # 产品配置类型
├─ data/qingti-jasmine.json       # 当前产品的唯一内容与时间配置
├─ scripts/build.mjs              # JSON → index.html 构建器
├─ STORYBOARD.md
└─ index.html                     # 构建产物
```

## 安装与预览

```bash
cd video
npm install
npm run build:template
npm run dev
```

预览服务启动后，在 HyperFrames Studio 中选择 `beverage-product-ad` 合成。

## 检查、快照与渲染

```bash
npm run check
npm run snapshot
npm run render
```

默认 MP4 输出到 `renders/qingti-jasmine.mp4`。

也可以用其他配置一条命令生成：

```bash
npm run render:product -- --config data/new-product.json --output renders/new-product.mp4
```

或手动分步生成：

```bash
node scripts/build.mjs --config data/new-product.json --output index.html
npx --yes hyperframes@0.7.63 check
npx --yes hyperframes@0.7.63 render --quality high --fps 30 --skill product-launch-video --output renders/new-product.mp4
```

## 新增一个产品配置

1. 复制 `data/qingti-jasmine.json` 为新的 JSON 文件。
2. 修改品牌、产品名、颜色、口味、卖点、场景、口号、免责声明与素材路径。
3. `flavors` 可以包含一个或多个口味；构建器会对每项重复调用同一个 `FlavorScene`，不需要修改核心场景代码。
4. 修改 `timeline` 和每项口味的 `duration` 时，确保合计时长在 22—30 秒内。
5. 保持 `output` 为 1080 × 1920、30fps。

核心配置结构：

```json
{
  "brandName": "",
  "productName": "",
  "shortName": "",
  "category": "",
  "primaryColor": "#000000",
  "secondaryColor": "#FFFFFF",
  "accentColor": "#E9544D",
  "flavors": [
    { "name": "", "description": "", "asset": "assets/flavor.png", "duration": 4 }
  ],
  "benefits": [],
  "scenes": [{ "name": "", "asset": "assets/lifestyle.jpg" }],
  "slogan": "",
  "conceptLabel": "概念产品演示",
  "disclaimer": "",
  "assets": {
    "productFront": "assets/product-front.png",
    "productHero": "assets/product-hero.png",
    "productThreeView": "assets/product-three-view.png",
    "background": "assets/background.jpg",
    "logo": "assets/logo.png"
  }
}
```

## 替换素材

- 产品正面图：替换 `assets.productFront` 对应文件。推荐透明 PNG；组件始终使用 `object-fit: contain`，不会拉伸、裁切或重绘包装文字。
- 产品英雄图、三视图、背景：分别由 `productHero`、`productThreeView` 与 `background` 控制，未使用的字段也会保留给后续产品模板。
- 水果、花卉或辅助原料：修改每个 `flavors[].asset`。
- 生活场景：修改每个 `scenes[].asset`。
- Logo：修改 `assets.logo`；若无独立 Logo，模板以配置中的品牌名排版，不会伪造图形标识。

所有路径都相对于 `video/`。缺少素材时会显示明确的“开发占位”框，并在 `.hyperframes/asset-report.json` 列出缺失项。占位只用于结构与渲染测试，发布前必须补齐并再次运行检查和快照。

## 内容与合规边界

- 不写入虚构价格、销量、奖项、用户比例或上市日期。
- 口味文案仅表达感官感受，不声称真实含量、营养或功能。
- 最终画面持续显示“概念产品演示”，并保留研发与合规确认说明。
- 当前仓库未提供真实包装图、原料图或生活方式图片，因此测试渲染不是可直接投放的终稿。
