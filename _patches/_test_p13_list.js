/* _test_p13_list.js —— P13 列表贴边：bot 气泡 Markdown 列表（ol/ul/li/p/标题/code）贴边排版。
 *
 * 跑法：node _test_p13_list.js [产物.html]
 * 必须用全量产物（含 p12 的 _mdRenderHtml），不能用 --only p06 产物。
 *
 * 断言：
 *   L1 静态：p06 IIFE css 含 '.ws-a-msg ol' 且含 'padding-left'
 *   L2 静态：'.ws-a-bot' 规则为 white-space:normal（覆盖 .ws-a-msg 的 pre-wrap）
 *   L3 静态：'.ws-a-user' 规则为 white-space:pre-wrap
 *   L4 静态：含 'list-style-position:outside'
 *   L5 行为：真 _mdRenderHtml 渲染 '1. a\n2. b' → bot 气泡 innerHTML 含 <ol 与 <li
 *   L6 行为：user 气泡多空格/换行走 textContent 分支，innerHTML 为空、textContent 原样保留
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

/* ── 截取 p06 IIFE ── */
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

/* ── 从全量产物里抽取真 _mdRenderHtml 源码（大括号配对）── */
function extractFn(src,signature){
  const i=src.indexOf(signature);
  if(i<0)return null;
  let j=src.indexOf('{',i);if(j<0)return null;
  let depth=0;
  for(let k=j;k<src.length;k++){
    const ch=src[k];
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0)return src.slice(i,k+1)}
  }
  return null;
}

/* ── 假环境（与 _test_p13_jump.js 同一现实版）── */
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
      tag:tag,style:{},children:[],_h:'',_tc:'',dataset:{},value:'',className:'',
      _handlers:{},_clsLog:[],
      appendChild(c){this.children.push(c);return c},
      removeChild(c){const idx=this.children.indexOf(c);if(idx>=0)this.children.splice(idx,1);return c},
      get firstChild(){return this.children[0]||null},
      get lastChild(){return this.children[this.children.length-1]||null},
      addEventListener(t,fn){(this._handlers[t]=this._handlers[t]||[]).push(fn)},
      removeEventListener(){},
      remove(){},focus(){},blur(){},click(){},
      setAttribute(){},removeAttribute(){},
      set innerHTML(v){this._h=String(v);this._tc=String(v).replace(/<[^>]*>/g,'')},get innerHTML(){return this._h||''},
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
  const ctx={
    console,
    localStorage:{_m:{},getItem(k){return this._m[k]||null},setItem(k,v){this._m[k]=String(v)}},
    document:{
      readyState:'complete',addEventListener(){},
      createElement(tag){return docEl(tag)},
      head:{appendChild(){}},
      body:{children:bodyKids,appendChild(c){bodyKids.push(c)},classList:{contains(){return false}}},
      getElementById(id){if(!byId[id]){const e=docEl('el#'+id);e.scrollIntoView=function(){scrollCalls.push(id)};byId[id]=e}return byId[id]},
      querySelectorAll(){return[]},
    },
    dbGet:async(s,k)=>{const row=store[s+'/'+k];return row||null},
    dbPut:async(s,d)=>{writeLog.push({table:s,id:d.id});store[s+'/'+d.id]=Object.assign({},d)},
    dbDelete:async()=>{},
    dbGetAll:async(s)=>Object.keys(store).filter(k=>k.indexOf(s+'/')===0).map(k=>store[k]),
    toast(){},
    setTimeout(fn){pendingTimeouts.push(fn);return pendingTimeouts.length},
    clearTimeout(){},
    apiConfigs:[{id:'cfgA',nickname:'小明',model:'gpt-x',systemPrompt:''},{id:'cfgB',nickname:'小红',model:'claude-y'}],
    archivedConfigs:[],
    navTo(p){navCalls.push(p)},
    callApiChat:async function(cfg,messages,opts){apiCalls.push({cfg:cfg&&cfg.id,messages:messages,opts:opts});if(ctx.__fakeReturn!==undefined)return ctx.__fakeReturn;return {text:ctx.__fakeReply||'',truncated:false}},
    /* 真渲染器由测试在 runInContext 之前注入（见下） */
  };
  ctx.window=ctx;
  ctx.__navCalls=navCalls;ctx.__scrollCalls=scrollCalls;ctx.__apiCalls=apiCalls;
  ctx.__pendingTimeouts=pendingTimeouts;
  ctx.__store=store;ctx.__writeLog=writeLog;ctx.__fakeReply='';ctx.__fakeReturn=undefined;
  /* 真 _mdRenderHtml + 它依赖的 _hasCJK */
  const mdSrc=hasIIFE?extractFn(outText,'function _mdRenderHtml(text,partial){'):null;
  if(mdSrc){
    try{ctx._mdRenderHtml=eval('('+mdSrc+')')}catch(e){console.log('      (注入真 _mdRenderHtml 失败：'+e.message+')')}
  }
  ctx._hasCJK=function(s){return /[\u4e00-\u9fff]/.test(String(s==null?'':s))};
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}

