/* _test_p21_regen.js —— P21 重新生成断言式测试（逻辑层 + 静态断言，不碰真 DOM/DB/网络）
 *
 * 跑法：node _test_p21_regen.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 * 做法：把产物里整段 p21 IIFE 抽出来放进 vm，配假 document/db/sendChatMessage 与假消息气泡，
 *       只断言外部可观察行为（不断言内部函数名）：
 *       资格矩阵（末条 AI 正文才有键；user/群聊/发送中/系统标记通话卡/空气泡/非末条都无）、
 *       点击只 dbDelete 目标 id、气泡移除、sendChatMessage 恰好触发一次、不写 chatMessages、不重发用户消息、
 *       连点锁（第二次点击不二次删条/不二次回复）、占位 loading 出现；
 *       静态：全屏与小窗入口都注入、不破坏 p05/p06 既有悬停族。
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const HERE=__dirname;
const DEF_OUT=path.join(HERE,'out','InternalBeyond.patched.html');

let pass=0,fail=0;
function ok(name,cond,extra){if(cond){pass++;console.log('  ✓ '+name)}else{fail++;console.log('  ✗ '+name+(extra?' —— '+extra:''))}}

let outText;
if(process.argv[2])outText=fs.readFileSync(process.argv[2],'utf8');
else if(fs.existsSync(DEF_OUT))outText=fs.readFileSync(DEF_OUT,'utf8');
else{console.error('找不到产物，先跑 node _driver.js');process.exit(1)}

/* ── 截取 p21 IIFE（唯一起止标记）── */
const iifeStart=outText.indexOf('(function(){/* p21：重新生成');
let iifeSrc=null,hasIIFE=false;
if(iifeStart<0){
  console.log('  · 产物里暂无 p21 IIFE（实现线未落），行为层跳过，仅跑静态断言');
}else{
  const endMark=outText.indexOf('_regenLock',iifeStart);
  const iifeEnd=outText.indexOf('})();',endMark)+5;
  if(endMark<0||iifeEnd<5){console.log('  · p21 IIFE 结尾标记不全，行为层跳过')}
  else{iifeSrc=outText.slice(iifeStart,iifeEnd);hasIIFE=true}
}

/* ── 假 DOM 节点 ── */
function fakeEl(tag){
  return {
    tag:tag,style:{},children:[],_h:'',_tc:'',dataset:{},value:'',className:'',
    parentNode:null,
    appendChild(c){c.parentNode=this;this.children.push(c);return c},
    remove(){if(this.parentNode){const i=this.parentNode.children.indexOf(this);if(i>=0)this.parentNode.children.splice(i,1);this.parentNode=null}},
    addEventListener(){},setAttribute(){},
    set innerHTML(v){this._h=String(v)},get innerHTML(){return this._h||''},
    set textContent(v){this._tc=String(v)},get textContent(){return this._tc||''},
    querySelector(){return null},
    querySelectorAll(){return[]},
    closest(){return null},
    get previousElementSibling(){
      if(!this.parentNode)return null;
      const i=this.parentNode.children.indexOf(this);
      return i>0?this.parentNode.children[i-1]:null;
    },
    classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(){},contains(c){return this._s.has(c)}},
  };
}

