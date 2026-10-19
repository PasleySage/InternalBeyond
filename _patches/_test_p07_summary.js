/* _test_p07_summary.js —— P07 摘要关思考与真因的断言式回归测试（逻辑层，不发真实请求）
 *
 * 跑法：node _test_p07_summary.js [产物.html]
 *       不传路径时，用 `out\InternalBeyond.patched.html`；再没有就在内存里从基线重打一遍（p01+p07）。
 *
 * 做法：从产物文本里**原样抽出** callApi / generateSummary / maybeSummarize / _doSummarize
 * 等函数源码，连同 PROVIDERS / _cfgFmt / _tokParam* 放进 vm，配一套假 fetch 与假 toast，
 * 按响应逐个断言外部可观察行为：
 *   - 摘要请求体：DeepSeek 目标带 thinking:{type:'disabled'}，其它服务商不带（W1+W2）
 *   - 空正文真因：finish=length + reasoning_content → 提示含「思考」（W6+W7）
 *   - 真因清空：连续两次失败，第二次不得读到第一次文案（W7）
 *   - 并发早退 / 无料可摘：各自文案（W4+W5）
 * 另加纯静态（grep 式）断言：聊天构造路径不带该字段、去掉 W2 后产物不含该字段。
 *
 * 已知口径：`SUMMARY_TRIGGER_COUNT=10` 时 :16079（未达触发数）会先于 :16081 返回，
 * 故 W5 的「无料可摘」分支在默认配置下不可达；本测试用 stub 把触发数压到 1 来
 * 单独验证该分支文案（方案 §四 3 要求测到该出口）。真机验收时该出口是否可见，
 * 需主控决定是否另补 :16079 出口文案（见回报风险）。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const E = require('./_engine.js');

const HERE = __dirname;
const BASE = path.join(HERE, 'baseline', 'InternalBeyond-f8955fd1.html');
const DEF_OUT = path.join(HERE, 'out', 'InternalBeyond.patched.html');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' —— ' + extra : '')); }
}

/* ── 取出待跑的源码 ── */
const baseText = fs.readFileSync(BASE, 'utf8');
const P01 = require('./p01-连接测试.js');
const P07 = require('./p07-摘要关思考与真因.js');
let outText;
if (process.argv[2]) outText = fs.readFileSync(process.argv[2], 'utf8');
else if (fs.existsSync(DEF_OUT)) outText = fs.readFileSync(DEF_OUT, 'utf8');
else outText = E.runChain([P01, P07], baseText).text;

/* 从 startIdx 起按花括号配对取出一个函数/对象定义 */
function takeBlock(text, startIdx) {
  let i = text.indexOf('{', startIdx), d = 0;
  for (; i < text.length; i++) {
    if (text[i] === '{') d++;
    else if (text[i] === '}') { d--; if (!d) return text.slice(startIdx, i + 1); }
  }
  throw new Error('取块失败：花括号未配平');
}
const idx = (t, s) => { const i = t.indexOf(s); if (i < 0) throw new Error('取源码失败：找不到 ' + s); return i; };

/* 静态断言用到的函数源码（产物，聊天路径应保持原样） */
const chatStreamSrc = takeBlock(outText, idx(outText, 'async function callApiChatStream(cfg,messages,opts){'));
const chatSrc = takeBlock(outText, idx(outText, 'async function callApiChat(cfg,messages,opts){'));

console.log('== P07 摘要关思考与真因（逻辑层，假 fetch）==');