async function send(c,q,reply){
  await c._wsASetCfgId('cfgB');
  c.__fakeReturn=reply;
  let threw=false;
  try{await c._wsASendQ(q)}catch(e){threw=true;console.log('      send err='+e.message)}
  return threw;
}
function bodyKidsOf(c){const b=c.document.getElementById('ws-a-body');return (b&&b.children)||[]}

console.log('== P13 列表贴边（L1–L4 静态 css / L5 真渲染器产出 ol/li / L6 user 纯文本分支）==');

(async()=>{
  /* ── L1–L4：静态 css 断言（对准 p06 IIFE 尾部追加的规则）── */
  if(hasIIFE){
    ok('L1. css 含 .ws-a-msg ol 规则且带 padding-left',iifeSrc.indexOf('.ws-a-msg ol')!==-1&&iifeSrc.indexOf('padding-left')!==-1);
    ok('L2. .ws-a-bot 规则为 white-space:normal（覆盖 .ws-a-msg 的 pre-wrap）',
      iifeSrc.indexOf('.ws-a-bot{white-space:normal}')!==-1&&iifeSrc.indexOf('.ws-a-bot{white-space:pre-wrap')===-1);
    ok('L3. .ws-a-user 规则为 white-space:pre-wrap',iifeSrc.indexOf('.ws-a-user{white-space:pre-wrap}')!==-1);
    ok('L4. 含 list-style-position:outside',iifeSrc.indexOf('list-style-position:outside')!==-1);
  }else{
    ok('L1. (无 IIFE，跳过)',false);ok('L2. (无 IIFE，跳过)',false);
    ok('L3. (无 IIFE，跳过)',false);ok('L4. (无 IIFE，跳过)',false);
  }

  /* ── L5：真渲染器把「1. a\n2. b」渲染成 <ol><li> ── */
  if(hasIIFE){
    const c=makeEnv();
    if(typeof c._mdRenderHtml!=='function'){
      ok('L5. 全量产物含真 _mdRenderHtml',false,'extractFn 未取到');
    }else{
      const reply='开启摘要分三步：\n1. 打开 API 页\n2. 滚动到对话摘要卡\n3. 勾选启用对话摘要';
      const threw=await send(c,'怎么开启摘要',reply);
      const kids=bodyKidsOf(c);
      const bot=kids[kids.length-1];
      const html=bot?String(bot.innerHTML):'';
      ok('L5. bot 气泡 innerHTML 经真 _mdRenderHtml 后含 <ol 与 <li',
        !threw&&/<ol[\s>]/i.test(html)&&/<li[\s>]/i.test(html),'threw='+threw+' html='+JSON.stringify(html.slice(0,300)));
    }
  }

  /* ── L6：user 气泡保留多空格/换行（textContent 分支，不走 innerHTML）── */
  if(hasIIFE){
    const c=makeEnv();
    const q='第一行   后面有三个空格\n第二行\t带 tab';
    const threw=await send(c,q,'好的');
    const kids=bodyKidsOf(c);
    const user=kids[0];
    ok('L6. user 气泡 textContent 原样保留多空格/换行，innerHTML 为空（走 textContent 分支）',
      !threw&&!!user&&String(user.textContent)===q&&String(user.innerHTML)==='',
      'threw='+threw+' tc='+JSON.stringify(user&&user.textContent)+' html='+JSON.stringify(user&&user.innerHTML));
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
