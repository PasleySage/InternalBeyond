# D:\IB-Workspace-Desktop

Internal Beyond（IB）**电脑端（单文件 HTML）**工作空间 —— 上游 `Sui-IB/InternalBeyond`，我方 fork `PasleySage/InternalBeyond`；本地补丁模式（`_patches\`，基线永不被写）。2026-10-19 从混合工作区拆出（`docs\adr\0004`）；手机端在独立工作区 `D:\IB-Workspace-Mobile`；观影室 DLC 是本仓嵌套独立 repo `DLC\`。

## Project overview

| 线路 | 体量 | 技术形态 | 上游 |
|---|---|---|---|
| **电脑端** | 单文件 `InternalBeyond.html`（约 298 万字节级）+ `game\` 等资源 | 纯 HTML / CSS / JS + IndexedDB；无后端 | `Sui-IB/InternalBeyond`（V2.7.x） |
| **观影室 DLC**（外来） | `DLC\DLC\IB-Cinema.js`（嵌套独立 repo） | 单文件 JS 扩展 | `Sui-IB/InternalBeyond-Cinema` |

本工作区**不是产品、不属于上游**；职责是跟版、出变更一览、维护本地补丁与归档、写上游 issue / 参考实现稿。

## Architecture

```
D:\IB-Workspace-Desktop\
├─ InternalBeyond.html      在用文件（可由补丁流水线从基线重放）
├─ _patches\                补丁引擎 / 清单 pNN-*.js / driver / 测试 / baseline / out
├─ _win_*.js                桌面线工具：与上游比对 / 同步 / 变更一览数据链 / 发布自检
├─ _check_*.js _fetch_upstream.js _probe_lint.js   与手机端同字节的共用自检四件套＋取数
├─ DLC\                     嵌套独立 repo（Cinema，父仓已 gitignore；文件在 DLC\DLC\）
├─ game\ …                  上游资源
├─ CONTEXT.md               术语表（只放词汇）
├─ docs\adr\                决策记录（0003 本地补丁模式／0004 拆分）
├─ docs\agents\             issue 流程 / 上游收口 / 规格与拆票 / shell 环境
├─ docs\issues\             跨线外发稿（IB-issue-*-电脑端-已外发）
├─ docs\IB-本体缺陷-复核清单.md   与手机端同字节的共用清单
├─ docs\说明书-电脑端.md     电脑端说明书
├─ docs\workspace-readme.md 本文件
└─ .scratch\                本地 effort：spec + issues + 对外稿（不入库）
```

**两层产品逻辑（电脑端）**：应用本体是单文件交付物；可重复的改动一律落在 `_patches\`（清单＝数据、引擎＝代码），从**干净基线**重放，不直接手改在用文件当唯一真相。

## Code style（编码思路）

1. **不做向后兼容层。** 删掉过时路径，不要加兼容垫片、fallback 或「先迁一点」的中间态。上游发版后补丁锚点失效，就**重打锚点或撤掉该项**，不写兼容读法。
2. **选刚好满足当前需求的最简实现。** 避免投机性抽象、配置项和间接层。三处相似代码好过一个过早的框架；清单里能写清的锚点替换，不要升级成模板引擎。
3. **分层生长。** 先做出端到端能跑的最小版本，再往上叠能力。**绝不拿一个能用的产品去换未完成的复杂度**——补丁一项一验收，绿了再下一项。
4. **模块边界清楚。** 引擎 / 清单 / driver / 测试各管一事；新增补丁**只写清单**，不改引擎。不与手机端工作区跨仓引用，同构逻辑允许副本，改一边时对照另一边。
5. **优先用已有能力。** 动手前先查 `_patches\README.md`（补丁台账）与既有 `pNN-*.js`；项目里已有的解析、同步、自检工具不要重写。要引入外部库先确认是否真能降低复杂度（IB 本体是单文件，依赖越少越好）。
6. **假定库已有能力前先核实。** 不要假设「浏览器做不到 / 现有函数没有」——先 grep 源码与文档（单文件用 `grep -n` + 抽段，勿整读）。
7. **架构决定按长期形态做。** 不接受「先这样、以后再换」的临时方案；若必须临时，写进 ADR 并写明退出条件。
8. **不破坏 IB 原前端设计。** 宁可改进度条语义，也不自造控件；UI 形状、图标 path **从源码抄**，禁止近似自画。
9. **临时验证代码用完即清。** debug 输出、一次性脚本、假数据、无引用的探针，在交付前删除；正式测试与诊断日志保留。

## UI guidelines

- 沿用页面既有控件类与视觉语言（按钮、提示、卡片）；**零新造视觉** 优先。
- 电脑端 Chat 是**两套独立 UI**（全屏页 `#page-chat` / 浮动小窗 `#chat-panel`），改聊天相关界面两处都要看。
- 界面预览必须**落盘**成文件，不得只内联在会话里；图标与面板结构以源码为准。
- 内容排版默认**中轴居中**（用户偏好）；系统原生控件除外。