/* ── A. 静态 / 反向断言 ── */
{
  const n = (outText.match(/ob\.thinking=\{type:'disabled'\}/g) || []).length;
  ok('A1 产物中 ob.thinking={type:\'disabled\'} 恰好 1 次（上游 _dsThinkOffD 路径）', n === 1, '出现 ' + n + ' 次');
  ok('A2 聊天流式构造路径（callApiChatStream）请求体不带 thinking 字段与 _noThink',
    !/\bthinking\s*[:=]\s*\{/.test(chatStreamSrc) && !/_noThink/.test(chatStreamSrc));
  ok('A3 聊天普通构造路径（callApiChat）请求体不带 thinking 字段与 _noThink',
    !/\bthinking\s*[:=]\s*\{/.test(chatSrc) && !/_noThink/.test(chatSrc));
  /* 反向：本地补丁不新增 thinking 请求字段（V2.7.4 起关思考走上游 _dsThinkOffD；W2 已撤） */
  const countDisabled = t => (t.match(/ob\.thinking=\{type:'disabled'\}/g) || []).length;
  const countReqThink = t => (t.match(/\bthinking\s*[:=]\s*\{type:/g) || []).length;
  let revText = '';
  try { revText = E.applyPatches(baseText, P07.patches).text; } catch (e) { revText = ''; ok('A4 反向：p07 全集在基线上仍可应用', false, String(e && e.message)); }
  if (revText) ok('A4 反向：本地补丁不新增 thinking 请求字段（与基线同数，沿用上游 _dsThinkOffD）',
    countDisabled(revText) === countDisabled(baseText) && countReqThink(revText) === countReqThink(baseText),
    'base disabled=' + countDisabled(baseText) + ' req=' + countReqThink(baseText) + ' / rev disabled=' + countDisabled(revText) + ' req=' + countReqThink(revText));
}
{
  const sumGenSrc = takeBlock(outText, idx(outText, 'let _sumLastErr='));
  ok('A5 摘要关思考走上游（noThink/_dsThinkOffD）', /noThink|_dsThinkOffD/.test(outText));
  ok('A6 真因暂存与清空：入口 _sumLastErr=\'\'、catch 写入（W7）',
    sumGenSrc.indexOf("_sumLastErr='';") !== -1 && sumGenSrc.indexOf('_sumLastErr=String(') !== -1);
  ok('A7 真因优先：!result 分支补写真因，不再恒为默认文案（W6）',
    /_sumLastErr=_sumLastErr\|\|/.test(sumGenSrc));
}

/* ── B. generateSummary → callApi 的动态断言（假 fetch） ── */
const providersSrc = takeBlock(outText, idx(outText, 'const PROVIDERS={'));
const cfgFmtSrc = takeBlock(outText, idx(outText, 'function _cfgFmt(cfg){'));
const tokMemSrc = takeBlock(outText, idx(outText, 'var _tokParamMem={}'));
const tokKeySrc = takeBlock(outText, idx(outText, 'function _tokParamKey(cfg){'));
const tokGetSrc = takeBlock(outText, idx(outText, 'function _tokParamGet(cfg){'));
const callApiSrc = takeBlock(outText, idx(outText, 'async function callApi(cfg,userMsg,opts){'));
const dsThinkSrc = outText.includes('function _dsThinkOffD(')
  ? takeBlock(outText, idx(outText, 'function _dsThinkOffD('))
  : 'function _dsThinkOffD(cfg){return !!(cfg&&cfg.provider==="deepseek")};';
const sumGenSrc = takeBlock(outText, idx(outText, 'let _sumLastErr='));
const getTextContentSrc = takeBlock(outText, idx(outText, 'function getTextContent(msg){'));

let sCalls = [], sPlan = [];
async function fakeFetch(url, opt) {
  sCalls.push({ url: url, headers: opt.headers || {}, body: opt.body });
  const p = sPlan.length > 1 ? sPlan.shift() : sPlan[0];
  if (p && p.throw) throw p.throw;
  return {
    ok: true, status: 200,
    headers: { get: () => 'application/json' },
    text: async () => '', json: async () => (p && p.json) || {}
  };
}
const sToasts = [];
function toastS(m) { sToasts.push(String(m)); }
const ctxS = {
  fetch: fakeFetch, toast: toastS, JSON: JSON, Date: Date,
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  AbortController: AbortController, console: console, URL: URL
};
ctxS.window = ctxS;
vm.createContext(ctxS);
vm.runInContext(['function _ccBeta(h,c){return h}', providersSrc, cfgFmtSrc, tokMemSrc, tokKeySrc, tokGetSrc, dsThinkSrc, callApiSrc, getTextContentSrc, sumGenSrc].join('\n'), ctxS);

const genSum = async (cfg, plan) => {
  sCalls = []; sPlan = Array.isArray(plan) ? plan.slice() : [plan];
  const n0 = sToasts.length;
  const r = await vm.runInContext('generateSummary(' + JSON.stringify(cfg) + ',null,[{role:"user",content:"hi"}],600,{user:"用户",ai:"AI"})', ctxS);
  return { result: r, body: sCalls[0] ? sCalls[0].body : null, toast: sToasts.slice(n0).join('|') };
};

(async function () {
  /* 摘要调用 → DeepSeek 目标：请求体带 thinking disabled */
  let r = await genSum({ provider: 'deepseek', endpoint: 'https://api.deepseek.com/v1/chat/completions', apiKey: 'sk', model: 'deepseek-chat', id: 'ds' },
    [{ json: { choices: [{ message: { content: '摘要正文' } }] } }]);
  {
    const b = r.body ? JSON.parse(r.body) : null;
    ok('B1 DeepSeek（provider=deepseek）→ 请求体带 thinking:{type:"disabled"}', !!(b && b.thinking && b.thinking.type === 'disabled'), r.body);
    ok('B1b 且仍带输出上限 max_tokens（上游 noThink 路径）', !!(b && b.max_tokens > 0), r.body);
  }

  /* 非 DeepSeek → 不带 */
  r = await genSum({ provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', apiKey: 'sk', model: 'gpt-4o-mini', id: 'oa' },
    [{ json: { choices: [{ message: { content: '摘要正文' } }] } }]);
  ok('B2 OpenAI → 请求体不含 thinking 字段', !!r.body && !/\bthinking/.test(r.body), r.body);

  /* 自定义服务商 + deepseek.com 端点 → 端点命中也下发 */
  r = await genSum({ provider: 'custom', endpoint: 'https://api.deepseek.com/v1/chat/completions', apiKey: 'sk', model: 'deepseek-chat', id: 'c1' },
    [{ json: { choices: [{ message: { content: '摘要正文' } }] } }]);
  ok('B3 自定义 + deepseek.com 端点 → 请求体带 thinking:{type:"disabled"}',
    !!r.body && /"thinking"\s*:\s*\{\s*"type"\s*:\s*"disabled"\s*\}/.test(r.body), r.body);

  /* 自定义服务商 + 其它端点 → 不带 */
  r = await genSum({ provider: 'custom', endpoint: 'https://proxy.example.com/v1/chat/completions', apiKey: 'sk', model: 'm', id: 'c2' },
    [{ json: { choices: [{ message: { content: '摘要正文' } }] } }]);
  ok('B4 自定义 + 其它端点 → 请求体不含 thinking 字段', !!r.body && !/\bthinking/.test(r.body), r.body);

  /* Gemini 格式 → 不带 */
  r = await genSum({ provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', apiKey: 'gk', model: 'gemini-2.0-flash', id: 'gm' },
    [{ json: { candidates: [{ content: { parts: [{ text: '摘要正文' }] } }] } }]);
  ok('B5 Gemini → 请求体不含 thinking 字段', !!r.body && !/\bthinking/.test(r.body), r.body);

  /* 成功路径返回正文 */
  r = await genSum({ provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', apiKey: 'sk', model: 'gpt-4o-mini', id: 'oa2' },
    [{ json: { choices: [{ message: { content: '  摘要正文  ' } }] } }]);
  ok('B6 成功 → 返回去空白后的摘要正文', r.result === '摘要正文', JSON.stringify(r.result));

  /* finish=length + reasoning_content → 真因直达（含「思考」） */
  r = await genSum({ provider: 'deepseek', endpoint: 'https://api.deepseek.com/v1/chat/completions', apiKey: 'sk', model: 'deepseek-chat', id: 'ds2' },
    [{ json: { choices: [{ message: { content: '', reasoning_content: '想了很久' }, finish_reason: 'length' }] } }]);
  ok('B7 finish=length＋思考 → 提示含「思考」与「输出预算」', r.result === null && /思考/.test(r.toast) && /输出预算/.test(r.toast), r.toast);

  /* 真因清空：连续两次失败，第二次不得读到第一次文案 */
  r = await genSum({ provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', apiKey: 'sk', model: 'gpt-4o-mini', id: 'oa3' },
    [{ throw: new TypeError('Failed to fetch') }]);
  ok('B8a 网络失败 → 提示带真实原因（Failed to fetch）', /Failed to fetch/.test(r.toast), r.toast);
  r = await genSum({ provider: 'deepseek', endpoint: 'https://api.deepseek.com/v1/chat/completions', apiKey: 'sk', model: 'deepseek-chat', id: 'ds3' },
    [{ json: { choices: [{ message: { content: '', reasoning_content: '再想一次' }, finish_reason: 'length' }] } }]);
  ok('B8b 第二次失败 → 入口清空 _sumLastErr，提示为本次真因且不含上一次文案',
    /思考/.test(r.toast) && r.toast.indexOf('Failed to fetch') === -1, r.toast);

  /* 空正文（Anthropic 空串返回，不抛错）→ !result 分支补写真因（W6） */
  r = await genSum({ provider: 'anthropic', endpoint: 'https://api.anthropic.com/v1/messages', apiKey: 'sk-ant', model: 'claude-sonnet-4-6', id: 'an1' },
    [{ json: {} }]);
  ok('B9 Anthropic 空正文 → !result 补写真因（含「空内容」，不含默认文案）',
    r.result === null && /空内容/.test(r.toast) && r.toast.indexOf('未收到有效回复') === -1, r.toast);
  r = await genSum({ provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', apiKey: 'gk', model: 'gemini-2.0-flash', id: 'gm2' },
    [{ json: {} }]);
  ok('B9b Gemini 空正文 → !result 补写真因（含「空内容」，不含默认文案）',
    r.result === null && /空内容/.test(r.toast) && r.toast.indexOf('未收到有效回复') === -1, r.toast);

  /* 无 Key → 人话文案（P4） */
  r = await genSum({ provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', apiKey: '', model: 'gpt-4o-mini', id: 'nokey' }, [{ json: {} }]);
  ok('B10 无 Key → toast「没填 Key」人话文案且不发请求',
    r.result === null && /没填 Key/.test(r.toast) && sCalls.length === 0, r.toast);

  /* ── C. maybeSummarize 动态断言（并发 / 无料可摘） ── */
  const maybeSrc = takeBlock(outText, idx(outText, 'async function maybeSummarize(cfg,friendId,threadId,allMsgs){'));
  const sumKeepSrc = takeBlock(outText, idx(outText, 'async function _sumKeepD(ss,friendId){'));
  const doSumSrc = takeBlock(outText, idx(outText, 'async function _doSummarize(cfg,friendId,threadId,allMsgs){'));
  const mToasts = [];
  const ctxM = {
    toast: function (m) { mToasts.push(String(m)); },
    JSON: JSON, Date: Date, Math: Math,
    setTimeout: setTimeout, clearTimeout: clearTimeout, console: console
  };
  ctxM.window = ctxM;
  vm.createContext(ctxM);
  /* 注：_getSummaryTriggerCount 用 stub 压到 1，使 :16081 分支可达（默认 10 时 :16079 先返回） */
  vm.runInContext([
    'let _summarizing=false;const _sumFailCdD={};const SUMMARY_WINDOW_LIMITS={60:600,100:800,200:1200};',
    'async function getSummarySettings(){return {enabled:true,summaryScope:"default",keepCount:6,summaryWindow:60}}',
    'async function getChatSealTimestamp(){return 0}',
    'function filterSealed(a){return a}',
    'async function getChatSummary(){return null}',
    'function _getSummaryTriggerCount(){return 1}',
    maybeSrc, sumKeepSrc, doSumSrc
  ].join('\n'), ctxM);

  /* 无料可摘：窗口内有 1 条新料（<2）→ 提示「已是最新」，不再往下走 */
  const msgs = [1, 2, 3, 4, 5, 6, 7].map(i => ({ role: 'user', content: 'm' + i, timestamp: i }));
  {
    const n0 = mToasts.length;
    const r2 = await vm.runInContext('maybeSummarize({provider:"deepseek",apiKey:"k"},"f",null,' + JSON.stringify(msgs) + ')', ctxM);
    const got = mToasts.slice(n0).join('|');
    ok('C1 无料可摘（toSummarize<2）→ 提示「已是最新：暂时没有要补的内容」且返回 null',
      r2 === null && /已是最新/.test(got) && /暂时没有要补的内容/.test(got), got);
    ok('C1b 且未走到「正在整理对话记录」', got.indexOf('正在整理对话记录') === -1, got);
  }
  /* 并发早退：有一轮在跑 → 提示「正在整理中」，不进入执行体 */
  {
    await vm.runInContext('_summarizing=true', ctxM);
    const n0 = mToasts.length;
    const r1 = await vm.runInContext('maybeSummarize({},"f",null,[])', ctxM);
    const got = mToasts.slice(n0).join('|');
    ok('C2 并发早退 → 提示「摘要正在整理中，稍等十几秒再点一次」且返回 null',
      r1 === null && /摘要正在整理中/.test(got), got);
    const stillBusy = vm.runInContext('_summarizing', ctxM);
    ok('C2b 并发早退不进入 try/finally（_summarizing 保持 true）', stillBusy === true, '=_summarizing=' + stillBusy);
  }
  /* 摘要未启用 → 人话文案（P4；自动路径已前置检查 enabled，此分支属防御） */
  {
    await vm.runInContext('_summarizing=false', ctxM);
    await vm.runInContext('async function getSummarySettings(){return {enabled:false,keepCount:6,summaryScope:"default",summaryWindow:60}}', ctxM);
    const n0 = mToasts.length;
    const r3 = await vm.runInContext('maybeSummarize({provider:"deepseek",apiKey:"k"},"f",null,[])', ctxM);
    const got = mToasts.slice(n0).join('|');
    ok('D1 摘要未启用 → toast「对话摘要没有开启」且返回 null',
      r3 === null && /对话摘要没有开启/.test(got), got);
  }

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
