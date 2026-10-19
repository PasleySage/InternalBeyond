/* _driver.js —— 电脑端补丁流水线的唯一入口
 *
 * 用法：node _driver.js [--baseline <干净上游>] [--out <产物>] [--report <自检报告>] [--only p01] [--dry]
 *
 * 默认：
 *   baseline = baseline\InternalBeyond-<commit>.html（干净上游，永不被写）
 *   out      = out\InternalBeyond.patched.html
 *   report   = out\_自检报告.md
 *
 * 流程：读基线 → 按文件名顺序应用全部补丁清单 → 三层自检 → 全绿才写产物与报告。
 * 任一断言不过：不写产物、以非零码退出（与手机端 `_mk_mirror.js` 同一纪律）。
 *
 * 上游发版后：换新的基线副本 → 重跑 → 看哪条锚点报错（即需要重打锚点的地方）。
 */
const fs = require('fs'), path = require('path');
const E = require('./_engine.js');

const HERE = __dirname;
const DEF = {
  baseline: path.join(HERE, 'baseline', 'InternalBeyond-b0d7919d.html'),
  out: path.join(HERE, 'out', 'InternalBeyond.patched.html'),
  report: path.join(HERE, 'out', '_自检报告.md')
};

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return (i !== -1 && process.argv[i + 1]) ? process.argv[i + 1] : def;
}
const has = n => process.argv.indexOf('--' + n) !== -1;

const baseline = arg('baseline', DEF.baseline);
const outPath = arg('out', DEF.out);
const reportPath = arg('report', DEF.report);
const only = arg('only', null);
const dry = has('dry');

/* 补丁清单：pNN-*.js，按文件名排序（编号即应用顺序，跨集依赖靠编号表达） */
const specs = fs.readdirSync(HERE)
  .filter(f => /^p\d+-.*\.js$/.test(f))
  .filter(f => !only || f.indexOf(only) === 0)
  .sort()
  .map(f => { const s = E.loadSpec(path.join(HERE, f)); s.__file = f; return s; });

if (!specs.length) { console.error('✗ 没有可应用的补丁清单'); process.exit(2); }
if (!fs.existsSync(baseline)) { console.error('✗ 基线不存在：' + baseline); process.exit(2); }

const raw = fs.readFileSync(baseline, 'utf8');
const rawSha = E.sha256(Buffer.from(raw, 'utf8'));
const up = specs[0].upstream || {};
const baseOk = !up.sha256 || rawSha === up.sha256;

console.log('== 电脑端补丁流水线 ==');
console.log('基线  ' + path.basename(baseline));
console.log('  ' + Buffer.byteLength(raw, 'utf8') + ' 字节  sha256 ' + rawSha.slice(0, 16) + '…');
console.log('  清单记录的上游：' + (up.repo || '?') + ' @ ' + (up.commit || '?') + ' —— ' + (baseOk ? '一致 ✓' : '⚠ 不一致（上游可能已发版，锚点需重打）'));
console.log('补丁集 ' + specs.map(s => s.id + '(' + s.__file + ')').join(' → '));

let rep;
try {
  rep = E.runChain(specs, raw);
} catch (e) {
  console.error('\n✗ ' + ((e && e.message) || e));
  console.error('（未写产物）');
  process.exit(1);
}

rep.sets.forEach(function (s) {
  console.log('\n· ' + s.id + ' 「' + s.about + '」' + s.hits.length + ' 处');
  s.hits.forEach(h => console.log('    ' + h[0] + ' → 命中 ' + h[1]));
});
console.log('\n== 自检 ==');
rep.layers.forEach(l => console.log('  [' + (l.ok ? '✓' : '✗') + '] ' + l.name + ' —— ' + l.detail.join('；')));
console.log('\n产物 ' + rep.bytes + ' 字节（基线 ' + rep.rawBytes + '，+' + (rep.bytes - rep.rawBytes) + '）sha256 ' + rep.sha256.slice(0, 16) + '…');

if (!rep.ok) {
  console.error('\n✗ 自检未通过，未写产物：');
  rep.errors.forEach(e => console.error('  · ' + e));
  process.exit(1);
}

/* 自检报告（md） */
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' +
  pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
const L = [];
L.push('# 电脑端补丁 · 自检报告');
L.push('');
L.push('- 生成时间：' + stamp + '（本机时区）');
L.push('- 基线：`' + path.basename(baseline) + '`（' + Buffer.byteLength(raw, 'utf8') + ' 字节，sha256 `' + rawSha.slice(0, 16) + '…`）');
L.push('- 清单记录的上游：' + (up.repo || '?') + ' @ ' + (up.commit || '?') + ' —— ' + (baseOk ? '一致' : '**不一致**：上游可能已发版，锚点需重打'));
L.push('- 补丁集：' + specs.map(s => s.id + '（' + s.about + '）').join(' → '));
L.push('- 产物：`' + path.basename(outPath) + '`（' + rep.bytes + ' 字节，sha256 `' + rep.sha256.slice(0, 16) + '…`）');
L.push('');
L.push('## 一、三层自检');
L.push('');
L.push('| 层 | 结果 | 说明 |');
L.push('|---|---|---|');
rep.layers.forEach(l => L.push('| ' + l.name + ' | ' + (l.ok ? '✓ 通过' : '✗ 未过') + ' | ' + l.detail.join('；') + ' |'));
L.push('');
L.push('## 二、锚点命中明细');
L.push('');
rep.sets.forEach(function (s) {
  L.push('### ' + s.id + ' · ' + s.about + '（' + s.hits.length + ' 处）');
  L.push('');
  s.hits.forEach(h => L.push('- ' + h[0] + ' → 命中 ' + h[1]));
  L.push('');
});
L.push('## 三、人工验收清单');
L.push('');
specs.forEach(function (s) {
  if (!s.accept || !s.accept.length) return;
  L.push('### ' + s.id + ' · ' + s.about);
  L.push('');
  L.push('| 改了什么 | 点哪里 | 期望看到什么 | 出问题怎么回滚 |');
  L.push('|---|---|---|---|');
  s.accept.forEach(a => L.push('| ' + a[0] + ' | ' + a[1] + ' | ' + a[2] + ' | ' + a[3] + ' |'));
  L.push('');
});
L.push('> 本表同时固化在 `_patches\\README.md`（补丁台账）。真机确认由人在浏览器里做：');
L.push('> 流水线负责「结构上没坏」，人负责「用起来对」。');
L.push('');

if (!dry) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rep.text, 'utf8');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, L.join('\n'), 'utf8');
  console.log('\nOK 写入产物 ' + outPath);
  console.log('OK 写入报告 ' + reportPath);
} else {
  console.log('\n（--dry：未写文件）');
}
