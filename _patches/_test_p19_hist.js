/* _test_p19_hist.js —— P19 小助手对话持久化与清空：localStorage 'ib_helper_hist'（≤30 条，{role,text,acts:[{ok,line}]}）、
 * boot 恢复重画（气泡 + 动作行回显，无撤销钮/跳转钮）、窗头「清空」（hist + undo 栈清空、重画空态欢迎句）、
 * 上下文窗口 slice(-12)、清空不回滚已改设置、localStorage.setItem 抛错不抛穿、防误删（p18/fab/white-space）。
 *
 * 跑法：node _test_p19_hist.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 * 做法与 _test_p18_set_act.js 一致：截 p06 IIFE → vm + 假环境（localStorage 可注入共享实例）跑行为断言。
 * 红相：对尚未落地 p19 的产物（p18 基线），H1–H6/H8d/H9 必须 RED（证明测试咬得住）。
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

/* ── 截取 p06 IIFE（与 p18/p13 同一方式）── */
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

/* ── 假环境（照 p18 惯例，三处改良）：
 *   ① innerHTML setter 清空 children（照 _test_p06_water.js，重画/空态断言需要）；
 *   ② localStorage 可注入共享实例 makeEnv(extLS)（恢复断言跨 env 共享同一份）；
 *   ③ 元素补 removeChild（_wsARemoveTip/_wsAPaintAll 需要）。── */
function makeEnv(extLS){
  const store={};
  const writeLog=[];
  const navCalls=[];
  const scrollCalls=[];
  const apiCalls=[];
  const byId={};
  function docEl(tag){
    const el={
      tag:tag,style:{},children:[],_h:'',_tc:'',dataset:{},value:'',className:'',checked:false,
      _handlers:{},_clsLog:{add(){},remove(){},toggle(){},contains(){return false}},
      appendChild(c){c.parentNode=this;this.children.push(c);return c},
      insertBefore(child,ref){child.parentNode=this;const idx=this.children.indexOf(ref);if(idx<0){this.children.push(child)}else{this.children.splice(idx,0,child)}return child},
      removeChild(c){const idx=this.children.indexOf(c);if(idx>=0)this.children.splice(idx,1);return c},
      get firstChild(){return this.children[0]||null},
      get lastChild(){return this.children[this.children.length-1]||null},
      addEventListener(t,fn){(this._handlers[t]=this._handlers[t]||[]).push(fn)},
      removeEventListener(){},remove(){},focus(){},blur(){},click(){},
      setAttribute(k,v){this[k]=String(v)},removeAttribute(){},
      set innerHTML(v){
        this._h=String(v);this._tc=String(v).replace(/<[^>]*>/g,'');
        this.children=[];
        const m=String(v).match(/^\s*<([a-zA-Z][\w-]*)\b([^>]*)>/);
        if(m){
          const child=docEl(m[1]);let mm;
          if((mm=(m[2]||'').match(/\bid=["']([^"']*)["']/)))child.id=mm[1];
          if((mm=(m[2]||'').match(/\bclass=["']([^"']*)["']/)))child.className=mm[1];
          child.parentNode=this;
          child._h=String(v).replace(/^\s*<[a-zA-Z][\w-]*\b[^>]*>/,'').replace(/<\/[a-zA-Z][\w-]*>\s*$/,'');
          child._tc=child._h.replace(/<[^>]*>/g,'');
          this.children.push(child);
        }
      },
      get innerHTML(){return this._h||''},
      set textContent(v){this._tc=String(v)},get textContent(){return this._tc||''},
      querySelector(){return docEl('sub')},querySelectorAll(){return[]},closest(){return null},
      scrollIntoView(){},
    };
    el.classList={
      add(c){(this._log=this._log||[]).push('add:'+c)},
      remove(c){(this._log=this._log||[]).push('remove:'+c)},
      toggle(){},contains(){return false},
    };
    return el;
  }
  const ls=extLS||{_m:{},getItem(k){return (k in this._m)?this._m[k]:null},setItem(k,v){this._m[k]=String(v)}};
  const ctx={
    console,
    localStorage:ls,
    document:{
      readyState:'complete',addEventListener(){},
      createElement(tag){return docEl(tag)},
      head:{appendChild(){}},
      body:{children:[],appendChild(c){this.children.push(c)},classList:{contains(){return false}}},
      getElementById(id){if(!byId[id]){const e=docEl('el#'+id);e.scrollIntoView=function(){scrollCalls.push(id)};byId[id]=e}return byId[id]},
      querySelectorAll(){return[]},
    },
    dbGet:async(s,k)=>{const row=store[s+'/'+k];return row?JSON.parse(JSON.stringify(row)):null},
    dbPut:async(s,d)=>{writeLog.push({table:s,id:d.id});store[s+'/'+d.id]=JSON.parse(JSON.stringify(d))},
    dbDelete:async()=>{},
    dbGetAll:async(s)=>Object.keys(store).filter(k=>k.indexOf(s+'/')===0).map(k=>store[k]),
    toast(){},setTimeout(fn){return 0},clearTimeout(){},
    apiConfigs:[{id:'cfgA',nickname:'小明',model:'gpt-x',systemPrompt:''},{id:'cfgB',nickname:'小红',model:'claude-y'}],
    archivedConfigs:[],editingApiId:null,
    navTo(p){navCalls.push(p)},
    toggleTheme(){ctx.__themeToggled=(ctx.__themeToggled||0)+1},
    callApiChat:async function(cfg,messages,opts){apiCalls.push({cfg:cfg&&cfg.id,messages:messages,opts:opts});if(ctx.__fakeReturn!==undefined)return ctx.__fakeReturn;return {text:ctx.__fakeReply||'',truncated:false}},
  };
  ctx.window=ctx;
  ctx.__navCalls=navCalls;ctx.__scrollCalls=scrollCalls;ctx.__apiCalls=apiCalls;
  ctx.__store=store;ctx.__writeLog=writeLog;ctx.__fakeReply='';ctx.__fakeReturn=undefined;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}
