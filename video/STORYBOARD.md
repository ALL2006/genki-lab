---
format: 1080x1920
fps: 30
message: "一口青提，一缕茉莉，让今天轻一点"
arc: "清爽钩子 → 产品揭晓 → 双重口味 → 气泡高潮 → 生活场景 → 产品定格"
audience: "年轻学生和职场人"
mode: autonomous
music: none
---

## Video direction

- palette: 茉莉白与高亮浅绿为画布，青提绿为主视觉，透明水色承担空间感，元气森林红只用于小面积标签。
- motion: 全片使用 `power3` 长尾缓动；文字、原料与产品按视觉阅读顺序逐项揭示，水波、气泡与花瓣均为有限、确定性动画。
- rhythm: 清爽慢启 → 克制产品推进 → 两段柔和口味呼吸 → 气泡节奏峰值 → 三张生活卡快切 → 五秒静稳产品定格。
- held frames: 茉莉茶香末段与最终产品定格承担静稳阅读；其他段落在后半程继续揭示，不前置堆满。
- safe area: 所有主标题位于顶部 160px 以下，底部免责声明距离画面底部至少 100px。
- negative: 不出现项目、研发流程、工具、系统、评分或验证文案；不使用霓虹、赛博、故障、卡通弹跳、无限循环、随机数、懒惰呼吸或多元素无主次漂浮。

## Frame 1 — 清爽开场

- scene: 青提落入透明水面，水波扩散，气泡上升，茉莉花瓣缓慢飘入。
- duration: 3s
- poster: 2.2s
- transition_in: cut
- status: animated
- voiceover: ""
- src: compositions/frames/01-opening.html
- type: hook
- persuasion: Future pacing
- beat: 清新好奇
- blueprint: compose
- asset_candidates: assets/flavor-grape.png — 青提素材；assets/flavor-jasmine.png — 茉莉花素材
- focal: assets/flavor-grape.png
- roles: flavor-grape = cutout；flavor-jasmine = supporting
- sfx: none

Scene 1 (0.0–0.7s): 高亮浅绿与茉莉白水色画布先建立，单颗青提从上方柔和落下；Centered 上半区，背景/水面/前景三层。
Scene 2 (0.7–1.8s): 青提触水，圆形水波由中心向外绘制并扩散（`svg-path-draw`）；不同尺寸气泡按固定索引从底部上升，花瓣从左右缓慢下降与轻旋（`sine-wave-loop` 有限变化）。
Scene 3 (1.8–3.0s): “今天，轻一点。”以逐词柔和揭示进入（`dynamic-content-sequencing`），波纹减弱并保持一段干净阅读。

narrativeRole: 用视觉清凉感先让观众感到“今天可以轻一点”。
keyMessage: 今天，轻一点。

## Frame 2 — 产品揭晓

- scene: 产品从白色光雾与水面中升起，周围由青提、茉莉与透明气泡环绕。
- duration: 4s
- poster: 3.1s
- transition_in: zoom-through
- status: animated
- voiceover: ""
- src: compositions/frames/02-product-intro.html
- type: product_intro
- persuasion: Product reveal
- beat: 惊喜 + 清晰
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/product-front.png — 产品正面透明图；assets/flavor-grape.png — 青提素材；assets/flavor-jasmine.png — 茉莉花素材；assets/logo.png — 官方品牌标识
- focal: assets/product-front.png
- roles: product-front = cutout；flavor-grape = supporting；flavor-jasmine = supporting；logo = supporting
- sfx: none

Adapt: 保留围绕固定中心产品逐步组装并轻推镜的签名动作，品牌标识缺失时不重绘，产品图缺失时显示开发占位。
Scene 1 (0.0–1.2s): 白色光雾和水面反射先建立，产品由下方升至中心并由模糊转清晰；产品保持 contain 与原始比例，轻微推进（`multi-phase-camera`）。
Scene 2 (1.2–2.7s): 青提、茉莉与气泡依次在瓶身外圈形成克制环绕（`center-outward-expansion`），不遮挡产品正面；“元气森林”从下方柔和上移。
Scene 3 (2.7–4.0s): “青提茉莉气泡茶”随后上移揭示，底部“概念产品演示”固定在安全区内；产品和文字稳定保持。

