# 批量新品配置指南

## 通用模板与单品文件

通用模板：

- `src/compositions/BeverageProductAd.tsx`
- `src/scenes/*.tsx`
- `src/components/*.tsx`
- `src/types/product-video.ts`
- `src/styles/typography.ts`

青提茉莉单品配置：

- `src/data/qingti-jasmine.ts`
- `src/config/asset-manifest.ts`
- `public/assets/products/qingti-jasmine/`

## 新增产品

1. 复制 `public/assets/products/qingti-jasmine/` 的目录结构到新的 `<slug>`。
2. 把新产品的原始素材放入 `_source/`，正式路径使用规范文件名。
3. 产品正面与主视觉不得拉伸、裁切、重绘包装或重新排版标签。
4. 需要透明的水果、花卉和水花必须先在深灰/品红双背景下检查 Alpha；不得保留烘焙棋盘格。
5. 复制 `src/data/qingti-jasmine.ts` 为新的配置文件。
6. 只修改品牌、产品名、类别、颜色、口味、场景、文案、免责声明、素材映射和时长。
7. 在 `src/Root.tsx` 注册新的 Composition，并继续复用 `BeverageProductAd`。

## 可替换字段

- `brandName`、`productName`、`fullProductName`、`category`
- `primaryColor`、`secondaryColor`、`accentColor`、`darkColor`
- `flavors[]`：标题、感官描述、主辅素材键
- `keywords[]`、`scenes[]`
- `sloganLine1`、`sloganLine2`、`conceptLabel`、`disclaimer`
- `assets`：产品正面、主视觉、原料、背景等路径
- `timings`：开场、揭晓、每个口味、高潮和尾卡帧数

`BeverageProductAd` 会按 `flavors` 数组动态重复调用 `FlavorScene`，总时长由配置自动计算。改变口味数量时不需要复制场景代码。

## 输出另一款新品

1. 先让资产检查脚本覆盖新产品的素材表。
2. 为新 Composition 准备对应的七帧抽查清单。
3. 按 `check:assets → typecheck → AssetCheck → stills → MP4` 的顺序执行。
4. 为不同产品设置独立输出名，避免覆盖现有成片。

禁止在新配置中添加未经证实的价格、销量、奖项、上市日期、营养和功效结论。
