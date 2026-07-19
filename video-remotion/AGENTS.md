# GENKI LAB Remotion开发规则

1. 开发前读取已安装的Remotion Agent Skills。
2. 视频画面使用React和Remotion组件实现。
3. 动画使用useCurrentFrame、interpolate、spring和Sequence。
4. 不使用CSS无限动画、setInterval或依赖真实时间的动画。
5. 所有静态素材统一通过staticFile()调用。
6. 产品图片不得拉伸、裁切或重新绘制。
7. 所有产品信息由配置文件驱动。
8. 所有文字统一使用思源黑体加粗。
9. 没有检测到思源黑体时，正式渲染必须失败。
10. 先完成素材检查构图，再制作正式广告。
11. 每次修改后检查1080×1920竖屏安全区。
12. 不使用网页仪表盘、信息卡片或项目汇报风格。
13. 产品瓶必须是主要视觉焦点。
14. 不使用未经证实的营养、功效、价格和上市表述。
15. 不修改video-remotion目录之外的代码。
