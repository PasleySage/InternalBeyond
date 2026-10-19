/* _test_p18_set_act.js —— P18 小助手动作系统：统一动作解析 + 设置表 doSet + undo + 设置清单。
 *
 * 跑法：node _test_p18_set_act.js [产物.html]
 * 做法与 _test_p13_jump.js 一致：截 p06 IIFE → vm + 假环境跑行为断言。
 * 红相：对尚未落地 p18 的产物（旧代码只认 [[open:]]、无 doSet/undo），S1–S12 必须 RED。
 *
 * 假环境与 p13 同款：store 模拟 IndexedDB（dbGet/dbPut）、localStorage、假 DOM、假 callApiChat。
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

/* ── 截取 p06 IIFE（与 p13 一致）── */
const iifeStart=outText.indexOf('(function(){/* p06：小助手');
let iifeSrc=null,hasIIFE=false;
if(iifeStart<0){
  console.log('  · 产物里暂无 p06 IIFE，行为层跳过');
}else{
  const endMark=outText.indexOf('_wsABoot();',iifeStart);
  const iifeEnd=outText.indexOf('})();',endMark)+5;
  if(endMark<0||iifeEnd<5){console.log('  · p06 IIFE 结尾标记不全，行为层跳过')}
  else{iifeSrc=outText.slice(iifeStart,iifeEnd);hasIIFE=true}
}

