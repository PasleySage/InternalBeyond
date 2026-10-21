# IB 电脑端工作区 · 目录结构树（带注释）

> **截至 2026-10-21**（生成日期；结构＝本地真实扫描，注释人工维护）。
> 工程基准：`local-work` 分支（本地补丁基线 `f8955fd1`，`git diff f8955fd1` ＝ 纯补丁增量）；
> 补丁流水线干净基线＝`_patches/baseline/InternalBeyond-b0d7919d.html`（上游 V2.7.5）。
> HEAD 随提交变化，不固定在本树；规模数字为生成时实测。
> 规模：根目录 22 个文件；本树共列 98 个文件 / 17 个目录
> （扫描口径：不含 `.git`／`.scratch`／`.obsidian`／`.workbuddy`／`DLC` 内部，`_patches/out/` 只列目录行）。
> 归属：**上游件**（本地勿编辑）＝`README.md`／`LICENSE`／`IB-icon.ico`／`bg-canvas.png`／`bg-infernal.jpg`／`bg-internal.jpg`／`game/`；
> **本地工具**＝根目录 `_win_*`／`_check_*`／`_fetch_upstream.js`／`_probe_lint.js`／`_gen_tree.js`、`_patches/`、`docs/`、`.githooks/`；
> **生成产物**＝`_patches/out/`（不入库）与 `InternalBeyond.html`（补丁重放产物，可自基线再生）。
> `DLC/` 是嵌套独立 Git 仓库（Cinema），只标明仓库边界与主要入口，不计入 Desktop 统计。