narrativeRole: 明确产品身份，并将开场的轻盈感落到具体新品。
keyMessage: 元气森林青提茉莉气泡茶。

## Frame 3 — 青提果香

- scene: 青提切面、水珠与绿色透明液体围绕产品形成清爽近景。
- duration: 4s
- poster: 3.0s
- transition_in: push-slide LEFT
- status: animated
- voiceover: ""
- src: compositions/frames/03-flavor-one.html
- type: feature_showcase
- persuasion: Sensory translation
- beat: 鲜活
- blueprint: titlecard-reveal (Adapt)
- asset_candidates: assets/product-front.png — 产品正面透明图；assets/flavor-grape.png — 青提素材
- focal: assets/flavor-grape.png
- roles: product-front = cutout；flavor-grape = supporting
- sfx: none

Adapt: 保留一次克制主标题揭示与静稳保持，加入产品和原料的前后景层次。
Scene 1 (0.0–1.0s): 青提素材或开发占位进入左上近景，绿色透明水色从下方铺开；产品置于右侧 40% 区域，形成非对称 60/40。
Scene 2 (1.0–2.3s): “青提果香”由轻微上移与聚焦完成揭示，几颗青提按固定路径从前景掠过（`motion-blur-streak`）后停驻。
Scene 3 (2.3–4.0s): “清甜鲜活，入口清爽”逐词出现并保持；水珠高光和少量气泡有限上升，产品不再移动。

narrativeRole: 用感官语言呈现第一重口味，不做原料含量或功能声称。
keyMessage: 青提果香，清甜鲜活。

## Frame 4 — 茉莉茶香

- scene: 洁白茉莉花瓣与浅绿色茶汤、透明气泡形成现代花香画面。
- duration: 4s
- poster: 3.0s
- transition_in: blur-crossfade
- status: animated
- voiceover: ""
- src: compositions/frames/04-flavor-two.html
- type: feature_showcase
- persuasion: Sensory translation
- beat: 舒展
- blueprint: titlecard-reveal (Adapt)
- asset_candidates: assets/product-front.png — 产品正面透明图；assets/flavor-jasmine.png — 茉莉花素材
- focal: assets/flavor-jasmine.png
- roles: product-front = cutout；flavor-jasmine = supporting
- sfx: none

Adapt: 保留单次克制文字揭示与末段静稳，让洁白花朵和现代浅色画布成为主角。
Scene 1 (0.0–1.1s): 茉莉白画布与浅绿茶汤层先出现，产品位于中心偏右；花瓣从两侧缓慢下降并轻旋。
Scene 2 (1.1–2.4s): “茉莉茶香”由柔和聚焦和上移揭示，花朵素材或开发占位置于左下，三层景深保持洁白。
Scene 3 (2.4–4.0s): “花香轻盈，余味舒展”逐词出现；画面停止推进，只保留少量有限气泡后静稳阅读。

narrativeRole: 呈现第二重轻盈花香，与青提段形成清爽互补。
keyMessage: 茉莉茶香，花香轻盈。

## Frame 5 — 气泡爆发

- scene: 冰块、水花和细密气泡由底部爆发，产品快速回到中心，原料形成动态环绕。
- duration: 4s
- poster: 3.2s
- transition_in: zoom-through
- status: animated
- voiceover: ""
- src: compositions/frames/05-bubble-explosion.html
- type: benefit_highlight
- persuasion: Sensory climax
- beat: 爽快兴奋
- blueprint: kinetic-type-beats (Adapt)
- asset_candidates: assets/product-front.png — 产品正面透明图；assets/flavor-grape.png — 青提素材；assets/flavor-jasmine.png — 茉莉花素材
- focal: assets/product-front.png
- roles: product-front = cutout；flavor-grape = supporting；flavor-jasmine = supporting
- sfx: none

