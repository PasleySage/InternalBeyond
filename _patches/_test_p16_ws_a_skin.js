/* _test_p16_ws_a_skin.js —— P16 小助手换肤：浅色覆盖 + 深色变量修正（静态文本断言）。
 *
 * 跑法：node _test_p16_ws_a_skin.js [产物.html]
 * 默认读 out\InternalBeyond.patched.html；改完 p06 后先用 node _driver.js 重建产物。
 *
 * 只做静态断言（indexOf），截取 p06 IIFE 切片（与 _test_p13_list.js 同一截取方式），
 * 不做行为层测试。普通字符串一律单引号，不用模板字符串。
 *
 * 断言清单（11 条）：
 *   1  浅色 body:not(.theme-infernal) .ws-a-modal 块含 rgba(255,255,255,0.32) 与 blur(24px)
 *   2  浅色 .ws-a-title 色含 #152c58
 *   3  浅色 .ws-a-user 与 .ws-a-bot 文字色均含 #0a1e42
 *   4  浅色 #ws-a-q::placeholder 色含 #3f5e8c
 *   5  浅色 .ws-a-user 底 rgba(110,160,238,0.08)；.ws-a-bot 底 rgba(248,252,255,0.4)
 *   6  所有 body:not(.theme-infernal) .ws-a- 浅色规则块中不再出现 #cfe0ff 或 #9ab
 *   7  默认 .ws-a-title 用 color:var(--light)，且不含 #cfe0ff
 *   8  默认 .ws-a-user 底 rgba(74,122,178,0.26)；.ws-a-bot 底 rgba(175,195,228,0.08)
 *   9  默认 #ws-a-q::placeholder 用 var(--text-muted)；.ws-a-send 用 color:var(--accent-light)
 *  10  深色关闭钮（.ws-a-mini）用 color:var(--mist)
 *  11  防误删：#ws-a-fab、.ws-a-bot{white-space:normal}、.ws-a-user{white-space:pre-wrap} 仍在
 */
const fs = require('fs'), path = require('path');
const HERE = __dirname;
const DEF_OUT = path.join(HERE, 'out', 'InternalBeyond.patched.html');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' —— ' + extra : '')); }
}

let outText;
if (process.argv[2]) outText = fs.readFileSync(process.argv[2], 'utf8');
else if (fs.existsSync(DEF_OUT)) outText = fs.readFileSync(DEF_OUT, 'utf8');
else { console.error('找不到产物，先跑 node _driver.js'); process.exit(1); }

/* ── 截取 p06 IIFE（与 _test_p13_list.js 同一方式：indexOf 起始标记 + 找 _wsABoot 后 })();）── */
const iifeStart = outText.indexOf('(function(){/* p06：小助手');
if (iifeStart < 0) { console.error('产物里没有 p06 IIFE 起始标记'); process.exit(1); }
const endMark = outText.indexOf('_wsABoot();', iifeStart);
const iifeEnd = outText.indexOf('})();', endMark) + 5;
if (endMark < 0 || iifeEnd < 5) { console.error('p06 IIFE 结尾标记不全'); process.exit(1); }
const iifeSrc = outText.slice(iifeStart, iifeEnd);

/* ── 工具：按选择器抽取规则块。wantLight=true 取 body:not(.theme-infernal) 前缀的浅色规则；
 *    wantLight=false 取无前缀的默认（深色）规则。lookback 80 字符判断是否浅色前缀。── */
function extractRule(src, selector, wantLight) {
  let searchFrom = 0;
  while (true) {
    const i = src.indexOf(selector, searchFrom);
    if (i < 0) return null;
    const lookback = src.slice(Math.max(0, i - 80), i);
    const isLight = lookback.indexOf('body:not(.theme-infernal)') !== -1;
    if (wantLight ? isLight : !isLight) {
      const open = src.indexOf('{', i);
      if (open < 0) return null;
      const close = src.indexOf('}', open);
      if (close < 0) return null;
      return src.slice(i, close + 1);
    }
    searchFrom = i + selector.length;
  }
}

/* ── 工具：收集所有 body:not(.theme-infernal) .ws-a- 开头的浅色规则块文本 ── */
function collectLightWsRules(src) {
  const prefix = 'body:not(.theme-infernal) .ws-a-';
  const rules = [];
  let i = 0;
  while (true) {
    const s = src.indexOf(prefix, i);
    if (s < 0) break;
    const open = src.indexOf('{', s);
    if (open < 0) break;
    const close = src.indexOf('}', open);
    if (close < 0) break;
    rules.push(src.slice(s, close + 1));
    i = close + 1;
  }
  return rules;
}

console.log('== P16 小助手换肤（浅色覆盖 + 深色变量修正，静态断言 1–11）==');

