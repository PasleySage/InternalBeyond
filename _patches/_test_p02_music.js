/* _test_p02_music.js —— P02 AI 控制播放器的断言式测试（逻辑层，不播真音频、不发网络）
 *
 * 跑法：node _test_p02_music.js [产物.html]
 *       不传路径时，用 `out\InternalBeyond.patched.html`；再没有就在内存里从基线重打 p01+p02。
 *
 * 做法：从产物文本里原样抽出 _musicCtl(action) 的源码，放进 vm，配一套假的
 *       playlist/currentTrackIdx/audioEl 与记录式 playTrack/togglePlay/nextTrack/prevTrack，
 *       断言「外部可观察行为」：各 action 调到哪个既有函数、失败回执可读、非法 action 不抛穿。
 *       其余（开关门、能力块注入、Sing 解耦、不碰音量/删歌）用对产物文本的静态断言覆盖。
 *       内部变量名不作断言。
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const E = require('./_engine.js');

const HERE = __dirname;
const BASE = path.join(HERE, 'baseline', 'InternalBeyond-f8955fd1.html');
const DEF_OUT = path.join(HERE, 'out', 'InternalBeyond.patched.html');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' —— ' + extra : '')); }
}

/* ── 取出产物文本 ── */
const baseText = fs.readFileSync(BASE, 'utf8');
let outText;
if (process.argv[2]) outText = fs.readFileSync(process.argv[2], 'utf8');
else if (fs.existsSync(DEF_OUT)) outText = fs.readFileSync(DEF_OUT, 'utf8');
else outText = E.runChain([require('./p01-连接测试.js'), require('./p02-AI控制播放器.js')], baseText).text;

/* 从 startIdx 起按花括号配对取出一个函数定义 */
function takeBlock(text, startIdx) {
  let i = text.indexOf('{', startIdx), d = 0;
  for (; i < text.length; i++) {
    if (text[i] === '{') d++;
    else if (text[i] === '}') { d--; if (!d) return text.slice(startIdx, i + 1); }
  }
  throw new Error('取块失败：花括号未配平');
}

const musicCtlSrc = takeBlock(outText, outText.indexOf('function _musicCtl(action){'));
if (!/_musicCtl/.test(musicCtlSrc)) { console.error('✗ 产物里没找到 _musicCtl 源码'); process.exit(1); }

/* ── 假环境 ── */
function makeCtx() {
  const ctx = {
    playlist: [], currentTrackIdx: -1, audioEl: { paused: true },
    __calls: [],
    playTrack: function (i) { ctx.__calls.push('playTrack(' + i + ')'); },
    togglePlay: function () { ctx.__calls.push('togglePlay'); },
    nextTrack: function () { ctx.__calls.push('nextTrack'); },
    prevTrack: function () { ctx.__calls.push('prevTrack'); },
    console: console
  };
  vm.createContext(ctx);
  vm.runInContext(musicCtlSrc, ctx);
  return ctx;
}
function setList(ctx, names) {
  ctx.playlist = names.map(function (n) { return { name: n }; });
}
function runAction(ctx, action) {
  return vm.runInContext('_musicCtl(' + JSON.stringify(action) + ')', ctx);
}

console.log('== P02 AI 控制播放器（逻辑层 + 静态断言）==');

/* ── 行为层：_musicCtl ── */
let ctx = makeCtx();
let r;

/* 1. 空歌单 → 失败回执，不调任何播放函数 */
ctx = makeCtx();
r = runAction(ctx, 'play');
ok('空歌单 + play → 失败回执、不播', r.ok === false && /没有歌曲/.test(r.text) && ctx.__calls.length === 0, JSON.stringify(r) + ' calls=' + ctx.__calls);

/* 2. 空歌单 + next/prev → 失败回执 */
ctx = makeCtx();
r = runAction(ctx, 'next');
ok('空歌单 + next → 失败回执', r.ok === false && ctx.__calls.length === 0, JSON.stringify(r));

/* 3. 未选曲 + play → 调 playTrack(0) */
ctx = makeCtx(); setList(ctx, ['A.mp3', 'B.mp3']); ctx.currentTrackIdx = -1; ctx.audioEl.paused = true;
r = runAction(ctx, 'play');
ok('未选曲 + play → 调 playTrack(0)', r.ok === true && ctx.__calls.indexOf('playTrack(0)') !== -1, JSON.stringify(r) + ' calls=' + ctx.__calls);

/* 4. 暂停中 + play → 调 togglePlay（继续），不再 playTrack 重置 */
ctx = makeCtx(); setList(ctx, ['A.mp3']); ctx.currentTrackIdx = 0; ctx.audioEl.paused = true;
r = runAction(ctx, 'play');
ok('暂停中 + play → 调 togglePlay 继续', r.ok === true && /继续播放/.test(r.text) && ctx.__calls.indexOf('togglePlay') !== -1 && ctx.__calls.indexOf('playTrack(0)') === -1, JSON.stringify(r) + ' calls=' + ctx.__calls);

/* 5. 播放中 + play → 不重复调函数 */
ctx = makeCtx(); setList(ctx, ['A.mp3']); ctx.currentTrackIdx = 0; ctx.audioEl.paused = false;
r = runAction(ctx, 'play');
ok('播放中 + play → 幂等、不重复调', r.ok === true && /正在播放/.test(r.text) && ctx.__calls.length === 0, JSON.stringify(r) + ' calls=' + ctx.__calls);

