# 生日美化版 · 交接（更新于 2026-11-09）

分支：`main`。生日基础版本 `2558772` 已按用户新指令快进合并并推送到 `main`；`birthday-polish` 保留原提交。第二轮已补齐打击感画面效果；第三轮（本次）完成光影、地图、UI 重做和 Boss 招式/结局实测，均提交到 `main`。原计划四块现已全部完成。
目标：给女朋友的生日游戏整体美化（光影、地图、UI、攻击打击感），并加一个以用户本人为原型的最终 Boss。保留草帽女孩、猫、原剧情和玩法核心。

> v15 HANDOFF 里“不要启动游戏测试”的旧限制已被用户的新要求取代：这一轮要在浏览器里实际跑、截图检查。

## 本地运行

```bash
cd ~/Documents/ChatGPT/hat-and-cat && python3 -m http.server 18431 --bind 127.0.0.1
```

打开 http://127.0.0.1:18431/index.html （加 `?debug` 才开调试钩子）。8765 端口被别的进程占用，别用。打包单 HTML：`node build.cjs dist`。

### 调试钩子（只在 `?debug` 下生效）

- `window.__hat` = `{game, G, fx, camera, shoulder, actors, scene, renderer}`，game 是实时状态。
- `__hat.inspect=[cx,cy,cz, tx,ty,tz]` 覆盖相机位置和朝向，看模型用；`delete __hat.inspect` 恢复。
- 直接跳到最终 Boss（浏览器面板失焦会触发游戏原有的自动暂停，所以用引擎输入而不是按键）：

```js
document.getElementById('start').click();
const g=__hat.game;g.wilds.bossDefeated=true;
Object.assign(g.enemies.find(e=>e.id==='boss'),{dead:true,hp:0,state:'dead',deadAge:20});
const ex=HatWilds.exit;Object.assign(g.player,{x:ex.x,z:ex.z+1.4,y:ex.y,groundY:ex.y});
if(g.phase!=='play')document.getElementById('resume').click();
g.inputLatch.interact=false;__hat.G.step(g,{interact:true,moveX:0,moveZ:0},1/60);
```

## 已完成

### 新 Boss「钰淞 · 生日最终 Boss」

- 流程：打败守誓者 → 触碰余晖祭坛（交互类型 `final`）→ 封住雾门，他从天而降（`spawning` 1.35 秒，期间无敌）→ 打赢后坐在地上挥手 → 再到祭坛“吹灭生日蜡烛”→ 通关画面显示“生日快乐！”。
- 数据：`src/wilds-data.js` 里的敌人 `sweetheart`（`type:'boss'`、`bossKind:'sweetheart'`，HP 320，守誓者是 460）。名字写在 `bossName`，想改直接改这里。
- 引擎 `src/engine.js`：`wilds.finalEntered/finalDefeated` 两个标记、`enterFinal()`、雾门在决战时重新封住、营火复活会重置决战、击杀时发 `finalDefeated` 事件、`SHOT_VOLUMES.sweetheart`、`cake` 投射物半径。
- AI `src/enemy-ai.js`：5 个招式，前摇都比守誓者长，伤害约为一半——
  - `sweetSweep` 爱心棒棒糖横扫（可格挡、可弹反）
  - `sweetBonk` 棒棒糖敲头（线形，侧闪）
  - `sweetPopper` 生日礼花震地（圆形，不可挡，跳开）
  - `sweetHug` 抱抱冲锋（不可挡，闪避）
  - `sweetCakeA/B/Fan` 扔蛋糕（新投射物 `cake`，可格挡）
  - 选招：距离大于 4.4 时冲锋或扔蛋糕，近身时横扫、礼花或敲头；半血进入二阶段，连招更长。他在出场倒计时结束后才开始行动。
- 模型 `src/pixel-sweetheart.js`（新文件）：照用户证件照做的 Q 版体素人——黑发、厚刘海压到眉毛、圆脸、腮红、米色衬衫（领子、门襟、4 颗扣子、胸袋）、深色裤子；歪戴生日帽，右手拿爱心棒棒糖（也是挥砍轨迹的采样段，粉色），左手扔蛋糕时才显示蛋糕。会眨眼，受击时眯眼张嘴，受击闪光用 emissive 白闪。接口和 `pixel-warden.js` 一致。**已截图确认能认出是用户本人。**
- 渲染接入：`actors.js`（建模型、休眠时隐藏）、`boss-forms.js`（跳过他，避免旧平面贴图重复绘制）、`index.html`（加载新脚本）。
- 特效 `battle-fx.js`：飞行的小蛋糕（海绵、奶油、樱桃）、蛋糕砸中时奶油飞溅、彩纸粒子系统（出场、礼花、认输时撒，落地后停在地上）、敌人武器轨迹支持 `tint` 颜色。
- 界面：Boss 血条显示当前 Boss 的名字，并给 `#boss-hud` 加 `.sweet` class（**还没写对应 CSS**）；小地图上他显示成粉点；目标提示和通关文案都改成生日版；出场和认输时有提示。

### 打击感（数值 + 2026-11-09 视觉补齐）

