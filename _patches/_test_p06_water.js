/* _test_p06_water.js —— P06 小助手 断言式测试（逻辑层 + 静态断言，不碰真 DOM/DB/网络）
 *
 * 跑法：node _test_p06_water.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 * 做法：把产物里整段 p06 IIFE 抽出来放进 vm，配假 apiSettings/document/navTo/callApiChat，
 *       断言外部可观察行为：
 *       - 知识源是内嵌说明书正文（含收藏/无此功能小节），且不含应用内 Guide 的艺术写作；
 *       - 系统提示要求：只依据说明书、手机端独有功能如实说没有、被要求改设置时拒绝；
 *       - [[open:key]] 跳转标记能被解析、能映射到 navTo 页面/锚点；
 *       - 回答用 API 独立选存（apiSettings / app:'wsA'），不动聊天 activeFriendId；
 *       - 不写聊天记录、不改既有能力（guards 静态核对）。
 *       其余（入口按钮、面板样式不污染全局、p01–p05/p07 共存）用对产物文本的静态断言覆盖。
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const HERE=__dirname;
const DEF_OUT=path.join(HERE,'out','InternalBeyond.patched.html');

let pass=0,fail=0;
function ok(name,cond,extra){if(cond){pass++;console.log('  ✓ '+name)}else{fail++;console.log('  ✗ '+name+(extra?' —— '+extra:''))}}

let outText;
if(process.argv[2])outText=fs.readFileSync(process.argv[2],'utf8');
else if(fs.existsSync(DEF_OUT))outText=fs.readFileSync(DEF_OUT,'utf8');
else{console.error('找不到产物，先跑 node _driver.js --only p06');process.exit(1)}

/* ── 截取 p06 IIFE（唯一起止标记）── */
const iifeStart=outText.indexOf('(function(){/* p06：小助手');
let iifeSrc=null,hasIIFE=false;
if(iifeStart<0){
  console.log('  · 产物里暂无 p06 IIFE（实现线未落），行为层跳过，仅跑静态断言');
}else{
  const endMark=outText.indexOf('_wsABoot();',iifeStart);
  const iifeEnd=outText.indexOf('})();',endMark)+5;
  if(endMark<0||iifeEnd<5){console.log('  · p06 IIFE 结尾标记不全，行为层跳过')}
  else{iifeSrc=outText.slice(iifeStart,iifeEnd);hasIIFE=true}
}