function makeEnv(){
  const chatStore={};
  const writeLog=[];
  const byId={};
  const calls={sendChat:0};
  function docEl(tag){
    const e=fakeEl(tag);
    return e;
  }
  /* 两个消息容器（全屏 #chat-full-messages / 小窗 #chat-messages） */
  const fullBox=docEl('#chat-full-messages');
  const miniBox=docEl('#chat-messages');
  byId['chat-full-messages']=fullBox;
  byId['chat-messages']=miniBox;
  const ctx={
    console,
    document:{
      readyState:'complete',addEventListener(){},
      createElement(tag){return docEl(tag)},
      head:{appendChild(){}},
      body:{appendChild(){},classList:{contains(){return false}}},
      getElementById(id){if(!byId[id])byId[id]=docEl('el#'+id);return byId[id]},
      querySelectorAll(sel){
        const m=/\.chat-msg\[data-msg-id="(.+)"\]/.exec(String(sel||''));
        if(!m)return[];
        const id=m[1];
        const out=[];
        [fullBox,miniBox].forEach(box=>{
          box.children.forEach(ch=>{if(ch&&ch.dataset&&ch.dataset.msgId===id)out.push(ch)});
        });
        return out;
      },
    },
    window:{},
    activeFriendId:'f1',
    activeThreadId:null,
    _chatSendingFor:new Set(),
    currentPage:'chat',
    dbGet:async(s,k)=>{if(s==='chatMessages')return chatStore[k]||null;return null},
    dbPut:async(s,d)=>{writeLog.push({op:'put',table:s});const row=Object.assign({},d);if(s==='chatMessages')chatStore[row.id]=row},
    dbDelete:async(s,k)=>{writeLog.push({op:'del',table:s,key:k});if(s==='chatMessages')delete chatStore[k]},
    sendChatMessage:async function(){calls.sendChat++;},
    setInterval(){return 0},clearInterval(){},
    setTimeout(){return 0},clearTimeout(){},
    toast(){},
  };
  ctx.window=ctx;
  ctx._writeLog=writeLog;ctx._chatStore=chatStore;ctx._calls=calls;
  ctx._fullBox=fullBox;ctx._miniBox=miniBox;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}

/* 造一个悬停目标气泡：data-msg-id=id，带删除键，可配 last/user/容器等 */
function bubble(ctx,id,opts){
  opts=opts||{};
  const el=fakeEl('div');el.className='chat-msg ai';el.dataset.msgId=id;
  if(opts.user)el.classList.add('user');
  /* 有删除键（同族可操作口径） */
  const del=fakeEl('span');el.appendChild(del);
  el.querySelector=function(sel){
    if(sel===':scope>.chat-msg-regen')return el.children.find(c=>c.className==='chat-msg-regen')||null;
    if(sel===':scope>.chat-msg-del')return del;
    return null;
  };
  const cont=opts.container||ctx._fullBox;
  cont.appendChild(el);
  el.closest=function(sel){
    if(cont===ctx._fullBox&&sel==='#chat-full-messages')return cont;
    if(cont===ctx._miniBox&&sel==='#chat-messages')return cont;
    return null;
  };
  /* 默认：它就是容器里最后一条 data-msg-id；last=false 时它不是最后一条 */
  const list=opts.last===false?[el,fakeEl('div')]:[el];
  cont.querySelectorAll=function(sel){return sel==='.chat-msg[data-msg-id]'?list:[]};
  return el;
}

console.log('== P21 重新生成（逻辑层 + 静态断言）==');

