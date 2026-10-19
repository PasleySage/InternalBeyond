/* _engine.js —— 电脑端「锚点补丁」引擎（不依赖行号，供上游每次发版后重放）
 *
 * 先例（prior art）：手机端 `Android\_patch_engine.js`。本文件是电脑端线的独立副本 ——
 * 两条线分属两个仓库（`Sui-IB/InternalBeyond-Mobile` / `Sui-IB/InternalBeyond`），
 * 补丁与基线互不共享，故不跨线 require：一条线动自己的引擎，不会波及另一条。
 * 两份的核心语义（锚点命中数 / expectCount / script 块语法）保持一致，改动任一份时请对照另一份。
 *
 * 用法：由 `_driver.js` 调用；也可单独跑 —— node _engine.js <清单.js> <基线> [输出]
 *
 * 清单（一个 CommonJS 模块）：
 *   module.exports = {
 *     id:'p01', about:'连接测试',
 *     upstream:{repo, commit, bytes, sha256},
 *     expectCount:2,                          // 本集共有几个 patch（引擎核对，写错即报错）
 *     guards:['…'],                           // 原有锚点：产物里必须还在（补丁不得改坏）
 *     adds:['…'],                             // 新增锚点：产物里必须出现
 *     patches:[ {label, old, new, expect?} ]
 *   }
 *
 * 断言（任一不过都**不写产物**、以非零码退出）：
 *   ① 每处锚点命中数必须等于 expect（默认 1）—— 上游改动过这里，停下人工看。
 *   ② expectCount 必须等于 patches 的实际个数。
 *   ③ 产物的 script 块语法必须可解析，且坏块数不超过原文。
 *   ④ HTML 结构：以 </html> 收尾；script / div / button / span / textarea / select
 *      的开闭差值与原文一致（允许基线本身不平衡，比较的是差值）。
 *   ⑤ guards 全部仍在、adds 全部已出现。
 *
 * 设计：清单是数据、引擎是代码 —— 新增补丁只写清单，不动这里。
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

/* ④ 参与开闭平衡核对的标签 */
const BALANCE_TAGS = ['script', 'div', 'button', 'span', 'textarea', 'select'];

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function countOf(text, re) { const m = text.match(re); return m ? m.length : 0; }

/* ① 锚点替换：不依赖行号，靠唯一字符串定位 */
function applyPatches(srcText, patches) {
  const EOL = /\r\n/.test(srcText) ? '\r\n' : '\n';
  let s = srcText; const hits = [];
  (patches || []).forEach(function (p) {
    const rx = new RegExp(esc(p.old).split('\n').join('\\r?\\n'), 'g');
    const n = (s.match(rx) || []).length;
    const want = (p.expect == null ? 1 : p.expect);
    hits.push([p.label, n]);
    if (n !== want) throw new Error('锚点「' + p.label + '」命中 ' + n + ' 次（应为 ' + want + '）——上游改动过这里，停止生成');
    s = s.replace(rx, function () { return p.new.split('\n').join(EOL); });
  });
  return { text: s, hits: hits, EOL: EOL };
}

/* ③ 逐个数 script 块，返回"编译不过"的那些（含序号与原因） */
function badBlocks(text) {
  const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
  const bad = []; let m, i = 0;
  while ((m = re.exec(text))) {
    try { new vm.Script(m[1]); } catch (e) { bad.push('#' + i + ' ' + e.message); }
    i++;
  }
  return bad;
}

/* ④ 标签开闭平衡：返回 {tag: 开-闭}。自闭合与 void 元素不计，故只做差值比较 */
function tagBalance(text, tags) {
  const out = {};
  (tags || BALANCE_TAGS).forEach(function (t) {
    const open = countOf(text, new RegExp('<' + t + '(?=[\\s>])', 'gi'));
    const close = countOf(text, new RegExp('</' + t + '\\s*>', 'gi'));
    out[t] = open - close;
  });
  return out;
}

function checkHtml(rawText, outText, tags) {
  const errs = [];
  if (!/<\/html\s*>\s*$/.test(outText)) errs.push('产物不是以 </html> 收尾');
  if (!/<html[\s>]/i.test(outText)) errs.push('产物里找不到 <html> 开标签');
  const tags2 = tags || BALANCE_TAGS;
  const b = tagBalance(rawText, tags2), o = tagBalance(outText, tags2);
  tags2.forEach(function (t) {
    if (b[t] !== o[t]) errs.push('标签 <' + t + '> 开闭差值变了：原文 ' + b[t] + ' → 产物 ' + o[t]);
  });
  return errs;
}

