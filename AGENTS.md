# D:\IB-Workspace-Desktop

Internal Beyond **电脑端（单文件 HTML）**工作空间 —— 上游 `Sui-IB/InternalBeyond`，我方 fork `PasleySage/InternalBeyond`；自 `docs\adr\0003` 起为本地补丁模式（`_patches\`，基线永不被写）。2026-10-19 从混合工作区拆出（`docs\adr\0004`）；手机端在独立工作区 `D:\IB-Workspace-Mobile`；观影室 DLC 是本仓嵌套独立 repo `DLC\`。

## Agent skills

> 本节只描述本工作空间**实际存在**的东西；尚未创建的结构件在括号里注明，不要当成已有。
> **新会话开工时**：当前状态与长期内容一律看 `.workbuddy\memory\MEMORY.md`（每会话自动注入）与 `.workbuddy\memory\` 下的当日日志；补丁台账看 `_patches\README.md`；本机 shell / 检索 / 安全删除的坑看 `docs\agents\win-shell-env.md`。

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/issues/NN-*.md`（**已存在**：`.scratch/ib-body-defects/`、`.scratch/ib-ibm-parity/` 等）. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default role strings: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context：根 `CONTEXT.md`（术语表，只放词汇、不放实现细节）+ `docs/adr/`，**两者都已存在**. See `docs/agents/domain.md`.

### 上游 bug：从症状到收口

发现 IB 行为不对、或要向上游提 issue / PR / 评论、或收口一条已提的 issue 之前，读 `docs/agents/upstream-issue-loop.md`。要点：**症状确定 ≠ 机制确定** —— 先过三道闸门（能不能复现 / 谁的锅 / 机制清不清），再在出口处选路（只报不改 / 参考实现 PR / 自用补丁 / 先记着）；**选路之前不要动笔写稿**。写稿走「上游可发体」六段，出稿待批，提交后回读核对（「我」应为 0 次）。落稿在 `.scratch/<effort>/issues/NN-*.md`。

### 写规格与拆票

动笔写规格、或把规格拆成票之前，读 `docs/agents/spec-and-tickets.md`。三条要点：**Implementation Decisions 要逐处列改动**（没点名的那处，审查时会当成范围蔓延）；**交付物相同的票可以合并实现**（同一份单文件、同一个补丁集时，票的边界在实现期会坍缩）；**真机确认与上线分成两张票**，后者写明"确认通过前不得启动"。

### Code style（编码思路）

> 完整版与本工作区特有条目（不破坏 IB 原前端、临时代码用完即清等）见 `docs\workspace-readme.md` 的「Code style」；此处只留每次动手都适用的硬原则。

1. **不做向后兼容层。** 删掉过时路径，不要加兼容垫片、fallback 或「先迁一点」的中间态。上游发版后补丁锚点失效，就重打锚点或撤掉该项，不写兼容读法。
2. **选刚好满足当前需求的最简实现。** 避免投机性抽象、配置项和间接层。三处相似代码好过一个过早的框架。
3. **分层生长。** 先做出端到端能跑的最小版本，再往上叠能力。绝不拿一个能用的产品去换未完成的复杂度。
4. **模块边界清楚。** 引擎 / 清单 / driver / 测试各管一事；新增补丁只写清单，不改引擎。不与手机端工作区跨仓引用；共用工具（发布自检四件套等）两端各一份副本，改一边时对照另一边。
5. **优先用已有能力。** 动手前先查 `_patches\README.md`（补丁台账）与既有 `pNN-*.js`；不要重写项目里已有的解析、同步、自检工具。要引入外部库先确认是否真能降低复杂度（IB 本体是单文件，依赖越少越好）。
6. **假定「做不到」前先核实。** 不要假设浏览器 / 现有函数没有某能力——先 grep 源码与文档（单文件用 `grep -n` + 抽段，勿整读）。
7. **架构决定按长期形态做。** 不接受「先这样、以后再换」的临时方案；若必须临时，写进 ADR 并写明退出条件。
8. **捕获点必须配行为桩测。** 凡给组包路径加捕获点（埋点），同一个补丁要附带一个行为桩测：把线上真实的上游变换（合并、截断、切分等）提取出来跑在模拟场景上，证明捕获点取的数组和时序是对的。模块桩测只覆盖模块自身行为，管不到接线测错对象。

### 交付前（与 Code style 配套）

- **Pre-commit**：电脑端补丁跑 `_patches` 的 driver + 测试（`node _driver.js`、`_test_pipeline.js` 及各 `_test_pNN.js`）；对外文稿跑 `_check_publish.js` / `_check_docs.js` / `_check_tables.js`。顺序固定：**临时残留清理 → 测试 → 再提交**。
- **探针与地图类文档另跑** `_probe_lint.js` —— 查五件机械可判定的事：脚本里的隐藏控制字符、采集器写了却没人读的字段、标题重复、空壳节、**引用悬空**（§N 锚点指向的节不存在／D·Q 标签无定义）。**裸跑即 glob 整个 effort**（`.scratch/**/*.md`＋3 探针＋`CONTEXT.md`，证据/临时文件自动排除）；传路径则只查指定文件。**改完探针或地图必跑**（它拦的是"改完没验"那类错）。
- **探针 ≠ 测试**：只打印指标、不含断言的对照页 / 计数脚本不算测试，不能代替 `_test_*.js`。
- **给用户的数字要有来源**：面向用户给出的任何数字，若来自估算、占位或举例，须在同一屏标注来源与不确定性——**实测／静态／倒推／推断／未测，五级标注**；**不得以表格或图形呈现无来源的数字**——形状合理的假数字会被当结论用，一路传到外发稿。
- **区间要标来源**：写「system 占 54～91%」这类区间先问一句——全量还是选样？选样的话选了几轮、依据是什么？
- **改口径要顺引用链**：改任何口径/数字/结论，先把引用点 grep 出来一起改——**grep 要连含义一起搜**，不只搜数字；机械可判的那类（§N 锚点、D·Q 标签）交给 `_probe_lint.js` 第⑤节，别靠人记。
- UI 零新造视觉、聊天两套UI 都要看等，见 `docs\workspace-readme.md`「UI guidelines」。

### git 与本工作区边界

- 本仓 `origin=PasleySage/InternalBeyond`、`upstream=Sui-IB/InternalBeyond`。**`main` 永不动**（对齐 origin/main＝`9ef2ed12`）；本地资产一律落 `local-work` 分支（锚定补丁基线 `f8955fd1`，`git diff f8955fd1` ＝ 纯补丁增量）。**不 push**（除非用户明确指令且自测通过）。
- 观影室 DLC＝嵌套独立 repo `DLC\`（origin=PasleySage/InternalBeyond-Cinema）；⚠️ 上游仓库自身带一层 `DLC\`，文件在 `DLC\DLC\IB-Cinema.js`；父仓 `.gitignore` 已登记 `DLC/`。
- 手机端（`index.html` 镜像线）在 `D:\IB-Workspace-Mobile`；**别覆盖另一条线的资产**，跨线引用先想清楚归属。
- 派活先报备：派子代理/跨会话派活先向用户说一声；不擅自 `spawn` actor。
