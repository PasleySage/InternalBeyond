/* _test_p03_fine.js —— P03 精细文件工具的断言式测试（逻辑层，不真开 DB、不发网络）
 *
 * 跑法：node _test_p03_fine.js [产物.html]
 *       不传路径时用 `out\InternalBeyond.patched.html`；再没有就在内存里从基线重打 p01+p02+p03(+p07)。
 *
 * 做法：从产物文本原样抽出 _fineOn/_fineCap/_fileOutline/_capFileText/_fineSearch/_fineCtx 源码，
 *       放进 vm，配假的 dbGetAll/wsGetFiles/dbGetByIndex/localStorage/activeFriendId，断言外部可观察行为：
 *       三档取值、20 处上限、目录格式、按行窗口、截断+目录、只读边界。
 *       开关门、能力块、设置 UI、与 p02 共存、归类用对产物文本的静态断言覆盖。
 *       内部变量名不作断言。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const E = require('./_engine.js');

const HERE = __dirname;
const BASE = path.join(HERE, 'baseline', 'InternalBeyond-f8955fd1.html');
const DEF_OUT = path.join(HERE, 'out', 'InternalBeyond.patched.html');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' —— ' + JSON.stringify(extra) : '')); }
}
/* 从 startIdx 起按花括号配对取出一个函数定义（含 async 前缀） */
function takeBlock(text, startIdx) {
  let i = text.indexOf('{', startIdx), d = 0;
  for (; i < text.length; i++) {
    if (text[i] === '{') d++;
    else if (text[i] === '}') { d--; if (!d) return text.slice(startIdx, i + 1); }
  }
  throw new Error('取块失败：花括号未配平');
}
function grab(src, sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error('产物里没找到：' + sig);
  return takeBlock(src, i);
}

/* ── 取出产物文本 ── */
const baseText = fs.readFileSync(BASE, 'utf8');
let outText;
if (process.argv[2]) outText = fs.readFileSync(process.argv[2], 'utf8');
else if (fs.existsSync(DEF_OUT)) outText = fs.readFileSync(DEF_OUT);
else outText = E.runChain([
  require('./p01-连接测试.js'), require('./p02-AI控制播放器.js'), require('./p03-精细文件工具.js')
], baseText).text;

/* 抽出本次要在 vm 里跑的源码：p03 辅助函数是连续一块（_capFileText 之后、_attachCloseHandler 之前），
 * 整段切下即可——逐函数花括号配对会被字符串/正则里的 {} 干扰。 */
