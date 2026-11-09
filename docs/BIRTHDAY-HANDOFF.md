# 生日美化版 · 交接（更新于 2026-11-09）

分支：`main`。生日基础版本 `2558772` 已按用户新指令快进合并并推送到 `main`；`birthday-polish` 保留原提交。本轮按用户要求补齐打击感画面效果，随代码提交到 `main`。
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

## 验证状态

- 本轮打击感：使用真实 Chromium/WebGL 加载源码，受控逐帧运行引擎并截图，验证三连击实际命中、前摇剑尖闪光、剑轨、受击白闪、震屏位置恢复、暂停清空震屏、尾迹/闪光回收、闪避取消剑光；默认与 reduced-motion 模式均通过，浏览器脚本错误为 0。额外按 30 Hz 呈现验证三连击，补齐一帧内“命中 + 首个冻结步”的剑轨采样；冻结期间几何不重复推进。
- 单文件：`node build.cjs dist` 编译并内嵌 25 个脚本，产物约 13.83 MB；实际通过 `file://` 打开生成 HTML，重复三连击、暂停、回收、闪避取消检查通过，无脚本错误。
- 行为边界：真实 Three.js 守卫/弓手/蝙蝠/守誓者模型验证白闪首帧、冻结、衰减、弹反和死亡隐藏；震屏验证同动作去重、强度上限、异常 dt、衰减归零、reset 与 reduced-motion。以上是可重复的受控验证，不代表整场难度或长时间性能验收。
- 原生日 Boss 已看过：游戏能跑；最终 Boss 能被触发、从天上落下、开始扔蛋糕；Boss 血条和名字正确；模型正面截图正常。
- **没看过**：各招式的实际动作（横扫、敲头、礼花、冲锋的姿势可能需要调角度）、蛋糕投射物和彩纸的效果、认输坐姿、通关画面、打赢一整场的难度。
- 已知小问题：通关文案里有 `\n`，`#result-copy` 需要加 `white-space:pre-line` 才会换行。另有生日决战雾墙显示待修：`wilds-world.js` 目前仍按 `bossDefeated` 隐藏雾门，而引擎在 `finalEntered && !finalDefeated` 时恢复碰撞，可能形成不可见墙。本轮攻击特效未改这两项。

## 没做完（按原计划）

1. **光影**（`game.js` + `wilds-world.js`）：曝光调到约 1.12；太阳改成 `#ffcf8f`；半球光改成天空 `#9fb0ff`、地面 `#5a3d33`；加一盏冷色逆光（方向光，不投影）；天空着色器加夕阳光晕和闪烁的星星，色带改成靛蓝 → 紫玫 → 珊瑚 → 金；雾色跟地平线一致，范围约 26–120；营火加强光并让它闪烁，礼拜堂蜡烛和祭坛加点光源；光源处加像素风光晕精灵（additive）；礼拜堂加光柱。
2. **粒子**（新建 `src/ambience.js`，在 `game.js` 的 draw 里调用）：萤火虫、飘落树叶、营火火星、礼拜堂金色光尘，总数约 300，用 CPU 更新。
3. **地图**：三层远山剪影环（半径约 78、92、104，`fog:false`，颜色从近到远是 `#5b4a6e` → `#7d5f80` → `#a87487`），走动时有视差；地形顶点色和 Kenney 模型的 tint 调亮调暖（树改秋金色、石头改淡紫灰、旗帜改深红）；草地里撒小花（粉、黄、白、淡紫）；路边加路灯——坐标已经算好，加到 obstacles，`kind:'lantern'`，宽深 0.4、高 2.3：
   `[-14.4,18.4] [-11.8,9.2] [-3.2,4.9] [-4.7,-4.6] [-3.6,-11.9] [3.6,-11.9]`。
   注意 `wilds-world.js` 的 `obstacleScenery()` 要先加 lantern 分支，否则会走 `masonry()` 被画成墙。
4. **UI**（`style.css`，保留所有 id）：配色改得更大胆（深梅紫面板 + 金 + 珊瑚），全部卡片化，加 hover 和动效；血条加渐变、分段刻度，掉血时留一段延迟的白色残影（需要新增 `#health-lag` / `#boss-lag` 元素，并在 `hud()` 里同步宽度）；Boss 血条做成带名牌的华丽边框，并写 `.sweet` 的粉色主题；伤害数字加弹出动画并对所有命中都显示；开场、暂停、营火、遗物卡重做；通关时撒 CSS 彩纸。

攻击特效已完成，参数和实现见上方“打击感”；光影、地图和 UI 重做仍保留为后续工作。

## 改动方式

用的是严格的查找替换（旧文本必须恰好出现一次才替换）。代码是压缩风格的长行，改之前先用 `grep -n` 定位。