function makeEnv(){
  const store={};
  const writeLog=[];
  const navCalls=[];
  const scrollCalls=[];
  const apiCalls=[];
  const bodyKids=[];
  let pendingTimeouts=[];
  const byId={};
  function docEl(tag){
    const el={
      tag:tag,style:{},children:[],_h:'',_tc:'',dataset:{},value:'',className:'',checked:false,
      _handlers:{},_clsLog:{add(){},remove(){},toggle(){},contains(){return false}},
      appendChild(c){this.children.push(c);return c},
      addEventListener(t,fn){(this._handlers[t]=this._handlers[t]||[]).push(fn)},
      removeEventListener(){},remove(){},focus(){},blur(){},click(){},
      setAttribute(){},removeAttribute(){},
      set innerHTML(v){this._h=String(v);this._tc=String(v).replace(/<[^>]*>/g,'')},get innerHTML(){return this._h||''},
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
  const ctx={
    console,
    localStorage:{_m:{},getItem(k){return (k in this._m)?this._m[k]:null},setItem(k,v){this._m[k]=String(v)}},
    document:{
      readyState:'complete',addEventListener(){},
      createElement(tag){return docEl(tag)},
      head:{appendChild(){}},
      body:{children:bodyKids,appendChild(c){bodyKids.push(c)},classList:{contains(){return false}}},
      getElementById(id){if(!byId[id]){const e=docEl('el#'+id);e.scrollIntoView=function(){scrollCalls.push(id)};byId[id]=e}return byId[id]},
      querySelectorAll(){return[]},
    },
    dbGet:async(s,k)=>{const row=store[s+'/'+k];return row?JSON.parse(JSON.stringify(row)):null},
    dbPut:async(s,d)=>{writeLog.push({table:s,id:d.id});store[s+'/'+d.id]=JSON.parse(JSON.stringify(d))},
    dbDelete:async()=>{},
    dbGetAll:async(s)=>Object.keys(store).filter(k=>k.indexOf(s+'/')===0).map(k=>store[k]),
    toast(){},setTimeout(fn){pendingTimeouts.push(fn);return pendingTimeouts.length},clearTimeout(){},
    apiConfigs:[{id:'cfgA',nickname:'小明',model:'gpt-x'},{id:'cfgB',nickname:'小红',model:'claude-y'}],
    archivedConfigs:[],editingApiId:null,
    navTo(p){navCalls.push(p)},
    toggleTheme(){ctx.__themeToggled=(ctx.__themeToggled||0)+1},
    callApiChat:async function(cfg,messages,opts){apiCalls.push({cfg:cfg&&cfg.id,messages:messages});if(ctx.__fakeReturn!==undefined)return ctx.__fakeReturn;return {text:ctx.__fakeReply||''}},
  };
  ctx.window=ctx;
  ctx.__navCalls=navCalls;ctx.__scrollCalls=scrollCalls;ctx.__apiCalls=apiCalls;
  ctx.__pendingTimeouts=pendingTimeouts;
  ctx.__store=store;ctx.__writeLog=writeLog;ctx.__fakeReply='';ctx.__fakeReturn=undefined;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}
function seed(c,table,id,row){c.__store[table+'/'+id]=JSON.parse(JSON.stringify(row))}
async function send(c,q,reply){
  await c._wsASetCfgId('cfgB');
  c.__fakeReturn=reply;
  let threw=false;
  try{await c._wsASendQ(q)}catch(e){threw=true;console.log('      send err='+e.message)}
  return threw;
}
function bodyKidsOf(c){const b=c.document.getElementById('ws-a-body');return (b&&b.children)||[]}
function actRows(c){return bodyKidsOf(c).filter(function(el){return el&&typeof el.className==='string'&&el.className.indexOf('ws-a-act')!==-1})}

console.log('== P18 小助手动作系统（S1–S12）==');

(async()=>{
  if(!hasIIFE){console.log('\n结果：'+pass+' 通过 / '+fail+' 失败（p06 IIFE 未注入）');process.exit(fail?1:0)}

  /* ── S1：统一解析 [[set:]]/[[open:]]/[[run:]]，正文被剥离 ── */
  {
    const c=makeEnv();
    const parsed=c._wsAParse('改一下摘要 [[set:sum.enabled=true]] 去音乐页 [[open:set-music]] 切个主题 [[run:theme]] 收尾');
    ok('S1. 三类标记都能抽出（3 个 acts）',parsed.acts&&parsed.acts.length===3,'n='+(parsed.acts&&parsed.acts.length));
    if(parsed.acts){
      ok('S1b. acts 顺序与 op/参数正确',
        parsed.acts[0].op==='set'&&parsed.acts[0].path==='sum.enabled'&&parsed.acts[0].value==='true'
        &&parsed.acts[1].op==='open'&&parsed.acts[1].key==='set-music'
        &&parsed.acts[2].op==='run'&&parsed.acts[2].name==='theme',
        JSON.stringify(parsed.acts));
    }
    ok('S1c. 正文已剥离所有标记',/\[\[(set|open|run):/.test(parsed.text)===false&&parsed.text.indexOf('改一下摘要')===0,JSON.stringify(parsed.text));
  }

  /* ── S2：设置表含 A/B 全部 path；不含 ui./perms./key/endpoint ── */
  {
    const c=makeEnv();
    const T=(typeof c._wsATable==='function')?c._wsATable():[];
    const paths=T.map(function(r){return r.path});
    ['sum.enabled','sum.keepCount','sum.summaryScope','sum.summaryWindow','sum.summaryApiId',
     'presence.welcomeEnabled','presence.welcomeInterval','music.sing',
     'music.ctl','stk.on','fine.on','fine.cap',
     'read.chat','read.groupChat','read.feed','read.posts'].forEach(function(p){
      ok('S2. 表内应有 '+p,paths.indexOf(p)!==-1,'paths='+JSON.stringify(paths));
    });
    ok('S2b. 表内不含 ui./perms./key/endpoint',
      paths.every(function(p){return p.indexOf('ui.')!==0&&p.indexOf('perms.')!==0&&p!=='key'&&p!=='endpoint'}),
      JSON.stringify(paths.filter(function(p){return /^(ui\.|perms\.)/.test(p)||p==='key'||p==='endpoint'})));
  }

  /* ── S3：doSet sum.enabled → summarySettings.enabled，其它字段不动 ── */
  {
    const c=makeEnv();
    seed(c,'apiSettings','summarySettings',{id:'summarySettings',enabled:false,keepCount:10,welcomeEnabled:false,welcomeInterval:2,musicEnabled:false,summaryApiId:'',summaryWindow:60,summaryScope:'keep'});
    const r=await c._wsADoSet('sum.enabled','true');
    const s=c.__store['apiSettings/summarySettings'];
    ok('S3. doSet(sum.enabled,true) ok 且回显 from→to',r.ok===true&&/关\s*→\s*开/.test(r.line||''),'r='+JSON.stringify(r));
    ok('S3b. summarySettings.enabled===true 且 keepCount 仍=10（读改写单键，未重建整表）',s.enabled===true&&s.keepCount===10,'s='+JSON.stringify(s));
  }

  /* ── S4：doSet stk.on 只改 on，presets 长度不变 ── */
  {
    const c=makeEnv();
    seed(c,'apiSettings','ib_stk',{id:'ib_stk',on:false,cur:'x',presets:[{a:1},{b:2},{c:3}]});
    const r=await c._wsADoSet('stk.on','true');
    const s=c.__store['apiSettings/ib_stk'];
    ok('S4. doSet(stk.on,true) ok',r.ok===true,'r='+JSON.stringify(r));
    ok('S4b. 只改 on；presets 长度仍=3、cur 仍=x',s.on===true&&s.presets.length===3&&s.cur==='x',JSON.stringify(s));
  }

  /* ── S5：doSet fine.on → localStorage.ib_wsFineTools==='1' ── */
  {
    const c=makeEnv();
    const r=await c._wsADoSet('fine.on','true');
    ok('S5. doSet(fine.on,true) ok 且 localStorage.ib_wsFineTools==="1"',r.ok===true&&c.localStorage.getItem('ib_wsFineTools')==='1','r='+JSON.stringify(r)+' ls='+c.localStorage.getItem('ib_wsFineTools'));
  }

  /* ── S6：doSet api.<id>.temperature 只动 temperature；未知 id 失败 ── */
  {
    const c=makeEnv();
    const r=await c._wsADoSet('api.cfgA.temperature','0.8');
    const row=c.apiConfigs.find(function(x){return x.id==='cfgA'});
    ok('S6. doSet(api.cfgA.temperature,0.8) ok',r.ok===true,'r='+JSON.stringify(r));
    ok('S6b. 只动 temperature=0.8，昵称仍=小明',Math.abs(row.temperature-0.8)<1e-9&&row.nickname==='小明','row='+JSON.stringify(row));
    const bad=await c._wsADoSet('api.noSuchId.temperature','0.5');
    ok('S6c. 未知 id → ok:false',bad.ok===false,JSON.stringify(bad));
  }

  /* ── S7：表外 path → ok:false，回显含「设置表里没有」 ── */
  {
    const c=makeEnv();
    const r=await c._wsADoSet('ui.fs','1.2');
    ok('S7. 表外 path → ok:false 且 line/msg 含「设置表里没有」',r.ok===false&&/设置表里没有/.test((r.line||'')+(r.msg||'')),JSON.stringify(r));
  }

  /* ── S8：undo 写回 old，UI 同步函数被调 ── */
  {
    const c=makeEnv();
    seed(c,'apiSettings','summarySettings',{id:'summarySettings',enabled:false,keepCount:6});
    const r=await c._wsADoSet('sum.enabled','true');
    ok('S8. doSet 返回 undoIdx',r.ok===true&&r.undoIdx!==undefined,'r='+JSON.stringify(r));
    await c._wsAUndo(r.undoIdx);
    const s=c.__store['apiSettings/summarySettings'];
    ok('S8b. undo 后 enabled 写回 false（本会话内小助手改过的项可撤）',s.enabled===false,'s='+JSON.stringify(s));
  }

  /* ── S9：「设置清单」整句匹配不调 callApiChat ── */
  {
    const c=makeEnv();
    const threw=await send(c,'设置清单','（不该走到这里的模型回复）');
    ok('S9. 输入「设置清单」未调 callApiChat',!threw&&c.__apiCalls.length===0,'apiCalls='+c.__apiCalls.length);
    const txt=bodyKidsOf(c).map(function(e){return e.textContent||''}).join('\n');
    ok('S9b. 本地列出了可改项（含「对话摘要」等人话）',/对话摘要|设置/.test(txt),txt.slice(0,120));
  }

  /* ── S10：一条回复 >5 动作只执行 5 个 ── */
  {
    const c=makeEnv();
    let marks='';
    for(let i=0;i<7;i++)marks+=' [[set:sum.keepCount='+[3,6,10,20,30,60,3][i]+']]';
    const parsed=c._wsAParse('正文'+marks);
    ok('S10. 7 个动作只保留前 5',parsed.acts.length===5,'n='+parsed.acts.length);
  }

  /* ── S11：run:skinReset / 手机端 path → 明确失败；run:theme 成功 ── */
  {
    const c=makeEnv();
    const sk=await c._wsARun('skinReset');
    ok('S11. run:skinReset → 明确失败（电脑端暂无）',sk.ok===false&&/暂无|不支持/.test(sk.line||sk.msg||''),JSON.stringify(sk));
    const th=await c._wsARun('theme');
    ok('S11b. run:theme → 调 toggleTheme 且 ok',th.ok===true&&c.__themeToggled===1,'r='+JSON.stringify(th)+' toggled='+c.__themeToggled);
    const ui=await c._wsADoSet('ui.reduce','true');
    ok('S11c. 手机端 ui.* path → 表外拒绝',ui.ok===false,JSON.stringify(ui));
  }

  /* ── S12：全程不写 chatMessages ── */
  {
    const c=makeEnv();
    await c._wsADoSet('sum.enabled','true');
    await c._wsADoSet('stk.on','true');
    await c._wsADoSet('fine.on','true');
    await c._wsADoSet('api.cfgA.temperature','1.2');
    await c._wsADoSet('read.chat','20');
    const leaked=Object.keys(c.__store).filter(function(k){return k.indexOf('chatMessages/')===0});
    ok('S12. 改设置全程未写 chatMessages',leaked.length===0,'leaked='+JSON.stringify(leaked));
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