const startI = outText.indexOf('function _capFileText(');
const endI = outText.indexOf('var _attachCloseHandler=null;');
if (startI < 0 || endI < 0 || endI < startI) throw new Error('产物里没找到 p03 函数块边界');
const src = outText.slice(startI, endI);
if (!/async function _fineSearch\(/.test(src) || !/async function _fineCtx\(/.test(src)) throw new Error('函数块不完整');

/* ── 假环境 ── */
function makeEnv(opts) {
  opts = opts || {};
  const store = {}; /* 假 localStorage */
  if (opts.fineOn) store['ib_wsFineTools'] = '1';
  if (opts.fileCap) store['ib_fileCap'] = String(opts.fileCap);
  const projFiles = opts.projFiles || {}; /* projId -> [files] */
  const env = {
    console: console,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    WS_DEFAULT_PROJ_ID: 'proj_icode_default',
    activeFriendId: 'f1',
    _ibInjectMax: () => 1000000,
    dbGetAll: async (kind) => {
      if (kind === 'projects') return (opts.projects || []);
      return [];
    },
    wsGetFiles: async (projId) => projFiles[projId] || [],
    dbGetByIndex: async (kind, idx, fid) => opts.chatMessages || [],
    _wsExtractRichText: async () => '',
    setTimeout: setTimeout
  };
  vm.createContext(env);
  vm.runInContext(src, env);
  return env;
}
const run = (env, expr) => vm.runInContext(expr, env);

/* 样例工作区：默认项目下两个文件 */
const PROJ = [
  { id: 'proj_icode_default', name: 'ICode' },
  { id: 'proj_user', name: 'User' }
];
const FILES = {
  proj_icode_default: [
    { path: 'a.js', content: 'function alpha(){}\n// line2 关键词在这里\nfunction beta(){}\n' },
    { path: 'big.md', content: '# Title\n\npara one\n\nsecond para\n\nkeyword again\n' }
  ]
};

console.log('== P03 精细文件工具（逻辑层 + 静态断言）==');

/* ── 1. 开关默认关 ── */
let env = makeEnv({});
ok('默认关：未设置时 _fineOn()=false', run(env, '_fineOn()') === false);
env = makeEnv({ fineOn: true });
ok('开关开：localStorage.ib_wsFineTools=1 时 _fineOn()=true', run(env, '_fineOn()') === true);

/* ── 2. 三档取值 ── */
env = makeEnv({});
ok('三档默认：未设置时 _fineCap()=30000', run(env, '_fineCap()') === 30000);
env = makeEnv({ fileCap: 15000 });
ok('三档：15000 被接受', run(env, '_fineCap()') === 15000);
env = makeEnv({ fileCap: 120000 });
ok('三档：120000 被接受', run(env, '_fineCap()') === 120000);
env = makeEnv({ fileCap: 999999 });
ok('三档：非法值回落 30000', run(env, '_fineCap()') === 30000);

/* ── 3. 目录 ── */
env = makeEnv({ fineOn: true });
const outline = run(env, "_fileOutline(" + JSON.stringify('# H1\n\nbody line\n\n## H2\n\nmore\n') + ", 60, 1600)");
ok('目录：含「行号| 首行」格式', /1\|\s*# H1/.test(outline) && /5\|\s*## H2/.test(outline), outline);
ok('目录：空串返回空', run(env, "_fileOutline('', 60, 1600)") === '');

/* ── 4-6. 检索 ── */
(async () => {
  env = makeEnv({ fineOn: true, projects: PROJ, projFiles: FILES });
  let r = await run(env, "_fineSearch({q:'关键词',path:''})");
  ok('检索：命中并回传「路径:行号 ｜ 前后文」', r.ok && /a\.js:2 ｜/.test(r.content) && r.content.indexOf('检索「关键词」') === 0, r.content.slice(0, 120));

  /* 命中 >20：塞一个 50 次命中的文件 */
  const many = { proj_icode_default: [{ path: 'many.txt', content: Array(60).fill('hitword here\n').join('') }] };
  env = makeEnv({ fineOn: true, projects: PROJ, projFiles: many });
  r = await run(env, "_fineSearch({q:'hitword',path:''})");
  const hits = (r.content.match(/many\.txt:\d+ ｜/g) || []);
  ok('检索：命中>20 只回传 20 处', hits.length === 20, '实际 ' + hits.length);

  env = makeEnv({ fineOn: true, projects: PROJ, projFiles: FILES });
  r = await run(env, "_fineSearch({q:'不存在的词xyz',path:''})");
  ok('检索：无命中 → 可读空结果', r.ok && /0 处命中/.test(r.content) && !/\n\S/.test(r.content.split('）')[1] || ''), r.content.slice(0, 120));

  r = await run(env, "_fineSearch({q:'',path:''})");
  ok('检索：缺 q → 失败回执', r.ok === false && /缺少关键词/.test(r.detail), r);

  /* 7. ctx outline / range / around */
  env = makeEnv({ fineOn: true, projects: PROJ, projFiles: { proj_icode_default: [{ path: 'x.txt', content: 'line1\nline2\nline3\nline4\nline5\n' }] } });
  r = await run(env, "_fineCtx({path:'x.txt',outline:'1',from:'',to:'',line:'',span:''})");
  ok('ctx outline：返回目录', r.ok && /目录/.test(r.content) && /共 6 行/.test(r.content), r.content.slice(0, 120));

  r = await run(env, "_fineCtx({path:'x.txt',outline:'',from:'2',to:'4',line:'',span:''})");
  ok('ctx range：带行号片段（2–4 行）', r.ok && /2\| line2/.test(r.content) && /4\| line4/.test(r.content) && !/1\| line1/.test(r.content), r.content);

  r = await run(env, "_fineCtx({path:'x.txt',outline:'',from:'',to:'',line:'3',span:'1'})");
  ok('ctx around：以第 3 行为中心 ±1', /2\| line2/.test(r.content) && /3\| line3/.test(r.content) && /4\| line4/.test(r.content), r.content);

  r = await run(env, "_fineCtx({path:'x.txt',outline:'',from:'99',to:'200',line:'',span:''})");
  ok('ctx range：越界 from/to 被夹到末尾、可读', r.ok && /第 6–6 行/.test(r.content), r.content.slice(0, 100));

  r = await run(env, "_fineCtx({path:'nope.txt',outline:'',from:'',to:'',line:'',span:''})");
  ok('ctx：文件不存在 → 可读错误', r.ok === false && /文件不存在/.test(r.detail), r);

  /* 8. 三档截断 + 目录 */
  env = makeEnv({ fineOn: true, fileCap: 15000 });
  const longText = Array(800).fill('这是一段很长的正文，用来撑过一万五千字的附件上限。\n').join('');
  ok('前置：样例正文确实超过 15000', longText.length > 15000, longText.length);
  const out1 = run(env, "_capFileText(" + JSON.stringify(longText) + ",'big.txt')");
  ok('截断：超限 → 截断提示 + 「目录 · 行号| 该段首行」', out1.indexOf('[目录 · 行号| 该段首行]') !== -1 && /已截断至前 15000 字符/.test(out1), out1.slice(-120));
  ok('截断：截断后长度小于原文', out1.length < longText.length, out1.length + ' vs ' + longText.length);

  env = makeEnv({ fineOn: true, fileCap: 120000 });
  const small = '短正文\n第二行\n';
  const out2 = run(env, "_capFileText(" + JSON.stringify(small) + ",'s.txt')");
  ok('截断：未超限 → 原文照发、不附目录', out2 === small && out2.indexOf('目录') === -1, out2);

  env = makeEnv({ fineOn: false });
  const out3 = run(env, "_capFileText(" + JSON.stringify(longText) + ",'big.txt')");
  ok('截断：开关关 → 维持 _ibInjectMax(100万) 行为、不附目录', out3 === longText && out3.indexOf('目录') === -1, 'len=' + out3.length);

  /* ── 静态断言 ── */
  /* 9. 只读：p03 辅助函数块与执行分支源码不含写/网络 API */
  const fineSrc = src; /* vm 里跑的那整块（_capFileText…_fineCtx） */
  const execI1 = outText.indexOf("op.kind==='search'"), execI2 = outText.indexOf("op.kind==='ctx'");
  const execSeg = execI1 >= 0 && execI2 > execI1 ? outText.slice(execI1, outText.indexOf('continue}', execI2) + 9) : '';
  ok('只读：fine 函数块不出现 dbPut/fetch/writeFile/delete', !/dbPut\(|fetch\(|writeFile|deleteFile|removeItem|indexedDB/.test(fineSrc), '');
  ok('只读：执行分支不出现写/网络调用', !/dbPut\(|fetch\(|wsCreate|wsWrite|saveFile/.test(execSeg), execSeg.slice(0, 80));

  /* 10. 开关关二次拦截 */
  ok('开关门：执行器有 !_fineOn() 拦截', outText.indexOf("op.kind==='search'") !== -1 && outText.indexOf("!_fineOn()") !== -1);
  ok('开关门：双轨执行层按 _fineOn() 拦截', outText.indexOf("!_fineOn()") !== -1 && outText.indexOf("op.kind==='search'") !== -1);

  /* 11. 与 p02 共存 */
  ok('p02 共存：_musicCtl 与 music 执行分支仍在', outText.indexOf('function _musicCtl(action)') !== -1 && /op\.kind==='music'/.test(outText));

  /* 12. 反向：search/ctx 执行路径真实存在 */
  ok('执行路径存在：双轨 search 与 ctx 分支', /op\.kind==='search'/.test(outText) && /op\.kind==='ctx'/.test(outText));

  /* 13. 能力块 */
  ok('能力块常量已定义', outText.indexOf('const _WS_FINE_INSTR_BLOCK=') !== -1);
  ok('能力块只描述只读两标签', /<ws_search q=/.test(outText) && /<ws_ctx path=/.test(outText) && /只读/.test(outText));

  /* 14. 标签进正则 */
  ok('双轨通路识别 search/ctx', outText.indexOf("op.kind==='search'||op.kind==='ctx'") !== -1);

  /* 15. 设置 UI */
  ok('设置 UI：checkbox 与三档 select 都在', outText.indexOf('id="ib-fine-toggle"') !== -1 && outText.indexOf('id="ib-fine-cap"') !== -1);

  /* 16. 归类 */
  ok('失败归类：search→检索工作区、ctx→读取上下文', outText.indexOf("r.type==='search'?'检索工作区'") !== -1 && outText.indexOf("r.type==='ctx'?'读取上下文'") !== -1);

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('✗ 未捕获：' + (e && e.stack || e)); process.exit(1); });
