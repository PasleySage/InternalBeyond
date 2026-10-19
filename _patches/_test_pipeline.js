/* _test_pipeline.js —— 补丁流水线自身的断言式回归测试
 *
 * 跑法：node _test_pipeline.js
 *
 * 测的是「自检会不会真的报错」—— 否则流水线永远全绿，等于没检。
 * 每条用例都是**故意埋的错**，期望引擎/驱动抓出来；另外验证失败时不写产物。
 * 不跑真机、不发请求，只读基线文本在内存里做替换。
 *
 * 用例（对应 _engine.js 的 ①–⑤ 断言）：
 *   A 锚点不存在        → 抛「命中 0 次」
 *   B 锚点命中多次      → 抛「命中 N 次」
 *   C expectCount 不符  → 抛「两者必须一致」
 *   D 产物新增坏 script → 层二不过
 *   E 产物丢 </html>    → 层一不过
 *   F guards 丢失       → 层三不过
 *   G adds 未出现       → 层三不过
 *   H 正常补丁          → 全绿（sanity）
 *   I 驱动失败时不写产物 → 退出码非 0 且产物不存在
 */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const E = require('./_engine.js');

const HERE = __dirname;
const BASE = path.join(HERE, 'baseline', 'InternalBeyond-f8955fd1.html');
const raw = fs.readFileSync(BASE, 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' —— ' + extra : '')); }
}
function throws(name, fn, wantRe) {
  let msg = '';
  try { fn(); } catch (e) { msg = String((e && e.message) || e); }
  ok(name, wantRe.test(msg), msg ? ('实际抛出：' + msg.slice(0, 90)) : '没有抛出');
}
/* 一个能唯一命中的真锚点，借用 p01 的第一处 */
const REAL = require('./p01-连接测试.js');
const anchor = REAL.patches[0].old;
function spec(o) {
  return Object.assign({ id: 't', about: 'test', expectCount: 1, guards: [], adds: [], patches: [] }, o);
}

console.log('== 补丁流水线自检（反向验证）==');

/* A 锚点不存在 */
throws('A 锚点不存在 → 报错停下',
  () => E.runChain([spec({ patches: [{ label: 'x', old: '__绝不存在的锚点__', new: 'y' }] })], raw),
  /命中 0 次/);

/* B 锚点命中多次 */
throws('B 锚点命中多次 → 报错停下',
  () => E.runChain([spec({ patches: [{ label: 'x', old: 'function ', new: 'y' }] })], raw),
  /命中 \d+ 次/);

/* C expectCount 与实际不符 */
throws('C expectCount 不符 → 报错停下',
  () => E.runChain([spec({ expectCount: 9, patches: [{ label: 'x', old: anchor, new: anchor }] })], raw),
  /两者必须一致/);

/* D 产物新增一个语法不合法的 script 块 */
{
  const r = E.runChain([spec({
    patches: [{ label: 'x', old: anchor, new: anchor + '\n<script>function __broken({{{</script>' }]
  })], raw);
  ok('D 新增坏 script 块 → 层二不过', r.layers[1].ok === false && r.ok === false,
    r.layers[1].detail.join('；'));
}

/* E 产物丢掉 </html>（基线里 </html> 不止一处 —— 用实际命中数当 expect，全部去掉） */
{
  const nHtml = (raw.match(/<\/html>/g) || []).length;
  const r = E.runChain([spec({
    patches: [{ label: 'x', old: '</html>', new: '', expect: nHtml }]
  })], raw);
  ok('E 丢掉 </html>（' + nHtml + ' 处）→ 层一不过', r.layers[0].ok === false && r.ok === false, r.layers[0].detail.join('；'));
}

/* F guards 丢失 */
{
  const r = E.runChain([spec({
    guards: ['__绝不存在的原有锚点__'], patches: [{ label: 'x', old: anchor, new: anchor }]
  })], raw);
  ok('F 原有锚点丢失 → 层三不过', r.layers[2].ok === false && r.ok === false, r.layers[2].detail.join('；'));
}

/* G adds 未出现 */
{
  const r = E.runChain([spec({
    adds: ['__绝不会出现的新增锚点__'], patches: [{ label: 'x', old: anchor, new: anchor }]
  })], raw);
  ok('G 新增锚点未出现 → 层三不过', r.layers[2].ok === false && r.ok === false, r.layers[2].detail.join('；'));
}

/* H 正常补丁（p01 全集）应当全绿 */
{
  const r = E.runChain([REAL], raw);
  ok('H 应用 p01 全集 → 三层全绿', r.ok === true, r.errors.join('；'));
  ok('H 产物比基线大（纯增量）', r.bytes > r.rawBytes, r.bytes + ' vs ' + r.rawBytes);
  ok('H 五个 guards 全在', (REAL.guards || []).every(g => r.text.indexOf(g) !== -1));
  ok('H 四个 adds 全出现', (REAL.adds || []).every(a => r.text.indexOf(a) !== -1));
}

/* I 驱动失败时不写产物 */
{
  const tmpSpec = path.join(HERE, 'p99-绝不命中.js');
  const tmpOut = path.join(HERE, 'out', '_tmp_should_not_exist.html');
  fs.writeFileSync(tmpSpec,
    'module.exports={id:"p99",about:"故意埋错",expectCount:1,guards:[],adds:[],' +
    'patches:[{label:"x",old:"__绝不存在的锚点__",new:"y"}]};\n', 'utf8');
  try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
  let code = 0;
  try {
    cp.execFileSync(process.execPath, [path.join(HERE, '_driver.js'), '--only', 'p99', '--out', tmpOut,
      '--report', path.join(HERE, 'out', '_tmp_should_not_exist.md')], { stdio: 'pipe' });
  } catch (e) { code = (e && e.status) || 1; }
  let exists = false; try { exists = fs.existsSync(tmpOut); } catch (e) {}
  try { fs.unlinkSync(tmpSpec); } catch (e) {}
  try { if (exists) fs.unlinkSync(tmpOut); } catch (e) {}
  ok('I 驱动失败 → 非零退出', code !== 0, '退出码 ' + code);
  ok('I 驱动失败 → 未写产物', exists === false);
}

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
