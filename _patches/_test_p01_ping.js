/* _test_p01_ping.js —— P01 连接测试的断言式回归测试（逻辑层，不发真实请求）
 *
 * 跑法：node _test_p01_ping.js [产物.html]
 *       不传路径时，用 `out\InternalBeyond.patched.html`；再没有就在内存里从基线重打一遍。
 *
 * 做法：从产物文本里**原样抽出**探活函数的源码，连同基线里的 PROVIDERS / _epTidy / _cfgFmt
 * 一起放进 vm，配一套假 DOM 与假 fetch，按响应逐个断言。
 * 测的是外部可观察行为：按钮文案与结果区三态（成功文案 / 失败分类），
 * 以及"请求本身是不是最小"（不带上系统提示词、不重复发、不带多余字段）。
 * 内部函数名与结构一律不作断言。
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
let outText;
if (process.argv[2]) outText = fs.readFileSync(process.argv[2], 'utf8');
else if (fs.existsSync(DEF_OUT)) outText = fs.readFileSync(DEF_OUT, 'utf8');
else outText = E.runChain([require('./p01-连接测试.js')], baseText).text;

/* 从 startIdx 起按花括号配对取出一个函数/对象定义 */
function takeBlock(text, startIdx) {
  let i = text.indexOf('{', startIdx), d = 0;
  for (; i < text.length; i++) {
    if (text[i] === '{') d++;
    else if (text[i] === '}') { d--; if (!d) return text.slice(startIdx, i + 1); }
  }
  throw new Error('取块失败：花括号未配平');
}
const providersSrc = takeBlock(baseText, baseText.indexOf('const PROVIDERS={'));
const epTidySrc = takeBlock(baseText, baseText.indexOf('function _epTidy(s){'));
const cfgFmtSrc = takeBlock(baseText, baseText.indexOf('function _cfgFmt(cfg){'));
const tokMemSrc = takeBlock(baseText, baseText.indexOf('var _tokParamMem={'));
const tokKeySrc = takeBlock(baseText, baseText.indexOf('function _tokParamKey(cfg){'));
const tokGetSrc = takeBlock(baseText, baseText.indexOf('function _tokParamGet(cfg){'));
const pingSrc = outText.slice(outText.indexOf('function _pingFormCfg(){'), outText.indexOf('async function saveCurrentApi(){'));
if (!/apiTestConnection/.test(pingSrc)) { console.error('✗ 产物里没找到探活函数源码'); process.exit(1); }

