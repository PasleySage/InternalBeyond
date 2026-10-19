/* p05-收藏夹.js
 * 对标手机端「收藏夹」：按好友分存，只存引用与文字（语音存时长/文字稿、图片存张数），
 * 不复制媒体原件到收藏行——回读时按 msgId 回 chatMessages 取原消息。
 * 数据存 apiSettings 表：fav_<msgId> 行 {app:'fav',key:msgId,v:{...},updated}。
 * 三处入口：全屏 ICode 旁的星钮、小窗关闭钮旁的星钮、消息悬停动作族里的收藏键。
 * 面板：按好友左右切换 + 正文/署名/频道搜索 + 长文折角 + 右上角移除（不动原消息）。
 * 纯前端纯离线；随 _ioDoExport 全量导出（apiSettings 整表）往返。
 *
 * ⚠️ 锚点与产出代码一律 String.raw（与 p01 同纪律：普通模板字符串会吃反斜杠）。
 */
module.exports={
  id:'p05',about:'收藏夹',
  upstream:{repo:'Sui-IB/InternalBeyond',commit:'b0d7919d',bytes:2819874,sha256:'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6'},
  expectCount:4,
  /* 原有锚点：打完 p05 必须还在（证明没改坏既有界面、既有能力块与备份导出） */
  guards:[
    'onclick="openWorkspace()" title="ICode"',/* 全屏 ICode 入口原位 */
    'onclick="closeChatPanel()"',/* 小窗关闭原位 */
    '_ensureQuoteBtn(el);_ensureEditBtn(el)',/* 消息动作族原位（p05 在其后追加 _ensureFavBtn） */
    'function dbGetAll(s)',/* 存储层 */
    "AM_PRIOS=['always','normal','low']",/* 记忆优先级未被改 */
    '_ioDoExport',/* 备份导出仍在 */
    "op.kind==='music'",/* p02 双轨共存 */
    "op.kind==='sticker'"/* p04 双轨共存 */
  ],
  /* 新增锚点：证明本集真的落上了 */
  adds:[
    'id="fav-open-full"',/* 全屏入口 */
    'id="fav-open-mini"',/* 小窗入口 */
    '_ensureFavBtn(el)',/* 消息动作 */
    'function _favKey(',/* 存储 */
    "app:'fav'",/* 存储标记 */
    '_favOpen()',/* 面板入口 */
    'id="p05-fav-css"',/* 样式 */
    '_favBoot()'/* boot */
  ],
  /* 人工验收清单（四列） */
  accept:[
    [
      '全屏页 ICode 按钮旁多一个同级星形按钮（小窗关闭钮旁也多一个纯图标星钮），视觉沿用既有控件，未新造入口语言',
      '全屏：右上点 ICode 旁的星；小窗：聊天面板右上角 ✕ 旁的星',
      '两种入口都打开「XX的收藏夹」全屏面板；点返回 ‹ 或点背景关闭',
      '把 p05-收藏夹.js 移出 _patches\\ 后重跑 _driver.js，两个星钮与悬停收藏键全部消失'
    ],
    [
      '每条可操作消息（有删除键的）悬停时，右上角动作族里多一个星形收藏键（与引用/编辑同列同体例）',
      '鼠标悬停在任一自己或 TA 的消息上 → 点星',
      'toast「已收藏」；空内容消息（纯图片无文字等边界）提示「这条消息没有可收藏的内容」；不写聊天记录、不改原消息',
      '同上（移出 p05）'
    ],
    [
      '收藏按好友分存：面板顶部名片显示当前好友，‹ › 在好友间切换；标题随好友变「XX的收藏夹」',
      '从两个好友处各收藏几条消息 → 打开收藏夹 → 点 ‹ / ›',
      '纸墙只显示当前好友的收藏；hint 显示「共 N 条收藏」；切到空好友显示空态文案',
      '同上'
    ],
    [
      '搜索：顶栏放大镜展开输入框，按正文/署名/频道名不区分大小写过滤当前好友',
      '点放大镜 → 输入关键词',
      '实时过滤；搜不到显示「没有找到匹配的收藏。」；再点放大镜收起并清空',
      '同上'
    ],
    [
      '每张纸右上角 × 移除：ibConfirmX 确认后只删收藏行，原聊天消息不动',
      '收藏一条消息 → 打开收藏夹 → 点某张纸右上角 × → 确认',
      '纸从墙消失；回到聊天，原消息仍在；再次打开收藏夹该纸不出现',
      '同上'
    ],
    [
      '收藏行随备份往返：fav_* 行存在 apiSettings 表，_ioDoExport 全量导出时一并导出',
      '收藏几条 → 导出备份 → 在另一环境导入 → 打开收藏夹',
      '导出 JSON 里能看到 id 以 fav_ 开头、app 为 fav 的行；导入后收藏夹内容回来',
      '同上'
    ],
    [
      '正文/语音/图片回读：文字纸按聊天 Markdown 渲染（与聊天气泡同一 `_mdRenderHtml`）；语音/图片纸显示类型标记并尝试按 msgId 回读原消息',
      '收藏一条带语音或图片的消息 → 打开收藏夹看那张纸',
      '正文纸：长文默认折叠、点右下角折角展开；语音纸显示「🎤 语音」并尝试补出文字稿；图片纸显示「🖼 图片 N 张」；原消息已删时只显示文字、不报错',
      '同上'
    ]
  ],
  patches:[
    /* ── P05-1 全屏页入口：ws-open-btn 之后追加同级星钮 ── */
    {
      label:'P05-1 全屏页 ICode 旁加收藏夹星钮（id=fav-open-full）',
      old:String.raw`          <button class="ws-btn" id="ws-open-btn" onclick="openWorkspace()" title="ICode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v8.5"/><path d="M8.5 8.5 12 12l3.5-3.5"/><path d="M4 13.5v3.9A2.6 2.6 0 0 0 6.6 20h10.8a2.6 2.6 0 0 0 2.6-2.6v-3.9"/></svg></button>`,
      new:String.raw`          <button class="ws-btn" id="ws-open-btn" onclick="openWorkspace()" title="ICode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v8.5"/><path d="M8.5 8.5 12 12l3.5-3.5"/><path d="M4 13.5v3.9A2.6 2.6 0 0 0 6.6 20h10.8a2.6 2.6 0 0 0 2.6-2.6v-3.9"/></svg></button>
          <button class="ws-btn" id="fav-open-full" onclick="_favOpen()" title="收藏夹"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px;opacity:0.92"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></button>`
    },
    /* ── P05-2 浮动小窗入口：名字 span 后插同级纯图标星钮（在 .chat-header-left 内） ── */
    {
      label:'P05-2 小窗顶栏名字后加收藏夹星钮（id=fav-open-mini）',
      old:String.raw`      <span class="chat-ai-name" id="chat-header-name">Glasswing</span>
    </div>
    <button class="chat-close" onclick="closeChatPanel()">✕</button>`,
      new:String.raw`      <span class="chat-ai-name" id="chat-header-name">Glasswing</span>
      <button id="fav-open-mini" onclick="_favOpen()" title="收藏夹" style="background:none;border:none;padding:0 3px;cursor:pointer;line-height:1;display:inline-flex;align-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></button>
    </div>
    <button class="chat-close" onclick="closeChatPanel()">✕</button>`
    },
    /* ── P05-3 消息动作族：_ensureEditBtn 之后加 _ensureFavBtn ── */
    {
      label:'P05-3 消息悬停懒注入追加收藏键 _ensureFavBtn(el)',
      old:String.raw`  if(el){_ensureQuoteBtn(el);_ensureEditBtn(el);if(el.classList.contains('bs-msg'))_bsEnsureSegActs(el)}/* v129：铅笔（修改）与引用键同一懒注入 */`,
      new:String.raw`  if(el){_ensureQuoteBtn(el);_ensureEditBtn(el);_ensureFavBtn(el);if(el.classList.contains('bs-msg'))_bsEnsureSegActs(el)}/* v129：铅笔（修改）与引用键同一懒注入；p05：收藏键同族 */`
    },
    /* ── P05-4 主 IIFE：存储 + 面板 + 交互（锚 dbDelete 行尾） ── */
    {
      label:'P05-4 整段 IIFE：收藏夹 CSS + 存储层 + 悬停键 + 面板交互 + boot',
      old:String.raw`function dbDelete(s,k){return new Promise((r,j)=>{const t=db.transaction(s,'readwrite');t.objectStore(s).delete(k);t.oncomplete=()=>{_ibFsDirty=true;r()};t.onerror=()=>j(t.error)})}`,
      new:String.raw`function dbDelete(s,k){return new Promise((r,j)=>{const t=db.transaction(s,'readwrite');t.objectStore(s).delete(k);t.oncomplete=()=>{_ibFsDirty=true;r()};t.onerror=()=>j(t.error)})}
(function(){/* p05：收藏夹——存储+面板+交互；纯前端纯离线，按好友分存，只存引用与文字 */
'use strict';
const _favCss=document.createElement('style');
_favCss.id="p05-fav-css";
_favCss.textContent=
 '#fav-open-mini{color:var(--light)}'
+'body:not(.theme-infernal) #chat-panel #fav-open-mini{color:#152c58}'
+'#fav-open-mini:hover{color:#0a1e42}'
+'.fav-ov{position:fixed;inset:0;z-index:9997;background:rgba(10,18,38,0.55);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}'
+'.fav-ov.open{display:flex}'
+'.fav-modal{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:16px;width:100%;max-width:720px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,0.35)}'
+'.fav-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--glass-border);flex:none}'
+'.fav-back{width:30px;height:30px;border-radius:50%;border:1px solid var(--glass-border);background:none;color:var(--text-primary);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}'
+'#fav-tt{flex:1;min-width:0;font-size:0.95rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
+'#fav-sq{display:flex;align-items:center;gap:6px;flex:none}'
+'#fav-sq-b{width:30px;height:30px;border-radius:50%;border:1px solid var(--glass-border);background:none;color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center}'
+'#fav-sq-in{width:0;opacity:0;border:1px solid var(--glass-border);border-radius:999px;background:rgba(255,255,255,0.06);color:var(--text-primary);font-size:0.82rem;height:28px;outline:none;padding:0;transition:width 0.2s,opacity 0.2s;box-sizing:border-box}'
+'#fav-sq.open #fav-sq-in{width:160px;opacity:1;padding:0 10px}'
+'.fav-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px 20px}'
+'.fav-card{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}'
+'.fav-av{width:38px;height:38px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.95rem;flex:none}'
+'.fav-nm{flex:1;min-width:0;font-size:0.9rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
+'.fav-nav{width:28px;height:28px;border-radius:50%;border:1px solid var(--glass-border);background:none;color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}'
+'.fav-hint{flex-basis:100%;font-size:0.7rem;color:var(--text-muted);margin-top:2px}'
+'.fav-wall{display:flex;flex-wrap:wrap;gap:12px;padding:2px}'
+'.fav-paper{position:relative;min-width:200px;max-width:280px;flex:1 1 220px;background:rgba(255,255,255,0.94);color:#22304a;border-radius:8px;padding:12px 14px 18px;box-shadow:0 4px 14px rgba(20,30,60,0.18);transform:rotate(-1.2deg);line-height:1.55}'
+'.fav-paper:nth-child(2n){transform:rotate(1deg)}'
+'.fav-paper:nth-child(3n){transform:rotate(-0.5deg)}'
+'.fav-paper .fav-who{font-size:0.74rem;color:#8890a4;margin-bottom:4px}'
+'.fav-paper .fav-kind{display:inline-block;font-size:0.68rem;color:#5a6b8c;margin-left:6px}'
+'.fav-paper .fav-paper-text{font-size:0.84rem;white-space:pre-wrap;word-break:break-word}'
+'.fav-paper.folded .fav-paper-text{max-height:80px;overflow:hidden}'
+'.fav-paper .fav-meta{font-size:0.66rem;color:#9aa3b8;margin-top:8px}'
+'.fav-paper .fav-del{position:absolute;top:4px;right:6px;width:18px;height:18px;border:none;background:none;color:#999;cursor:pointer;font-size:0.85rem;line-height:1;padding:0}'
+'.fav-paper .fav-del:hover{color:#e88}'
+'.fav-paper .fav-fold{position:absolute;right:0;bottom:0;width:0;height:0;border-style:solid;border-width:0 0 14px 14px;border-color:transparent transparent #c9d4e8 transparent;cursor:pointer}'
+'.fav-empty{text-align:center;color:#999;padding:40px 10px;font-size:0.85rem;line-height:1.7}'
+'.fav-img{max-width:200px;max-height:160px;border-radius:8px;margin-top:6px;display:block;cursor:pointer;border:1px solid rgba(175,195,228,0.15)}'
+'.chat-msg-fav{position:absolute;top:4px;right:66px;width:16px;height:16px;border:none;background:none;color:var(--text-muted);cursor:pointer;opacity:0;padding:0;border-radius:4px;line-height:1;display:flex;align-items:center;justify-content:center;transition:opacity 0.2s,color 0.2s,background 0.2s}'
+'.chat-msg-fav svg{width:12px;height:12px}'
+'.chat-msg:hover .chat-msg-fav{opacity:0.5}'
+'.chat-msg-fav:hover{opacity:1!important;color:var(--accent-light);background:rgba(114,168,216,0.14)}'
+'.chat-msg.user .chat-msg-fav{right:auto;left:66px}'
+'body:not(.theme-infernal) .chat-msg-fav:hover{color:#2a6bb0;background:rgba(70,130,190,0.12)}';
document.head.appendChild(_favCss);
const _favState={curFriend:0,friends:[],items:[],allItems:[],searchOpen:false,query:''};
let _favOv=null;
/* ── 存储层：抄手机端字段语义；fav_<msgId> 行，app='fav' ── */
function _favKey(m){return 'fav_'+String(m&&m.id||'')}/* p05：收藏行主键 */
function _favCfgName(friendId){/* p05：好友名片名——单聊取 nickname||model，群聊取群名；全局未定义时兜底 TA/群聊 */
  try{
    if(!friendId)return 'TA';
    if(String(friendId).indexOf('group_')===0){
      let gs=null;try{if(typeof groups!=='undefined'&&Array.isArray(groups))gs=groups}catch(e){}
      if(gs){const g=gs.find(function(x){return x&&x.id===friendId});if(g&&g.name)return g.name}
      return '群聊';
    }
    const cfgs=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];
    let c=null;try{c=cfgs.find(function(a){return a&&a.id===friendId})}catch(e){}
    return (c&&(c.nickname||c.model))||'TA';
  }catch(e){return 'TA'}
}
function _favTxt(m){/* p05：清洗正文——去 think 块/标签/ibvoice，压缩换行，截 6000 */
  let t=String((m&&m.text)||(m&&m.content)||'');
  t=t.replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/<thinking>[\s\S]*?<\/thinking>/gi,'');
  t=t.replace(/<\/?(ws|mem|cal|ib|bt|am)_[^>]*>/gi,'');
  t=t.replace(/<\/?ibvoice>/gi,'');
  t=t.replace(/\n{2,}/g,'\n').trim();
  return t.slice(0,6000);
}
function _favWho(m){return m.role==='user'?'我':(m.senderName||_favCfgName(m.friendId)||'TA')}
async function _favAdd(m){/* p05：收藏一条消息；无文字且无语音图片则提示并放弃 */
  if(!m)return false;
  const txt=_favTxt(m);
  const hasVoice=!!(m.voice),hasImg=!!(m.images&&m.images.length);
  if(!txt&&!hasVoice&&!hasImg){try{toast('这条消息没有可收藏的内容')}catch(e){}return false}
  const v={msgId:String(m.id),cfgId:String(m.friendId||''),cfgName:_favCfgName(m.friendId),
    threadId:m.threadId||null,threadName:m.threadName||'',
    role:m.role||'',who:_favWho(m),text:txt,
    kind:(hasVoice?'voice':(hasImg?'image':'text')),
    voice:hasVoice?{duration:(m.voice&&m.voice.duration)||0,transcript:(m.voice&&m.voice.transcript)||''}:null,
    imgN:hasImg?m.images.length:0,
    ts:m.timestamp||Date.now(),created:Date.now()};
  try{await dbPut('apiSettings',{id:_favKey(m),app:'fav',key:String(m.id),v:v,updated:Date.now()})}
  catch(e){try{toast('收藏失败')}catch(_e){}return false}
  try{toast('已收藏')}catch(e){}
  return true;
}
async function _favDel(id){try{await dbDelete('apiSettings',id)}catch(e){}}
async function _favList(){/* p05：列出全部收藏，按 ts 降序 */
  let all=[];try{all=await dbGetAll('apiSettings')}catch(e){return[]}
  const arr=(all||[]).filter(function(r){return r&&r.id&&r.id.indexOf('fav_')===0&&r.app==='fav'&&r.v&&r.v.msgId})
    .map(function(r){return Object.assign({id:r.id},r.v)});
  arr.sort(function(a,b){return (b.ts||0)-(a.ts||0)});
  return arr;
}
/* ── 消息悬停收藏键（与 _ensureQuoteBtn/_ensureEditBtn 同模式） ── */
function _ensureFavBtn(el){/* p05：只给可操作消息（有删除键）加收藏键 */
  if(!el||el.querySelector(':scope>.chat-msg-fav'))return;
  const id=el.dataset&&el.dataset.msgId;if(!id)return;
  if(!el.querySelector(':scope>.chat-msg-del'))return;
  const b=document.createElement('button');
  b.className='chat-msg-fav';b.title='收藏此消息';b.setAttribute('aria-label','收藏此消息');
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  b.onclick=function(ev){
    ev.stopPropagation();
    dbGet('chatMessages',id).then(function(m){if(m)_favAdd(m)}).catch(function(){});
  };
  el.appendChild(b);
}
/* ── 面板 ── */
function _favFriendsOf(items){/* p05：按出现顺序提取不重复 cfgId */
  const seen={},out=[];
  (items||[]).forEach(function(it){const k=String(it.cfgId||'');if(k&&!seen[k]){seen[k]=1;out.push(k)}});
  return out;
}
function _favFriendName(cfgId){
  if(!cfgId)return 'TA';
  for(let i=0;i<_favState.allItems.length;i++){const it=_favState.allItems[i];if(String(it.cfgId)===cfgId&&it.cfgName)return it.cfgName}
  return _favCfgName(cfgId);
}
function _favFiltered(){/* p05：当前好友 + 搜索过滤 */
  const fid=_favState.friends[_favState.curFriend]||'';
  const q=_favState.query;
  return _favState.allItems.filter(function(it){
    if(String(it.cfgId||'')!==fid)return false;
    if(!q)return true;
    return String(it.text||'').toLowerCase().indexOf(q)>=0
      ||String(it.who||'').toLowerCase().indexOf(q)>=0
      ||String(it.threadName||'').toLowerCase().indexOf(q)>=0;
  });
}
function _favBuild(){
  _favOv=document.createElement('div');
  _favOv.className='fav-ov';
  _favOv.innerHTML='<div class="fav-modal">'
    +'<div class="fav-head"><button class="fav-back" id="fav-back" title="返回">‹</button>'
    +'<div id="fav-tt">收藏夹</div>'
    +'<div id="fav-sq"><button id="fav-sq-b" title="搜索"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></button>'
    +'<input id="fav-sq-in" type="text" placeholder="搜正文/署名/频道…" autocomplete="off"></div></div>'
    +'<div class="fav-body"><div class="fav-card" id="fav-card">'
    +'<div class="fav-av" id="fav-av">?</div>'
    +'<div class="fav-nm" id="fav-nm">…</div>'
    +'<button class="fav-nav" id="fav-prev" title="上一个好友">‹</button>'
    +'<button class="fav-nav" id="fav-next" title="下一个好友">›</button>'
    +'<div class="fav-hint" id="fav-hint"></div>'
    +'</div><div class="fav-wall" id="fav-wall"></div></div></div>';
  document.body.appendChild(_favOv);
  _favOv.addEventListener('click',function(e){if(e.target===_favOv)_favClose()});
  document.getElementById('fav-back').addEventListener('click',_favClose);
  document.getElementById('fav-prev').addEventListener('click',function(){_favStep(-1)});
  document.getElementById('fav-next').addEventListener('click',function(){_favStep(1)});
  document.getElementById('fav-sq-b').addEventListener('click',function(){
    _favState.searchOpen=!_favState.searchOpen;
    document.getElementById('fav-sq').classList.toggle('open',_favState.searchOpen);
    if(_favState.searchOpen){const i=document.getElementById('fav-sq-in');i.value=_favState.query;setTimeout(function(){i.focus()},0)}
    else{_favState.query='';_favPaint()}
  });
  document.getElementById('fav-sq-in').addEventListener('input',function(e){_favState.query=String(e.target.value||'').toLowerCase();_favPaint()});
}
function _favPaper(it){/* p05：一张纸——署名/正文/meta/类型标记 + 移除 + 折角；语音图片尝试回读原消息 */
  const p=document.createElement('div');
  p.className='fav-paper';
  const long=String(it.text||'').length>120;
  if(long)p.classList.add('folded');
  const who=document.createElement('div');who.className='fav-who';
  who.textContent=String(it.who||'TA');
  if(it.kind==='voice'){const k=document.createElement('span');k.className='fav-kind';k.textContent='🎤 语音';who.appendChild(k)}
  else if(it.kind==='image'){const k2=document.createElement('span');k2.className='fav-kind';k2.textContent='🖼 图片 '+(it.imgN||0)+' 张';who.appendChild(k2)}
  p.appendChild(who);
  const txt=document.createElement('div');txt.className='fav-paper-text';/* p05：正文按聊天 Markdown 渲染（派活单 §四#4）；渲染器缺失时退回纯文本 */
  try{txt.innerHTML=(typeof _mdRenderHtml==='function')?_mdRenderHtml(String(it.text||''),false):'';if(!txt.innerHTML)txt.textContent=String(it.text||'')}catch(e){txt.textContent=String(it.text||'')}
  p.appendChild(txt);
  const meta=document.createElement('div');meta.className='fav-meta';
  const d=new Date(it.ts||Date.now());
  meta.textContent=(d.getMonth()+1)+'/'+d.getDate()+(it.threadName?' · '+String(it.threadName):'');
  p.appendChild(meta);
  const del=document.createElement('button');del.className='fav-del';del.textContent='×';del.title='移除收藏';
  del.onclick=function(e){e.stopPropagation();_favRemove(it)};
  p.appendChild(del);
  if(long){const fold=document.createElement('div');fold.className='fav-fold';fold.title='展开/收起';
    fold.onclick=function(e){e.stopPropagation();p.classList.toggle('folded')};p.appendChild(fold)}
  try{/* p05：回读原消息真渲染语音/图片——只存引用，回读按 msgId 取；原消息已删/回读失败都不抛错 */
    if(it.kind==='voice'||it.kind==='image'){
      dbGet('chatMessages',it.msgId).then(function(orig){
        if(!orig||!p.parentNode)return;
        try{
          if(it.kind==='image'&&orig.images&&orig.images.length){
            orig.images.forEach(function(img){
              if(!img||!img.dataUrl)return;
              const im=document.createElement('img');im.className='fav-img';
              im.src=img.dataUrl;im.loading='lazy';im.alt='';
              im.onclick=function(){try{if(typeof _viewImageFull==='function')_viewImageFull(img.dataUrl)}catch(e){}};
              p.appendChild(im);
            });
          }else if(it.kind==='voice'&&orig.voice&&orig.voice.dataUrl){
            let vEl=null;
            try{if(typeof _buildVoiceEl==='function')vEl=_buildVoiceEl(orig.voice)}catch(e){vEl=null}
            if(vEl){p.appendChild(vEl)}
            else{
              const au=document.createElement('audio');au.controls=true;au.src=orig.voice.dataUrl;
              au.style.cssText='max-width:200px;margin-top:6px;display:block';p.appendChild(au);
            }
            if(orig.voice.transcript){
              const vt=document.createElement('div');vt.className='fav-meta';vt.textContent='🎤 '+String(orig.voice.transcript).slice(0,80);p.appendChild(vt);
            }
          }
        }catch(e){}
      }).catch(function(){});
    }
  }catch(e){}
  return p;
}
function _favPaint(){
  if(!_favOv)return;
  const wall=document.getElementById('fav-wall');
  const fid=_favState.friends[_favState.curFriend]||'';
  const nm=_favFriendName(fid);
  document.getElementById('fav-tt').textContent=nm+'的收藏夹';
  document.getElementById('fav-nm').textContent=nm+"'s";
  document.getElementById('fav-av').textContent=(nm||'?').charAt(0).toUpperCase();
  const items=_favFiltered();
  const total=_favState.allItems.filter(function(it){return String(it.cfgId||'')===fid}).length;
  document.getElementById('fav-hint').textContent='共 '+total+' 条收藏'+(_favState.query?'（筛选出 '+items.length+' 条）':'');
  wall.innerHTML='';
  if(!items.length){
    wall.innerHTML='<div class="fav-empty">'+(_favState.query?'没有找到匹配的收藏。':'这里还是空的。长按一条消息选「收藏」。')+'</div>';
    return;
  }
  items.forEach(function(it){wall.appendChild(_favPaper(it))});
}
function _favStep(d){
  if(!_favState.friends.length)return;
  _favState.curFriend=(_favState.curFriend+d+_favState.friends.length)%_favState.friends.length;
  _favPaint();
}
async function _favRemove(it){
  let ok=false;
  try{ok=await ibConfirmX('从收藏夹移除这条？','移除')}catch(e){try{ok=window.confirm('从收藏夹移除这条？')}catch(_x){}}
  if(!ok)return;
  await _favDel(it.id);
  _favState.allItems=_favState.allItems.filter(function(x){return x.id!==it.id});
  _favState.friends=_favFriendsOf(_favState.allItems);
  if(_favState.curFriend>=_favState.friends.length)_favState.curFriend=Math.max(0,_favState.friends.length-1);
  _favPaint();
}
async function _favOpen(){/* p05：打开面板——加载列表、按好友渲染 */
  if(!_favOv)_favBuild();
  _favState.allItems=await _favList();
  _favState.friends=_favFriendsOf(_favState.allItems);
  if(_favState.curFriend>=_favState.friends.length)_favState.curFriend=0;
  _favOv.classList.add('open');_favOv.style.display='flex';
  _favPaint();
}
function _favClose(){if(_favOv){_favOv.classList.remove('open');_favOv.style.display='none'}}
function _favBoot(){/* p05：预创建面板（display none），入口点击时再加载列表 */
  try{if(!_favOv)_favBuild()}catch(e){}
}
window._favKey=_favKey;
window._favTxt=_favTxt;
window._favWho=_favWho;
window._favCfgName=_favCfgName;
window._favAdd=_favAdd;
window._favDel=_favDel;
window._favList=_favList;
window._favOpen=_favOpen;
window._favClose=_favClose;
window._favBoot=_favBoot;
window._ensureFavBtn=_ensureFavBtn;
window._favState=_favState;
if(document.readyState==='complete')_favBoot();else document.addEventListener('DOMContentLoaded',_favBoot);
})();`
    }
  ]
};
