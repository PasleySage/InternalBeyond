#!/usr/bin/env node
/*
 * _gen_tree.js —— IB 电脑端工作区目录树生成器（轻量，无第三方依赖）
 *
 * 用法：
 *   node _gen_tree.js                # 产出 docs/workspace-tree.md（默认）
 *   node _gen_tree.js --stdout       # 只打印到标准输出，不写文件
 *   node _gen_tree.js --out <path>   # 写到指定路径
 *
 * 设计：
 *   · 树体来自真实文件系统扫描（根＝本脚本所在目录），注释与扫描结果分离；
 *   · 注释集中在下方 NOTES 表人工维护：键为相对路径（目录不带尾斜杠），
 *     值里的 {bytes} / {n} 由扫描时实测填入；键支持 * 通配（不跨 /），
 *     用于给一整族文件/分组批注（如 _patches/_test_*）；
 *   · 未登记注释的条目显示「（未登记注释）」——新文件不会从树中消失，方便回头补注；
 *   · 同一输入重复运行输出一致（排序按代码位定序，无随机因素）；
 *   · 不扫描其他仓库：.git / .scratch / .obsidian / .workbuddy 只列一行；
 *     DLC/ 是嵌套独立 Git 仓库，只列边界与主要入口；不跟随目录链接；
 *   · _patches/out/ 是生成产物，只列目录行；game/ 子树按文件名前缀分组显示；
 *   · 只读文件系统，不做任何 Git 操作，不删不改业务文件。
 *
 * 维护方式：结构有变时重跑本脚本；要补/改注释就编辑 NOTES 表后重跑，勿手改树体。
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;                       // 脚本住在仓库根，定位不上跳

// ── 扫描规则 ───────────────────────────────────────────────────────────────
const OPAQUE = new Set(['.git', '.scratch', '.obsidian', '.workbuddy']); // 只列一行
const BOUNDARY = new Set(['DLC']);            // 嵌套独立仓：列直接子级，不递归
const EXPAND_ONCE = new Set(['DLC/DLC']);     // 边界内再深入一级（主要入口）
const COLLAPSE = new Set(['_patches/out']);   // 生成产物：只列目录行
const GROUP = new Set(['game', 'game/sprites']); // 直接子文件按前缀分组

// ── 人工维护的注释表（键：相对路径；目录不带尾斜杠；* 不跨 /）────────────────
const NOTES = {
  // 根目录 · 文件
  'AGENTS.md': 'AI 行为守则＋根记忆入口（开工先读；含本仓与手机端/DLC 的边界规则；Shared 跨仓状态机制尚未建立）',
  'CONTEXT.md': '术语表（只放词汇、不放实现细节）',
  'README.md': '上游 README（上游同步件，本地勿编辑）',
  'LICENSE': '上游许可（PolyForm Noncommercial 1.0.0）',
  'IB-icon.ico': '应用图标（上游件）',
  'InternalBeyond.html': '在用文件＝补丁流水线产物（可由 _patches 从干净基线重放，勿手改当唯一真相）',
  'bg-canvas.png': '上游底图（canvas 纹理；{bytes}）',
  'bg-infernal.jpg': 'Infernal 主题底图（上游件）',
  'bg-internal.jpg': 'Internal 主题底图（上游件）',
  '_check_docs.js': '文档自洽检查（编号/refs/尾部空行；与手机端同字节，2026-10-21 实测）',
  '_check_publish.js': '外发稿自检（占位符/内部字样；与手机端同字节，2026-10-21 实测）',
  '_check_tables.js': '表格读数自查（列名/量纲/混排；与手机端同字节，2026-10-21 实测）',
  '_fetch_upstream.js': '上游源码快照取数入口（与手机端同字节，2026-10-21 实测）',
  '_probe_lint.js': '结构 lint（隐藏控制字符/标题重复/引用悬空/__dirname 禁上跳/路径存在性；与手机端已分叉，两端各自演进，勿互抄）',
  '_win_check.js': '与上游差异核对（外来项已登记 EXTERNAL_PREFIX）',
  '_win_digest.js': '变更一览汇总（数据链第三步）',
  '_win_html_check.js': '变更一览 HTML 校验',
  '_win_probe.js': '上游快照下载＋探测（数据链第一步）',
  '_win_probe2.js': '差异比对（数据链第二步）',
  '_win_sync.js': '上游同步（外来项 DLC/、_patches/ 已登记）',
  '_gen_tree.js': '目录树生成器（产出 docs/workspace-tree.md；注释在 NOTES 表维护）',
  // 根目录 · 目录
  '.git': '仓库元数据（不展开）',
  '.githooks': '预提交守栏（core.hooksPath 指向处）',
  '.gitignore': '忽略规则（.scratch/.workbuddy/memory/.obsidian/DLC/_patches/out 等）',
  '.obsidian': 'Obsidian 笔记配置（不入库）',
  '.scratch': '本地 effort（不入库）：spec＋issues＋对外稿＋拆分记录；只述用途，数量不记',
  '.workbuddy': '会话记忆 memory/（不入库）＋项目技能 skills/ib-upstream-issue-publish（随仓跟踪，AI 上游发布入口）',
  'DLC': '嵌套独立 Git 仓库（Cinema；父仓已 gitignore，不纳入 Desktop 统计）',
  'LICENSES': '版权与许可说明（拆分时整理：代码 PolyForm NC＋素材/声明）',
  '_patches': '本地补丁流水线（引擎＋清单＋driver＋测试＋基线＋产物）',
  'docs': '项目文档（adr/agents/issues＋说明书/复核清单/本树）',
  'game': '上游游戏资源（小游戏模块＋立绘/精灵/场景；{n} 个直接子项，勿改）',
  // .githooks
  '.githooks/pre-commit': '预提交守栏：_patches 活测试全链＋_check_docs＋_probe_lint，任一失败即阻止提交',
  // DLC（嵌套仓边界）
  'DLC/.git': '嵌套仓自身元数据（不展开）',
  'DLC/DLC': '上游仓库自带内层目录（观影室本体所在）',
  'DLC/DLC/IB-Cinema.js': '观影室 DLC 本体（{bytes}；与上游 main 逐字节一致）',
  'DLC/LICENSES': 'PolyForm Noncommercial 1.0.0 许可文本',
  'DLC/LICENSE': 'DLC 许可',
  'DLC/README.md': 'DLC 说明',
  'DLC/*': '嵌套仓内条目（不纳入 Desktop 统计）',
  // LICENSES
  'LICENSES/COPYRIGHT-NOTICE.md': '作品版权声明（作者 Sui，2025–2026）',
  'LICENSES/LICENSE-ASSETS.md': '视觉素材与文档许可',
  'LICENSES/LICENSE-CODE.md': '代码许可（PolyForm Noncommercial 1.0.0 全文）',
  'LICENSES/README-LICENSE-TEXT.md': '许可文本说明',
  // _patches
  '_patches/README.md': '补丁台账（唯一索引：目录/怎么跑/自检三层/人工验收清单）',
  '_patches/_driver.js': '补丁驱动（唯一入口）：基线→按序应用清单→三层自检→全绿才写产物',
  '_patches/_engine.js': '锚点替换引擎（五道断言；手机端 _patch_engine.js 的独立副本）',
  '_patches/_smoke_ui_edge.js': 'Edge 界面冒烟（playwright-core＋系统 Edge，不装 Chrome）',
  '_patches/_smoke_controls.js': '产物控件存在性冒烟（读 out/ 产物做静态断言）',
  '_patches/_test_*': '活测试：逻辑层断言（假 fetch/DOM/DB，不发真实请求；条数见 _patches/README.md）',
  '_patches/p*': '补丁清单（数据）：锚点替换项；票号/锚点数/状态见 _patches/README.md',
  '_patches/package.json': 'playwright-core 开发依赖（Edge 冒烟用）',
  '_patches/package-lock.json': '依赖锁文件（随 package.json）',
  '_patches/真机验收-清单.md': '人工验收清单（真机点一遍；流水线只保结构）',
  '_patches/baseline': '干净基线（永不被写；流水线每次从这里出发重放）',
  '_patches/baseline/InternalBeyond-b0d7919d.html': '当前干净基线（上游 V2.7.5；{bytes}）',
  '_patches/baseline/InternalBeyond-f8955fd1.html': '旧基线（上游 V2.7.4；留档对照）',
  '_patches/baseline/InternalBeyond-9ef2ed12.html': '旧基线（上游 V2.7.2；留档对照）',
  '_patches/out': '生成产物（不入库）：重放产物＋自检报告，不逐项展开',
  // docs
  'docs/workspace-readme.md': '工作区说明（架构树简版/Code style/常用操作；完整目录树入口指向本树）',
  'docs/workspace-tree.md': '本文件：完整目录树（_gen_tree.js 生成）',
  'docs/说明书-电脑端.md': '电脑端说明书（小助手知识源）',
  'docs/IB-本体缺陷-复核清单.md': '本体缺陷复核清单（与手机端同字节，2026-10-21 实测）',
  'docs/adr': '架构决策记录',
  'docs/adr/0003-电脑端改用本地补丁模式.md': '本地补丁模式决策（2026-09-21 起；基线永不被写）',
  'docs/adr/0004-工作空间拆分与git绑定.md': '工作空间拆分与 git 绑定（2026-10-19；双工作区）',
  'docs/agents': '流程规范',
  'docs/agents/domain.md': '领域文档规则（CONTEXT＋adr 分工）',
  'docs/agents/issue-tracker.md': 'issue 流程（.scratch/<feature>/issues/）',
  'docs/agents/spec-and-tickets.md': '规格与拆票（Implementation Decisions 逐处列）',
  'docs/agents/triage-labels.md': '五种分诊标签',
  'docs/agents/upstream-issue-loop.md': '上游收口流程（三道闸门→选路→六段稿）',
  'docs/agents/win-shell-env.md': '本机 shell/检索/安全删除的坑',
  'docs/issues': '已外发上游稿存档',
  'docs/issues/IB-issue-历史窗口跳档致缓存重建-电脑端-已外发.md': '已外发 issue 存档（历史窗口跳档致缓存重建）',
  // game（上游资源，按前缀分组）
  'game/dessert_*': '甜点图标（上游件）',
  'game/dialogue_box.png': '对话框素材（上游件）',
  'game/game_module.js': '小游戏模块（上游件）',
  'game/room_*': '房间底图（日/夜；上游件）',
  'game/sleep_*': '睡眠气泡（双主题；上游件）',
  'game/story_*': '剧情场景素材（上游件）',
  'game/tea_*': '茶会场景素材（图标/底图/精灵；上游件）',
  'game/portraits': '角色立绘（上游件）',
  'game/portraits/*': '立绘（上游件）',
  'game/sprites': '角色精灵图（按动作分三组；上游件）',
  'game/sprites/idle_*': '待机精灵（上游件）',
  'game/sprites/lie_*': '躺姿精灵（上游件）',
  'game/sprites/walk_*': '行走精灵（上游件）',
};

// ── 小工具 ─────────────────────────────────────────────────────────────────
const WIDE = /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;
function dispWidth(s) { let w = 0; for (const ch of s) w += WIDE.test(ch) ? 2 : 1; return w; }
function fmtBytes(n) { return n.toLocaleString('en-US') + ' B'; }
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function cmpName(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
// 可见条目在前、点条目在后；目录在前、文件在后；同类按代码位定序（保证可重复）
function cmpEntry(a, b) {
  const ad = a.name.startsWith('.') ? 1 : 0, bd = b.name.startsWith('.') ? 1 : 0;
  if (ad !== bd) return ad - bd;
  const at = a.isDirectory() ? 0 : 1, bt = b.isDirectory() ? 0 : 1;
  if (at !== bt) return at - bt;
  return cmpName(a.name, b.name);
}

function noteFor(rel, abs, isDir) {
  let note = NOTES[rel];
  if (note === undefined) {
    for (const k of Object.keys(NOTES)) {
      if (!k.includes('*')) continue;
      const re = new RegExp('^' + k.split('*').map(escapeRe).join('[^/]*') + '$');
      if (re.test(rel)) { note = NOTES[k]; break; }
    }
  }
  if (note === undefined) return null;
  let n = 0;
  if (isDir) { try { n = fs.readdirSync(abs).length; } catch (e) { n = 0; } }
  return note
    .replace(/\{bytes\}/g, () => { try { return fmtBytes(fs.statSync(abs).size); } catch (e) { return '?'; } })
    .replace(/\{n\}/g, () => String(n));
}

// ── 扫描与渲染（边扫边存带引导线的文本行）──────────────────────────────────
// guides[d]＝第 d 层祖先是否还有后续兄弟（画 │   还是空白）；isLast＝本行是否末个兄弟
const textRows = [];
let nFiles = 0, nDirs = 0, nRootFiles = 0;

function readSorted(abs) {
  let ents;
  try { ents = fs.readdirSync(abs, { withFileTypes: true }); } catch (e) { return []; }
  return ents.sort(cmpEntry);
}

function prefixOf(guides, isLast) {
  let s = '';
  for (const g of guides) s += g ? '│   ' : '    ';
  return s + (isLast ? '└── ' : '├── ');
}

function addRow(label, rel, abs, isDir, guides, isLast, counted = true) {
  const note = noteFor(rel, abs, isDir) || '（未登记注释）';
  textRows.push({ prefix: prefixOf(guides, isLast), label, note });
  if (!counted) return; // DLC 边界内的行只标明，不计入 Desktop 统计
  if (isDir) nDirs++;
  else { nFiles++; if (guides.length === 0) nRootFiles++; }
}

// 普通目录：全量递归
function walk(rel, depth, guides) {
  const abs = path.join(ROOT, rel);
  const ents = readSorted(abs);
  ents.forEach((e, i) => {
    const isLast = i === ents.length - 1;
    const childRel = rel + '/' + e.name;
    if (e.isDirectory()) renderDir(childRel, e.name, depth, guides, isLast);
    else addRow(e.name, childRel, path.join(abs, e.name), false, guides, isLast); // 符号链接不跟随，按文件行列
  });
}

function renderDir(rel, name, depth, guides, isLast) {
  const abs = path.join(ROOT, rel);
  const childGuides = guides.concat(!isLast); // 本目录子级的祖先引导线
  if (OPAQUE.has(rel)) { addRow(name + '/', rel, abs, true, guides, isLast); return; }
  if (BOUNDARY.has(rel)) {
    addRow(name + '/', rel, abs, true, guides, isLast);
    walkBoundary(rel, depth + 1, childGuides);
    return;
  }
  if (COLLAPSE.has(rel)) { addRow(name + '/', rel, abs, true, guides, isLast); return; }
  if (GROUP.has(rel)) {
    addRow(name + '/', rel, abs, true, guides, isLast);
    walkGrouped(rel, depth + 1, childGuides);
    return;
  }
  addRow(name + '/', rel, abs, true, guides, isLast);
  walk(rel, depth + 1, childGuides);
}

// DLC 边界：列直接子级；.git 不展开；EXPAND_ONCE 的目录再列一级；其余目录只列一行
// （边界内的行只作标明，不计入 Desktop 统计）
function walkBoundary(rel, depth, guides) {
  const abs = path.join(ROOT, rel);
  const ents = readSorted(abs);
  ents.forEach((e, i) => {
    const isLast = i === ents.length - 1;
    const childRel = rel + '/' + e.name;
    if (e.isDirectory()) {
      addRow(e.name + '/', childRel, path.join(abs, e.name), true, guides, isLast, false);
      if (EXPAND_ONCE.has(childRel)) {
        const inner = readSorted(path.join(abs, e.name));
        const innerGuides = guides.concat(!isLast);
        inner.forEach((f, j) => {
          const fLast = j === inner.length - 1;
          addRow(f.name, childRel + '/' + f.name, path.join(abs, e.name, f.name), !f.isDirectory(), innerGuides, fLast, false);
        });
      }
    } else {
      addRow(e.name, childRel, path.join(abs, e.name), false, guides, isLast, false);
    }
  });
}

// 分组目录：文件按文件名前缀（第一个 _ 之前）分组，目录照常递归
function walkGrouped(rel, depth, guides) {
  const abs = path.join(ROOT, rel);
  const ents = readSorted(abs);
  const groups = new Map();
  const dirs = [];
  ents.forEach(e => {
    if (e.isDirectory()) { dirs.push(e); return; }
    const i = e.name.indexOf('_');
    const pfx = i > 0 ? e.name.slice(0, i) : e.name;
    if (!groups.has(pfx)) groups.set(pfx, []);
    groups.get(pfx).push(e.name);
  });
  const total = dirs.length + groups.size;
  let idx = 0;
  dirs.forEach(e => {
    const isLast = ++idx === total;
    renderDir(rel + '/' + e.name, e.name, depth, guides, isLast);
  });
  [...groups.keys()].sort(cmpName).forEach(pfx => {
    const isLast = ++idx === total;
    const names = groups.get(pfx).sort(cmpName);
    if (names.length === 1) addRow(names[0], rel + '/' + names[0], path.join(abs, names[0]), false, guides, isLast);
    else addRow(pfx + '_*（' + names.length + '）', rel + '/' + pfx + '_*', path.join(abs, names[0]), false, guides, isLast);
  });
}

function today() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function main() {
  const args = process.argv.slice(2);
  const toStdout = args.includes('--stdout');
  let outPath = path.join(ROOT, 'docs', 'workspace-tree.md');
  const oi = args.indexOf('--out');
  if (oi >= 0 && args[oi + 1]) outPath = path.resolve(args[oi + 1]);

  // 根层
  const rootLabel = ROOT.replace(/\//g, '\\') + '\\';
  const ents = readSorted(ROOT);
  ents.forEach((e, i) => {
    const isLast = i === ents.length - 1;
    if (e.isDirectory()) renderDir(e.name, e.name, 1, [], isLast);
    else addRow(e.name, e.name, path.join(ROOT, e.name), false, [], isLast);
  });

  const maxW = textRows.reduce((m, r) => Math.max(m, dispWidth(r.label)), 0);
  const tree = [rootLabel];
  textRows.forEach(r => {
    const pad = ' '.repeat(Math.max(1, maxW - dispWidth(r.label) + 2));
    tree.push(r.prefix + r.label + pad + '# ' + r.note);
  });

  const md = [
    '# IB 电脑端工作区 · 目录结构树（带注释）',
    '',
    '> **截至 ' + today() + '**（生成日期；结构＝本地真实扫描，注释人工维护）。',
    '> 工程基准：`local-work` 分支（本地补丁基线 `f8955fd1`，`git diff f8955fd1` ＝ 纯补丁增量）；',
    '> 补丁流水线干净基线＝`_patches/baseline/InternalBeyond-b0d7919d.html`（上游 V2.7.5）。',
    '> HEAD 随提交变化，不固定在本树；规模数字为生成时实测。',
    '> 规模：根目录 ' + nRootFiles + ' 个文件；本树共列 ' + nFiles + ' 个文件 / ' + nDirs + ' 个目录',
    '> （扫描口径：不含 `.git`／`.scratch`／`.obsidian`／`.workbuddy`／`DLC` 内部，`_patches/out/` 只列目录行）。',
    '> 归属：**上游件**（本地勿编辑）＝`README.md`／`LICENSE`／`IB-icon.ico`／`bg-canvas.png`／`bg-infernal.jpg`／`bg-internal.jpg`／`game/`；',
    '> **本地工具**＝根目录 `_win_*`／`_check_*`／`_fetch_upstream.js`／`_probe_lint.js`／`_gen_tree.js`、`_patches/`、`docs/`、`.githooks/`；',
    '> **生成产物**＝`_patches/out/`（不入库）与 `InternalBeyond.html`（补丁重放产物，可自基线再生）。',
    '> `DLC/` 是嵌套独立 Git 仓库（Cinema），只标明仓库边界与主要入口，不计入 Desktop 统计。',
    '',
    '```text',
    ...tree,
    '```',
    '',
    '## 阅读要点',
    '',
    '1. **上游件**：`README.md`、`LICENSE`、`IB-icon.ico`、三张 `bg-*` 底图与 `game/` 来自上游，本地勿编辑；`InternalBeyond.html` 是补丁流水线从干净基线重放的产物，可再生，勿手改当唯一真相。',
    '2. **本地工具**：根目录 `_win_*`（与上游比对/同步/变更一览数据链）、`_gen_tree.js`（本树生成器）；`_patches/` 是本地补丁流水线（引擎/清单/driver/测试/基线/产物）；`.githooks/` 是预提交守栏。自检／取数脚本（`_check_*`、`_fetch_upstream.js`、`_probe_lint.js`）与手机端各持一份副本，同字节状态逐文件标注于本树（标注者＝2026-10-21 实测相同），未标注者不作同字节声明。',
    '3. **不入库目录**：`.scratch/`（本地 effort）、`.workbuddy/memory/`（会话记忆）、`.obsidian/`（笔记配置）、`_patches/out/`（生成产物）、`DLC/`（嵌套独立仓，父仓已 gitignore）——只述用途，数量与体积随会话变化，不记录。',
    '4. **DLC 边界**：`DLC/` 是嵌套独立 Git 仓库（Cinema，origin=PasleySage/InternalBeyond-Cinema），本树只标明仓库边界与主要入口 `DLC/DLC/IB-Cinema.js`，其内部文件不纳入 Desktop 的递归扫描与统计。',
    '5. **注释维护**：注释与扫描结果分离——NOTES 表在 `_gen_tree.js` 内人工维护（支持 `*` 通配批注，`{bytes}`/`{n}` 为实测占位）；未登记的新条目显示「（未登记注释）」，不会从树中消失；结构有变时重跑 `node _gen_tree.js`，勿手改树体。',
    '',
    '---',
    '**生成**：' + today() + '；树体由根目录 `_gen_tree.js` 产出（注释列按显示宽度对齐）。',
    '',
  ].join('\n');

  if (toStdout) {
    process.stdout.write(md);
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md, 'utf8');
    console.log('已生成 ' + path.relative(ROOT, outPath).replace(/\\/g, '/') +
      '（' + nFiles + ' 文件 / ' + nDirs + ' 目录；根目录 ' + nRootFiles + ' 个文件）');
  }
}

main();
