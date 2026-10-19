/* _test_p10_api_diag.js —— P10 接口诊断的逻辑层 + 静态断言
 *
 * 跑法：node _test_p10_api_diag.js [产物.html]
 *       不传路径时，用 `out\InternalBeyond.patched.html`；再没有就在内存里从基线 + p10 清单重打。
 *
 * 做法：从产物文本里原样抽出 `function _apiDiagText(e){…}`，放进 vm 跑断言。
 * 测的是外部可观察行为：各类错误映射出的人话类别词 + 状态码；外加静态锚点与不含密钥的安全断言。
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
else outText = E.runChain([require('./p10-接口诊断与请求优化.js')], baseText).text;
/* out 可能是未含 p10 的旧产物（自测阶段只跑 --dry 不写产物）：若里面没有本集函数，回退到内存重打 */
if (outText.indexOf('function _apiDiagText(e){') === -1) outText = E.runChain([require('./p10-接口诊断与请求优化.js')], baseText).text;

/* 从 startIdx 起按花括号配对取出一个函数定义 */
function takeBlock(text, startIdx) {
  let i = text.indexOf('{', startIdx), d = 0;
  for (; i < text.length; i++) {
    if (text[i] === '{') d++;
    else if (text[i] === '}') { d--; if (!d) return text.slice(startIdx, i + 1); }
  }
  throw new Error('取块失败：花括号未配平');
}

const fnStart = outText.indexOf('function _apiDiagText(e){');
if (fnStart === -1) { console.error('✗ 产物里没找到 function _apiDiagText(e){'); process.exit(1); }
const fnSrc = takeBlock(outText, fnStart);

/* ── vm 上下文：只需基础全局 ── */
const ctx = { JSON: JSON, console: console, RegExp: RegExp, Error: Error, TypeError: TypeError, String: String, parseInt: parseInt };
vm.createContext(ctx);
vm.runInContext(fnSrc, ctx);
const diag = (e) => { ctx.__e = e; return vm.runInContext('_apiDiagText(__e)', ctx); };

console.log('== P10 接口诊断（逻辑层 + 静态断言）==');

/* ── 逻辑断言 ── */
let t;
t = diag(new Error('401: Unauthorized'));
ok('401 → 含「密钥」与 401', /密钥/.test(t) && /401/.test(t), t);

t = diag(new Error('404: {"error":{"message":"model not found"}}'));
ok('404 提 model → 含「模型名」', /模型名/.test(t), t);

t = diag(new Error('404: Not Found'));
ok('404 不提 model → 含「地址」', /地址/.test(t), t);

t = diag(new Error('400: {"error":{"message":"Invalid max_tokens parameter"}}'));
ok('400 max_tokens → 含「参数被拒」与「输出上限」', /参数被拒/.test(t) && /输出上限/.test(t), t);

t = diag(new Error('400: {"error":{"message":"tools is not supported"}}'));
ok('400 tools → 含「参数被拒」与「tools」', /参数被拒/.test(t) && /tools/.test(t), t);

t = diag(new Error('429: rate limited'));
ok('429 → 含「限流」或 429', /限流/.test(t) || /429/.test(t), t);

t = diag(new Error('请求超时（120秒），请检查网络连接或API服务状态'));
ok('超时文案 → 含「超时」', /超时/.test(t), t);

t = diag(new TypeError('Failed to fetch'));
ok('网络失败 → 含「地址」或「跨域」', /地址/.test(t) || /跨域/.test(t), t);

t = diag(new Error('接口返回空文本（HTTP 200）——响应里没有可用正文'));
ok('空文本 → 含「空文本」', /空文本/.test(t), t);

t = diag(new Error('500: Internal Server Error'));
ok('5xx → 含「服务端错误」或 500', /服务端错误/.test(t) || /500/.test(t), t);

t = diag(new Error('some weird error'));
ok('兜底 → 含「其它」', /其它/.test(t), t);

/* ── 静态锚点断言 ── */
ok('静态：产物含 120000（超时默认值）', outText.indexOf('120000') !== -1);
ok('静态：产物含「仅有思考字段」', outText.indexOf('仅有思考字段') !== -1);
ok('静态：产物含 content 数组拼接逻辑（含裸字符串兼容）', outText.indexOf('Array.isArray(_ctx)') !== -1 && outText.indexOf('typeof pp===\'string\'') !== -1);
ok('静态：产物含 _apiDiagText 函数定义', outText.indexOf('function _apiDiagText(e){') !== -1);
ok('静态：聊天面 catch 接了 _apiDiagText(err)', outText.indexOf('_apiDiagText(err)') !== -1);
ok('静态：聊天面 console.warn 带 [ib-api] 聊天请求失败', outText.indexOf('[ib-api] 聊天请求失败') !== -1);

/* ── 安全断言：函数源码不引入密钥 ── */
ok('安全：函数源码不含 apiKey', !/apiKey/.test(fnSrc));
ok('安全：函数源码不含 Authorization', !/Authorization/.test(fnSrc));
ok('安全：函数源码不含 Bearer', !/Bearer/.test(fnSrc));

/* 函数是纯函数：不改传入 error 的 message */
const e = new Error('401: Unauthorized');
const before = e.message;
diag(e);
ok('安全：不改写原始 error.message', e.message === before, e.message);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
