/* 变更一览 HTML 结构自检：标签配平、无 Markdown 泄漏、必填区块齐全 */
const fs = require('fs');
const P = process.argv[2];
const h = fs.readFileSync(P, 'utf8');
const c = (re) => (h.match(re) || []).length;
const out = [];
const eq = (n, a, b) => out.push('  ' + (a === b ? 'PASS' : 'FAIL') + '  ' + n + '  ' + a + ' vs ' + b);
const ge = (n, a, b) => out.push('  ' + (a >= b ? 'PASS' : 'FAIL') + '  ' + n + '  ' + a + '（应 ≥ ' + b + '）');
eq('<section> 配平', c(/<section class="sec">/g), c(/<\/section>/g));
eq('<ul.items> 配平', c(/<ul class="items">/g), c(/<\/ul>/g));
eq('<li> 配平', c(/<li>/g), c(/<\/li>/g));
eq('.meta 配平', c(/<div class="meta">/g), c(/<\/div>\s*<\/li>/g));
eq('.stats 卡数', c(/<div class="stat(?: [a-z]+)?">/g), 4);
/* 风险条与合并方案的条数按内容走，别写死上一份的数量（踩过：照电脑端那份写成 7） */
ge('.chip 数（提示区风险条）', c(/<span class="chip[^"]*">/g), 1);
ge('合并方案 <li> 数', c(/<li><b>/g), 3);
eq('<code> 配平', c(/<code>/g), c(/<\/code>/g));
eq('<b> 配平', c(/<b>/g), c(/<\/b>/g));
out.push('  ' + (h.indexOf('**') < 0 ? 'PASS' : 'FAIL') + '  HTML 里无 Markdown 加粗残留');
out.push('  ' + (/^\|/m.test(h) ? 'FAIL' : 'PASS') + '  HTML 里无 Markdown 表格行');
['class="stats"', 'class="alert"', 'class="plan"', '<footer>', '图例：', '数据来源：', '生成时间：'].forEach(k =>
  out.push('  ' + (h.includes(k) ? 'PASS' : 'FAIL') + '  含 ' + k));
out.push('  文件字节数 ' + Buffer.byteLength(h) + '，字符数 ' + h.length);
const bad = out.filter(l => l.indexOf('FAIL') >= 0).length;
out.push('\n  失败 ' + bad + ' 项');
console.log(out.join('\n'));
fs.writeFileSync(__dirname + '/_win_html_check.txt', out.join('\n'), 'utf8');
process.exit(bad ? 1 : 0);
