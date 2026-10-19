/* 比对本地 Windows 端文件与仓库当前版本（不用 --jq，避免引号被 shell 吃掉） */
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
const env = Object.assign({}, process.env, { GH_CONFIG_DIR: 'C:\\Users\\20513\\AppData\\Roaming\\GitHub CLI' });
const log = [];
const ghJson = (p) => { try { return JSON.parse(execSync('gh api ' + p, { env, encoding: 'utf8', maxBuffer: 1 << 26 })); } catch (e) { return null; } };

const blob = (p) => {
  const buf = fs.readFileSync(p);
  return { size: buf.length, sha: crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex') };
};

const localPath = __dirname + '/InternalBeyond.html';
const L = blob(localPath);
log.push('本地 ' + localPath);
log.push('  字节数 = ' + L.size + '　git blob = ' + L.sha);

const repo = ghJson('repos/Sui-IB/InternalBeyond/contents/');
if (!repo) { log.push('仓库根目录读取失败'); }
else {
  const html = repo.find(x => x.name === 'InternalBeyond.html');
  log.push('仓库当前 blob = ' + (html ? html.sha : '?') + '　size = ' + (html ? html.size : '?'));
  log.push('  → ' + (html && html.sha === L.sha ? '✓ 完全一致（本地就是仓库当前版）' : '✗ 不一致（本地与仓库不同）'));
  log.push('');
  log.push('本地目录 vs 仓库根目录：');
  repo.forEach(x => {
    const p = __dirname + '/' + x.name;
    const has = fs.existsSync(p);
    let extra = '';
    if (has && fs.statSync(p).isFile()) {
      const s = fs.statSync(p).size;
      extra = '　本地 ' + s + ' / 仓库 ' + x.size + (String(s) === String(x.size) ? '  ✓' : '  ⚠ 体积不同');
    }
    log.push('  ' + (has ? '有  ' : '无  ') + x.name + (x.type === 'dir' ? '（目录）' : '') + extra);
  });
  log.push('');
  const extraLocal = fs.readdirSync(__dirname).filter(n => !repo.some(x => x.name === n));
  log.push('本地额外项（仓库根目录没有的）：' + (extraLocal.length ? extraLocal.join('、') : '（无）'));
}
fs.writeFileSync(__dirname + '/_win_check.txt', log.join('\n'), 'utf8');