## Pre-commit checklist

交付 / 提交前按序：

```bash
# 电脑端补丁（若本轮改了 _patches\）
cd _patches
node _driver.js
node _test_pipeline.js
node _test_p01_ping.js
node _test_p07_summary.js

# 对外文稿（若本轮有 issue / PR / 评论稿）
node _check_publish.js <稿路径>
node _check_docs.js
node _check_tables.js <稿路径>
```

另加纪律：**临时残留清理 → 测试 → 再提交**（顺序不可颠倒）；写操作回读核对。

## Benchmarks are not tests

只打印指标、不含断言的探针（对照页、计数脚本）**不算测试**，不能代替 `_test_*.js`。跑通探针 ≠ 验证通过。

## 常用操作

| 想做什么 | 怎么做 |
|---|---|
| **上游更新了** | 说「上游更新了」+ 电脑端，走 skill **`upstream-update-brief`**：先出 HTML+MD 预览 → 同意后再同步 + 复核 |
| 重放电脑端补丁 | `cd _patches && node _driver.js`（默认写 `out\`；`--out ..\InternalBeyond.html` 写回在用文件） |
| 看电脑端与上游差异 | `node _win_check.js` / `_win_sync.js`（外来项 `DLC/`、`_patches/`、`docs/` 与本地工具已登记 `EXTERNAL_PREFIX`／`LOCAL_FILES`，不计入「本地多出」；`.git`／`.scratch` 等点目录不参与比对） |
| 出电脑端变更一览 | `node _win_probe.js` → `_win_probe2.js` → `_win_digest.js`（**必须按序连着跑**，后两个读第一个当场下载的快照；各 txt／diff 产物落在工作区根，2026-10-19 深清理后历史归档件已清、git 历史可查） |
| 观影室 DLC | 嵌套仓 `DLC\`：`git -C DLC status`；上游 `Sui-IB/InternalBeyond-Cinema`；⚠️ 上游仓库自身带一层 `DLC\`，文件在 `DLC\DLC\IB-Cinema.js` |
| 脚本 / 产物索引 | **`_patches\README.md`（补丁台账）**；手机端索引在 `D:\IB-Workspace-Mobile\_工具与产物清单.md` |

## 本线定位

- **电脑端**：单文件本地打开即用；**无 Pages**。自 `docs\adr\0003` 起为**本地补丁模式**（`_patches\`，基线永不被写）；核对判据＝逐项比补丁台账，不是「文件全等」。
- **观影室 DLC**（外来）：本地在用版与上游 `main` 逐字节一致（129,266 B，blob `5e92e348`，sha256 `ae249d2b…`）；嵌套仓 `local-work` 当前与 `main` 同点。⚠️ PolyForm Noncommercial＋CC BY-NC-SA：推回须留版权行/署名、标「非官方修改版」。

## git 绑定（2026-10-19 拆分）

- `origin=PasleySage/InternalBeyond`、`upstream=Sui-IB/InternalBeyond`；`main`＝上游镜像点（`9ef2ed12`）、永不被本地提交污染；本地资产在 `local-work` 分支（锚定补丁基线 `f8955fd1`，`git diff f8955fd1` ＝ 纯补丁增量）。
- 首次入库＝2026-10-19 拆分（迁移记录 `.scratch\workspace-split\`）；**不 push**（除非用户明确指令且自测通过）。

## 文档约定

- 长期文档不写「当前 / 现在」；版本与基线一律「**截至 YYYY-MM-DD** …」。
- **对外文稿默认先出稿待批**，不直接发。细则见用户级 `~\.workbuddy\MEMORY.md`「对外文稿」。
- 上游 issue / PR 走 `docs\agents\upstream-issue-loop.md`：三道闸门 → 选路 → 六段「上游可发体」→ 待批 → 回读（「我」= 0）。

## Useful commands

```bash
# 查引用（Glob/Grep 会漏隐藏目录）
bash -lc "grep -rn 'pattern' ..."

# 清理临时文件（Remove-Item 必失败）
node -e "require('fs').unlinkSync('path')"
```

Shell / PATH / 安全删除的坑见 `docs\agents\win-shell-env.md`。