function seed(c,table,id,row){c.__store[table+'/'+id]=JSON.parse(JSON.stringify(row))}
function send(c,q,reply){
  return (async function(){
    await c._wsASetCfgId('cfgB');
    c.__fakeReturn=reply;
    let threw=false;
    try{await c._wsASendQ(q)}catch(e){threw=true;console.log('      send err='+e.message)}
    return threw;
  })();
}
function bodyKidsOf(c){const b=c.document.getElementById('ws-a-body');return (b&&b.children)||[]}
function walkBody(c,pred){const out=[];(function walk(node){if(!node||!node.children)return;for(let i=0;i<node.children.length;i++){const ch=node.children[i];if(ch&&pred(ch))out.push(ch);walk(ch)}})(c.document.getElementById('ws-a-body'));return out}
function actRows(c){return walkBody(c,function(el){return el&&typeof el.className==='string'&&(el.className==='ws-a-act'||el.className==='ws-a-act err')})}
function undoBtns(c){return walkBody(c,function(el){return el&&el.className==='ws-a-act-undo'})}
function jumpBtns(c){return walkBody(c,function(el){return el&&el.className==='ws-a-jump'})}
function histOf(c){try{const raw=c.localStorage.getItem('ib_helper_hist');return raw?JSON.parse(raw):null}catch(e){return null}}
function seedSum(c){seed(c,'apiSettings','summarySettings',{id:'summarySettings',enabled:false,keepCount:10,welcomeEnabled:false,welcomeInterval:2,musicEnabled:false,summaryApiId:'',summaryWindow:60,summaryScope:'keep'})}

console.log('== P19 小助手对话持久化与清空（H1–H9）==');