/* ── 浅色组 1–6 ── */
const lightModal = extractRule(iifeSrc, '.ws-a-modal{', true);
ok('1. 浅色 .ws-a-modal 块含 rgba(255,255,255,0.32) 与 blur(24px)',
  !!lightModal && lightModal.indexOf('rgba(255,255,255,0.32)') !== -1 && lightModal.indexOf('blur(24px)') !== -1,
  lightModal ? lightModal.slice(0, 200) : '未找到浅色 .ws-a-modal 规则');

const lightTitle = extractRule(iifeSrc, '.ws-a-title{', true);
ok('2. 浅色 .ws-a-title 色含 #152c58',
  !!lightTitle && lightTitle.indexOf('#152c58') !== -1,
  lightTitle ? lightTitle : '未找到浅色 .ws-a-title 规则');

const lightUser = extractRule(iifeSrc, '.ws-a-user{', true);
const lightBot = extractRule(iifeSrc, '.ws-a-bot{', true);
ok('3. 浅色 .ws-a-user 与 .ws-a-bot 文字色均含 #0a1e42',
  !!lightUser && lightUser.indexOf('#0a1e42') !== -1 &&
  !!lightBot && lightBot.indexOf('#0a1e42') !== -1,
  'user=' + (lightUser || '缺') + ' | bot=' + (lightBot || '缺'));

const lightPh = extractRule(iifeSrc, '#ws-a-q::placeholder', true);
ok('4. 浅色 #ws-a-q::placeholder 色含 #3f5e8c',
  !!lightPh && lightPh.indexOf('#3f5e8c') !== -1,
  lightPh ? lightPh : '未找到浅色 placeholder 规则');

ok('5. 浅色 .ws-a-user 底 rgba(110,160,238,0.08)；.ws-a-bot 底 rgba(248,252,255,0.4)',
  !!lightUser && lightUser.indexOf('rgba(110,160,238,0.08)') !== -1 &&
  !!lightBot && lightBot.indexOf('rgba(248,252,255,0.4)') !== -1,
  'user=' + (lightUser || '缺') + ' | bot=' + (lightBot || '缺'));

const lightBlockText = collectLightWsRules(iifeSrc).join('\n');
ok('6. 浅色 .ws-a- 规则块中不含 #cfe0ff 且不含 #9ab',
  lightBlockText.indexOf('#cfe0ff') === -1 && lightBlockText.indexOf('#9ab') === -1,
  '块文本前200字=' + lightBlockText.slice(0, 200));

/* ── 深色/默认组 7–10 ── */
const defTitle = extractRule(iifeSrc, '.ws-a-title{', false);
ok('7. 默认 .ws-a-title 用 color:var(--light) 且不含 #cfe0ff',
  !!defTitle && defTitle.indexOf('color:var(--light)') !== -1 && defTitle.indexOf('#cfe0ff') === -1,
  defTitle ? defTitle : '未找到默认 .ws-a-title 规则');

const defUser = extractRule(iifeSrc, '.ws-a-user{', false);
const defBot = extractRule(iifeSrc, '.ws-a-bot{', false);
ok('8. 默认 .ws-a-user 底 rgba(74,122,178,0.26)；.ws-a-bot 底 rgba(175,195,228,0.08)',
  !!defUser && defUser.indexOf('rgba(74,122,178,0.26)') !== -1 &&
  !!defBot && defBot.indexOf('rgba(175,195,228,0.08)') !== -1,
  'user=' + (defUser || '缺') + ' | bot=' + (defBot || '缺'));

const defPh = extractRule(iifeSrc, '#ws-a-q::placeholder', false);
const defSend = extractRule(iifeSrc, '.ws-a-send{', false);
ok('9. 默认 #ws-a-q::placeholder 用 var(--text-muted)；.ws-a-send 用 color:var(--accent-light)',
  !!defPh && defPh.indexOf('var(--text-muted)') !== -1 &&
  !!defSend && defSend.indexOf('color:var(--accent-light)') !== -1,
  'ph=' + (defPh || '缺') + ' | send=' + (defSend || '缺'));

const defMini = extractRule(iifeSrc, '.ws-a-mini{', false);
ok('10. 深色关闭钮 .ws-a-mini 用 color:var(--mist)',
  !!defMini && defMini.indexOf('color:var(--mist)') !== -1,
  defMini ? defMini : '未找到 .ws-a-mini 规则');

/* ── 防误删 11 ── */
ok('11. 防误删：#ws-a-fab、.ws-a-bot{white-space:normal}、.ws-a-user{white-space:pre-wrap} 仍在',
  iifeSrc.indexOf('#ws-a-fab') !== -1 &&
  iifeSrc.indexOf('.ws-a-bot{white-space:normal}') !== -1 &&
  iifeSrc.indexOf('.ws-a-user{white-space:pre-wrap}') !== -1);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
