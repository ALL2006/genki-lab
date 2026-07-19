---
version: 1
name: Fresh Botanical Beverage
description: "清新、轻盈、通透的竖屏饮料商业广告系统"
colors:
  canvas: "#F6FFF9"
  canvasWarm: "#FFFDF7"
  primary: "#2E8B62"
  primaryLight: "#BFE8D0"
  grape: "#72C69B"
  jasmine: "#FFFDF7"
  water: "#E7F8F4"
  accent: "#E9544D"
  ink: "#14372A"
  muted: "#5E7C70"
typography:
  display:
    fontFamily: "Microsoft YaHei, Noto Sans SC, system-ui, sans-serif"
    weight: 700
  body:
    fontFamily: "Microsoft YaHei, Noto Sans SC, system-ui, sans-serif"
    weight: 400
  label:
    fontFamily: "Microsoft YaHei, Noto Sans SC, system-ui, sans-serif"
    weight: 600
safeArea:
  top: 160
  bottom: 100
  side: 72
components:
  cardRadius: 42
  pillRadius: 999
  thinRule: 2
  productShadow: "0 44px 90px rgba(24, 91, 65, 0.18)"
---

# Fresh Botanical Beverage

## Frame character

画面以高亮浅绿和茉莉白为主，青提绿承担主要视觉识别，元气森林红仅作为小面积标签和节奏标记。背景可以使用柔和径向渐变、透明水色叠层、薄雾与高光，但不得使用霓虹、赛博或深色科技风。

## Typography

所有中文使用系统无衬线字体。标题保持 64–118px 的视频尺度，正文保持 28–40px；免责声明允许 22–28px，但必须保证对比度和安全区。短句优先，一屏只保留一个核心阅读重点。

## Product treatment

- 产品图始终 `object-fit: contain`，保持原始比例，不裁切、不拉伸。
- 不在代码中重绘包装标签；缺失图片时显示独立的开发占位框。
- 白底产品图使用浅色光雾、反射和柔和阴影融入背景。
- 产品瓶是主要视觉焦点，原料与文字不得遮挡品牌和产品名称区域。

## Motion language

- 入口使用 `power3.out`、`expo.out` 或 `sine.inOut` 的克制长尾缓动。
- 水波扩散、气泡上升、花瓣下降均为有限且确定性的时间轴动画。
- 产品揭晓使用轻微推进与柔和升起；爆发段允许更快的运动模糊和集中节奏。
- 不使用卡通弹跳、无限循环、随机数、故障、霓虹或所有元素同时运动。

## Safety and compliance

标题上缘不高于 160px 安全线，免责声明下缘不低于底部 100px。始终显示“概念产品演示”，不出现价格、销量、奖项、用户比例或上市日期。
