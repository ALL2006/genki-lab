# Remotion 环境与 Skills

## 环境记录

| 项目 | 实际版本/结果 |
|---|---|
| Node.js | `v24.11.1` |
| npm | `11.6.2` |
| Git | `2.53.0.windows.1` |
| Remotion | `4.0.491` |
| Remotion 扩展 | `@remotion/transitions`、`@remotion/shapes`、`@remotion/noise`、`@remotion/motion-blur` 均为 `4.0.491` |
| React | `19.2.3` |
| 操作系统 | Windows，PowerShell |

全部 npm 依赖仅安装在 `E:\元气森林\genki-lab\video-remotion`，未写入现有网页工程。

## 工程初始化

优先执行了官方命令：

```powershell
npx --yes create-video@4.0.491 --yes --blank --no-tailwind video-remotion
```

初始化器成功启动，但其 GitHub 压缩包下载通道在当时返回 `connect ECONNREFUSED 127.0.0.1:443`。随后从同一官方 `remotion-dev/template-empty` 仓库克隆 blank 模板，移除嵌套 `.git`，并把 `remotion`、`@remotion/cli` 与 ESLint 配置锁定到 `4.0.491`。安装命令：

```powershell
npm install
```

## Agent Skills

先后尝试：

```powershell
npx remotion skills add
npx skills add remotion-dev/skills --skill remotion --agent codex --copy --yes
```

第一次在 Windows 上出现 `spawn EINVAL`，第二次遇到 GitHub 临时连接重置。连接恢复后，直接克隆官方仓库并从 HEAD `ad2321d187d2b15f65cdbfb9cb9f9a57e1a75e8c` 复制当前公开的四个官方 Skill：

- `.agents/skills/remotion-best-practices`
- `.agents/skills/remotion-create`
- `.agents/skills/remotion-markup`
- `.agents/skills/remotion-render`

计划制定时官方仓库仅观察到主 Skill；执行时仓库已经公开后三个独立 Skill，因此最终安装的是当前官方版本，不再保留本地兼容包装。四个目录均通过 `quick_validate.py`。

## 字体与素材工具

- 字体文件未复制进项目。
- `FontGate` 由 Chromium 运行时检查系统字体。
- 实际命中：`Source Han Sans SC`，字重 `700`。
- 五项透明衍生素材使用纯品红中间稿和项目私有 `.venv` 中的 Pillow 转换；原文件完整保留在 `_source/`。
- 项目不需要 `OPENAI_API_KEY`，正式渲染不调用外部模型。

## 目录结构

```text
video-remotion/
├─ .agents/skills/
├─ public/assets/products/qingti-jasmine/
│  ├─ _source/
│  └─ 10项原始标准文件
├─ public/assets/generated/qingti-jasmine/
│  └─ 6项无包装、无品牌、无文字创意底板
├─ scripts/
├─ src/
│  ├─ components/
│  ├─ compositions/
│  ├─ config/
│  ├─ data/
│  ├─ scenes/
│  ├─ styles/
│  └─ types/
├─ docs/
└─ out/
```

本地预览：

```powershell
npm run dev
```
