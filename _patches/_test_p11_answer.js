/* _test_p11_answer.js —— P11「小助手指到按钮」断言式测试（红→绿）
 *
 * 跑法：node _test_p11_answer.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 * 做法与 _test_p06_water.js 一致：读产物 → 截取 p06 IIFE → vm + 假环境跑起来，
 * 然后断言：
 *   组 A 空话清除   —— _wsAMANUAL / _wsASYS 不再出现「以界面按钮/文案/流程为准」这类空话；
 *   组 B 知识源补实 —— _wsAMANUAL §6 摘要写出可执行步骤（API 页 / 对话摘要 / 启用 / 保留条数）；
 *   组 C 系统提示   —— _wsASYS 新增规则 6/7/8（明确入口·编号步骤 / 卡片标题·可执行步骤 /
 *                      [[open: 对应页键]），且 mock 发送时真正随 messages 发出去；
 *   组 D 跳转映射   —— _wsAPAGES.api 与 [[open:api]] 解析仍在（没把既有能力改坏）。
 *
 * 若产物未含 p11 改动（重建前）：组 A/B/C 的新断言应为 RED（实现线重建产物后转 GREEN）。
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const HERE=__dirname;
const DEF_OUT=path.join(HERE,'out','InternalBeyond.patched.html');

let pass=0,fail=0;
const failed=[];
function ok(name,cond,extra){if(cond){pass++;console.log('  ✓ '+name)}else{fail++;failed.push(name);console.log('  ✗ '+name+(extra?' —— '+extra:''))}}

let outText;
if(process.argv[2])outText=fs.readFileSync(process.argv[2],'utf8');
else if(fs.existsSync(DEF_OUT))outText=fs.readFileSync(DEF_OUT,'utf8');
else{console.error('找不到产物，先跑 node _driver.js');process.exit(1)}

/* ── 截取 p06 IIFE（与 _test_p06_water.js 同一起止标记）── */
const iifeStart=outText.indexOf('(function(){/* p06：小助手');
let iifeSrc=null,hasIIFE=false;
if(iifeStart<0){
  console.log('  · 产物里暂无 p06 IIFE（实现线未落），行为层跳过');
}else{
  const endMark=outText.indexOf('_wsABoot();',iifeStart);
  const iifeEnd=outText.indexOf('})();',endMark)+5;
  if(endMark<0||iifeEnd<5){console.log('  · p06 IIFE 结尾标记不全，行为层跳过')}
  else{iifeSrc=outText.slice(iifeStart,iifeEnd);hasIIFE=true}
}