/* ── 假环境 ── */
function makeEnv(){
  const store={};          /* 假 apiSettings */
  const writeLog=[];
  const navCalls=[];       /* 记录 navTo 调用 */
  const scrollCalls=[];    /* 记录 scrollIntoView 调用 */
  const apiCalls=[];       /* 记录 callApiChat 收到的 messages/cfg */
  const byId={};
  function docEl(tag){
    const el={
      tag:tag,style:{},children:[],_h:'',_tc:'',dataset:{},value:'',className:'',
      _handlers:{},_clsLog:[],
      appendChild(c){c.parentNode=this;this.children.push(c);return c},
      insertBefore(child,ref){child.parentNode=this;const idx=this.children.indexOf(ref);if(idx<0){this.children.push(child)}else{this.children.splice(idx,0,child)}return child},
      addEventListener(t,fn){(this._handlers[t]=this._handlers[t]||[]).push(fn)},
      removeEventListener(){},
      remove(){},focus(){},blur(){},click(){},
      setAttribute(k,v){this[k]=String(v)},removeAttribute(){},
      set innerHTML(v){
        this._h=String(v);this._tc=String(v).replace(/<[^>]*>/g,'');
        this.children=[];
        const m=String(v).match(/^\s*<([a-zA-Z][\w-]*)\b([^>]*)>/);
        if(m){
          const child=docEl(m[1]);let mm;
          if((mm=(m[2]||'').match(/\bid=["']([^"']*)["']/)))child.id=mm[1];
          if((mm=(m[2]||'').match(/\bclass=["']([^"']*)["']/)))child.className=mm[1];
          if((mm=(m[2]||'').match(/\btitle=["']([^"']*)["']/)))child.title=mm[1];
          child.parentNode=this;
          child._h=String(v).replace(/^\s*<[a-zA-Z][\w-]*\b[^>]*>/,'').replace(/<\/[a-zA-Z][\w-]*>\s*$/,'');
          child._tc=child._h.replace(/<[^>]*>/g,'');
          this.children.push(child);
        }
      },
      get innerHTML(){return this._h||''},
      get firstElementChild(){return this.children[0]||null},
      set textContent(v){this._tc=String(v)},get textContent(){return this._tc||''},
      querySelector(){return docEl('sub')},
      querySelectorAll(){return[]},
      closest(){return null},
      scrollIntoView(){},
    };
    el.classList={
      add(c){el._clsLog.push({op:'add',cls:c})},
      remove(c){el._clsLog.push({op:'remove',cls:c})},
      toggle(c){el._clsLog.push({op:'toggle',cls:c})},
      contains(){return false},
    };
    return el;
  }
  /* p14：预置 #fab-dock / #cal-mini，供 _wsABoot 把 #ws-a-fab 注入到 cal-mini 之前 */
  const dockEl=docEl('div#fab-dock');
  const calEl=docEl('div#cal-mini');
  dockEl.id='fab-dock';
  calEl.id='cal-mini';
  dockEl.children.push(calEl);
  calEl.parentNode=dockEl;
  byId['fab-dock']=dockEl;
  byId['cal-mini']=calEl;
  const ctx={
    console,
    localStorage:{_m:{},getItem(k){return this._m[k]||null},setItem(k,v){this._m[k]=String(v)}},
    document:{
      readyState:'complete',addEventListener(){},
      createElement(tag){return docEl(tag)},
      head:{appendChild(){}},
      body:{children:[],appendChild(c){this.children.push(c)},classList:{contains(){return false}}},
      getElementById(id){
        /* p14：注入守卫 `if(getElementById('ws-a-fab'))return` 依赖「找不到=未注入」语义，
         * 对 ws-a-fab 不做懒创建（其余 id 维持懒创建，_wsABuild 靠它取 ws-a-close/send/q/sel/body）。 */
        if(id==='ws-a-fab')return byId[id]||null;
        if(!byId[id]){const e=docEl('el#'+id);e.scrollIntoView=function(){scrollCalls.push(id)};byId[id]=e}return byId[id]
      },
      querySelectorAll(){return[]},
    },
    dbGet:async(s,k)=>{const row=store[s+'/'+k];return row||null},
    dbPut:async(s,d)=>{writeLog.push({table:s,id:d.id});store[s+'/'+d.id]=Object.assign({},d)},
    dbDelete:async()=>{},
    dbGetAll:async(s)=>Object.keys(store).filter(k=>k.indexOf(s+'/')===0).map(k=>store[k]),
    toast(){},
    setTimeout(fn){return 0},clearTimeout(){},
    apiConfigs:[{id:'cfgA',nickname:'小明',model:'gpt-x',systemPrompt:''},{id:'cfgB',nickname:'小红',model:'claude-y'}],
    archivedConfigs:[],
    navTo(p){navCalls.push(p)},
    /* 假 callApiChat：记录收到的 cfg/messages/opts，返回预置回复。
     * ctx.__fakeReturn 若被显式赋值（含 '' 空串 / null），原样返回以模拟字符串契约；
     * 否则返回对象契约 {text:ctx.__fakeReply,truncated:false}。 */
    callApiChat:async function(cfg,messages,opts){apiCalls.push({cfg:cfg&&cfg.id,messages:messages,opts:opts});if(ctx.__fakeReturn!==undefined)return ctx.__fakeReturn;return {text:ctx.__fakeReply||'',truncated:false}},
  };
  ctx.window=ctx;
  ctx.__navCalls=navCalls;ctx.__scrollCalls=scrollCalls;ctx.__apiCalls=apiCalls;
  ctx.__store=store;ctx.__writeLog=writeLog;ctx.__fakeReply='';ctx.__fakeReturn=undefined;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}

console.log('== P06 小助手（逻辑层 + 静态断言）==');

