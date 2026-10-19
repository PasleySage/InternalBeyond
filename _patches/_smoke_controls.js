const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'out', 'InternalBeyond.patched.html');
const s = fs.readFileSync(p, 'utf8');
const ids = [
  'api-ping-btn',
  'ib-fine-toggle',
  'ib-fine-cap',
  'ib-stk-toggle',
  'ib-kp-btn-full',
  'ib-kp-btn-mini',
  'fav-open-full',
  'fav-open-mini',
  'ws-a-fab',
  'api-music-toggle',
  'ib-stk-cur',
  'ib-stk-mgr-open',
];
let miss = 0;
for (const id of ids) {
  const ok = s.includes('id="' + id + '"') || s.includes("id='" + id + "'");
  console.log((ok ? 'OK ' : 'MISS ') + id);
  if (!ok) miss++;
}
const fns = ['_fineOn', '_stkOn', '_favOpen', '_wsAOpen', '_musicCtl', 'apiTestConnection', '_mdRenderHtml'];
for (const f of fns) {
  const ok = s.includes(f);
  console.log((ok ? 'OK ' : 'MISS ') + f);
  if (!ok) miss++;
}
console.log('product bytes', s.length);
console.log(miss ? 'FAIL miss=' + miss : 'PASS offline-control-smoke');
process.exit(miss ? 1 : 0);
