/* 补丁清单 · P02 AI 控制播放器（电脑端 `InternalBeyond.html`）
 *
 * 对应票：`.scratch\ib-ibm-parity\issues\02-AI控制播放器.md`
 * 派活单：`.scratch\ib-ibm-parity\派活-p02-AI控制播放器.md`
 * 依据版本：上游 `Sui-IB/InternalBeyond` `b0d7919d`（V2.7.5，2,819,874 B，sha256 a49fb343…8cbd6）
 *
 * ⚠️ 转义：锚点与产出代码一律用 String.raw。
 *
 * 目标：让 TA 用指令控制本地播放器的 播放/暂停/切歌（此前电脑端只能「听见」正在听什么，
 *       即 Sing/一起听正向注入；本项补反向控制）。纯前端、纯离线、仅本地 playlist。
 *
 * 本集共 12 处：
 *   P02-1   设置组加「允许 AI 控制播放器」checkbox（默认关，抄 #api-music-toggle 体例）
 *   P02-2   播放器函数区新增 _musicCtl(action) 唯一入口 + 开关同步缓存与存取函数
 *   P02-3a  _WS_OPEN_RE 识别 ws_music
 *   P02-3b  手机端标签清洗：开关开时 music 不再被洗成占位（放行给解析执行）
 *   P02-3c  解析器新增 kind==='music' 分支（取 action 属性）
 *   P02-3d  执行器 _execWsOps 新增 music 分支（调 _musicCtl，toast + 回执回传）
 *   P02-4a  定义 _MUSICCTL_INSTR_BLOCK 能力说明常量
 *   P02-4b  群聊系统提示拼接处条件注入能力块
 *   P02-4c  单聊系统提示拼接处条件注入能力块
 *   P02-4d  失败回执动作归类 +music→「控制播放器」
 *   P02-5a  loadSummarySettingsUI 还原勾选（用已预热缓存）
 *   P02-5b  init() 预热开关同步缓存
 *
 * 与 Sing 解耦：#api-music-toggle / musicEnabled / _musicTailD 正在听注入一律不动；
 *   本开关独立存 apiSettings·aiMusicCtl，关它不影响「正在听什么」的正向注入。
 * 不碰：音量、播放模式、歌单增删、callApi 聊天主链、数据表/备份格式。
 */
