/* 阶段二：把上游 head 版覆盖到本地 Windows\（纯拷贝同步，不碰远端）
   只换 InternalBeyond.html 与 README.md；其余文件复核是否仍与仓库一致。
   校验：本地文件的 git blob sha 必须等于 repos/.../contents/<file>?ref=<head> 的 sha。 */
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const env = Object.assign({}, process.env, { GH_CONFIG_DIR: 'C:\\Users\\20513\\AppData\\Roaming\\GitHub CLI' });
const UP = 'Sui-IB/InternalBeyond';
const L = __dirname + '/';
const T = __dirname + '/';
const gh = (a) => { try { return execSync('gh ' + a, { env, encoding: 'utf8', maxBuffer: 1 << 28 }).trim(); } catch (e) { return 'ERR:' + String(e.stdout || e.message).slice(0, 300); } };
const J = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
const blobOf = (b) => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const out = [];

const head = gh('api repos/' + UP + '/commits/main --jq .sha');
out.push('上游 head = ' + head);
if (head.startsWith('ERR')) { fs.writeFileSync(T + '_win_sync.txt', out.join('\n'), 'utf8'); process.exit(1); }

const TARGETS = ['InternalBeyond.html', 'README.md'];
/* 外来项/已登记本地项：不属于本仓库上游内容、但应摆在 Windows\ 下的东西。
   - DLC\ —— 上游 README 明写「把 DLC/ 文件夹放到 InternalBeyond.html 同级」，
     内容来自另一仓库 PasleySage/InternalBeyond-Cinema（观影室，我方 fork，
     锚点 f54f45db / blob 5e92e348）。
   - _patches\ —— 电脑端本地补丁流水线（docs/adr/0003 本地补丁模式），
     基线/清单/产物都住在这里，不是上游文件。
   ⇒ 这些路径不算「本地多出」，但必须单独列出来，免得"本地多了什么"这件事被悄悄吞掉。 */
const EXTERNAL_PREFIX = ['DLC/', '_patches/'];
out.push('\n== 覆盖前 ==');
TARGETS.forEach(f => {
  const p = L + f;
  const b = fs.readFileSync(p);
  out.push('  ' + f + '：本地 ' + b.length + ' B，blob ' + blobOf(b).slice(0, 8));
});

out.push('\n== 下载并覆盖 ==');
TARGETS.forEach(f => {
  const meta = J(gh('api "repos/' + UP + '/contents/' + f + '?ref=' + head + '"'));
  const url = 'https://raw.githubusercontent.com/' + UP + '/' + head + '/' + f;
  const p = L + f;
  out.push('  ' + f);
  out.push('    期望 size=' + (meta ? meta.size : '?') + '  blob=' + (meta ? meta.sha.slice(0, 8) : '?'));
  let okFlag = false;
  for (let attempt = 1; attempt <= 3 && !okFlag; attempt++) {
    try { execSync('curl -sL --max-time 240 -o "' + p + '" "' + url + '"', { env, stdio: 'ignore' }); } catch (e) { out.push('    第 ' + attempt + ' 次 curl 失败：' + e.message.slice(0, 120)); continue; }
    const b = fs.readFileSync(p);
    const sha = blobOf(b);
    if (meta && sha === meta.sha) { out.push('    第 ' + attempt + ' 次成功：' + b.length + ' B，blob ' + sha.slice(0, 8) + ' ✓ 与仓库逐字节一致'); okFlag = true; }
    else out.push('    第 ' + attempt + ' 次不匹配：' + b.length + ' B，blob ' + sha.slice(0, 8) + '（期望 ' + (meta ? meta.sha.slice(0, 8) : '?') + '）');
  }
  if (!okFlag) {
    /* 兜底：blob API（git blobs 支持任意大小） */
    out.push('    改走 git blobs API 兜底…');
    const bl = J(gh('api "repos/' + UP + '/git/blobs/' + (meta ? meta.sha : '')));
    if (bl && bl.content) {
      const buf = Buffer.from(bl.content.replace(/\n/g, ''), 'base64');
      fs.writeFileSync(p, buf);
      out.push('    写入 ' + buf.length + ' B，blob ' + blobOf(buf).slice(0, 8) + (blobOf(buf) === (meta ? meta.sha : '') ? ' ✓' : ' ✗ 仍不一致'));
    } else out.push('    ✗ 兜底也失败，需人工处理');
  }
});

out.push('\n== 覆盖后复核 ==');
let allOk = true;
TARGETS.forEach(f => {
  const meta = J(gh('api "repos/' + UP + '/contents/' + f + '?ref=' + head + '"'));
  const b = fs.readFileSync(L + f);
  const sha = blobOf(b);
  const same = meta && sha === meta.sha;
  if (!same) allOk = false;
  out.push('  ' + (same ? '✓' : '✗') + '  ' + f + '：本地 ' + b.length + ' B / 仓库 ' + (meta ? meta.size : '?') + ' B，blob ' + sha.slice(0, 8));
});

/* 其余文件仍须与仓库一致（含子目录，递归） */
out.push('\n== 其余文件复核（Git Trees recursive，只比 blob） ==');
const tree = J(gh('api "repos/' + UP + '/git/trees/' + head + '?recursive=1'));
if (tree && tree.tree) {
  const blobs = tree.tree.filter(x => x.type === 'blob');
  let same = 0, diff = 0, miss = 0;
  blobs.forEach(x => {
    const p = L + x.path.replace(/\//g, '\\');
    if (!fs.existsSync(p)) { miss++; out.push('  ✗ 本地缺 ' + x.path); if (!TARGETS.includes(x.path)) allOk = false; return; }
    const b = fs.readFileSync(p);
    const sha = blobOf(b);
    if (sha === x.sha) same++;
    else { diff++; out.push('  ⚠ ' + x.path + ' 本地 ' + b.length + ' / 仓库 ' + x.size); if (!TARGETS.includes(x.path)) allOk = false; }
  });
  out.push('  仓库共 ' + blobs.length + ' 个文件：一致 ' + same + '，不同 ' + diff + '，本地缺 ' + miss);
  const repoPaths = new Set(blobs.map(x => x.path));
  const walk = (d, base) => fs.readdirSync(d).forEach(n => {
    const p = d + '\\' + n;
    if (fs.statSync(p).isDirectory()) walk(p, base + n + '/');
    else if (!repoPaths.has(base + n)) {
      const rel = base + n;
      if (EXTERNAL_PREFIX.some(x => rel.startsWith(x))) out.push('  · 外来项（非本仓库，已登记）' + rel);
      else { out.push('  ＋ 本地多出 ' + rel); allOk = false; }
    }
  });
  walk(L.slice(0, -1), '');
} else out.push('  递归 tree 取不到');

out.push('\n==============================');
out.push(allOk ? '结果：全部一致 ✓' : '结果：存在不一致 ✗');
out.push('==============================');
fs.writeFileSync(T + '_win_sync.txt', out.join('\n'), 'utf8');
console.log('done ok=' + allOk);