/* 6. 播放中 + pause → 调 togglePlay（暂停） */
ctx = makeCtx(); setList(ctx, ['A.mp3']); ctx.currentTrackIdx = 0; ctx.audioEl.paused = false;
r = runAction(ctx, 'pause');
ok('播放中 + pause → 调 togglePlay 暂停', r.ok === true && /已暂停/.test(r.text) && ctx.__calls.indexOf('togglePlay') !== -1, JSON.stringify(r) + ' calls=' + ctx.__calls);

/* 7. 未播放 + pause → 失败回执，不调 togglePlay */
ctx = makeCtx(); setList(ctx, ['A.mp3']); ctx.currentTrackIdx = -1; ctx.audioEl.paused = true;
r = runAction(ctx, 'pause');
ok('未播放 + pause → 失败回执', r.ok === false && ctx.__calls.length === 0, JSON.stringify(r));

/* 8. next → 调 nextTrack */
ctx = makeCtx(); setList(ctx, ['A', 'B']); ctx.currentTrackIdx = 0;
r = runAction(ctx, 'next');
ok('next → 调 nextTrack', r.ok === true && /下一首/.test(r.text) && ctx.__calls.indexOf('nextTrack') !== -1, JSON.stringify(r));

/* 9. prev → 调 prevTrack */
ctx = makeCtx(); setList(ctx, ['A', 'B']); ctx.currentTrackIdx = 1;
r = runAction(ctx, 'prev');
ok('prev → 调 prevTrack', r.ok === true && /上一首/.test(r.text) && ctx.__calls.indexOf('prevTrack') !== -1, JSON.stringify(r));

/* 10. 非法 action → 可读错误回执，不抛穿 */
ctx = makeCtx(); setList(ctx, ['A']); ctx.currentTrackIdx = 0; ctx.audioEl.paused = false;
let threw = false;
try { r = runAction(ctx, 'volume'); } catch (e) { threw = true; r = { ok: false, text: String(e && e.message) }; }
ok('非法 action → 错误回执、不抛穿', threw === false && r.ok === false && /不认识的播放指令/.test(r.text), JSON.stringify(r));

/* 11. 大小写不敏感：PLAY / NEXT */
ctx = makeCtx(); setList(ctx, ['A']); ctx.currentTrackIdx = 0; ctx.audioEl.paused = true;
r = runAction(ctx, 'PLAY');
ok('action 大小写不敏感（PLAY 继续）', r.ok === true && ctx.__calls.indexOf('togglePlay') !== -1, JSON.stringify(r));

/* ── 静态断言：开关门 / 能力块 / 解耦 / 不越界 ── */
/* 12. 默认关：初始缓存 false，且注入/执行都条件门控 */
ok('默认关：_aiMusicCtlOn 初始 false', /let _aiMusicCtlOn=false;/.test(outText), '未找到初始 false');
ok('开关门：执行器有 !_aiMusicCtlOn 拦截', outText.indexOf('if(!_aiMusicCtlOn){results.push({type:\'music\'') !== -1);
ok('开关门：双轨执行层按 _aiMusicCtlOn 拦截', outText.indexOf("!_aiMusicCtlOn") !== -1 && outText.indexOf("op.kind==='music'") !== -1);

/* 13. 能力块存在且只含 play/pause/next/prev */
ok('能力块常量已定义', outText.indexOf('const _MUSICCTL_INSTR_BLOCK=') !== -1);
const blk = outText.slice(outText.indexOf('const _MUSICCTL_INSTR_BLOCK='), outText.indexOf('/* p02 */', outText.indexOf('const _MUSICCTL_INSTR_BLOCK=')));
ok('能力块仅 play/pause/next/prev 四动作', /action="play"/.test(blk) && /action="pause"/.test(blk) && /action="next"/.test(blk) && /action="prev"/.test(blk) && !/action="(volume|seek|delete|add)/.test(blk), blk.slice(0, 120));

/* 14. ws_music 进了解析正则 */
ok('双轨通路识别 music', outText.indexOf("op.kind==='music'") !== -1);

/* 15. Sing 解耦：正在听注入路径与 Sing 开关原样保留 */
ok('Sing 解耦：#api-music-toggle 原样在', outText.indexOf('id="api-music-toggle"') !== -1);
ok('Sing 解耦：musicEnabled 读取/写入在', /musicEnabled:!!document\.getElementById\('api-music-toggle'\)/.test(outText) && /s\.musicEnabled/.test(outText));
ok('Sing 解耦：正在听注入 _musicTailD 调用在', (outText.match(/_musicTailD\(\)/g) || []).length >= 2);

/* 16. 不越界：新增控制代码不碰音量/删歌/歌单/网络 */
ok('_musicCtl 不碰音量/删歌/网络', !/audioEl\.volume/.test(musicCtlSrc) && !/removeTrack|playMode=|fetch\(/.test(musicCtlSrc), musicCtlSrc.slice(0, 80));
ok('新增执行分支不发网络请求', outText.indexOf("op.kind==='music'") !== -1 && /_musicCtl\(/.test(outText));

/* 17. 回执归类：失败动作归「控制播放器」 */
ok('失败回执动作归类 控制播放器', outText.indexOf("r.type==='music'?'控制播放器'") !== -1);

/* 18. 反向：产物里确有 ws_music 执行路径（去掉 P02-3 后此断言会挂，即证明它真在） */
ok('执行路径存在：双轨 music 分支', /op\.kind==='music'/.test(outText));

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