/* ── 假环境（照搬 _test_p06_water.js makeEnv）── */
function makeEnv(){
  const store={};
  const writeLog=[];
  const navCalls=[];
  const scrollCalls=[];
  const apiCalls=[];
  const byId={};
  function docEl(tag){
    return {
      tag:tag,style:{},children:[],_h:'',_tc:'',dataset:{},value:'',className:'',
      appendChild(c){this.children.push(c);return c},
      addEventListener(){},removeEventListener(){},
      remove(){},focus(){},blur(){},click(){},
      setAttribute(){},removeAttribute(){},
      set innerHTML(v){this._h=String(v)},get innerHTML(){return this._h||''},
      set textContent(v){this._tc=String(v)},get textContent(){return this._tc||''},
      querySelector(){return docEl('sub')},
      querySelectorAll(){return[]},
      closest(){return null},
      classList:{add(){},remove(){},toggle(){},contains(){return false}},
      scrollIntoView(){},
    };
  }
  const ctx={
    console,
    localStorage:{_m:{},getItem(k){return this._m[k]||null},setItem(k,v){this._m[k]=String(v)}},
    document:{
      readyState:'complete',addEventListener(){},
      createElement(tag){return docEl(tag)},
      head:{appendChild(){}},
      body:{appendChild(){},classList:{contains(){return false}}},
      getElementById(id){if(!byId[id]){const e=docEl('el#'+id);e.scrollIntoView=function(){scrollCalls.push(id)};byId[id]=e}return byId[id]},
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
    callApiChat:async function(cfg,messages,opts){apiCalls.push({cfg:cfg&&cfg.id,messages:messages,opts:opts});if(ctx.__fakeReturn!==undefined)return ctx.__fakeReturn;return {text:ctx.__fakeReply||'',truncated:false}},
  };
  ctx.window=ctx;
  ctx.__navCalls=navCalls;ctx.__scrollCalls=scrollCalls;ctx.__apiCalls=apiCalls;
  ctx.__store=store;ctx.__writeLog=writeLog;ctx.__fakeReply='';ctx.__fakeReturn=undefined;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}

console.log('== P11 小助手指到按钮（A 空话清除 / B 知识源补实 / C 系统提示规则6-8 / D 跳转映射）==');

(async()=>{
  if(!hasIIFE){
    console.log('\n结果：'+pass+' 通过 / '+fail+' 失败（p06 IIFE 未注入，行为层无法跑）');
    process.exit(fail?1:0);
  }

  /* 前置：暴露都在 */
  {
    const c=makeEnv();
    const need=['_wsAMANUAL','_wsASYS','_wsAPAGES','_wsAParse','_wsASetCfgId','_wsASendQ'];
    const missing=need.filter(n=>typeof c[n]==='undefined');
    ok('前置. window 暴露全部 _wsA* 接口',missing.length===0,'missing='+missing.join(','));
  }

  /* ══ 组 A：空话清除 ══ */
  {
    const c=makeEnv();
    const man=String(c._wsAMANUAL||'');
    const sys=String(c._wsASYS||'');
    ok('A1. _wsAMANUAL 不含「以界面按钮为准」',man.indexOf('以界面按钮为准')===-1);
    ok('A2. _wsAMANUAL 不含「以界面文案为准」',man.indexOf('以界面文案为准')===-1);
    ok('A3. _wsAMANUAL 不含「以界面流程为准」',man.indexOf('以界面流程为准')===-1);
    ok('A4. _wsASYS 不含「以界面按钮为准」',sys.indexOf('以界面按钮为准')===-1);
  }

  /* ══ 组 B：知识源补实（§6 摘要可执行步骤）══ */
  {
    const c=makeEnv();
    const man=String(c._wsAMANUAL||'');
    ok('B1. _wsAMANUAL 含「API 页」',man.indexOf('API 页')!==-1,man.slice(0,60));
    ok('B2. _wsAMANUAL 含「对话摘要」',man.indexOf('对话摘要')!==-1);
    ok('B3. _wsAMANUAL 含「启用对话摘要」',man.indexOf('启用对话摘要')!==-1);
    ok('B4. _wsAMANUAL 含「近期消息保留条数」',man.indexOf('近期消息保留条数')!==-1);
    ok('B5. _wsAMANUAL 含「每 10 条新消息」（可选）',man.indexOf('每 10 条新消息')!==-1);
  }

  /* ══ 组 C：系统提示硬约束（规则 6/7/8）══ */
  {
    const c=makeEnv();
    const sys=String(c._wsASYS||'');
    ok('C1. _wsASYS 含规则6关键词（明确入口 / 编号步骤）',sys.indexOf('明确入口')!==-1||sys.indexOf('编号步骤')!==-1,sys.slice(0,200));
    ok('C2. _wsASYS 含规则7关键词（卡片标题 / 可执行步骤）',sys.indexOf('卡片标题')!==-1||sys.indexOf('可执行步骤')!==-1);
    ok('C3. _wsASYS 含规则8关键词（[[open: 与 对应页键）',sys.indexOf('[[open:')!==-1&&sys.indexOf('对应页键')!==-1);
  }
  /* C4：mock 发送「摘要在哪」→ 断言真正发出去的 system 消息含规则6/7关键词 */
  {
    const c=makeEnv();
    await c._wsASetCfgId('cfgA');
    c.__fakeReply='在 API 页 [[open:api]]';
    let threw=false;
    try{
      if(typeof c._wsALoadCfg==='function')await c._wsALoadCfg();
      await c._wsASendQ('摘要在哪');
    }catch(e){threw=true;console.log('      err='+e.message)}
    ok('C4a. 发送不抛错',!threw);
    const call=c.__apiCalls[c.__apiCalls.length-1];
    ok('C4b. 走了 callApiChat',!!call,'n='+c.__apiCalls.length);
    if(call){
      const sysMsg=call.messages.find(m=>m.role==='system');
      const sc=String(sysMsg&&sysMsg.content||'');
      ok('C4c. system 消息含规则6关键词（明确入口 / 编号步骤）',sc.indexOf('明确入口')!==-1||sc.indexOf('编号步骤')!==-1,sc.slice(0,200));
      ok('C4d. system 消息含规则7关键词（卡片标题 / 可执行步骤）',sc.indexOf('卡片标题')!==-1||sc.indexOf('可执行步骤')!==-1);
    }
  }

  /* ══ 组 D：跳转映射仍在 ══ */
  {
    const c=makeEnv();
    const pg=c._wsAPAGES||{};
    ok('D1. _wsAPAGES.api 存在且 page===\'api\'',!!pg.api&&pg.api.page==='api',JSON.stringify(pg.api));
    const r=c._wsAParse('去 API 页 [[open:api]]');
    ok('D2. _wsAParse 解析出 open 动作 key=api',r&&r.acts&&r.acts.length===1&&r.acts[0].key==='api',JSON.stringify(r));
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  if(failed.length){console.log('失败断言：\n - '+failed.join('\n - '))}
  process.exit(fail?1:0);
})();
