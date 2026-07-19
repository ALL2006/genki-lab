# GENKI LAB 成员提交资料

本目录用于保存组员提交的原始研究文档和数据文件。这里的文件属于项目资料层，不会被 Vite 前端或 Remotion 视频工程自动读取，也不应复制到 `public/` 目录。

## 当前目录

```text
materials/
└─ team-submissions/
   ├─ product-research/
   │  └─ GENKI_LAB_青提茉莉气泡茶_排版优化版.docx
   └─ user-research/
      └─ 多平台饮料真实评论数据_修订版.xlsx
```

## 文件说明

### 产品研究文档

- 文件：`team-submissions/product-research/GENKI_LAB_青提茉莉气泡茶_排版优化版.docx`
- 类型：组员提交的产品与行业研究文档。
- 状态：原始提交副本，尚未拆分为网页数据，也未作为最终研究结论审核。

### 用户研究数据

- 文件：`team-submissions/user-research/多平台饮料真实评论数据_修订版.xlsx`
- 类型：多平台饮料评论、清洗结果、标签统计、来源记录与分析看板。
- 状态：原始提交副本，尚未导入 `src/data/`，也未连接前端服务层。
- 公开提醒：文件包含评论原文和来源链接。若 GitHub 仓库设为公开，请先确认组员授权、平台引用要求和数据公开范围；未确认前建议使用 Private 仓库。

## 使用约定

1. 保留组员原文件，不直接覆盖；修订版使用新文件名或新日期目录。
2. 原始资料保存在 `materials/`，不要放入 `public/`，避免被 GitHub Pages 直接公开访问。
3. 需要接入网页时，先完成来源核验、必要的匿名化和字段映射，再转换到 `src/data/` 所需的 TypeScript 结构。
4. 提交 GitHub 前先运行 `git status`，确认没有把 `node_modules/`、`dist/` 或视频渲染输出加入版本控制。

