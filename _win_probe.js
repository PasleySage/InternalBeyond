/* Windows 端（Sui-IB/InternalBeyond）上游更新探针
   - 纯拷贝模式：由本地 Windows\InternalBeyond.html 的 git blob 反查基线
   - 补丁模式（ADR 0003）：本地是补丁产物，反查必失败 → 显式传基线：
     node _win_probe.js f8955fd1
   - 再取 compare/HEAD、原始 diff、trees 权威清单、全目录一致性、常量对照、归档项复检 */
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const env = Object.assign({}, process.env, { GH_CONFIG_DIR: 'C:\\Users\\20513\\AppData\\Roaming\\GitHub CLI' });
const UP = 'Sui-IB/InternalBeyond';
const FK = 'PasleySage/InternalBeyond';
const OUT = __dirname + '/_win_probe.txt';
const TMP = __dirname + '/';

const gh = (a) => { try { return execSync('gh ' + a, { env, encoding: 'utf8', maxBuffer: 1 << 28 }).trim(); } catch (e) { return 'ERR:' + String(e.stdout || e.message).slice(0, 400); } };
const J = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };
const curl = (u) => { try { return execSync('curl -sL --max-time 180 "' + u + '"', { encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { return ''; } };
const blob = (p) => { const b = fs.readFileSync(p); return { size: b.length, sha: crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex') }; };
const out = [];

/* ---------- 1. 本地现状 ---------- */
const LOCAL = __dirname + '/';
const loc = {};
['InternalBeyond.html', 'README.md'].forEach(f => {
  const p = LOCAL + f;
  if (fs.existsSync(p)) loc[f] = blob(p);
});
out.push('== 本地 ' + LOCAL + ' ==');
Object.keys(loc).forEach(f => out.push('  ' + f.padEnd(22) + loc[f].size + ' B　blob ' + loc[f].sha));
const localHtmlSha = loc['InternalBeyond.html'] ? loc['InternalBeyond.html'].sha : '';

/* ---------- 2. 上游 head 与历史（用历史反查本地基线提交） ---------- */
const head = gh('api repos/' + UP + '/commits/main --jq .sha');
out.push('\n== 上游 ' + UP + ' ==');
out.push('  head = ' + head);
const log = J(gh('api "repos/' + UP + '/commits?per_page=40"'));
if (!Array.isArray(log)) { out.push('  提交列表取不到：' + log); }
else {
  out.push('  最近 12 条（新→旧）：');
  log.slice(0, 12).forEach(c => out.push('   ' + c.sha.slice(0, 8) + '  ' + c.commit.committer.date + '  ' + c.commit.message.split('\n')[0].slice(0, 90)));
  /* 基线：argv 显式传入（补丁模式）优先；否则反查本地 blob */
  let baseSha = process.argv[2] ? process.argv[2] : null, baseDate = null;
  if (baseSha) {
    out.push('  → 基线（argv 显式传入） = ' + baseSha);
  } else {
    for (const c of log) {
      const t = J(gh('api repos/' + UP + '/git/trees/' + c.commit.tree.sha + '?recursive=0'));
      if (!t || !t.tree) continue;
      const f = t.tree.find(x => x.path === 'InternalBeyond.html');
      if (f && f.sha === localHtmlSha) { baseSha = c.sha; baseDate = c.commit.committer.date; break; }
    }
    out.push('  → 本地 HTML 对应提交（基线） = ' + (baseSha || '（近 40 条里没找到，本地已改过 → 请显式传基线 sha）') + (baseDate ? '  ' + baseDate : ''));
  }
  fs.writeFileSync(TMP + '_win_base.txt', String(baseSha || ''), 'utf8');

  if (baseSha) {
    /* ---------- 3. compare ---------- */
    const cmp = J(gh('api "repos/' + UP + '/compare/' + baseSha + '...' + head + '"'));
    if (cmp) {
      out.push('\n== compare ' + baseSha.slice(0, 8) + '...' + head.slice(0, 8) + ' ==');
      out.push('  status=' + cmp.status + '  ahead_by=' + cmp.ahead_by + '  behind_by=' + cmp.behind_by + '  total_commits=' + cmp.total_commits);
      out.push('  commits（旧→新）：');
      (cmp.commits || []).forEach(c => out.push('   ' + c.sha.slice(0, 8) + '  ' + c.commit.committer.date + '  ' + c.commit.message.split('\n')[0].slice(0, 110)));
      let a = 0, d = 0;
      out.push('  files：');
      (cmp.files || []).forEach(f => { a += f.additions; d += f.deletions; out.push('   ' + f.status.padEnd(9) + '+' + f.additions + '/-' + f.deletions + '  ' + f.filename); });
      out.push('  合计  +' + a + ' / −' + d + '　文件数 ' + (cmp.files || []).length);
    } else out.push('  compare 取不到：' + cmp);

    /* ---------- 4. 原始 diff ---------- */
    const diff = gh('api "repos/' + UP + '/compare/' + baseSha + '...' + head + '" -H "Accept: application/vnd.github.diff"');
    fs.writeFileSync(TMP + '_win.diff', diff, 'utf8');
    out.push('\n== 原始 diff 落盘 _win.diff，' + diff.length + ' 字符 ==');

    /* ---------- 4b. trees 权威文件清单（compare files 有 300 条硬上限） ---------- */
    const treeOf = (sha) => {
      const c = J(gh('api repos/' + UP + '/commits/' + sha));
      if (!c || !c.commit) return null;
      const t = J(gh('api "repos/' + UP + '/git/trees/' + c.commit.tree.sha + '?recursive=1"'));
      if (!t || !t.tree) return null;
      return { truncated: !!t.truncated, blobs: new Map(t.tree.filter(x => x.type === 'blob').map(x => [x.path, x.sha])) };
    };
    const tb = treeOf(baseSha), thh = treeOf(head);
    if (tb && thh) {
      const added = [], removed = [], modified = [];
      for (const [p, s] of thh.blobs) { if (!tb.blobs.has(p)) added.push(p); else if (tb.blobs.get(p) !== s) modified.push(p); }
      for (const p of tb.blobs.keys()) if (!thh.blobs.has(p)) removed.push(p);
      out.push('\n== trees 权威清单 ==');
      out.push('  truncated: BASE=' + tb.truncated + ' HEAD=' + thh.truncated);
      out.push('  文件数 ' + tb.blobs.size + ' → ' + thh.blobs.size + '　added ' + added.length + ' · removed ' + removed.length + ' · modified ' + modified.length);
      added.forEach(p => out.push('   +  ' + p)); removed.forEach(p => out.push('   -  ' + p)); modified.forEach(p => out.push('   M  ' + p));

      /* 提交级 stats 累加（跳过 merge） */
      let sa = 0, sd = 0, sn = 0;
      ((cmp && cmp.commits) || []).forEach(c => {
        const m = J(gh('api repos/' + UP + '/commits/' + c.sha));
        if (!m || !m.commit || (m.parents || []).length > 1 || !m.stats) return;
        sa += m.stats.additions; sd += m.stats.deletions; sn++;
      });
      out.push('  提交级 stats 累加（非 merge ' + sn + ' 条）：+' + sa + ' / −' + sd);

      /* 全目录一致性：本地 Windows\ 逐文件 vs HEAD 树（跳过补丁产物与本地专属目录） */
      out.push('\n== 本地 Windows\\ vs HEAD 树（全目录递归） ==');
      const SKIP = new Set(['_patches', 'node_modules']);
      const LOCAL_EX = new Set(['InternalBeyond.html']); // 补丁产物，预期不一致
      const walk = (dir, rel) => {
        const r = [];
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = rel ? rel + '/' + e.name : e.name;
          if (e.isDirectory()) { if (!SKIP.has(e.name)) r.push(...walk(dir + '/' + e.name, p)); }
          else r.push(p);
        }
        return r;
      };
      const localFiles = walk(__dirname, '');
      const mismatch = [], missing = [], localOnly = [];
      for (const p of localFiles) {
        if (LOCAL_EX.has(p)) continue;
        const hs = thh.blobs.get(p);
        if (!hs) { localOnly.push(p); continue; }
        const ls = blob(__dirname + '/' + p).sha;
        if (ls !== hs) mismatch.push(p);
      }
      for (const p of thh.blobs.keys()) if (!localFiles.includes(p)) missing.push(p);
      out.push('  本地文件（跳过 _patches/node_modules，排除补丁产物）' + localFiles.length + '　不一致 ' + mismatch.length + ' · 缺失 ' + missing.length + ' · 本地多出 ' + localOnly.length);
      mismatch.forEach(p => out.push('   ≠  ' + p)); missing.forEach(p => out.push('   缺  ' + p)); localOnly.forEach(p => out.push('   多  ' + p));
    } else out.push('\n== trees 取不到 ==');

    /* ---------- 5. 两版原文 ---------- */
    fs.writeFileSync(TMP + '_win_base.html', curl('https://raw.githubusercontent.com/' + UP + '/' + baseSha + '/InternalBeyond.html'), 'utf8');
    fs.writeFileSync(TMP + '_win_head.html', curl('https://raw.githubusercontent.com/' + UP + '/' + head + '/InternalBeyond.html'), 'utf8');
    const bi = fs.readFileSync(TMP + '_win_base.html', 'utf8');
    const hi = fs.readFileSync(TMP + '_win_head.html', 'utf8');
    out.push('\n== 两版 InternalBeyond.html ==');
    out.push('  BASE ' + bi.length + ' 字符　HEAD ' + hi.length + ' 字符　Δ=' + (hi.length - bi.length));
    const grep = (s, re) => (s.match(re) || ['（无）'])[0];
    const show = (name, re) => out.push('  ' + name + '  BASE = ' + grep(bi, re) + '　HEAD = ' + grep(hi, re));
    show('IB_VER       ', /IB_VER\s*=\s*['"][^'"]+['"]/);
    show('IB_VER_DATE  ', /IB_VER_DATE\s*=\s*['"][^'"]+['"]/);
    show('DB_VER       ', /DB_VER\s*=\s*\d+/);
    show('SW cache     ', /ib-cache-v\d+/);
    show('APP_VER      ', /APP_VER\s*=\s*['"][^'"]+['"]/);
    show('version      ', /<title>[^<]*<\/title>/);
    out.push('  HEAD 里的版本类字串（前 20 个）：');
    const vers = Array.from(new Set((hi.match(/v\d+\.\d+[a-z]?/g) || [])));
    out.push('    ' + vers.slice(0, 20).join('  '));
    out.push('  BASE 里的版本类字串（前 20 个）：');
    out.push('    ' + Array.from(new Set((bi.match(/v\d+\.\d+[a-z]?/g) || []))).slice(0, 20).join('  '));

    /* ---------- 6. 归档项 / 本地补丁锚点复检 ---------- */
    out.push('\n== 归档项与本地补丁锚点复检（上游 HEAD） ==');
    [['诊断面板 _ibGuard', /_ibGuard/],
     ['各步耗时埋点 _ibStepLog', /_ibStepLog|_ibTimed/],
     ['脱敏 _ibRedact', /_ibRedact/],
     ['VersionError 自愈 ib_verfix', /ib_verfix/],
     ['预遮罩揭幕 _ibVeilOff', /_ibVeilOff/],
     ['9 秒硬兜底 now-t0>9000', /now-t0>9000/],
     ['openDB onblocked', /onblocked/]].forEach(([n, re]) => out.push('  ' + (re.test(hi) ? '有' : '无') + '  ' + n));
  }
}

/* ---------- 7. 仓库根目录文件对照 ---------- */
out.push('\n== 上游 HEAD 根目录 vs 本地 Windows/ ==');
const root = J(gh('api "repos/' + UP + '/contents/?ref=' + head + '"'));
if (Array.isArray(root)) {
  root.forEach(x => {
    const p = LOCAL + x.name;
    const has = fs.existsSync(p);
    let extra = '';
    if (has && fs.statSync(p).isFile()) {
      const s = fs.statSync(p).size;
      extra = '　本地 ' + s + (String(s) === String(x.size) ? ' ✓' : ' / 仓库 ' + x.size + ' ⚠');
    } else if (has) extra = '　（目录）';
    out.push('  ' + (has ? '有' : '无') + '  ' + x.name.padEnd(22) + '仓库 ' + (x.size || '-') + extra);
  });
} else out.push('  根目录取不到');

/* ---------- 8. 是否有 Windows 端 fork ---------- */
out.push('\n== ' + FK + ' 是否存在 ==');
out.push('  ' + (gh('api repos/' + FK).startsWith('ERR') ? '不存在（Windows 端无镜像仓库）' : '存在'));

fs.writeFileSync(OUT, out.join('\n'), 'utf8');
console.log('done -> ' + OUT);
