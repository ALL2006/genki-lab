# 原创视觉素材说明

工程内共保留六张无包装、无品牌、无文字的原创视觉底片。当前正式成片只引用后两张 `v2` 口味动态底板；前四张保留用于版本比较与素材检查，不进入正式 Composition。正式产品包装仍只使用用户提供的原始产品图。

| 文件 | 用途 |
|---|---|
| `public/assets/generated/qingti-jasmine/liquid-vortex.png` | 液体隧道推镜、开场和白光转场 |
| `public/assets/generated/qingti-jasmine/grape-refraction.png` | 青提折射、近景视差和掠镜 |
| `public/assets/generated/qingti-jasmine/jasmine-water-spiral.png` | 茉莉花瓣环绕、水幕旋转和遮挡转场 |
| `public/assets/generated/qingti-jasmine/bubble-shockwave.png` | 径向气泡冲击、高潮背景和爆发转场 |
| `public/assets/generated/qingti-jasmine/grape-water-cgi-v2.png` | 当前正式青提口味段；9:16 水光折射底板 |
| `public/assets/generated/qingti-jasmine/jasmine-water-cgi-v2.png` | 当前正式茉莉口味段；9:16 花瓣水幕底板 |

## 生成提示词摘要

1. 高亮白色商业摄影空间中的浅绿茶汤与透明气泡水旋涡，中心留出产品合成空间；禁止包装、文字、Logo、人物。
2. 青提绿色透明球体、切面折射、水珠和高速宏观景深，形成由左下向右上的运动通道；禁止包装和文字。
3. 现代高亮饮料广告风格的白色茉莉、花瓣、透明水幕与细密气泡，形成环绕中心的螺旋运动；禁止传统深色风格和包装。
4. 透明气泡水与浅绿色光线从中心径向爆发，形成可缩放的液体冲击波；禁止产品、原料、文字和品牌元素。

素材由内置图像生成工具生成，随后复制到项目目录。六张文件均由 `npm run check:assets` 检查存在性、可读性、尺寸和文件大小。`v2` 底板由产品配置中的 `motionPlateKey` 选择，更换新品时无需修改 `FlavorScene`。
