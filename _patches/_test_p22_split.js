/* _test_p22_split.js —— P22 分段气泡收尾拆段：逻辑层 + 静态断言
 *
 * 跑法：node _test_p22_split.js [产物.html]
 *       不传路径时，用 `out\InternalBeyond.patched.html`；若其中没有 p22，回退到内存从基线重打。
 *
 * 做法：从产物原样抽出 `function _wsFinalizeBubble(ref,rawText,wsResults){…}`，
 * 放进 vm，注入假的 _mdMode/_bsOn/_renderSegments/_renderAiContent/_panelMdHost，
 * 断言三条分支各自走对渲染路径 —— 去掉 p22 后 L1 必红。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const E = require('./_engine.js');

const HERE = __dirname;
const BASE = path.join(HERE, 'baseline', 'InternalBeyond-b0d7919d.html');
const DEF_OUT = path.join(HERE, 'out', 'InternalBeyond.patched.html');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' —— ' + extra : '')); }
}

const baseText = fs.readFileSync(BASE, 'utf8');
let outText;
if (process.argv[2]) outText = fs.readFileSync(process.argv[2], 'utf8');
else if (fs.existsSync(DEF_OUT)) outText = fs.readFileSync(DEF_OUT, 'utf8');
else outText = '';
if (outText.indexOf('p22：分段气泡开时') === -1) outText = E.runChain([require('./p22-分段气泡收尾拆段.js')], baseText).text;

console.log('== P22 分段气泡收尾拆段（逻辑层 + 静态断言）==');

/* ── 静态断言 ── */
ok('S1. 产物含 p22 分支（_bsOn 开 → _renderAiContent，含小窗 r-text 归一）',
  outText.indexOf('var _te22=ref.txt;') !== -1 &&
  outText.indexOf('_renderAiContent(_te22,ref.div,rawText,wsResults);') !== -1);
ok('S2. 产物保留 else 原句（原渲染路径完整）',
  outText.indexOf('else{_renderSegments(ref.isTextNode?_panelMdHost(host):host,rawText,wsResults)}') !== -1);
ok('S3. 干净基线不含 p22 任一分支（是本补丁加的）',
  baseText.indexOf('var _te22=ref.txt;') === -1 &&
  baseText.indexOf('var _te22h=div.querySelector') === -1 &&
  baseText.indexOf('var _te22a=div.querySelector') === -1);
ok('S7. P22-2 小窗历史分支在产物中（_te22h 归一 r-text）',
  outText.indexOf("if(_bsOn()){var _te22h=div.querySelector(':scope>.r-text')") !== -1 &&
  outText.indexOf('_renderAiContent(_te22h,div,_pv9.text);') !== -1);
ok('S8. P22-3 小窗 append 分支在产物中（_te22a 归一 r-text）',
  outText.indexOf("if(_bsOn()){var _te22a=div.querySelector(':scope>.r-text')") !== -1 &&
  outText.indexOf('_renderAiContent(_te22a,div,_pv9.text,wsResults);') !== -1);
ok('S9. 两处 else 原句保留（P22-2/P22-3 关开关走原路径）',
  outText.indexOf('else{_renderSegments(_panelMdHost(div),_pv9.text);_vbMountD(div,null,_pv9.vb,_pv9.text)}') !== -1 &&
  outText.indexOf('else{_renderSegments(_panelMdHost(div),_pv9.text,wsResults);_vbMountD(div,null,_pv9.vb,_pv9.text)}') !== -1);
ok('S10. P22-4 小窗分段消息隐藏规则已扩（#chat-panel 版 quote/del display:none）',
  outText.indexOf('#chat-panel .chat-msg.bs-msg>.chat-msg-del,#chat-panel .chat-msg.bs-msg>.chat-msg-quote{display:none}') !== -1);
ok('S11. 干净基线的小窗无此规则（原规则仅 #page-chat）',
  baseText.indexOf('#chat-panel .chat-msg.bs-msg>.chat-msg-quote') === -1 &&
  baseText.indexOf('#page-chat .chat-msg.bs-msg>.chat-msg-del,#page-chat .chat-msg.bs-msg>.chat-msg-quote{display:none}') !== -1);
ok('S12. P22-5 段级键 top 对齐规则在产物中（top:3px 覆盖）',
  outText.indexOf('.chat-msg .r-text.bs-split .bs-seg .bs-act{top:3px}') !== -1);
ok('S13. 干净基线无对齐规则（原 .bs-act top:5px 单条）',
  baseText.indexOf('.bs-seg .bs-act{top:3px}') === -1);