(async()=>{
  /* ── 静态：两套 UI 注入 + 既有悬停族不破坏 ── */
  ok('S1. pointerover 懒注入串同时含 quote/edit/fav/regen',/_ensureQuoteBtn\(el\)[\s\S]*?_ensureEditBtn\(el\)[\s\S]*?_ensureFavBtn\(el\)[\s\S]*?_ensureRegenBtn\(el\)/.test(outText));
  ok('S2. _ensureRegenBtn 函数定义存在',/function _ensureRegenBtn/.test(outText));
  ok('S3. 键类 chat-msg-regen 存在',outText.indexOf('chat-msg-regen')!==-1);
  ok('S4. 全屏与小窗两个容器 id 都在 _ensureRegenBtn 内被查询',iifeSrc&&iifeSrc.indexOf('#chat-full-messages')!==-1&&iifeSrc.indexOf('#chat-messages')!==-1);
  ok('S5. p05 收藏键仍在产物中',outText.indexOf('_ensureFavBtn(el)')!==-1);
  ok('S6. sendChatMessage 空文本守卫被放行（_ibRegen.on）',outText.indexOf('&&!(window._ibRegen&&window._ibRegen.on))return')!==-1);
  ok('S7. 用户消息落库被跳过（_ibRegen.on）',outText.indexOf('if(!_silentHelp&&!(window._ibRegen&&window._ibRegen.on)){')!==-1);
  ok('S8. 键是描边体系（fill=none stroke=currentColor stroke-width=1.5）',iifeSrc&&iifeSrc.indexOf('fill="none" stroke="currentColor" stroke-width="1.5"')!==-1);
  ok('S9. 占位沿用既有 .chat-typing 类（不新造视觉）',iifeSrc&&iifeSrc.indexOf("ph.className='chat-typing'")!==-1);

  if(!hasIIFE){
    console.log('\n（行为层：p21 IIFE 未注入，跳过行为断言）');
    console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
    process.exit(fail?1:0);
  }

  /* 前置暴露 */
  {
    const c=makeEnv();
    const need=['_regenEligible','_ensureRegenBtn','_regenClick'];
    const missing=need.filter(n=>typeof c[n]==='undefined');
    ok('前置. window 暴露 _regen* 接口',missing.length===0,'missing='+missing.join(','));
  }

  /* ── 资格矩阵：_regenEligible ── */
  {
    const c=makeEnv();
    const E=(m,o)=>c._regenEligible(m,Object.assign({sending:false,isGroup:false,isLast:true},o));
    ok('M1. 末条 assistant 有正文 → 有键',E({role:'assistant',content:'你好'})===true);
    ok('M2. user 消息 → 无键',E({role:'user',content:'你好'})===false);
    ok('M3. 空气泡（无正文）→ 无键',E({role:'assistant',content:''})===false);
    ok('M4. assistant 但 content 空白串 → 无键',E({role:'assistant',content:'   '})===false);
    ok('M5. gift 礼物卡 → 无键',E({role:'assistant',content:'x',gift:{}})===false);
    ok('M6. callEnd 通话结束卡 → 无键',E({role:'assistant',content:'x',callEnd:1})===false);
    ok('M7. mark 标记行 → 无键',E({role:'assistant',content:'x',mark:1})===false);
    ok('M8. 发送中 → 无键',E({role:'assistant',content:'x'},{sending:true})===false);
    ok('M9. 群聊 → 无键',E({role:'assistant',content:'x'},{isGroup:true})===false);
    ok('M10. 非末条 → 无键',E({role:'assistant',content:'x'},{isLast:false})===false);
    ok('M11. null 消息 → 无键',E(null)===false);
  }

  /* ── 悬停注入：末条 AI 才落键；user/非末条不落 ── */
  {
    const c=makeEnv();
    await c.dbPut('chatMessages',{id:'a2',role:'assistant',content:'回复二',timestamp:2});
    const el=bubble(c,'a2',{});
    await c._ensureRegenBtn(el);
    const btn=el.children.find(x=>x.className==='chat-msg-regen');
    ok('I1. 末条 AI 正文气泡上注入重新生成键',!!btn);

    const c2=makeEnv();
    await c2.dbPut('chatMessages',{id:'u1',role:'user',content:'问题',timestamp:1});
    const el2=bubble(c2,'u1',{user:true});
    await c2._ensureRegenBtn(el2);
    ok('I2. user 消息上不注入',!el2.children.find(x=>x.className==='chat-msg-regen'));

    const c3=makeEnv();
    await c3.dbPut('chatMessages',{id:'a1',role:'assistant',content:'历史回复',timestamp:1});
    const el3=bubble(c3,'a1',{last:false});/* 不是最后一条 */
    await c3._ensureRegenBtn(el3);
    ok('I3. 非末条不注入',!el3.children.find(x=>x.className==='chat-msg-regen'));

    const c4=makeEnv();
    await c4.dbPut('chatMessages',{id:'a3',role:'assistant',content:'回复',timestamp:3});
    c4._chatSendingFor.add('f1');/* 发送中 */
    const el4=bubble(c4,'a3',{});
    await c4._ensureRegenBtn(el4);
    ok('I4. 发送中不注入',!el4.children.find(x=>x.className==='chat-msg-regen'));
  }

  /* ── 话题频道：只在当前话题内判定（isLast 由 DOM 容器决定；频道间互不串） ── */
  {
    const c=makeEnv();
    /* 主线末条 */
    c.activeThreadId=null;
    await c.dbPut('chatMessages',{id:'mainA',role:'assistant',content:'主线回复',timestamp:5});
    const mainEl=bubble(c,'mainA',{container:c._miniBox});
    await c._ensureRegenBtn(mainEl);
    ok('T1. 主线末条 AI 出键',!!mainEl.children.find(x=>x.className==='chat-msg-regen'));
  }

  /* ── 点击：只 dbDelete 目标 id；气泡移除；触发一次回复；不写 chatMessages、不重发用户消息 ── */
  {
    const c=makeEnv();
    await c.dbPut('chatMessages',{id:'a2',role:'assistant',content:'旧回复',timestamp:2});
    await c.dbPut('chatMessages',{id:'u1',role:'user',content:'问题',timestamp:1});
    const el=bubble(c,'a2',{});
    const w0=c._writeLog.length;/* 只统计点击期间的写入，排除 seed */
    await c._regenClick(el);
    const dels=c._writeLog.filter(w=>w.op==='del');
    ok('C1. dbDelete 恰好一次',dels.length===1,'n='+dels.length);
    ok('C2. 删的就是目标 id=a2 且表是 chatMessages',dels[0]&&dels[0].table==='chatMessages'&&dels[0].key==='a2',JSON.stringify(dels[0]));
    ok('C3. 旧记录已从 chatStore 删除',!c._chatStore['a2']);
    ok('C4. 用户消息 u1 原样保留（不重发）',!!c._chatStore['u1']);
    ok('C5. sendChatMessage 恰好触发一次',c._calls.sendChat===1,'n='+c._calls.sendChat);
    const puts=c._writeLog.slice(w0).filter(w=>w.op==='put'&&w.table==='chatMessages');
    ok('C6. 点击期间不向 chatMessages 写新用户行',puts.length===0,'puts='+puts.length);
    ok('C7. _ibRegen 已复位（非 on）',c._ibRegen==null||c._ibRegen===undefined);
    ok('C8. 气泡已从容器移除',!el.parentNode);
    const ph=c._fullBox.children.find(x=>x.id==='ib-regen-typing');
    ok('C9. 占位 loading 出现过（重新生成中…）',!!ph&&ph.textContent.indexOf('重新生成中')===0);
  }

  /* ── 删旧必须连思考链/头像行/续发时间，并清两套 Chat ── */
  {
    const c=makeEnv();
    await c.dbPut('chatMessages',{id:'a3',role:'assistant',content:'旧',timestamp:2});
    const wrap=fakeEl('div');wrap.classList.add('chat-thinking-wrap');
    const head=fakeEl('div');head.classList.add('chat-msg-header');
    const tm=fakeEl('div');tm.classList.add('chat-msg-cont-time');
    /* 原序：思考链 → 头像行 → 续发时间 → 气泡 */
    c._fullBox.appendChild(wrap);c._fullBox.appendChild(head);c._fullBox.appendChild(tm);
    const el=bubble(c,'a3',{});
    const wrap2=fakeEl('div');wrap2.classList.add('chat-thinking-wrap');
    c._miniBox.appendChild(wrap2);
    const el2=bubble(c,'a3',{container:c._miniBox});
    await c._regenClick(el);
    ok('C10. 全屏思考链已移除',!wrap.parentNode);
    ok('C11. 全屏头像行/续发时间已移除',!head.parentNode&&!tm.parentNode);
    ok('C12. 全屏气泡已移除',!el.parentNode);
    ok('C13. 小窗同 id 气泡已移除',!el2.parentNode);
    ok('C14. 小窗思考链已移除（不残留上一次 Thought process）',!wrap2.parentNode);
  }

  /* ── 连击防护：锁定期第二次点击不二次删条/不二次回复 ── */
  {
    const c=makeEnv();
    await c.dbPut('chatMessages',{id:'a9',role:'assistant',content:'旧',timestamp:2});
    const el=bubble(c,'a9',{});
    /* 同步连发两次：第一次进入即加锁，第二次应被锁吞掉 */
    const p1=c._regenClick(el);
    const lockMid=c._regenLock===true;
    const p2=c._regenClick(el);/* 锁定期 */
    await Promise.all([p1,p2]);
    const dels=c._writeLog.filter(w=>w.op==='del'&&w.table==='chatMessages');
    ok('L1. 点击后立即上锁',lockMid===true,String(lockMid));
    ok('L2. 连点只删一次',dels.length===1,'n='+dels.length);
    ok('L3. 连点只触发一次回复',c._calls.sendChat===1,'n='+c._calls.sendChat);
    ok('L4. 结束后锁已释放',c._regenLock===false,String(c._regenLock));
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
