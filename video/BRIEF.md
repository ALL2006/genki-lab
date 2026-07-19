---
workflow: product-launch-video
flow: automation
storyboard: no
message: "用清新通透的花果气泡感介绍元气森林青提茉莉气泡茶概念产品"
destination: vertical-social-video
aspect: 1080x1920
language: zh-CN
audience: "年轻学生和职场人"
length: 27s
angle: sensory-product-reveal
narration: no
---

## Intent

一条面向消费者的新品介绍广告，突出青提果香、茉莉茶香、细密气泡感和轻盈夏日氛围。画面清新、克制、通透，适用于抖音、小红书和微信视频号。

## Assets

- 当前工作区未提供产品包装图、青提图、茉莉花图或生活场景图。
- 所有素材路径由 `data/qingti-jasmine.json` 控制；缺失时显示明确的开发占位，不在代码中重绘包装标签。

## Customizations

- 单一 JSON 驱动品牌、产品、颜色、口味、场景、文案、素材路径和分段时长。
- `FlavorScene` 根据口味数组动态复用，支持未来产品拥有不同数量的口味。
- 1080×1920、30fps、27秒，标题与免责声明遵守竖屏安全区。
- 成片标注“概念产品演示”。

## Notes

- 不出现 AI、开发工具、系统架构、研究过程、产品评分、用户验证流程或项目汇报文案。
- 不添加价格、销量、奖项、用户比例、上市日期、真实配方含量或营养功能声称。
- 不添加视频播放器、不拉伸或裁切产品图、不在程序中重绘瓶身包装文字。
- 当前为无旁白、无背景音乐版本，重点验证可复用视觉模板与渲染链路。