- 命中停顿上限从 0.065 秒提到 0.085 秒：轻击 0.048、重击 0.08、弹反后的反击 0.085。
- 普通敌人被击退的距离从 0.1/0.3 提到 0.24/0.58（轻击/重击）。
- `battle-fx.js`：沿真实剑柄/剑尖采样绘制四层剑轨（柔光、主体、亮刃、细边），轻击/第二刀/重击/反击的余迹分别为 0.12/0.14/0.15/0.16 秒；重击偏金、反击为亮金，前摇末段剑尖有局部星光。仍使用普通透明混合，无 Bloom 或全屏闪白。
- 主命中在真实接触点显示短促冲击星、扩散小环与定向火花；轻击 9 枚、重击 14 枚，总池上限 120（reduced-motion 为 48）。连锁反应维持较弱反馈。
- `pixel-enemies.js` / `pixel-warden.js`：受击从底色染色改为白色 emissive，峰值 0.9，按引擎现有 0.09 秒命中计时平滑衰减；弹反保留冷青色。冻结帧也更新首个命中提示，后续保持冻结，原底色与顶点色不变。
- 新 `impact-camera.js` + `game.js`：命中后的微幅镜头位移，轻击 0.04 m、重击 0.075 m、反击 0.09 m，所有事件最大 0.095 m；靠墙时再乘 0.35。同一动作命中多个目标不叠加，暂停/死亡/切场清空。位移仅在渲染时应用，渲染后恢复相机位置和矩阵，不改变瞄准/碰撞。
- `prefers-reduced-motion: reduce` 下完全关闭震屏，减少火花、缩短剑轨、隐藏外围柔光并缩小剑尖闪光。调试对象 `__hat.impactCamera` 可查看 `sample()`，`__hat.inspect` 固定相机时禁用镜头偏移。

### 光影与地图（第三轮）

- `wilds-world.js` 配色整体换成金色黄昏：草地亮绿带暖斑、石材淡紫灰、秋叶金橙、旗帜深红；天空着色器改为靛蓝→紫玫→珊瑚→金，带分级夕阳光晕和闪烁星星；云带下沿被夕阳染暖。
- 景深：新增三层阶梯状远山剪影环（半径 104/93/82，粉→紫→深紫，`fog:false`），走动时有视差；雾色改暖，范围 30–122。
- 光：`game.js` 曝光 1.1，太阳 `#ffcf8f` 2.7，半球光 `#a9b6ff`/`#6a4636`，新增冷色逆光（不投影）。点光源：营火（闪烁）、6 盏路灯、礼拜堂 4 盏、祭坛 1 盏，全部有像素风光晕精灵（additive，代替 Bloom）。礼拜堂破顶加 4 道光柱。
- 装饰：草地小花（粉/黄/白/淡紫）、树下红蘑菇、路边 6 盏路灯（`wilds-data.js` 里 `kind:'lantern'` 的障碍物，0.4×0.4×2.3，有碰撞）。
- 祭坛：最终 Boss 认输后出现双层生日蛋糕和三根蜡烛（带光），通关后蜡烛熄灭。
- 新 `src/ambience.js`：萤火虫、营火火星、礼拜堂金色光尘、两棵大树飘落的树叶，约 180 个点加 34 片叶子，纯展示，reduced-motion 减半。
- 修复：决战期间雾门会重新显示，`activeSolids` 不再过滤掉它（之前是一堵看不见的墙）。

### UI（第三轮）

- `style.css` 末尾追加一整层新样式，所有 id 都没改：深梅紫玻璃卡片、金色/珊瑚/粉色强调色，按钮和卡片有 hover 上浮和发光，`prefers-reduced-motion` 时关闭动画。
- 血条：渐变、分段刻度，掉血时有一段延迟的白色残影（新增 `#health-lag`、`#boss-lag`，宽度在 `hud()` 里同步）；低血量时头像卡闪红。Boss 血条带名牌；`.sweet` 主题下名牌两侧是 ♥，血条变粉。
- 受击时屏幕边缘泛红（`#hurt-vignette`，只到边缘，不全屏闪白）；所有命中和受伤都显示伤害数字，并带弹出动画。
- 标题页加了“♥ HAPPY BIRTHDAY · 生日特别版”徽章，标题换成渐变字；暂停、营火、遗物、结果页都改成卡片。生日通关时屏幕上飘 CSS 彩纸（`#confetti`），`#result-copy` 支持换行。

## 验证状态

- 第三轮（内置浏览器实际运行并截图）：标题页、游戏内 HUD、草地/夕阳/远山视角、礼拜堂、最终 Boss 出场（彩纸、粉色 Boss 条）、Boss 实战中扔蛋糕和伤害数字、12 个关键帧的姿势图（横扫、敲头、礼花、抱抱、扔蛋糕各两帧，加认输和待机）、祭坛蛋糕、点击“吹灭生日蜡烛”后的“生日快乐！”通关页加彩纸，都看过，控制台没有报错。`node build.cjs dist` 打包了 26 个脚本，约 13.86 MB；产物通过本地 http 打开能正常加载标题和场景（内置浏览器禁止 `file://`，所以没测双击打开）。
- 第二轮打击感的验证见上文（另一个会话做的，包括 file:// 打开）。
- **仍未验证**：完整手打一整场（从营火一路打到通关）的难度和手感；手机或窄屏布局；长时间运行的帧率（点光源有 11 盏，渲染分辨率只有 320p，按理不吃力，但没测）。

## 可选的后续

- 想换 Boss 名字或通关文案：`wilds-data.js` 里的 `bossName`、`game.js` 的 `showResult` 和 `effects` 里的提示文字。
- 打包文件名还沿用 `v15`（`build.cjs`）；要出新版本时改文件名，并更新 README 和 Release。

## 改动方式

用的是严格的查找替换（旧文本必须恰好出现一次才替换）。代码是压缩风格的长行，改之前先用 `grep -n` 定位。