/* ② 清单自洽 */
function assertSpec(spec) {
  if (spec.expectCount != null && (spec.patches || []).length !== spec.expectCount)
    throw new Error('清单 ' + (spec.id || '?') + '：expectCount 写的是 ' + spec.expectCount + '，实际有 ' + (spec.patches || []).length + ' 个 patch —— 两者必须一致');
}

/* ⑤ 锚点核对（原有仍在 / 新增已出现） */
function checkAnchors(outText, spec) {
  const errs = [];
  (spec.guards || []).forEach(function (g) {
    if (outText.indexOf(g) === -1) errs.push('原有锚点丢失：' + g.slice(0, 60));
  });
  (spec.adds || []).forEach(function (a) {
    if (outText.indexOf(a) === -1) errs.push('新增锚点未出现：' + a.slice(0, 60));
  });
  return errs;
}

/* 一条链的全部断言：基线 → 逐集应用 → 三层自检。返回报告对象，不写文件 */
function runChain(specs, rawText, opt) {
  opt = opt || {};
  let text = rawText; const report = { sets: [], hits: 0, errors: [] };
  specs.forEach(function (sp) {
    assertSpec(sp);
    const r = applyPatches(text, sp.patches);
    text = r.text; report.hits += r.hits.length;
    report.sets.push({ id: sp.id, about: sp.about, hits: r.hits, errors: checkAnchors(text, sp) });
  });

  /* 层一：HTML 结构完整 */
  const htmlErrs = checkHtml(rawText, text);
  /* 层二：JS 语法可解析 */
  const base = badBlocks(rawText), out = badBlocks(text);
  if (out.length > base.length) htmlErrs.push('产物比原文多了 ' + (out.length - base.length) + ' 个语法不合法的 script 块：' + out.join(' / '));
  /* 层三：锚点核对 */
  const anchorErrs = [];
  report.sets.forEach(function (s) { s.errors.forEach(function (e) { anchorErrs.push('[' + s.id + '] ' + e); }); });

  report.layers = [
    { name: 'HTML 结构完整', ok: htmlErrs.length === 0, detail: htmlErrs.length ? htmlErrs : ['以 </html> 收尾；' + BALANCE_TAGS.join('/') + ' 开闭差值与原文一致'] },
    { name: 'JS 语法可解析', ok: out.length <= base.length, detail: ['坏块 ' + out.length + ' 个（原文 ' + base.length + ' 个）'] },
    { name: '新增/原有锚点核对', ok: anchorErrs.length === 0, detail: anchorErrs.length ? anchorErrs : ['guards 全在、adds 全出现'] }
  ];
  report.errors = htmlErrs.concat(anchorErrs);
  report.ok = report.errors.length === 0;
  report.text = text;
  report.bytes = Buffer.byteLength(text, 'utf8');
  report.rawBytes = Buffer.byteLength(rawText, 'utf8');
  report.sha256 = sha256(Buffer.from(text, 'utf8'));
  return report;
}

function loadSpec(p) { return require(path.resolve(p)); }

module.exports = {
  applyPatches: applyPatches, badBlocks: badBlocks, tagBalance: tagBalance,
  checkHtml: checkHtml, checkAnchors: checkAnchors, runChain: runChain,
  loadSpec: loadSpec, sha256: sha256, BALANCE_TAGS: BALANCE_TAGS
};

/* 单集重放（调试用）：node _engine.js <清单.js> <基线> [输出] */
if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.length < 2) { console.error('用法：node _engine.js <清单.js> <基线文件> [输出文件]'); process.exit(2); }
  try {
    const raw = fs.readFileSync(argv[1], 'utf8');
    const rep = runChain([loadSpec(argv[0])], raw);
    if (!rep.ok) { console.error('✗ ' + rep.errors.join('\n✗ ')); process.exit(1); }
    if (argv[2]) fs.writeFileSync(argv[2], rep.text, 'utf8');
    console.log('OK（' + rep.sha256.slice(0, 16) + '… ' + rep.bytes + ' 字节）' + (argv[2] ? ' → ' + argv[2] : '（未写文件）'));
  } catch (e) { console.error('✗ ' + ((e && e.message) || e)); process.exit(1); }
}