(async()=>{
  /* ── 前置：暴露都在 ── */
  {
    const c=makeEnv();
    const need=['_wsASendQ','_wsASetCfgId','_wsACfgId','_wsAParse','_wsADoSet','_wsAUndo'];
    const missing=need.filter(n=>typeof c[n]==='undefined');
    ok('前置. window 暴露既有 _wsA* 接口',missing.length===0,'missing='+missing.join(','));
    ok('前置b. window 暴露 _wsAClear（p19 清空）',typeof c._wsAClear==='function','type='+typeof c._wsAClear);
  }

  /* ── H1：发送后 localStorage.ib_helper_hist 有 1 条以上且为数组，条目含 role/text ── */
  {
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    c.__fakeReturn='收藏夹在顶栏星钮';
    await c._wsASendQ('怎么收藏一条消息');
    const h=histOf(c);
    ok('H1. 发送后 localStorage.ib_helper_hist 存在且 JSON 为数组',Array.isArray(h)&&h.length>=1,'h='+JSON.stringify(h));
    ok('H1b. 条目含 role/text',Array.isArray(h)&&h.every(function(m){return m&&typeof m.role==='string'&&typeof m.text==='string'}),'h='+JSON.stringify(h));
  }

  /* ── H2：有动作时 persisted acts 只含 {ok,line}，无 undoIdx/jump，回显 ✓ 关 → 开 ── */
  {
    const c=makeEnv();
    seedSum(c);
    await c._wsASetCfgId('cfgB');
    c.__fakeReturn='帮你打开摘要 [[set:sum.enabled=true]]';
    await c._wsASendQ('打开摘要');
    const h=histOf(c);
    const asst=Array.isArray(h)?h[h.length-1]:null;
    ok('H2. assistant 条目带 acts 数组',!!asst&&Array.isArray(asst.acts)&&asst.acts.length===1,'asst='+JSON.stringify(asst));
    const a=asst&&asst.acts&&asst.acts[0];
    ok('H2b. acts 只含 ok/line 两个键',!!a&&Object.keys(a).sort().join(',')==='line,ok','keys='+JSON.stringify(a&&Object.keys(a)));
    ok('H2c. acts 无 undoIdx/jump 字段',!!a&&a.undoIdx===undefined&&a.jump===undefined,'a='+JSON.stringify(a));
    ok('H2d. line 为回显「✓ 启用对话摘要：关 → 开」',!!a&&/✓ 启用对话摘要：关\s*→\s*开/.test(String(a.line||'')),'line='+String(a&&a.line));
  }

  /* ── H3：超过 30 条只留后 30（16 次发送 = 32 条）── */
  {
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    for(let i=0;i<16;i++){c.__fakeReturn='r'+i;await c._wsASendQ('q'+i)}
    const h=histOf(c);
    ok('H3. 32 条只留后 30',Array.isArray(h)&&h.length===30,'len='+(Array.isArray(h)?h.length:'n/a'));
    ok('H3b. 丢的是前 2 条（u0/a0），首条为第 1 次发送的问题 q1',Array.isArray(h)&&h.length===30&&h[0].role==='user'&&h[0].text==='q1','first='+JSON.stringify(h&&h[0]));
  }

  /* ── H4：重建环境（共享 localStorage）读回 hist，body 重画气泡 + 动作行，无撤销/跳转钮 ── */
  {
    const sharedLS={_m:{},getItem(k){return (k in this._m)?this._m[k]:null},setItem(k,v){this._m[k]=String(v)}};
    const cA=makeEnv(sharedLS);
    seedSum(cA);
    await cA._wsASetCfgId('cfgB');
    cA.__fakeReturn='已打开 [[set:sum.enabled=true]]';
    await cA._wsASendQ('打开摘要');
    const cB=makeEnv(sharedLS); /* 同一 localStorage：模拟刷新后重建 */
    const kids=bodyKidsOf(cB);
    const txt=kids.map(function(e){return String(e.textContent||'')}).join('\n');
    ok('H4. 重建环境读回 hist 后 #ws-a-body 子节点数>0',kids.length>0,'n='+kids.length);
    ok('H4b. 回显了 user 与 bot 气泡文案',txt.indexOf('打开摘要')!==-1&&txt.indexOf('已打开')!==-1,'txt='+txt.slice(0,120));
    ok('H4c. 有动作行回显（.ws-a-act）',actRows(cB).length>=1,'n='+actRows(cB).length);
    ok('H4d. 无撤销钮 / 无跳转钮（恢复不还原）',undoBtns(cB).length===0&&jumpBtns(cB).length===0,'undo='+undoBtns(cB).length+' jump='+jumpBtns(cB).length);
  }

  /* ── H5：清空 = hist [] + undo 栈清空 + body 回空态 ── */
  {
    const c=makeEnv();
    seedSum(c);
    await c._wsASetCfgId('cfgB');
    c.__fakeReturn='改一下 [[set:sum.enabled=true]]';
    await c._wsASendQ('打开摘要');
    const hasClear=typeof c._wsAClear==='function';
    ok('H5. 清空函数可用',hasClear);
    if(hasClear){
      ok('H5a. 清空前撤销钮在（撤销栈有内容）',undoBtns(c).length>=1,'n='+undoBtns(c).length);
      c._wsAClear();
      ok('H5b. 清空后 localStorage hist 为 []',c.localStorage.getItem('ib_helper_hist')==='[]','got='+String(c.localStorage.getItem('ib_helper_hist')));
      const kids=bodyKidsOf(c);
      ok('H5c. body 回到空态（仅 1 个 .ws-a-tip 欢迎句）',kids.length===1&&kids[0]&&typeof kids[0].className==='string'&&kids[0].className.indexOf('ws-a-tip')!==-1,
        'n='+kids.length+' cls='+String(kids[0]&&kids[0].className));
      ok('H5d. 空态文案是简短欢迎句（无颜文字/邮箱）',kids[0]&&String(kids[0].textContent||'').indexOf('我是小助手')!==-1&&String(kids[0].textContent||'').indexOf('@')===-1,'tip='+String(kids[0]&&kids[0].textContent));
      ok('H5e. 清空后无撤销钮残留',undoBtns(c).length===0,'n='+undoBtns(c).length);
      await c._wsAUndo(0);
      ok('H5f. 撤销栈已空：_wsAUndo(0) 不回滚设置',c.__store['apiSettings/summarySettings'].enabled===true,'s='+JSON.stringify(c.__store['apiSettings/summarySettings']));
    }else{
      ok('H5a. 撤销钮（跳过：无清空函数）',false);
      ok('H5b. hist 为 []（跳过）',false);
      ok('H5c. 空态（跳过）',false);
      ok('H5d. 空态文案（跳过）',false);
      ok('H5e. 无撤销钮（跳过）',false);
      ok('H5f. undo 不回滚（跳过）',false);
    }
  }

  /* ── H6：清空不回滚已写入 summarySettings 的改动 ── */
  {
    const c=makeEnv();
    seedSum(c);
    await c._wsASetCfgId('cfgB');
    c.__fakeReturn='[[set:sum.enabled=true]]';
    await c._wsASendQ('打开摘要');
    if(typeof c._wsAClear==='function'){
      c._wsAClear();
      ok('H6. 清空后 summarySettings.enabled 仍=true（不回滚已改设置）',c.__store['apiSettings/summarySettings'].enabled===true,'s='+JSON.stringify(c.__store['apiSettings/summarySettings']));
    }else{
      ok('H6. 清空后不回滚（跳过：无清空函数）',false);
    }
  }

  /* ── H7：localStorage.setItem 抛错时发送不抛穿，气泡仍出现 ── */
  {
    const c=makeEnv();
    c.localStorage.setItem=function(){throw new Error('QuotaExceededError')};
    await c._wsASetCfgId('cfgB');
    c.__fakeReturn='你好';
    let threw=false;
    try{await c._wsASendQ('测试问题')}catch(e){threw=true;console.log('      err='+e.message)}
    ok('H7. setItem 抛错时发送不抛穿',!threw);
    const kids=bodyKidsOf(c);
    const last=kids[kids.length-1];
    ok('H7b. 气泡仍出现（最后一条为 bot 回复）',kids.length>=2&&String(last&&last.textContent||'').indexOf('你好')!==-1,
      'n='+kids.length+' last='+JSON.stringify(last&&last.textContent));
  }

  /* ── H8：防误删静态（p18 动作系统 / fab / white-space / p19 锚点）── */
  {
    const p06mod=require('./p06-小助手.js');
    ok('H8. expectCount 仍为 2',p06mod.expectCount===2&&(p06mod.patches||[]).length===2,'ec='+p06mod.expectCount+' n='+(p06mod.patches||[]).length);
    ok('H8b. 动作管道仍在（_wsAParse / [[set:）',iifeSrc.indexOf('function _wsAParse(')!==-1&&iifeSrc.indexOf('[[set:')!==-1);
    ok('H8c. 不写 chatMessages',iifeSrc.indexOf('dbPut(\'chatMessages\')')===-1&&iifeSrc.indexOf('dbPut("chatMessages")')===-1);
    ok('H8d. fab / white-space 双规则在',iifeSrc.indexOf('#ws-a-fab')!==-1&&iifeSrc.indexOf('.ws-a-bot{white-space:normal}')!==-1&&iifeSrc.indexOf('.ws-a-user{white-space:pre-wrap}')!==-1);
    ok('H8e. 产物含 p19 锚点（键名 ib_helper_hist / 清空钮 id="ws-a-clr"）',outText.indexOf('ib_helper_hist')!==-1&&outText.indexOf('id="ws-a-clr"')!==-1);
  }

  /* ── H9：上下文窗口 = slice(-12)（26 条历史只带 12 条 + 当前问）── */
  {
    const c=makeEnv();
    await c._wsASetCfgId('cfgB');
    for(let i=0;i<13;i++){c.__fakeReturn='r'+i;await c._wsASendQ('q'+i)}
    c.__fakeReturn='最终回复';
    await c._wsASendQ('最后一问');
    const call=c.__apiCalls[c.__apiCalls.length-1];
    const histMsgs=(call&&call.messages||[]).filter(function(m){return m.role!=='system'});
    ok('H9. 上下文窗口 slice(-12)：26 条历史只带 12 条 + 当前问',Array.isArray(histMsgs)&&histMsgs.length===13,'n='+(histMsgs&&histMsgs.length));
    ok('H9b. 消息形状 {role,content}（对 API 无 text/acts 泄漏）',Array.isArray(histMsgs)&&histMsgs.every(function(m){return typeof m.content==='string'&&m.text===undefined&&m.acts===undefined}),'msgs='+JSON.stringify(histMsgs&&histMsgs.slice(0,2)));
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
