# 生日美化版 · 交接（2026-11-08）

分支：`birthday-polish`（只推了分支，**没有合并 main**）。用户要求：先改一版本地预览给他看，满意后再上线。
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

### 打击感（只改了数值）

- 命中停顿上限从 0.065 秒提到 0.085 秒：轻击 0.048、重击 0.08、弹反后的反击 0.085。
- 普通敌人被击退的距离从 0.1/0.3 提到 0.24/0.58（轻击/重击）。

## 验证状态

- 实际看过：游戏能跑，控制台没有报错；最终 Boss 能被触发、从天上落下、开始扔蛋糕；Boss 血条和名字正确；模型正面截图正常；全部脚本语法检查通过。
- **没看过**：各招式的实际动作（横扫、敲头、礼花、冲锋的姿势可能需要调角度）、蛋糕投射物和彩纸的效果、认输坐姿、通关画面、打赢一整场的难度、`node build.cjs dist` 打包结果。
- 已知小问题：通关文案里有 `\n`，`#result-copy` 需要加 `white-space:pre-line` 才会换行。

## 没做完（按原计划）

1. **光影**（`game.js` + `wilds-world.js`）：曝光调到约 1.12；太阳改成 `#ffcf8f`；半球光改成天空 `#9fb0ff`、地面 `#5a3d33`；加一盏冷色逆光（方向光，不投影）；天空着色器加夕阳光晕和闪烁的星星，色带改成靛蓝 → 紫玫 → 珊瑚 → 金；雾色跟地平线一致，范围约 26–120；营火加强光并让它闪烁，礼拜堂蜡烛和祭坛加点光源；光源处加像素风光晕精灵（additive）；礼拜堂加光柱。
2. **粒子**（新建 `src/ambience.js`，在 `game.js` 的 draw 里调用）：萤火虫、飘落树叶、营火火星、礼拜堂金色光尘，总数约 300，用 CPU 更新。
3. **地图**：三层远山剪影环（半径约 78、92、104，`fog:false`，颜色从近到远是 `#5b4a6e` → `#7d5f80` → `#a87487`），走动时有视差；地形顶点色和 Kenney 模型的 tint 调亮调暖（树改秋金色、石头改淡紫灰、旗帜改深红）；草地里撒小花（粉、黄、白、淡紫）；路边加路灯——坐标已经算好，加到 obstacles，`kind:'lantern'`，宽深 0.4、高 2.3：
   `[-14.4,18.4] [-11.8,9.2] [-3.2,4.9] [-4.7,-4.6] [-3.6,-11.9] [3.6,-11.9]`。
   注意 `wilds-world.js` 的 `obstacleScenery()` 要先加 lantern 分支，否则会走 `masonry()` 被画成墙。
4. **UI**（`style.css`，保留所有 id）：配色改得更大胆（深梅紫面板 + 金 + 珊瑚），全部卡片化，加 hover 和动效；血条加渐变、分段刻度，掉血时留一段延迟的白色残影（需要新增 `#health-lag` / `#boss-lag` 元素，并在 `hud()` 里同步宽度）；Boss 血条做成带名牌的华丽边框，并写 `.sweet` 的粉色主题；伤害数字加弹出动画并对所有命中都显示；开场、暂停、营火、遗物卡重做；通关时撒 CSS 彩纸。
5. **攻击特效**（`battle-fx.js` / `game.js`）：主角挥砍轨迹更宽更亮并加一层发光、持续时间延长到约 0.12–0.16 秒；挥砍前摇时剑尖闪一下；命中时火花上限提高，并加一个局部的冲击星和冲击环；普通敌人和守誓者的受击闪光改成 emissive 白闪（`pixel-enemies.js` / `pixel-warden.js` 里现在用的是 `material.color`）；小幅震屏——在 `game.js` 渲染前给相机加偏移、渲染后还原，幅度 0.04–0.12，支持 reduced-motion。用户早先说过“避免全屏闪白和大幅镜头摇晃”，所以闪光只做局部，震屏要克制。

## 改动方式

用的是严格的查找替换（旧文本必须恰好出现一次才替换）。代码是压缩风格的长行，改之前先用 `grep -n` 定位。