ok('S4. 收尾函数定义仍在', outText.indexOf('function _wsFinalizeBubble(ref,rawText,wsResults){') !== -1);
ok('S5. _renderAiContent 定义仍在', outText.indexOf('function _renderAiContent(textEl,container,text,wsResults){') !== -1);
ok('S6. _bsSplit 切段入口仍在', outText.indexOf('var segs=_bsOn()?_bsSplit(text):null;') !== -1);

/* ── 抽出 _wsFinalizeBubble 函数体 ── */
function takeBlock(text, startIdx) {
  let i = text.indexOf('{', startIdx), d = 0;
  for (; i < text.length; i++) {
    if (text[i] === '{') d++;
    else if (text[i] === '}') { d--; if (!d) return text.slice(startIdx, i + 1); }
  }
  throw new Error('取块失败：花括号未配平');
}
const fnStart = outText.indexOf('function _wsFinalizeBubble(ref,rawText,wsResults){');
if (fnStart === -1) { console.error('✗ 产物里没找到 _wsFinalizeBubble'); process.exit(1); }
const fnSrc = takeBlock(outText, fnStart);

/* ── vm 假环境：记录两条渲染路径被谁、以什么参数调用 ── */
function runCase(bsOnVal, isTextNode) {
  const calls = { seg: [], ai: [], panel: 0 };
  const mkEl = () => ({
    classList: { add() {}, remove() {}, contains: () => false },
    textContent: '', appendChild() {}, dataset: {}, firstChild: null,
    querySelector: () => null
  });
  const ref = { div: mkEl(), txt: isTextNode ? null : mkEl(), isTextNode: isTextNode };
  const ctx = {
    console: console, JSON: JSON, String: String, Error: Error,
    document: { createElement: () => ({ className: '', textContent: '' }) },
    __ref: ref, __text: '有。\n\n第二段', __res: [],
    _mdMode: () => 'full',
    _bsOn: () => bsOnVal,
    _panelMdHost: (d) => { calls.panel++; return d; },
    _renderSegments: (host, text, ws) => { calls.seg.push({ host, text, ws }); },
    _renderAiContent: (t, c, text, ws) => { calls.ai.push({ t, c, text, ws }); }
  };
  vm.createContext(ctx);
  vm.runInContext(fnSrc, ctx);
  vm.runInContext('_wsFinalizeBubble(__ref,__text,__res)', ctx);
  return { calls, ref };
}

/* L1 分段开关开 + 全屏（full）→ 走 _renderAiContent，且不走 _renderSegments */
let r = runCase(true, false);
ok('L1. 开关开 + 全屏 → 走 _renderAiContent(ref.txt, ref.div)',
  r.calls.ai.length === 1 && r.calls.ai[0].t === r.ref.txt && r.calls.ai[0].c === r.ref.div && r.calls.ai[0].text === '有。\n\n第二段',
  JSON.stringify({ ai: r.calls.ai.length, seg: r.calls.seg.length }));

/* L2 分段开关关 → 完全走原 _renderSegments，不碰 _renderAiContent */
r = runCase(false, false);
ok('L2. 开关关 → 走 _renderSegments 原路径（host=ref.txt），不动 _renderAiContent',
  r.calls.seg.length === 1 && r.calls.seg[0].host === r.ref.txt && r.calls.ai.length === 0,
  JSON.stringify({ ai: r.calls.ai.length, seg: r.calls.seg.length }));

/* L3 迷你气泡（isTextNode，开关开）→ 也进拆段分支：归一出 r-text 元素再 _renderAiContent */
r = runCase(true, true);
ok('L3. 迷你气泡（开关开）→ 走 _renderAiContent，textEl 为归一出的 r-text 元素，不走 _panelMdHost',
  r.calls.ai.length === 1 && r.calls.ai[0].t !== r.ref.txt && r.calls.ai[0].t.className === 'r-text' &&
  r.calls.ai[0].c === r.ref.div && r.calls.seg.length === 0 && r.calls.panel === 0,
  JSON.stringify({ ai: r.calls.ai.length, seg: r.calls.seg.length, panel: r.calls.panel }));

/* L4 迷你气泡（isTextNode，开关关）→ 原路径 _renderSegments(_panelMdHost(div)) 不变 */
r = runCase(false, true);
ok('L4. 迷你气泡（开关关）→ 仍走 _renderSegments(panelMdHost(div)) 原路径',
  r.calls.seg.length === 1 && r.calls.seg[0].host === r.ref.div && r.calls.ai.length === 0 && r.calls.panel === 1,
  JSON.stringify({ ai: r.calls.ai.length, seg: r.calls.seg.length, panel: r.calls.panel }));

console.log('----');
console.log('通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
