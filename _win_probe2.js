/* Windows 端补充探针：
   ① 本地 README 是"旧上游版"还是"本地改过"
   ② README 在各提交上的尺寸（判断它属于哪一轮）
   ③ 应用内版本号怎么写的（Windows 版没有 IB_VER）
   ④ LICENSES/、game/ 是否与仓库一致
   ⑤ 与我们归档的补丁锚点做区分（Windows 的 _ibGuard 是同名不同物） */
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const env = Object.assign({}, process.env, { GH_CONFIG_DIR: 'C:\\Users\\20513\\AppData\\Roaming\\GitHub CLI' });
const UP = 'Sui-IB/InternalBeyond';
const T = __dirname + '/';
const gh = (a) => { try { return execSync('gh ' + a, { env, encoding: 'utf8', maxBuffer: 1 << 28 }).trim(); } catch (e) { return 'ERR:' + String(e.stdout || e.message).slice(0, 300); } };
const J = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
const curl = (u) => { try { return execSync('curl -sL --max-time 180 "' + u + '"', { encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { return ''; } };
const blobOf = (b) => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const out = [];
const L = __dirname + '/';

/* ① README 各处尺寸 + 本地比对 */
const COMMITS = ['66725d2f', '497ca929', 'e58572b5', '596084c4', 'c1732516', '847edbbf', 'bf423ec7'];
out.push('== README.md 在各提交上的尺寸 ==');
const readmeBlobs = {};
COMMITS.forEach(c => {
  const j = J(gh('api "repos/' + UP + '/contents/README.md?ref=' + c + '"'));
  if (j && j.sha) { readmeBlobs[c] = j.sha; out.push('  ' + c + '  ' + j.size + ' B  blob ' + j.sha.slice(0, 8)); }
});
const locReadme = fs.readFileSync(L + 'README.md');
out.push('  本地        ' + locReadme.length + ' B  blob ' + blobOf(locReadme).slice(0, 8));
out.push('  → 本地 README 与哪个提交同 = ' + (Object.keys(readmeBlobs).find(k => readmeBlobs[k] === blobOf(locReadme)) || '都不是（本地改过）'));
const bReadme = curl('https://raw.githubusercontent.com/' + UP + '/e58572b5/README.md');
out.push('  e58572b5 版 README 下载 ' + bReadme.length + ' 字符，blob ' + blobOf(Buffer.from(bReadme, 'utf8')).slice(0, 8));
/* README 差异摘要（本地 vs 仓库 head） */
const hReadme = curl('https://raw.githubusercontent.com/' + UP + '/main/README.md');
fs.writeFileSync(T + '_win_readme_head.md', hReadme, 'utf8');
const ll = locReadme.toString('utf8').split('\n'), hl = hReadme.split('\n');
const lset = new Set(ll.map(s => s.trim()).filter(Boolean)), hset = new Set(hl.map(s => s.trim()).filter(Boolean));
const onlyHead = hl.filter(s => s.trim() && !lset.has(s.trim()));
const onlyLoc = ll.filter(s => s.trim() && !hset.has(s.trim()));
out.push('\n== README 差异（本地 vs 仓库 head）：仓库独有 ' + onlyHead.length + ' 行，本地独有 ' + onlyLoc.length + ' 行 ==');
out.push('  仓库独有前 14 行：');
onlyHead.slice(0, 14).forEach(s => out.push('   + ' + s.slice(0, 150)));
out.push('  本地独有前 8 行：');
onlyLoc.slice(0, 8).forEach(s => out.push('   − ' + s.slice(0, 150)));

/* ③ 应用内版本痕迹：看 README 里的"最近更新/版本"段落 */
out.push('\n== 仓库 README 里的版本/更新段落（head 版） ==');
const hlines = hReadme.split('\n');
hlines.forEach((s, i) => { if (/版本|最近更新|更新日志|V2\.7|v2\.7|Changelog|release/i.test(s)) out.push('  [' + (i + 1) + '] ' + s.slice(0, 180)); });

/* Windows 版应用内是否有版本显示 */
const hi = fs.readFileSync(T + '_win_head.html', 'utf8');
out.push('\n== Windows 应用内版本痕迹 ==');
[['关于/版本 区块', /关于[^<]{0,40}版本|当前版本|版本号/g],
 ['v\\d+\\.\\d+ 形式', /[vV]\d+\.\d+(\.\d+)?/g],
 ['CACHE/DB 版本常量', /(DB_VER|CACHE_VER|SW_VER|SCHEMA_VER)\s*=\s*\d+/g]].forEach(([n, re]) => {
  const m = hi.match(re);
  out.push('  ' + n.padEnd(18) + (m ? Array.from(new Set(m)).slice(0, 10).join(' | ') : '（无）'));
});

/* ④ 目录一致性（LICENSES / game） */
out.push('\n== 目录一致性（递归，只比文件 blob） ==');
const treeMain = J(gh('api "repos/' + UP + '/git/trees/main?recursive=1'));
if (treeMain && treeMain.tree) {
  ['LICENSES/', 'game/'].forEach(pre => {
    const files = treeMain.tree.filter(x => x.type === 'blob' && x.path.indexOf(pre) === 0);
    let same = 0, diff = 0, miss = 0;
    files.forEach(x => {
      const p = L + x.path.replace(/\//g, '\\');
      if (!fs.existsSync(p)) { miss++; out.push('    ✗ 本地缺 ' + x.path); return; }
      const b = fs.readFileSync(p);
      if (blobOf(b) === x.sha) same++; else { diff++; out.push('    ⚠ ' + x.path + ' 本地 ' + b.length + ' / 仓库 ' + x.size); }
    });
    out.push('  ' + pre + '：仓库 ' + files.length + ' 个文件，一致 ' + same + '，不同 ' + diff + '，本地缺 ' + miss);
  });
  /* 本地多出来的文件
     外来项/已登记本地项 = 不属于本仓库上游内容、但应摆在 Windows\ 下的东西：
     - DLC\：上游 README 明写把 DLC/ 放到 InternalBeyond.html 同级，内容来自另一仓库
       PasleySage/InternalBeyond-Cinema；
     - _patches\：电脑端本地补丁流水线（docs/adr/0003）；
     - docs\：本地工作文档（adr/agents/说明书/evidence 等）。
     列出来但不叫「多出」，与 _win_sync.js 同一口径。
     .git/.obsidian/.scratch/.workbuddy 是工作区基础设施，不参与比对（拆分后 L＝整个工作区根，
     不排除会把它们成千上万条全列出来，信号全毁）。 */
  const EXTERNAL_PREFIX = ['DLC/', '_patches/', 'docs/'];
  const SKIP_DIRS = new Set(['.git', '.obsidian', '.scratch', '.workbuddy', 'node_modules']);
  const LOCAL_FILES = new Set(['AGENTS.md', 'CONTEXT.md', '.gitignore',
    '_check_docs.js', '_check_publish.js', '_check_tables.js', '_fetch_upstream.js', '_probe_lint.js',
    '_win_check.js', '_win_sync.js', '_win_probe.js', '_win_probe2.js', '_win_digest.js', '_win_html_check.js']);
  const repoPaths = new Set(treeMain.tree.filter(x => x.type === 'blob').map(x => x.path));
  const walk = (d, base) => fs.readdirSync(d).forEach(n => {
    const p = d + '\\' + n;
    if (fs.statSync(p).isDirectory()) { if (!SKIP_DIRS.has(n)) walk(p, base + n + '/'); return; }
    if (repoPaths.has(base + n)) return;
    const rel = base + n;
    if (EXTERNAL_PREFIX.some(x => rel.startsWith(x))) out.push('    · 外来项（非本仓库，已登记）' + rel);
    else if (LOCAL_FILES.has(rel)) out.push('    · 本地工具／记忆件（已登记）' + rel);
    else out.push('    ＋ 本地多出 ' + rel);
  });
  walk(L.slice(0, -1), '');
} else out.push('  递归 tree 取不到');

/* ⑤ 同名不同物：Windows 的 _ibGuard 是什么 */
out.push('\n== Windows 版 _ibGuard 的真实身份（避免与手机端归档项混淆） ==');
const gi = hi.indexOf('_ibGuardCheck');
out.push('  _ibGuardCheck 定义处上下文：');
out.push('  …' + hi.slice(gi - 40, gi + 900).replace(/\s+/g, ' ').slice(0, 900) + '…');
out.push('\n  相关开关/键：' + (hi.match(/ib_guardMuted|ib_lastActive|ib-guard-overlay|_ibAutoBakOn|_ibFsSyncNow/g) || []).filter((v, i, a) => a.indexOf(v) === i).join('  '));

fs.writeFileSync(T + '_win_probe2.txt', out.join('\n'), 'utf8');
console.log('done');