Adapt: 保留多段短句依次落下的节奏引擎，产品和气泡爆发承担视觉峰值，避免故障和霓虹。
Scene 1 (0.0–1.0s): 透明冰块与水花从底部集中上冲，气泡按固定大小和速度差爆发；产品带轻微运动模糊快速落入中心（`motion-blur-streak`）。
Scene 2 (1.0–2.5s): “果香 × 茶香 × 气泡感”按三个短语逐段出现（`kinetic-beat-slam`），青提和茉莉从两侧环绕后停驻，不遮挡瓶身。
Scene 3 (2.5–4.0s): “清爽刚刚好”放大后平滑落定，背景高光集中到产品后方，其他运动收束并保持。

narrativeRole: 把双重口味合并成清爽气泡体验，形成全片能量峰值。
keyMessage: 果香、茶香与气泡感，清爽刚刚好。

## Frame 6 — 生活场景

- scene: 午后学习、日常通勤、轻松休息三张竖屏卡片约一秒切换。
- duration: 3s
- poster: 2.5s
- transition_in: push-slide UP
- status: animated
- voiceover: ""
- src: compositions/frames/06-lifestyle.html
- type: benefit_highlight
- persuasion: Use-case future pacing
- beat: 代入 + 轻松
- blueprint: grid-card-assemble (Adapt)
- asset_candidates: assets/product-front.png — 产品正面透明图；assets/lifestyle-study.jpg — 午后学习；assets/lifestyle-commute.jpg — 日常通勤；assets/lifestyle-relax.jpg — 轻松休息
- focal: assets/product-front.png
- roles: product-front = cutout；lifestyle-study = background；lifestyle-commute = background；lifestyle-relax = background
- sfx: none

Adapt: 将网格组装改为同一安全区内的三张卡片快速接力，产品始终作为前景固定焦点。
Scene 1 (0.0–0.9s): 午后学习卡片由右侧进入并定格，产品固定在前景下中部；背景图缺失时显示清晰开发占位。
Scene 2 (0.9–1.8s): 以同向速度切换到日常通勤卡片，保持产品位置与视觉连续性；卡片在峰值速度处完成切换。
Scene 3 (1.8–3.0s): 切换到轻松休息卡片，“随时给生活加一点轻盈”从上方柔和出现并保持。

narrativeRole: 让年轻消费者把产品代入三个高频轻饮场景。
keyMessage: 随时给生活加一点轻盈。

## Frame 7 — 最终产品定格

- scene: 产品居中，青提、茉莉、冰块和气泡铺底，浅绿光晕完成最终品牌定格。
- duration: 5s
- poster: 4.2s
- transition_in: blur-crossfade
- status: animated
- voiceover: ""
- src: compositions/frames/07-end-card.html
- type: branding
- persuasion: Memory lockup + compliance
- beat: 清爽确信
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/product-front.png — 产品正面透明图；assets/flavor-grape.png — 青提素材；assets/flavor-jasmine.png — 茉莉花素材；assets/logo.png — 官方品牌标识
- focal: assets/product-front.png
- roles: product-front = cutout；flavor-grape = supporting；flavor-jasmine = supporting；logo = supporting
- sfx: none

Adapt: 保留从原料环绕到产品与文案锁定的品牌收束，不绘制缺失标识，免责声明在底部安全区内保持全程可读。
Scene 1 (0.0–1.4s): 高亮浅绿渐变和圆形光晕先建立，产品从轻雾中升至中心；青提、茉莉与冰块在底部由中心向外组装（`center-outward-expansion`）。
Scene 2 (1.4–3.0s): “青提茉莉气泡茶”与核心文案分两次柔和上移，产品保持 contain；“概念产品演示”作为红色小标签进入。
Scene 3 (3.0–5.0s): 合规说明在距离底部 100px 以上完整出现，所有主要运动结束；产品、标题和文案静稳保持到最后一帧。

narrativeRole: 以产品、核心文案与合规说明完成可记忆且诚实的定格。
keyMessage: 一口青提，一缕茉莉，让今天轻一点。