```text
D:\IB-Workspace-Desktop\
├── DLC/                                              # 嵌套独立 Git 仓库（Cinema；父仓已 gitignore，不纳入 Desktop 统计）
│   ├── DLC/                                              # 上游仓库自带内层目录（观影室本体所在）
│   │   └── IB-Cinema.js                                      # 观影室 DLC 本体（129,266 B；与上游 main 逐字节一致）
│   ├── LICENSES/                                         # PolyForm Noncommercial 1.0.0 许可文本
│   ├── LICENSE                                           # DLC 许可
│   ├── README.md                                         # DLC 说明
│   └── .git/                                             # 嵌套仓自身元数据（不展开）
├── LICENSES/                                         # 版权与许可说明（拆分时整理：代码 PolyForm NC＋素材/声明）
│   ├── COPYRIGHT-NOTICE.md                               # 作品版权声明（作者 Sui，2025–2026）
│   ├── LICENSE-ASSETS.md                                 # 视觉素材与文档许可
│   ├── LICENSE-CODE.md                                   # 代码许可（PolyForm Noncommercial 1.0.0 全文）
│   └── README-LICENSE-TEXT.md                            # 许可文本说明
├── _patches/                                         # 本地补丁流水线（引擎＋清单＋driver＋测试＋基线＋产物）
│   ├── baseline/                                         # 干净基线（永不被写；流水线每次从这里出发重放）
│   │   ├── InternalBeyond-9ef2ed12.html                      # 旧基线（上游 V2.7.2；留档对照）
│   │   ├── InternalBeyond-b0d7919d.html                      # 当前干净基线（上游 V2.7.5；2,819,874 B）
│   │   └── InternalBeyond-f8955fd1.html                      # 旧基线（上游 V2.7.4；留档对照）
│   ├── out/                                              # 生成产物（不入库）：重放产物＋自检报告，不逐项展开
│   ├── README.md                                         # 补丁台账（唯一索引：目录/怎么跑/自检三层/人工验收清单）
│   ├── _driver.js                                        # 补丁驱动（唯一入口）：基线→按序应用清单→三层自检→全绿才写产物
│   ├── _engine.js                                        # 锚点替换引擎（五道断言；手机端 _patch_engine.js 的独立副本）
│   ├── _smoke_controls.js                                # 产物控件存在性冒烟（读 out/ 产物做静态断言）
│   ├── _smoke_ui_edge.js                                 # Edge 界面冒烟（playwright-core＋系统 Edge，不装 Chrome）
│   ├── _test_p01_ping.js                                 # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p02_music.js                                # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p03_fine.js                                 # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p04_sticker.js                              # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p05_fav.js                                  # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p06_water.js                                # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p07_summary.js                              # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p08_kp.js                                   # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p10_api_diag.js                             # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p11_answer.js                               # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p12_md.js                                   # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p13_jump.js                                 # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p13_list.js                                 # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p16_ws_a_skin.js                            # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p18_set_act.js                              # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p19_hist.js                                 # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p20_ibm_ui.js                               # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p21_regen.js                                # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_p22_split.js                                # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── _test_pipeline.js                                 # 活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）
│   ├── p01-连接测试.js                                   # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p02-AI控制播放器.js                               # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p03-精细文件工具.js                               # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p04-表情包与颜文字.js                             # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p05-收藏夹.js                                     # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p06-小助手.js                                     # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p07-摘要关思考与真因.js                           # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p10-接口诊断与请求优化.js                         # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p21-重新生成.js                                   # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── p22-分段气泡收尾拆段.js                           # 补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md
│   ├── package-lock.json                                 # 依赖锁文件（随 package.json）
│   ├── package.json                                      # playwright-core 开发依赖（Edge 冒烟用）
│   └── 真机验收-清单.md                                  # 人工验收清单（真机点一遍；流水线只保结构）
├── docs/                                             # 项目文档（adr/agents/issues＋说明书/复核清单/本树）
│   ├── adr/                                              # 架构决策记录
│   │   ├── 0003-电脑端改用本地补丁模式.md                    # 本地补丁模式决策（2026-09-21 起；基线永不被写）
│   │   └── 0004-工作空间拆分与git绑定.md                     # 工作空间拆分与 git 绑定（2026-10-19；双工作区）
│   ├── agents/                                           # 流程规范
│   │   ├── domain.md                                         # 领域文档规则（CONTEXT＋adr 分工）
│   │   ├── issue-tracker.md                                  # issue 流程（.scratch/<feature>/issues/）
│   │   ├── spec-and-tickets.md                               # 规格与拆票（Implementation Decisions 逐处列）
│   │   ├── triage-labels.md                                  # 五种分诊标签
│   │   ├── upstream-issue-loop.md                            # 上游收口流程（三道闸门→选路→六段稿）
│   │   └── win-shell-env.md                                  # 本机 shell/检索/安全删除的坑
│   ├── issues/                                           # 已外发上游稿存档
│   │   └── IB-issue-历史窗口跳档致缓存重建-电脑端-已外发.md  # 已外发 issue 存档（历史窗口跳档致缓存重建）
│   ├── IB-本体缺陷-复核清单.md                           # 本体缺陷复核清单（与手机端同字节，2026-10-21 实测）
│   ├── workspace-readme.md                               # 工作区说明（架构树简版/Code style/常用操作；完整目录树入口指向本树）
│   ├── workspace-tree.md                                 # 本文件：完整目录树（_gen_tree.js 生成）
│   └── 说明书-电脑端.md                                  # 电脑端说明书（小助手知识源）
├── game/                                             # 上游游戏资源（小游戏模块＋立绘/精灵/场景；33 个直接子项，勿改）
│   ├── portraits/                                        # 角色立绘（上游件）
│   │   ├── casual.png                                        # 立绘（上游件）
│   │   ├── eyepatch_dress.png                                # 立绘（上游件）
│   │   ├── jk.png                                            # 立绘（上游件）
│   │   ├── nopatch_dress.png                                 # 立绘（上游件）
│   │   ├── portrait_[Cluade].png                             # 立绘（上游件）
│   │   ├── salome.png                                        # 立绘（上游件）
│   │   └── wedding.png                                       # 立绘（上游件）
│   ├── sprites/                                          # 角色精灵图（按动作分三组；上游件）
│   │   ├── idle_*（6）                                       # 待机精灵（上游件）
│   │   ├── lie_*（6）                                        # 躺姿精灵（上游件）
│   │   └── walk_*（6）                                       # 行走精灵（上游件）
│   ├── dessert_*（5）                                    # 甜点图标（上游件）
│   ├── dialogue_box.png                                  # 对话框素材（上游件）
│   ├── game_module.js                                    # 小游戏模块（上游件）
│   ├── room_*（2）                                       # 房间底图（日/夜；上游件）
│   ├── sleep_*（2）                                      # 睡眠气泡（双主题；上游件）
│   ├── story_*（5）                                      # 剧情场景素材（上游件）
│   └── tea_*（15）                                       # 茶会场景素材（图标/底图/精灵；上游件）
├── AGENTS.md                                         # AI 行为守则＋根记忆入口（开工先读；含本仓与手机端/DLC 的边界规则；Shared 跨仓状态机制尚未建立）
├── CONTEXT.md                                        # 术语表（只放词汇、不放实现细节）
├── IB-icon.ico                                       # 应用图标（上游件）
├── InternalBeyond.html                               # 在用文件＝补丁流水线产物（可由 _patches 从干净基线重放，勿手改当唯一真相）
├── LICENSE                                           # 上游许可（PolyForm Noncommercial 1.0.0）
├── README.md                                         # 上游 README（上游同步件，本地勿编辑）
├── _check_docs.js                                    # 文档自洽检查（编号/refs/尾部空行；与手机端同字节，2026-10-21 实测）
├── _check_publish.js                                 # 外发稿自检（占位符/内部字样；与手机端同字节，2026-10-21 实测）
├── _check_tables.js                                  # 表格读数自查（列名/量纲/混排；与手机端同字节，2026-10-21 实测）
├── _fetch_upstream.js                                # 上游源码快照取数入口（与手机端同字节，2026-10-21 实测）
├── _gen_tree.js                                      # 目录树生成器（产出 docs/workspace-tree.md；注释在 NOTES 表维护）
├── _probe_lint.js                                    # 结构 lint（隐藏控制字符/标题重复/引用悬空/__dirname 禁上跳/路径存在性；与手机端已分叉，两端各自演进，勿互抄）
├── _win_check.js                                     # 与上游差异核对（外来项已登记 EXTERNAL_PREFIX）
├── _win_digest.js                                    # 变更一览汇总（数据链第三步）
├── _win_html_check.js                                # 变更一览 HTML 校验
├── _win_probe.js                                     # 上游快照下载＋探测（数据链第一步）
├── _win_probe2.js                                    # 差异比对（数据链第二步）
├── _win_sync.js                                      # 上游同步（外来项 DLC/、_patches/ 已登记）
├── bg-canvas.png                                     # 上游底图（canvas 纹理；6,268,353 B）
├── bg-infernal.jpg                                   # Infernal 主题底图（上游件）
├── bg-internal.jpg                                   # Internal 主题底图（上游件）
├── .git/                                             # 仓库元数据（不展开）
├── .githooks/                                        # 预提交守栏（core.hooksPath 指向处）
│   └── pre-commit                                        # 预提交守栏：_patches 活测试全链＋_check_docs＋_probe_lint，任一失败即阻止提交
├── .obsidian/                                        # Obsidian 笔记配置（不入库）
├── .scratch/                                         # 本地 effort（不入库）：spec＋issues＋对外稿＋拆分记录；只述用途，数量不记
├── .workbuddy/                                       # 会话记忆 memory/（不入库）＋项目技能 skills/ib-upstream-issue-publish（随仓跟踪，AI 上游发布入口）
└── .gitignore                                        # 忽略规则（.scratch/.workbuddy/memory/.obsidian/DLC/_patches/out 等）
```