(async()=>{
  /* ── 静态：p14 入口改右下角 fab-dock ── */
  ok('S1. 新入口 id="ws-a-fab"（或 id=\'ws-a-fab\'）存在',outText.indexOf('id="ws-a-fab"')!==-1||outText.indexOf("id='ws-a-fab'")!==-1);
  ok('S2. guide-header 区域不再挂 ws-a-launch（P06-1 还原为恒等）',!/guide-header[\s\S]{0,400}ws-a-launch/.test(outText));
  ok('S2b. ws-a-fab 不在 guide-header 区域（在 fab-dock 注入）',!/guide-header[\s\S]{0,400}ws-a-fab/.test(outText));

  /* ── 静态：guards 共存（既有能力未被改坏）── */
  ok('G1. callApiChat 仍在',outText.indexOf('async function callApiChat(cfg,messages,opts)')!==-1);
  ok('G2. navTo 仍在',outText.indexOf('function navTo(page){')!==-1);
  ok('G3. p05 收藏 app:\'fav\' 仍在',outText.indexOf("app:'fav'")!==-1);
  ok('G4. p02 music 分支仍在',/op\.kind==='music'/.test(outText));
  ok('G5. p04 sticker 分支仍在',/op\.kind==='sticker'/.test(outText));

  /* ── 静态：本集命名/纪律 ── */
  ok('N1. IIFE 注释以 /* p06 开头',outText.indexOf('(function(){/* p06：小助手')!==-1);
  ok('N2. 样式命名空间 ws-a- 存在',/\.ws-a[-{ .]/.test(outText));

  /* ══ 行为层（需 p06 IIFE）══ */
  if(!hasIIFE){
    console.log('\n（行为层：p06 IIFE 未注入，跳过 _wsA* 行为断言）');
    console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
    process.exit(fail?1:0);
  }

  /* 前置：暴露都在 */
  {
    const c=makeEnv();
    const need=['_wsAMANUAL','_wsASYS','_wsAPAGES','_wsAParse','_wsADoOpen','_wsASetCfgId','_wsACfgId'];
    const missing=need.filter(n=>typeof c[n]==='undefined');
    ok('前置. window 暴露全部 _wsA* 接口',missing.length===0,'missing='+missing.join(','));
  }

  /* ── p14：boot 时把 #ws-a-fab 注入 #fab-dock（#cal-mini 之前）── */
  {
    const c=makeEnv();
    const dock=c.document.getElementById('fab-dock');
    const ch=(dock&&dock.children)||[];
    const fabEl=ch.find(function(el){return el&&el.id==='ws-a-fab'});
    ok('F1. boot 后 #fab-dock 内存在 #ws-a-fab 子元素',!!fabEl,'children='+ch.map(function(e){return e&&(e.id||e.className)}).join(','));
    ok('F2. fab-dock 顺序=[ws-a-fab][fab-sep][cal-mini]',
      ch.length>=3&&ch[0].id==='ws-a-fab'&&String(ch[1].className||'').indexOf('fab-sep')!==-1&&ch[2].id==='cal-mini',
      'order='+ch.map(function(e){return e&&(e.id||'('+e.className+')')}).join(','));
    ok('F3. #ws-a-fab 的 title 含「小助手」',!!fabEl&&String(fabEl.title||'').indexOf('小助手')!==-1,'title='+(fabEl&&fabEl.title));
    ok('F4. #ws-a-fab 内容不含 Guide/mini-title，且无文字节点（textContent 去标签后为空）',
      !!fabEl
      && String(fabEl.innerHTML||'').indexOf('Guide')===-1
      && String(fabEl.innerHTML||'').indexOf('mini-title')===-1
      && String(fabEl.textContent||'').trim()==='',
      'html='+(fabEl&&String(fabEl.innerHTML||'').slice(0,160)));
    ok('F5. #ws-a-fab 已注册 click 监听器',!!fabEl&&!!fabEl._handlers&&Array.isArray(fabEl._handlers.click)&&fabEl._handlers.click.length>0,'handlers='+(fabEl&&JSON.stringify(Object.keys(fabEl._handlers||{}))));
    /* p15：fab 内仅一个 .mini-icon（无 mini-title/无额外文字）；svg 描边 1.5 贴齐 call/icode 邻居 */
    const fhtml=String(fabEl?fabEl.innerHTML:'');
    const miniCount=(fhtml.match(/class=["']mini-icon["']/g)||[]).length;
    ok('F4b. #ws-a-fab 内仅一个 .mini-icon 子元素',!!fabEl&&miniCount===1,'count='+miniCount+' html='+fhtml.slice(0,160));
    ok('F6. fab 内 svg stroke-width="1.5"（贴齐 call/icode 邻居，不再 1.7）',!!fabEl&&/stroke-width\s*=\s*["']1\.5["']/.test(fhtml),'html='+fhtml.slice(0,200));
  }

  /* ── 知识源：内嵌说明书正文，且不含应用内 Guide 的艺术写作 ── */
  {
    const c=makeEnv();
    const man=String(c._wsAMANUAL||'');
    ok('K1. 知识源含「这是什么」',man.indexOf('这是什么')!==-1,man.slice(0,40));
    ok('K2. 知识源含收藏小节',man.indexOf('收藏一条消息')!==-1);
    ok('K3. 知识源含「电脑端没有的功能」清单',man.indexOf('电脑端没有的功能')!==-1);
    ok('K4. 知识源含 p01–p05/p07 本地补丁说明',man.indexOf('本地补丁')!==-1&&man.indexOf('精细文件工具')!==-1&&(man.indexOf('连接测试')!==-1||man.indexOf('测试连接')!==-1));
    ok('K5. 不含应用内 Guide 的艺术写作（longitudinal）',man.toLowerCase().indexOf('longitudinal')===-1,man.slice(0,60));
    ok('K6. 不含「锁屏=电脑端有」这类假话：锁屏在「没有的功能」里出现',/锁屏/.test(man)&&man.indexOf('电脑端没有的功能')!==-1);
  }

  /* ── 系统提示：只答说明书 / 手机端独有如实说 / 改设置拒绝 ── */
  {
    const c=makeEnv();
    const sys=String(c._wsASYS||'');
    ok('P1. 系统提示要求只依据说明书',/说明书/.test(sys));
    ok('P2. 系统提示要求手机端独有功能如实说没有',/手机端/.test(sys)&&(/没有|暂无/.test(sys)));
    ok('P3. 系统提示拒绝替用户改设置',/改设置/.test(sys)&&(/不能|不做|无法/.test(sys)),sys.slice(0,120));
    ok('P4. 系统提示约定 [[open: 跳转标记',sys.indexOf('[[open:')!==-1);
  }

  /* ── 跳转标记解析（纯函数）── */
  {
    const c=makeEnv();
    const r1=c._wsAParse('去聊天页看看 [[open:chat]]');
    ok('O1. 解析出 open 动作 key=chat',r1.acts&&r1.acts.length===1&&r1.acts[0].op==='open'&&r1.acts[0].key==='chat',JSON.stringify(r1));
    ok('O2. 正文剥离标记',r1.text==='去聊天页看看',JSON.stringify(r1));
    const r2=c._wsAParse('这是普通回答，没有跳转');
    ok('O3. 无标记 acts 为空',r2.acts&&r2.acts.length===0,JSON.stringify(r2));
    const r3=c._wsAParse('[[open:gm-music]]\n播放器在设置区');
    ok('O4. 支持 gm- 小节键',r3.acts&&r3.acts.length===1&&r3.acts[0].key==='gm-music'&&r3.text==='播放器在设置区',JSON.stringify(r3));
    const r5=c._wsAParse('a [[open:chat]] b [[open:api]] c');
    ok('O5. 多个动作全部收集并全部剥离',r5.acts&&r5.acts.length===2&&r5.acts[0].key==='chat'&&r5.acts[1].key==='api'&&r5.text.indexOf('[[open:')===-1,JSON.stringify(r5));
  }

  /* ── 页面映射：key → navTo 页面 / 锚点 ── */
  {
    const c=makeEnv();
    const pg=c._wsAPAGES;
    ok('M1. chat 映射 page=chat',pg.chat&&pg.chat.page==='chat');
    ok('M2. api 映射 page=api',pg.api&&pg.api.page==='api');
    ok('M3. gm-music 落在 guide 页并带锚点',pg['gm-music']&&pg['gm-music'].page==='guide'&&pg['gm-music'].anchor==='gm-music',JSON.stringify(pg['gm-music']));
    ok('M4. 未知键为 undefined',pg['__nope__']===undefined);
  }

  /* ── _wsADoOpen：调 navTo；guide 小节再滚动 ── */
  {
    const c=makeEnv();
    c._wsADoOpen('chat');
    ok('D1. open chat → navTo(chat)',c.__navCalls.indexOf('chat')!==-1,'calls='+JSON.stringify(c.__navCalls));
    c._wsADoOpen('gm-music');
    ok('D2. open gm-music → navTo(guide)',c.__navCalls.indexOf('guide')!==-1,'calls='+JSON.stringify(c.__navCalls));
    c._wsADoOpen('__nope__');
    ok('D3. 未知键不调 navTo',c.__navCalls.length<=2,'calls='+JSON.stringify(c.__navCalls));
  }

  /* ── 回答用 API 独立选存：apiSettings / app:wsA，不碰聊天 activeFriendId ── */
  {
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    const id=await c._wsACfgId();
    ok('C1. 选存后读回 cfgB',id==='cfgB',String(id));
    const row=Object.values(c.__store).find(r=>r&&r.id==='wsA_cfg');
    ok('C2. 落在 apiSettings 行 id=wsA_cfg / app=wsA',!!row&&row.app==='wsA'&&row.v==='cfgB',JSON.stringify(row));
    const tablesTouched=[...new Set(c.__writeLog.map(w=>w.table))];
    ok('C3. 只写 apiSettings 一张表',tablesTouched.length===1&&tablesTouched[0]==='apiSettings','tables='+tablesTouched.join(','));
    ok('C4. 不依赖/不写 activeFriendId',typeof c.activeFriendId==='undefined');
  }

  /* ── 发送：用所选 cfg 调 callApiChat，系统提示=说明书，不写聊天记录 ── */
  {
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    c.__fakeReply='收藏夹在顶栏星钮 [[open:chat]]';
    /* 直接驱动发送：需要用户输入。通过暴露的发送函数与假 DOM 驱动 */
    let threw=false;
    try{
      /* 先把选择的 cfg 装入内存态（open 时加载）。若 _wsAOpen 需要，直接调用 */
      if(typeof c._wsALoadCfg==='function')await c._wsALoadCfg();
      await c._wsASendQ('怎么收藏一条消息');
    }catch(e){threw=true;console.log('      err='+e.message)}
    ok('SND1. 发送不抛错',!threw);
    const call=c.__apiCalls[c.__apiCalls.length-1];
    ok('SND2. 走了独立 callApiChat',!!call,'n='+c.__apiCalls.length);
    if(call){
      ok('SND3. 用的是所选 cfgB（非聊天好友）',call.cfg==='cfgB','cfg='+call.cfg);
      const sys=call.messages.find(m=>m.role==='system');
      ok('SND4. 系统提示内嵌说明书正文',!!sys&&String(sys.content).indexOf('收藏一条消息')!==-1);
      const u=call.messages.filter(m=>m.role==='user');
      ok('SND5. 用户问题在消息里',u.length>=1&&String(u[u.length-1].content).indexOf('收藏一条消息')!==-1);
    }
    /* P13：不再自动跳；改为在 bot 气泡后追加 ws-a-jump 跳转键，用户点击才 navTo */
    const bodyEl=c.document.getElementById('ws-a-body');
    const kids=(bodyEl&&bodyEl.children)||[];
    const hasJump=kids.some(function(el){return el&&typeof el.className==='string'&&el.className.indexOf('ws-a-jump')!==-1});
    ok('SND6. 回答不自动跳 chat，且 bot 气泡后出现 ws-a-jump 跳转键',
      c.__navCalls.indexOf('chat')===-1&&hasJump,
      'calls='+JSON.stringify(c.__navCalls)+' hasJump='+hasJump);
  }

  /* ── W1. 小助手「(无回复)」三态：callApiChat 两契约兼容 + 空回复可诊断 ── */
  /* helper：取 ws-a-body 最后一个子节点的 textContent（即最终 bot 气泡文案） */
  function lastBotBubbleText(c){
    const body=c.document.getElementById('ws-a-body');
    if(!body||!body.children||!body.children.length)return '';
    const last=body.children[body.children.length-1];
    return String((last&&last._tc)||'');
  }
  {
    /* ① mock 返回字符串 '你好' → 气泡显示「你好」，且 opts.wantMeta===true */
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    c.__fakeReturn='你好';
    let threw=false;
    try{await c._wsASendQ('测试问题')}catch(e){threw=true}
    const txt=lastBotBubbleText(c);
    ok('W1-①a. 字符串契约：气泡显示原文「你好」（不是无回复/空文本）',!threw&&txt==='你好','threw='+threw+' got='+JSON.stringify(txt));
    const call=c.__apiCalls[c.__apiCalls.length-1];
    ok('W1-①b. 字符串契约：调用 opts.wantMeta===true',!!call&&!!call.opts&&call.opts.wantMeta===true,'opts='+JSON.stringify(call&&call.opts));
  }
  {
    /* ② mock 返回 {text:'你好'} → 气泡显示「你好」 */
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    c.__fakeReply='你好';
    let threw=false;
    try{await c._wsASendQ('测试问题')}catch(e){threw=true}
    const txt=lastBotBubbleText(c);
    ok('W1-②. 对象契约：气泡显示原文「你好」',!threw&&txt==='你好','threw='+threw+' got='+JSON.stringify(txt));
  }
  {
    /* ③a mock 返回空字符串 '' → 气泡显示可诊断文案「接口返回空文本」 */
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    c.__fakeReturn='';
    let threw=false;
    try{await c._wsASendQ('测试问题')}catch(e){threw=true}
    const txt=lastBotBubbleText(c);
    ok('W1-③a. 空字符串：气泡显示可诊断文案',!threw&&txt.indexOf('接口返回空文本')!==-1,'threw='+threw+' got='+JSON.stringify(txt));
  }
  {
    /* ③b mock 返回 {text:''} → 气泡显示可诊断文案「接口返回空文本」 */
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    c.__fakeReply='';
    let threw=false;
    try{await c._wsASendQ('测试问题')}catch(e){threw=true}
    const txt=lastBotBubbleText(c);
    ok('W1-③b. 空对象{text:""}：气泡显示可诊断文案',!threw&&txt.indexOf('接口返回空文本')!==-1,'threw='+threw+' got='+JSON.stringify(txt));
  }

  /* ── 不越界：被要求改设置时，回答层不真的改设置（只在系统提示约束，静态兜底）── */
  {
    const c=makeEnv();
    const src=iifeSrc;
    ok('X1. IIFE 内不调用 saveCurrentApi / 改聊天设置',!/saveCurrentApi|location\.href\s*=/.test(src));
    ok('X2. 不写 chatMessages 表',!/dbPut\(\s*['"]chatMessages['"]/.test(src));
  }

  /* ── 面板样式不污染全局按钮（静态）── */
  ok('Y1. IIFE 内不覆盖 .ws-btn',iifeSrc.indexOf('.ws-btn')===-1);
  ok('Y2. IIFE 内不覆盖 .chat-close',iifeSrc.indexOf('.chat-close')===-1);

  /* ── B1–B4：fab 注入代码（IIFE 源码层）；线性描边 SVG；窗内去 💧 emoji ── */
  {
    ok('B1. IIFE 全段不含 💧 emoji',iifeSrc.indexOf('💧')===-1,'iifeSrc 仍含 💧');
    ok('B2. IIFE 内含 fab 注入 id（id="ws-a-fab" 或 id=\'ws-a-fab\'）',iifeSrc.indexOf('id="ws-a-fab"')!==-1||iifeSrc.indexOf("id='ws-a-fab'")!==-1);
    ok('B3. fab 内 svg 用 stroke="currentColor" 线性描边体系',/stroke=['"]currentColor['"]/.test(iifeSrc));
    ok('B4. fab 注入串不含 mini-title 标签（IIFE 全段无 mini-title；该词知识源亦无，可安全全 IIFE 搜）',iifeSrc.indexOf('mini-title')===-1);
    /* p15：#ws-a-fab 规则与真源 #cal-mini 同形态。选择器 # 或 . 均可（DOM 同时带 id 与 class）；
     * 取第一个 ws-a-fab{ 规则体（在 ::before 规则之前），归一化空白后比对声明序列；
     * gap 只在 fab 规则体内禁（面板 .ws-a-head/.ws-a-body/.ws-a-input 合法使用 gap）；
     * 光斑/悬停/激活 ::before 不删除，而是镜像 #cal-mini 整组（见 B6b/B6c）。 */
    const fabRule=iifeSrc.match(/ws-a-fab\s*\{([^}]*)\}/);
    const fabBody=fabRule?fabRule[1]:'';
    const fabNorm=fabBody.replace(/\s+/g,'');
    const calLike='position:relative;display:flex;align-items:center;box-sizing:border-box;background:none;border:none;cursor:pointer;padding:013px016px';
    ok('B6. #ws-a-fab 规则体与 #cal-mini 同形态（无 gap）',
      !!fabRule&&fabNorm.indexOf(calLike)!==-1&&fabNorm.indexOf('gap')===-1,
      'body='+fabBody.slice(0,200));
    /* p15 修复轮：fab 整组镜像 #cal-mini（光斑/取色/悬停），不再是裸单规则。
     * 一律限定 iifeSrc 切片；选择器 #ws-a-fab（T1 已从 . 改为 #）。 */
    const beforeRule=iifeSrc.match(/#ws-a-fab::before\{([^}]*)\}/);
    const beforeBody=beforeRule?beforeRule[1]:'';
    ok('B6b. fab 光斑组镜像 #cal-mini（::before right:1px / hover·active 底 / 主题反转 / >* / .mini-icon opacity）',
      !!beforeRule&&beforeBody.indexOf('right:1px')!==-1
      &&iifeSrc.indexOf('#ws-a-fab:hover::before{background:rgba(175,195,228,0.14)}')!==-1
      &&iifeSrc.indexOf('#ws-a-fab:active::before{background:rgba(175,195,228,0.2')!==-1
      &&iifeSrc.indexOf('body:not(.theme-infernal) #ws-a-fab:hover::before{background:rgba(255,255,255,0.4)}')!==-1
      &&iifeSrc.indexOf('body:not(.theme-infernal) #ws-a-fab:active::before{background:rgba(255,255,255,0.5)}')!==-1
      &&iifeSrc.indexOf('#ws-a-fab>*{position:relative;z-index:1}')!==-1
      &&iifeSrc.indexOf('#ws-a-fab:hover .mini-icon{opacity:1}')!==-1
      &&/#ws-a-fab \.mini-icon\{[^}]*opacity:0\.8/.test(iifeSrc),
      'beforeBody='+beforeBody.slice(0,160));
    ok('B6c. fab svg 取色镜像邻居（.mini-icon svg color:var(--silver)；非地狱主题 #2a5070）',
      iifeSrc.indexOf('#ws-a-fab .mini-icon svg{display:block;color:var(--silver)}')!==-1
      &&iifeSrc.indexOf('body:not(.theme-infernal) #ws-a-fab .mini-icon svg{color:#2a5070}')!==-1);
  }

  /* ── T1：窗题 .ws-a-title 文案=「小助手」（只窗头片段，禁止全产物搜「说明书小助手」）── */
  {
    const ti=iifeSrc.indexOf('ws-a-title');
    const tFrag=ti>=0?iifeSrc.slice(ti,ti+120):'';
    ok('T1. .ws-a-title 窗头文案为「小助手」',/ws-a-title">小助手</.test(iifeSrc),'frag='+tFrag.slice(0,80));
    ok('T1b. 窗头片段不含旧题「说明书小助手/旧问询词」',tFrag.indexOf('说明书小助手')===-1&&tFrag.indexOf('问\u6c34')===-1,'frag='+tFrag.slice(0,80));
  }

  /* ── S3：fab 标签用 Cormorant Garamond 衬线斜体（限定 IIFE 内，避免基线已有字族假阳性）── */
  ok('S3. IIFE 内不含 Cormorant（已删衬线字族/mini-title 全套自造视觉）',iifeSrc.indexOf('Cormorant')===-1);

  /* ── H1. 首页无污染：p06 patches 的 new 侧不写首页专属标记 ── */
  {
    const p06mod=require('./p06-小助手.js');
    const homeMarks=['id="page-home"','home-title','home-subtitle','home-credit','splash-mist','LOCAL TIME'];
    let h1bad=0;
    p06mod.patches.forEach(function(p,i){
      const nw=String(p.new||'');
      homeMarks.forEach(function(mk){
        if(nw.indexOf(mk)!==-1){h1bad++;console.log('  ✗ H1. patch#'+i+' new 含首页标记「'+mk+'」')}
      });
    });
    ok('H1. p06 patches new 侧不含首页专属标记（page-home/home-title/home-subtitle/home-credit/splash-mist/LOCAL TIME）',h1bad===0,'bad='+h1bad);
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