/* ── 假 DOM / 假 fetch ── */
const els = {};
function el(id) { if (!els[id]) els[id] = { id: id, value: '', textContent: '', disabled: false, style: {} }; return els[id]; }
function setForm(o) {
  ['api-provider', 'api-endpoint', 'api-key', 'api-model'].forEach(k => { el(k).value = o[k] || ''; });
  el('api-ping-result').textContent = ''; el('api-ping-result').style = {};
  el('api-ping-btn').textContent = '测试连接'; el('api-ping-btn').disabled = false;
}
let calls = [], plan = [];
async function fakeFetch(url, opt) {
  calls.push({ url: url, headers: opt.headers || {}, body: opt.body });
  const p = plan.length > 1 ? plan.shift() : plan[0];
  if (p.throwAbort) { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }
  if (p.throwNet) { throw new TypeError('Failed to fetch'); }
  return {
    ok: p.status >= 200 && p.status < 300, status: p.status,
    headers: { get: () => (p.ct || 'application/json') },
    text: async () => (p.body || '')
  };
}
const ctx = {
  document: { getElementById: id => els[id] || null },
  fetch: fakeFetch, JSON: JSON, Date: Date, setTimeout: setTimeout, clearTimeout: clearTimeout,
  AbortController: AbortController, console: console, URL: URL
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(providersSrc + '\n' + epTidySrc + '\n' + cfgFmtSrc + '\n' + tokMemSrc + '\n' + tokKeySrc + '\n' + tokGetSrc + '\n' + pingSrc, ctx);

const run = async (form, planIn) => {
  setForm(form); calls = []; plan = Array.isArray(planIn) ? planIn.slice() : [planIn];
  await vm.runInContext('apiTestConnection()', ctx);
  return { txt: el('api-ping-result').textContent, btn: el('api-ping-btn').textContent, disabled: el('api-ping-btn').disabled };
};
const OPENAI = { 'api-provider': 'openai', 'api-endpoint': 'https://api.openai.com/v1/chat/completions', 'api-key': 'sk-test', 'api-model': 'gpt-4o-mini' };
const okJson = JSON.stringify({ choices: [{ message: { content: 'hi' } }] });

console.log('== P01 连接测试（逻辑层，假 fetch）==');

(async function () {
  /* 缺字段：不发请求 */
  let r = await run({ 'api-provider': 'openai', 'api-endpoint': 'https://x/v1/chat/completions', 'api-key': '', 'api-model': 'm' }, { status: 200, body: okJson });
  ok('未填 Key → 提示「密钥」且不发请求', /密钥/.test(r.txt) && calls.length === 0, r.txt);
  r = await run({ 'api-provider': 'openai', 'api-endpoint': '', 'api-key': 'sk', 'api-model': 'm' }, { status: 200, body: okJson });
  ok('未填地址 → 提示「地址」且不发请求', /地址/.test(r.txt) && calls.length === 0, r.txt);
  r = await run({ 'api-provider': 'openai', 'api-endpoint': 'https://x/v1/chat/completions', 'api-key': 'sk', 'api-model': '' }, { status: 200, body: okJson });
  ok('未填模型 → 提示「模型名」且不发请求', /模型名/.test(r.txt) && calls.length === 0, r.txt);

  /* 通（两级：L1 + L2） */
  const l2ok = JSON.stringify({ choices: [{ message: { content: 'ok' } }] });
  r = await run(OPENAI, [
    { status: 200, body: okJson },
    { status: 200, body: l2ok }
  ]);
  ok('通：结果以 ✓ 通道：开头并含对话行', /^✓ 通道：/.test(r.txt) && /对话：/.test(r.txt), r.txt);
  ok('通：按钮恢复可点', r.disabled === false && r.btn === '测试连接');
  ok('L1+L2 共发两次请求', calls.length === 2, '发了 ' + calls.length + ' 次');
  let b1 = JSON.parse(calls[0].body);
  ok('L1：单条 user、content=ping、无 system', b1.messages.length === 1 && b1.messages[0].role === 'user' && b1.messages[0].content === 'ping' && !JSON.stringify(b1).includes('"system"'), JSON.stringify(b1));
  ok('L1：输出上限 16', b1.max_tokens === 16, JSON.stringify(b1));
  ok('L1 带密钥请求头', calls[0].headers['Authorization'] === 'Bearer sk-test');
  let b2 = JSON.parse(calls[1].body);
  ok('L2：单条 user、content=请回复：ok、无 system/tools', b2.messages.length === 1 && b2.messages[0].role === 'user' && b2.messages[0].content === '请回复：ok' && !JSON.stringify(b2).includes('"system"') && !JSON.stringify(b2).includes('"tools"'), JSON.stringify(b2));
  ok('L2：输出上限 32', b2.max_tokens === 32, JSON.stringify(b2));
  ok('L2 成功行带回复片段', /✓ 对话：ok ·/.test(r.txt), r.txt);

  /* L1 失败分类（不发 L2，请求数=1，✗ 通道：开头） */
  r = await run(OPENAI, { status: 401, body: JSON.stringify({ error: { message: 'invalid api key' } }) });
  ok('401 → 密钥（L1 失败，不发 L2）', /^✗ 通道：密钥/.test(r.txt) && calls.length === 1, r.txt);
  r = await run(OPENAI, { status: 429, body: '' });
  ok('429 → 请求（限流/额度）', /^✗ 通道：请求/.test(r.txt) && calls.length === 1, r.txt);
  r = await run(OPENAI, { status: 500, body: 'server error' });
  ok('5xx → 其它', /^✗ 通道：其它/.test(r.txt) && calls.length === 1, r.txt);
  r = await run(OPENAI, { status: 404, body: JSON.stringify({ error: { message: 'The model gpt-9 does not exist' } }) });
  ok('404 且正文提到 model → 模型名', /^✗ 通道：模型名/.test(r.txt) && calls.length === 1, r.txt);
  r = await run(OPENAI, { status: 404, body: 'Not Found' });
  ok('404 未提 model → 地址', /^✗ 通道：地址/.test(r.txt) && calls.length === 1, r.txt);
  r = await run(OPENAI, { status: 200, body: '<html><body>hi</body></html>', ct: 'text/html' });
  ok('返回网页 → 地址', /^✗ 通道：地址/.test(r.txt) && /网页/.test(r.txt) && calls.length === 1, r.txt);
  r = await run(OPENAI, { throwAbort: true });
  ok('超时 → 超时', /^✗ 通道：超时/.test(r.txt) && calls.length === 1, r.txt);
  r = await run(OPENAI, { throwNet: true });
  ok('网络失败 → 地址（含跨域提示）', /^✗ 通道：地址/.test(r.txt) && /跨域/.test(r.txt) && calls.length === 1, r.txt);

  /* L1 400 max_tokens 重试 → L1 重试成功后仍发 L2（共 3 次） */
  r = await run(OPENAI, [
    { status: 400, body: JSON.stringify({ error: { message: "Invalid 'max_tokens': unsupported" } }) },
    { status: 200, body: okJson },
    { status: 200, body: l2ok }
  ]);
  ok('L1 400 提到 max_tokens → 改 max_completion_tokens 重试后连通（共 3 次）',
    calls.length === 3 && /max_completion_tokens/.test(calls[1].body) && !/max_tokens/.test(calls[1].body) && /^✓ 通道：/.test(r.txt) && /对话：/.test(r.txt),
    r.txt + ' / 请求 ' + calls.length + ' 次');
  r = await run(OPENAI, [
    { status: 400, body: JSON.stringify({ error: { message: "Invalid 'max_tokens': unsupported" } }) },
    { status: 400, body: JSON.stringify({ error: { message: 'still bad' } }) }
  ]);
  ok('L1 重试仍失败 → 归到「请求」，不发 L2',
    calls.length === 2 && /^✗ 通道：请求/.test(r.txt), r.txt);

  /* L2 失败：L1 通、L2 挂 —— 同时显示 ✓ 通道 与 ✗ 对话 */
  r = await run(OPENAI, [
    { status: 200, body: okJson },
    { status: 400, body: JSON.stringify({ error: { message: 'bad request' } }) }
  ]);
  ok('L1 通但 L2 400 → 同时有 ✓ 通道 和 ✗ 对话',
    /^✓ 通道：/.test(r.txt) && /✗ 对话：请求/.test(r.txt) && calls.length === 2, r.txt);
  r = await run(OPENAI, [
    { status: 200, body: okJson },
    { throwAbort: true }
  ]);
  ok('L1 通但 L2 超时 → ✗ 对话：超时',
    /✓ 通道：/.test(r.txt) && /✗ 对话：超时/.test(r.txt), r.txt);

  /* L2 400 max_tokens 重试 → L2 改 max_completion_tokens 后成功（共 3 次） */
  r = await run(OPENAI, [
    { status: 200, body: okJson },
    { status: 400, body: JSON.stringify({ error: { message: "Invalid 'max_tokens': unsupported" } }) },
    { status: 200, body: l2ok }
  ]);
  ok('L2 400 max_tokens → 改 max_completion_tokens 重试后连通（共 3 次）',
    calls.length === 3 && /max_completion_tokens/.test(calls[2].body) && /^✓ 通道：/.test(r.txt) && /✓ 对话：/.test(r.txt),
    r.txt + ' / 请求 ' + calls.length + ' 次');

  /* 另两种格式（两级都要 200） */
  const anthCfg = { 'api-provider': 'anthropic', 'api-endpoint': 'https://api.anthropic.com/v1/messages', 'api-key': 'sk-ant', 'api-model': 'claude-sonnet-4-6' };
  r = await run(anthCfg, [
    { status: 200, body: JSON.stringify({ content: [{ text: 'hi' }] }) },
    { status: 200, body: JSON.stringify({ content: [{ text: 'ok' }] }) }
  ]);
  ok('Anthropic 格式：x-api-key + anthropic-version 头',
    calls[0].headers['x-api-key'] === 'sk-ant' && calls[0].headers['anthropic-version'] === '2023-06-01' && /^✓ 通道：/.test(r.txt), r.txt);
  let abL1 = JSON.parse(calls[0].body);
  ok('Anthropic L1：max_tokens=16、content=ping', abL1.max_tokens === 16 && abL1.messages[0].content === 'ping', JSON.stringify(abL1));
  let abL2 = JSON.parse(calls[1].body);
  ok('Anthropic L2：max_tokens=32、content=请回复：ok', abL2.max_tokens === 32 && abL2.messages[0].content === '请回复：ok', JSON.stringify(abL2));
  const gemCfg = { 'api-provider': 'gemini', 'api-endpoint': 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', 'api-key': 'gk', 'api-model': 'gemini-2.0-flash' };
  r = await run(gemCfg, [
    { status: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'hi' }] } }] }) },
    { status: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) }
  ]);
  ok('Gemini 格式：模型名进 URL、密钥进 query',
    /gemini-2\.0-flash:generateContent\?key=gk/.test(calls[0].url) && /^✓ 通道：/.test(r.txt), calls[0].url + ' / ' + r.txt);
  let gbL1 = JSON.parse(calls[0].body);
  ok('Gemini L1：maxOutputTokens=16、text=ping', gbL1.generationConfig.maxOutputTokens === 16 && gbL1.contents[0].parts[0].text === 'ping', JSON.stringify(gbL1));
  let gbL2 = JSON.parse(calls[1].body);
  ok('Gemini L2：maxOutputTokens=32、text=请回复：ok', gbL2.generationConfig.maxOutputTokens === 32 && gbL2.contents[0].parts[0].text === '请回复：ok', JSON.stringify(gbL2));

  /* L1：200 但不是回复结构 → 明确提示，不发 L2 */
  r = await run(OPENAI, { status: 200, body: JSON.stringify({ ok: true }) });
  ok('L1：200 但结构不可识别 → 明确提示，不发 L2', /^✗ 通道：其它/.test(r.txt) && calls.length === 1, r.txt);

  /* 静态：外层 catch 归「其它」（请求未能发出） */
  ok('静态：外层 catch 归「其它」而非「地址」', pingSrc.indexOf('其它：请求未能发出') !== -1, '探活源码未含「其它：请求未能发出」');

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})();
