/* 把 _win.diff 压成可读摘要：逐 hunk 只留变更行（截断），并核算 +/- 数 */
const fs = require('fs');
const T = __dirname + '/';
const diff = fs.readFileSync(T + '_win.diff', 'utf8');
const lines = diff.split('\n');
const out = [];
let add = 0, del = 0, hunks = 0, cur = null;
lines.forEach(L => {
  if (L.startsWith('@@')) { hunks++; out.push('\n===== HUNK ' + hunks + '  ' + L + ' ====='); return; }
  if (L.startsWith('+++') || L.startsWith('---') || L.startsWith('diff ') || L.startsWith('index ')) return;
  if (L.startsWith('+')) { add++; out.push('  + ' + L.slice(1, 700)); }
  else if (L.startsWith('-')) { del++; out.push('  − ' + L.slice(1, 700)); }
});
out.unshift('== _win.diff 合计：' + hunks + ' hunks，+' + add + ' / −' + del + '，总行 ' + lines.length + ' ==');
out.push('\n\n== 摘要文件结束 ==');

/* _ibGuard 在 Windows 版里是什么（与手机端补丁同名但未必同事） */
const hi = fs.readFileSync(T + '_win_head.html', 'utf8');
const ctx = [];
let i = -1;
while ((i = hi.indexOf('_ibGuard', i + 1)) !== -1 && ctx.length < 6) ctx.push(hi.slice(Math.max(0, i - 160), i + 160).replace(/\s+/g, ' '));
out.push('\n== Windows HEAD 里 _ibGuard 的出现（' + ctx.length + ' 处样例） ==');
ctx.forEach((c, n) => out.push('  [' + (n + 1) + '] …' + c + '…'));
const cnt = (s, re) => (s.match(re) || []).length;
out.push('  出现次数 _ibGuard = ' + cnt(hi, /_ibGuard/g) + '　_ibStepLog = ' + cnt(hi, /_ibStepLog/g) + '　IB_VER = ' + cnt(hi, /IB_VER/g));
/* 版本号在 Windows 版怎么写 */
out.push('\n== Windows HEAD 的版本痕迹 ==');
['v2\\.7\\.1[a-z]?', 'V2\\.7\\.1[a-z]?', 'APP_VERSION', 'appVersion', "version\\s*[:=]\\s*['\"]", 'buildVersion'].forEach(re => {
  const m = hi.match(new RegExp(re, 'g'));
  out.push('  ' + re.padEnd(26) + (m ? m.slice(0, 6).join(' ') : '（无）'));
});
const idx = hi.search(/v2\.7\.1/i);
out.push('  首个 v2.7.1 上下文：' + (idx < 0 ? '（无）' : '…' + hi.slice(Math.max(0, idx - 120), idx + 120).replace(/\s+/g, ' ') + '…'));

fs.writeFileSync(T + '_win_digest.txt', out.join('\n'), 'utf8');
console.log('done');