module.exports = {
  id: 'p02', about: 'AI 控制播放器',
  upstream: { repo: 'Sui-IB/InternalBeyond', commit: 'b0d7919d', bytes: 2819874, sha256: 'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6' },
  expectCount: 9,
  /* 原有锚点：打完补丁必须还在（证明没改坏播放器核心、Sing、聊天主链）。
   * 注：不挂 p01 的按钮 id（同 p07 口径：单跑 --only p02 时基线还没有它）。 */
  guards: [
    'function togglePlay(){',
    'function playTrack(i){',
    'function nextTrack(){',
    'function prevTrack(){',
    'id="api-music-toggle"',
    'musicEnabled:',
    'function _musicTailD()',
    'async function callApi(cfg,userMsg,opts){',
    '［手机端操作 · '
  ],
  /* 新增锚点：证明本集真的落上了 */
  adds: [
    'id="api-music-ctl-toggle"',
    'function _musicCtl(action)',
    '_MUSICCTL_INSTR_BLOCK',
    '_aiMusicCtlOn',
    'ws_music',
    'saveAiMusicCtl()'
  ],
  /* 人工验收清单（四列，跑流水线时会渲染进自检报告） */
  accept: [
    [
      '设置里多「允许 AI 控制播放器」开关（与 启用Sing 同组），默认关',
      'API/设置 → Presence/Music 组（启用Sing 下方）',
      '新开关默认关；勾选后 toast「已允许 AI 控制本地播放器」；不破坏 启用Sing 原有行为',
      '把 p02-AI控制播放器.js 移出 _patches\\ 后重跑 _driver.js（产物即回退到干净基线）'
    ],
    [
      '开关开后 TA 可控制：播放/暂停/切歌都有可见回执，播放器状态与回执一致',
      '音乐面板本地导入几首歌 → 开开关 → 让 TA 播放/暂停/切上一首/下一首',
      '本机 toast 显示「已开始播放/继续/已暂停/已切到下一首/上一首」；播放按钮图标随动；AI 下一轮收到该回执',
      '同上'
    ],
    [
      '与 Sing 解耦：关掉本开关，正在听注入照旧',
      '只开 Sing、关本开关 → 播放中发消息；再只开本开关、关 Sing',
      '前者 TA 仍收到「正在听什么」；后者无控制能力（聊天里不出现播放器指令说明）',
      '同上'
    ],
    [
      '默认关无副作用：不开开关正常使用，与改前一致',
      '不开开关随便聊、播放音乐、开 Sing',
      '聊天里不出现可控制播放器的工具说明；<ws_music> 仍显示为「手机端操作 · 播放器」占位',
      '同上'
    ]
  ],
  patches: [
    /* ── P02-1  设置组加 checkbox ── */
    {
      label: 'P02-1 Music/Presence 组加「允许 AI 控制播放器」checkbox',
      old: String.raw`      <div class="api-form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="api-music-toggle" onchange="saveSummarySettings()" style="width:auto;accent-color:var(--accent)"> 启用Sing</label>
      </div>`,
      new: String.raw`      <div class="api-form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="api-music-toggle" onchange="saveSummarySettings()" style="width:auto;accent-color:var(--accent)"> 启用Sing</label>
      </div>
      <div class="api-form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="api-music-ctl-toggle" onchange="saveAiMusicCtl()" style="width:auto;accent-color:var(--accent)"> 允许 AI 控制播放器</label>
        <p style="font-size:0.72rem;opacity:0.55;margin:4px 0 0;line-height:1.6">默认关。开后 TA 可用指令播放/暂停/切歌（仅本机本地曲库，纯离线）；与「启用Sing」相互独立，关掉不影响正在听的曲目上报。</p>
      </div>`
    },
    /* ── P02-2  播放器控制唯一入口 + 开关缓存/存取 ── */
    {
      label: 'P02-2 nextTrack 后新增 _musicCtl(action) 与开关存取函数',
      old: String.raw`function nextTrack(){if(!playlist.length)return;if(playMode==='random'){playTrack(Math.floor(Math.random()*playlist.length));return}playTrack(currentTrackIdx>=playlist.length-1?0:currentTrackIdx+1)}`,
      new: String.raw`function nextTrack(){if(!playlist.length)return;if(playMode==='random'){playTrack(Math.floor(Math.random()*playlist.length));return}playTrack(currentTrackIdx>=playlist.length-1?0:currentTrackIdx+1)}
let _aiMusicCtlOn=false;/* p02：AI 控制本地播放器开关的同步缓存——boot/切换时刷新；段入层同步读它决定是否放行 ws_music */
function _musicCtl(action){/* p02：AI 控制本地播放器唯一入口——只包一层既有 playTrack/togglePlay/nextTrack/prevTrack，不碰音量/歌单/网络 */
  const a=String(action||'').toLowerCase();
  const _name=function(){return (currentTrackIdx>=0&&playlist[currentTrackIdx])?playlist[currentTrackIdx].name:''};
  if(a==='play'||a==='resume'){
    if(!playlist.length)return{ok:false,text:'播放器里还没有歌曲：先在音乐面板导入几首，我才能播放或切歌'};
    if(currentTrackIdx===-1){playTrack(0);return{ok:true,text:'已开始播放「'+playlist[0].name+'」'}}
    if(audioEl.paused){togglePlay();return{ok:true,text:'继续播放「'+_name()+'」'}}
    return{ok:true,text:'正在播放「'+_name()+'」，无需重复播放'};
  }
  if(a==='pause'){
    if(currentTrackIdx===-1||audioEl.paused)return{ok:false,text:'当前没有正在播放的曲目'};
    togglePlay();return{ok:true,text:'已暂停「'+_name()+'」'};
  }
  if(a==='next'){if(!playlist.length)return{ok:false,text:'播放器里还没有歌曲'};nextTrack();return{ok:true,text:'已切到下一首'};}
  if(a==='prev'){if(!playlist.length)return{ok:false,text:'播放器里还没有歌曲'};prevTrack();return{ok:true,text:'已切到上一首'};}
  return{ok:false,text:'不认识的播放指令「'+(action||'空')+'」：只支持 play / pause / next / prev'};
}
async function saveAiMusicCtl(){/* p02：独立存 apiSettings·aiMusicCtl，读改写单键、不重建整表；与 Sing 的 summarySettings 解耦 */
  const el=document.getElementById('api-music-ctl-toggle');
  const on=!!(el&&el.checked);
  try{await dbPut('apiSettings',{id:'aiMusicCtl',on:on})}catch(e){}
  _aiMusicCtlOn=on;
  try{toast(on?'已允许 AI 控制本地播放器（播放/暂停/切歌）':'已关闭 AI 控制播放器')}catch(e){}
}
async function _aiMusicCtlWarm(){try{const s=await dbGet('apiSettings','aiMusicCtl');_aiMusicCtlOn=!!(s&&s.on)}catch(e){_aiMusicCtlOn=false}}
function _aiMusicCtlApplyUI(){const el=document.getElementById('api-music-ctl-toggle');if(el)el.checked=_aiMusicCtlOn}
async function _aiMusicCtlBoot(){await _aiMusicCtlWarm();_aiMusicCtlApplyUI()}`
    },
    /* ── P02-3  双轨：手机端通路上的 music，开关开时改本地执行（展示仍走操作卡） ── */
    {
      label: 'P02-3 _execWsOps 手机端通路：music 开关开时本地执行（双轨）',
      old: String.raw`if(op.type==='mobile'){results.push({type:op.kind,ok:false,mobile:true,fed:true,reason:'手机端专属，电脑端不执行'});continue}/* v139 */`,
      new: String.raw`if(op.type==='mobile'){/* p02 双轨：music 在本机开关开时真执行；手机导入记录不会走到这里（只渲染） */
    if(op.kind==='music'){var _mA=_wsAttr(op.attrs||'','action')||_wsAttr(op.attrs||'','dir')||'';
      if(!_aiMusicCtlOn){results.push({type:'music',action:_mA,ok:false,mobile:true,fed:true,reason:'未开启「允许 AI 控制播放器」'});continue}
      var _mR=_musicCtl(_mA);try{toast(_mR.text)}catch(e){}
      if(_mR.ok)try{_wsPendingOpFeedback.push({actor:authorName,text:'[本地播放器] '+_mR.text})}catch(e){}
      results.push({type:'music',action:_mA,ok:!!_mR.ok,reason:(_mR.ok?(_mR.text||'已完成'):_mR.text),mobile:true,fed:true});continue}
    results.push({type:op.kind,ok:false,mobile:true,fed:true,reason:'手机端专属，电脑端不执行'});continue}/* v139 */`
    },
    /* ── P02-4a  定义能力块常量 ── */
    {
      label: 'P02-4a 定义 _MUSICCTL_INSTR_BLOCK 能力说明常量',
      old: String.raw`不要在文字里复述选项。';/* v88：删逐模块主动性措辞（全开语义漂移第二刀） */`,
      new: String.raw`不要在文字里复述选项。';/* v88：删逐模块主动性措辞（全开语义漂移第二刀） */
const _MUSICCTL_INSTR_BLOCK='\n\n【本地播放器】用户允许你直接控制这台电脑上的本地音乐播放器。需要播放、暂停或切歌时，单独一行输出对应指令（不要包进代码块）：\n<ws_music action="play"/>\n<ws_music action="pause"/>\n<ws_music action="next"/>\n<ws_music action="prev"/>\n规则：action 四选一——play 开始/继续播放，pause 暂停，next 下一首，prev 上一首；只控制播放/暂停/切歌，不调音量、不改播放模式、不管理歌单；操作结果会在之后的消息回传给你。没有标签就没有动作，不要在文字里假装已经切歌。';/* p02 */`
    },
    /* ── P02-4b  群聊注入 ── */
    {
      label: 'P02-4b 群聊系统提示拼接处条件注入能力块',
      old: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（与手机端一致） */`,
      new: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（与手机端一致） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */`
    },
    /* ── P02-4c  单聊注入 ── */
    {
      label: 'P02-4c 单聊系统提示拼接处条件注入能力块',
      old: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（会话内稳定，缓存友好） */`,
      new: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（会话内稳定，缓存友好） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */`
    },
    /* ── P02-4d  失败回执动作归类 ── */
    {
      label: 'P02-4d 失败回执动作归类 +music→控制播放器',
      old: String.raw`r.type==='make_xlsx'?'生成 Excel 表格':'项目操作';/* v76：新指令失败经此通道自动回传 */`,
      new: String.raw`r.type==='make_xlsx'?'生成 Excel 表格':r.type==='music'?'控制播放器':'项目操作';/* v76：新指令失败经此通道自动回传 *//* p02：music 失败归「控制播放器」 */`
    },
    /* ── P02-5a  设置页还原勾选 ── */
    {
      label: 'P02-5a loadSummarySettingsUI 还原本开关勾选',
      old: String.raw`  if(sel){sel.innerHTML='<option value="">跟随对话 API（默认）</option>'+apiConfigs.map(a=>'<option value="'+a.id+'"'+(s.summaryApiId===a.id?' selected':'')+'>'+esc(a.nickname||a.model||'未命名')+'</option>').join('')}
  renderSummaryMgmt();`,
      new: String.raw`  if(sel){sel.innerHTML='<option value="">跟随对话 API（默认）</option>'+apiConfigs.map(a=>'<option value="'+a.id+'"'+(s.summaryApiId===a.id?' selected':'')+'>'+esc(a.nickname||a.model||'未命名')+'</option>').join('')}
  _aiMusicCtlApplyUI();/* p02：还原「允许 AI 控制播放器」勾选（用已预热缓存，不读改写 summarySettings） */
  renderSummaryMgmt();`
    },
    /* ── P02-5b  boot 预热缓存 ── */
    {
      label: 'P02-5b init() 预热开关同步缓存',
      old: String.raw`try{_askGlobalRestoreUI()}catch(e){}/* 进阶指令与选项卡开关必须等 DB 打开后再读 */`,
      new: String.raw`try{_askGlobalRestoreUI()}catch(e){}/* 进阶指令与选项卡开关必须等 DB 打开后再读 */try{await _aiMusicCtlBoot()}catch(e){}/* p02：预热 AI 控制播放器开关同步缓存（段入层同步读它） */`
    }
  ]
};
