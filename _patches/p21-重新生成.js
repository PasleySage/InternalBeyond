/* p21-重新生成.js
 * 对标 IBM「重新生成」：在当前会话（主线或话题频道）最后一条正常 AI 回复气泡上出悬停键；
 * 点击后只删这一条 AI 记录、移除气泡，然后按当前上下文再要一版（历史由 DB 重建，不重发用户消息、不造假用户行）。
 * 入口条件严格对齐 IBM：末条 ＋ assistant ＋ 有正文 ＋ 不在发送中 ＋ 非群聊 ＋ 非 user；
 * 系统行/标记行/通话卡/空气泡不给（是 IBM 字面条件的子集）。
 * 两条防翻车：⑩ 点击即加锁（_regenLock），发送锁（_chatSendingFor）生效后才解，连点不重复删条/并发重答；
 * ⑪ 删旧气泡与新气泡之间放占位（沿用既有 .chat-typing 视觉），真气泡/真 typing 出现即撤。
 * 全屏页与浮动小窗共用同一个 document 级 pointerover 懒注入，一套逻辑两处生效。
 *
 * ⚠️ 锚点与产出代码一律 String.raw（与 p01/p05 同纪律）。
 */
module.exports={
  id:'p21',about:'重新生成',
  upstream:{repo:'Sui-IB/InternalBeyond',commit:'b0d7919d',bytes:2819874,sha256:'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6'},
  expectCount:4,
  /* 原有锚点：打完 p21 必须还在（证明没改坏既有悬停族、发送锁与存储层） */
  guards:[
    '_ensureQuoteBtn(el);_ensureEditBtn(el);_ensureFavBtn(el);',/* 悬停族仍在（p21 在其后追加 _ensureRegenBtn） */
    'function dbDelete(s,k)',/* 存储层 */
    'const _chatSendingFor=new Set();',/* 既有发送锁（p21 复用，不新造锁） */
    'if(!text&&!_voice&&!_pendingImages.length&&!_pendingFiles.length&&!(window._ibRegen',/* 空文本守卫保留原条件，p21 仅追加放行 */
    'if(!_silentHelp&&!(window._ibRegen&&window._ibRegen.on)){'/* 用户消息落库守卫保留原条件，p21 仅追加跳过 */
  ],
  /* 新增锚点：证明本集真的落上了 */
  adds:[
    'id="p21-regen-css"',/* 样式 */
    'function _regenEligible(',/* 资格判定纯函数（测试缝） */
    '_ensureRegenBtn(el)',/* 悬停注入 */
    'chat-msg-regen',/* 键类 */
    'window._regenClick=_regenClick',/* 动作暴露（测试缝） */
    '重新生成中…'/* 占位 loading 文案 */
  ],
  /* 人工验收清单（四列） */
  accept:[
    [
      '当前会话（主线或话题频道）最后一条正常 AI 回复气泡悬停时，右上角动作族多一个描边环形箭头键「重新生成」（与引用/修改/删除/收藏同族，stroke 1.5）；user 消息、群聊、发送中、系统行/标记行/通话卡、非末条均不出现',
      '全屏 Chat 与右下角浮动小窗各悬停在最后一条 TA 的回复上',
      '两态都看到该键；把同一会话往上翻一条历史消息悬停——没有键；切到群聊、或 TA 正在回复时悬停——没有键',
      '把 p21-重新生成.js 移出 _patches\\ 后重跑 _driver.js，该键全部消失'
    ],
    [
      '点击后只删这一条 AI 记录：旧气泡**连同上方 Thought process（思考链）、头像行、续发时间一并消失**；全屏页与浮动小窗**两套 Chat 都清干净**；随后按当前上下文再出一版（流式/思考链/用量照旧）；不重发用户消息、不写新用户行',
      '对最后一条 AI 回复点「重新生成」（可开全屏＋小窗同时看）',
      '旧气泡与它的 Thought process 都消失（两套 Chat 均无残留）；先短暂显示「重新生成中…」占位，然后同一轮提问长出新回答；聊天记录末尾仍是「一句我问 → 一版 TA 答」，没有堆叠多版答案、没有多出一条空用户消息、没有上一次的 Thought process',
      '同上（移出 p21）'
    ],
    [
      '连击防护：点后立即加锁，连点不重复删条、不并发重答；发送锁生效（新气泡/生成态出现）后才解锁',
      '快速连点「重新生成」两三次',
      '只删一次、只出一版新回答；控制台无并发报错',
      '同上'
    ],
    [
      '话题频道：只有该频道内最后一条 AI 回复有键，不串到主线；共读/观影室等房间频道同一套规则',
      '进一个话题频道，悬停该频道最后一条 TA 回复；再回主线悬停主线末条',
      '频道与主线各自只对自己的末条 AI 回复出键；互不干扰',
      '同上'
    ]
  ],
  patches:[
    /* ── P21-1 悬停族：_ensureFavBtn 之后追加 _ensureRegenBtn（锚点为 p05 打完后的行） ── */
    {
      label:'P21-1 消息悬停懒注入追加重新生成键 _ensureRegenBtn(el)',
      old:String.raw`  if(el){_ensureQuoteBtn(el);_ensureEditBtn(el);_ensureFavBtn(el);if(el.classList.contains('bs-msg'))_bsEnsureSegActs(el)}/* v129：铅笔（修改）与引用键同一懒注入；p05：收藏键同族 */`,
      new:String.raw`  if(el){_ensureQuoteBtn(el);_ensureEditBtn(el);_ensureFavBtn(el);_ensureRegenBtn(el);if(el.classList.contains('bs-msg'))_bsEnsureSegActs(el)}/* v129：铅笔（修改）与引用键同一懒注入；p05：收藏键同族；p21：重新生成键同族 */`
    },
    /* ── P21-2 空文本守卫：重新生成允许空输入触发（历史由 DB 重建） ── */
    {
      label:'P21-2 sendChatMessage 空文本守卫放行重新生成',
      old:String.raw`  if(!text&&!_voice&&!_pendingImages.length&&!_pendingFiles.length)return;`,
      new:String.raw`  if(!text&&!_voice&&!_pendingImages.length&&!_pendingFiles.length&&!(window._ibRegen&&window._ibRegen.on))return;/* p21：重新生成允许空输入触发（历史由 DB 重建，不发用户消息） */`
    },
    /* ── P21-3 用户消息落库守卫：重新生成不落新用户消息行 ── */
    {
      label:'P21-3 sendChatMessage 用户消息落库跳过重新生成',
      old:String.raw`  if(!_silentHelp){`,
      new:String.raw`  if(!_silentHelp&&!(window._ibRegen&&window._ibRegen.on)){/* p21：重新生成不 dbPut 新用户消息、不渲染用户气泡 */`
    },
    /* ── P21-4 主 IIFE：资格判定 + 悬停键 + 删旧重答 + 双防翻车（锚 p05 IIFE 尾） ── */
    {
      label:'P21-4 整段 IIFE：重新生成 CSS + 资格判定 + 悬停键 + 删旧重答 + 锁与占位',
      old:String.raw`if(document.readyState==='complete')_favBoot();else document.addEventListener('DOMContentLoaded',_favBoot);
})();`,
      new:String.raw`if(document.readyState==='complete')_favBoot();else document.addEventListener('DOMContentLoaded',_favBoot);
})();
(function(){/* p21：重新生成——当前会话末条 AI 回复删旧重答；纯前端，复用既有发送锁与流式链 */
'use strict';
const _rgCss=document.createElement('style');
_rgCss.id="p21-regen-css";
_rgCss.textContent=
 '.chat-msg-regen{position:absolute;top:4px;right:86px;width:16px;height:16px;border:none;background:none;color:var(--text-muted);cursor:pointer;opacity:0;padding:0;border-radius:4px;line-height:1;display:flex;align-items:center;justify-content:center;transition:opacity 0.2s,color 0.2s,background 0.2s}'
+'.chat-msg:hover .chat-msg-regen{opacity:0.5}'
+'.chat-msg-regen:hover{opacity:1!important;color:var(--accent-light);background:rgba(114,168,216,0.14)}'
+'.chat-msg-regen svg{width:12px;height:12px}'
+'body:not(.theme-infernal) .chat-msg-regen:hover{color:#2a6bb0;background:rgba(70,130,190,0.12)}';
try{document.head.appendChild(_rgCss)}catch(e){}
let _regenLock=false;/* ⑩ 点击即锁，发送锁生效后才解 */
/* 资格判定（纯函数，测试缝）：末条 AI 正文气泡才出键；user/群聊/发送中/系统行/标记行/通话卡/空气泡一律不出 */
function _regenEligible(m,ctx){
  if(!m)return false;
  if(m.role!=='assistant')return false;
  if(m.gift||m.callEnd||m.mark)return false;/* 系统行/标记行/通话卡/礼物卡不是正文气泡 */
  var txt=String(m.content||'').trim();
  if(!txt)return false;/* 空气泡不给 */
  if(ctx&&ctx.sending)return false;
  if(ctx&&ctx.isGroup)return false;
  if(ctx&&ctx.isLast===false)return false;
  return true;
}
function _rgSending(){try{return !!(typeof _chatSendingFor!=='undefined'&&_chatSendingFor.has(activeFriendId))}catch(e){return false}}
function _rgGroup(){try{return String(activeFriendId||'').indexOf('group_')===0}catch(e){return false}}
/* 悬停键：与 _ensureQuoteBtn/_ensureEditBtn/_ensureFavBtn 同族懒注入；只在「当前会话末条 AI 气泡」上落键 */
function _ensureRegenBtn(el){
  if(!el||el.querySelector(':scope>.chat-msg-regen'))return;
  var id=el.dataset&&el.dataset.msgId;if(!id)return;
  if(el.classList.contains('user'))return;/* user 消息永不给出键 */
  if(!el.querySelector(':scope>.chat-msg-del'))return;/* 与同族同口径：只给可操作消息 */
  var cont=el.closest('#chat-full-messages')||el.closest('#chat-messages');
  if(cont){var all=cont.querySelectorAll('.chat-msg[data-msg-id]');if(all[all.length-1]!==el)return;}/* 必须是当前列表末条 */
  dbGet('chatMessages',id).then(function(m){
    if(!m||!el.parentNode)return;
    if(!_regenEligible(m,{sending:_rgSending(),isGroup:_rgGroup(),isLast:true}))return;
    var b=document.createElement('button');
    b.className='chat-msg-regen';b.title='重新生成';b.setAttribute('aria-label','重新生成');
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
    b.onclick=function(ev){ev.stopPropagation();_regenClick(el)};
    el.appendChild(b);
  }).catch(function(){});
}
/* 点击：删且只删这条 AI 记录 → 移除气泡 → 触发一次重新回复（不重发用户消息） */
async function _regenClick(el){
  if(_regenLock)return;/* ⑩ 连点直接吞掉 */
  if(_rgSending())return;
  var id=el&&el.dataset&&el.dataset.msgId;if(!id)return;
  _regenLock=true;
  /* ⑪ 占位：沿用既有 .chat-typing 视觉；真气泡/真 typing 一出现即撤 */
  var cont=(typeof currentPage!=='undefined'&&currentPage==='chat')?document.getElementById('chat-full-messages'):document.getElementById('chat-messages');
  var ph=null;
  if(cont){ph=document.createElement('div');ph.className='chat-typing';ph.id='ib-regen-typing';ph.textContent='重新生成中…';cont.appendChild(ph);try{cont.scrollTop=cont.scrollHeight}catch(e){}}
  var poll=setInterval(function(){
    var started=false,shown=false;
    try{started=_rgSending()}catch(e){}
    if(started){_regenLock=false;/* 发送锁已接管，本锁即解 */}
    if(cont){try{shown=!!(cont.querySelector('.chat-stream-cursor')||cont.querySelector('.chat-typing:not(#ib-regen-typing)'))}catch(e){}}
    if(started||shown){clearInterval(poll);if(ph&&ph.parentNode)ph.parentNode.removeChild(ph);}
  },150);
  setTimeout(function(){clearInterval(poll);if(ph&&ph.parentNode)ph.parentNode.removeChild(ph);_regenLock=false;},20000);
  /* 删旧：对齐 deleteSingleMsg —— 连同上方思考链/头像行/续发时间，并清两套 Chat 里同 id 节点 */
  try{
    if(typeof deleteSingleMsg==='function'){await deleteSingleMsg(id,el);}
    else{await dbDelete('chatMessages',id);}
  }catch(e){try{await dbDelete('chatMessages',id)}catch(e2){}}
  try{
    var _rgEsc=String(id).replace(/\"/g,'\\\"');
    document.querySelectorAll('.chat-msg[data-msg-id="'+_rgEsc+'"]').forEach(function(bubble){
      var prev=bubble.previousElementSibling;
      while(prev&&(prev.classList.contains('chat-msg-header')||prev.classList.contains('chat-msg-cont-time')||prev.classList.contains('chat-thinking-wrap'))){
        var gone=prev;prev=prev.previousElementSibling;try{gone.remove()}catch(e){}
      }
      try{bubble.remove()}catch(e){}
    });
  }catch(e){}
  window._ibRegen={on:true};/* 告诉 sendChatMessage：这是重答，别落用户行 */
  try{await sendChatMessage()}catch(e){}
  window._ibRegen=null;
  _regenLock=false;/* 发送链已走完；连点锁释放（发送期间本就被 _rgSending 挡住） */
}
window._regenEligible=_regenEligible;
window._ensureRegenBtn=_ensureRegenBtn;
window._regenClick=_regenClick;
Object.defineProperty(window,'_regenLock',{get:function(){return _regenLock},set:function(v){_regenLock=!!v},configurable:true});
})();`
    }
  ]
};