## 阅读要点

1. **上游件**：`README.md`、`LICENSE`、`IB-icon.ico`、三张 `bg-*` 底图与 `game/` 来自上游，本地勿编辑；`InternalBeyond.html` 是补丁流水线从干净基线重放的产物，可再生，勿手改当唯一真相。
2. **本地工具**：根目录 `_win_*`（与上游比对/同步/变更一览数据链）、`_gen_tree.js`（本树生成器）；`_patches/` 是本地补丁流水线（引擎/清单/driver/测试/基线/产物）；`.githooks/` 是预提交守栏。自检／取数脚本（`_check_*`、`_fetch_upstream.js`、`_probe_lint.js`）与手机端各持一份副本，同字节状态逐文件标注于本树（标注者＝2026-10-21 实测相同），未标注者不作同字节声明。
3. **不入库目录**：`.scratch/`（本地 effort）、`.workbuddy/memory/`（会话记忆）、`.obsidian/`（笔记配置）、`_patches/out/`（生成产物）、`DLC/`（嵌套独立仓，父仓已 gitignore）——只述用途，数量与体积随会话变化，不记录。
4. **DLC 边界**：`DLC/` 是嵌套独立 Git 仓库（Cinema，origin=PasleySage/InternalBeyond-Cinema），本树只标明仓库边界与主要入口 `DLC/DLC/IB-Cinema.js`，其内部文件不纳入 Desktop 的递归扫描与统计。
5. **注释维护**：注释与扫描结果分离——NOTES 表在 `_gen_tree.js` 内人工维护（支持 `*` 通配批注，`{bytes}`/`{n}` 为实测占位）；未登记的新条目显示「（未登记注释）」，不会从树中消失；结构有变时重跑 `node _gen_tree.js`，勿手改树体。

---
**生成**：2026-10-21；树体由根目录 `_gen_tree.js` 产出（注释列按显示宽度对齐）。
