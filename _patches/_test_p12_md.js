/* _test_p12_md.js —— P12 小助手 bot 气泡 Markdown 渲染 断言式测试
 *
 * 跑法：node _test_p12_md.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 * 背景：p12 把 _wsABubble 的 bot 分支从纯 textContent 改为
 *       bot → _mdRenderHtml(String(text),false) 渲染后写 innerHTML；
 *       异常/缺失/空渲染退回 textContent；user 保持 textContent。
 *
 * 红相：对尚未落地 p12 的产物，第 1 组（bot md 渲染）必须 RED
 *       （旧代码只写 textContent，innerHTML 为空、无 <strong>）。
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

/* ── 截取 p06 IIFE（唯一起止标记）── */
const iifeStart=outText.indexOf('(function(){/* p06：小助手');
let iifeSrc=null,hasIIFE=false;
if(iifeStart<0){
  console.log('  · 产物里暂无 p06 IIFE，行为层跳过，仅跑静态断言');
}else{
  const endMark=outText.indexOf('_wsABoot();',iifeStart);
  const iifeEnd=outText.indexOf('})();',endMark)+5;
  if(endMark<0||iifeEnd<5){console.log('  · p06 IIFE 结尾标记不全，行为层跳过')}
  else{iifeSrc=outText.slice(iifeStart,iifeEnd);hasIIFE=true}
}

/* 假 _mdRenderHtml：把 **x** 转 <strong>x</strong>（最小实现）。
 * 测试用例可在 makeEnv 之后按需替换为抛错 / undefined 版本。 */
function defaultMdRender(text/*,partial*/){
  return String(text==null?'':text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
}

/* ── 假环境（innerHTML setter 同步 textContent，剥标签纯文本）── */
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
      removeChild(c){const idx=this.children.indexOf(c);if(idx>=0)this.children.splice(idx,1);return c},
      get firstChild(){return this.children[0]||null},
      get lastChild(){return this.children[this.children.length-1]||null},
      addEventListener(){},removeEventListener(){},
      remove(){},focus(){},blur(){},click(){},
      setAttribute(){},removeAttribute(){},
      set innerHTML(v){this._h=String(v);this._tc=String(v).replace(/<[^>]*>/g,'')},get innerHTML(){return this._h||''},
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
    /* p12：bot 气泡要调的全局 markdown 渲染器（默认最小实现，可被测试覆盖） */
    _mdRenderHtml:defaultMdRender,
  };
  ctx.window=ctx;
  ctx.__navCalls=navCalls;ctx.__scrollCalls=scrollCalls;ctx.__apiCalls=apiCalls;
  ctx.__store=store;ctx.__writeLog=writeLog;ctx.__fakeReply='';ctx.__fakeReturn=undefined;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}

/* helper：取 ws-a-body 里的子节点数组（user 气泡=children[0]，最终 bot 气泡=最后一个） */
function kids(c){const b=c.document.getElementById('ws-a-body');return (b&&b.children)?b.children:[];}

/* helper：跑一次发送，预置返回字符串 reply，返回是否抛错 */
async function send(c,q,reply){
  await c._wsASetCfgId('cfgB');
  c.__fakeReturn=reply;
  let threw=false;
  try{await c._wsASendQ(q)}catch(e){threw=true;console.log('      send err='+e.message)}
  return threw;
}

console.log('== P12 小助手 bot 气泡 Markdown 渲染（bot 渲染 / user 纯文本 / 回退 / 静态）==');

(async()=>{
  /* ══ 行为层（需 p06 IIFE）══ */
  if(!hasIIFE){
    console.log('\n（p06 IIFE 未注入，行为层跳过）');
  }else{
    /* ── 组1：bot 文本含 **API** → 渲染成 <strong> ── */
    {
      const c=makeEnv();
      const threw=await send(c,'测试问题','这是 **API** 接口说明');
      const k=kids(c);
      const bot=k[k.length-1];
      const html=bot?String(bot.innerHTML):'';
      ok('P12-1a. bot 含 **API** → innerHTML 含 <strong>API</strong>',!threw&&/<strong[^>]*>\s*API\s*<\/strong>/.test(html),'threw='+threw+' html='+JSON.stringify(html));
      ok('P12-1b. bot 含 **API** → innerHTML 不含字面 **API**',!!bot&&html.indexOf('**API**')===-1,'html='+JSON.stringify(html));
    }

    /* ── 组2：user 文本含 **x** → 仍纯文本，不渲染 ── */
    {
      const c=makeEnv();
      const threw=await send(c,'我要 **加粗** 的效果','好的，已加粗');
      const k=kids(c);
      const user=k[0];
      ok('P12-2a. user 含 **加粗** → 用户气泡 textContent 保留 **加粗**',!threw&&!!user&&String(user.textContent).indexOf('**加粗**')!==-1,'tc='+JSON.stringify(user&&user.textContent));
      ok('P12-2b. user 含 **加粗** → 用户气泡 innerHTML 不含 <strong',!!user&&String(user.innerHTML).indexOf('<strong')===-1,'html='+JSON.stringify(user&&user.innerHTML));
    }

    /* ── 组3：_mdRenderHtml 抛错 / 缺失 → 退回 textContent，不白屏 ── */
    {
      /* 3a/3b：渲染器抛错 */
      const c=makeEnv();
      c._mdRenderHtml=function(t,p){throw new Error('render boom');};
      const threw=await send(c,'测试问题','故障 **粗** 文本');
      const k=kids(c);
      const bot=k[k.length-1];
      ok('P12-3a. 渲染器抛错 → _wsASendQ 不抛异常',!threw,'threw='+threw);
      ok('P12-3b. 渲染器抛错 → 退回纯文本（有文本且 innerHTML 无 <strong>）',!!bot&&String(bot.textContent).length>0&&String(bot.innerHTML).indexOf('<strong')===-1,'tc='+JSON.stringify(bot&&bot.textContent)+' html='+JSON.stringify(bot&&bot.innerHTML));
    }
    {
      /* 3c：渲染器缺失（undefined） */
      const c=makeEnv();
      c._mdRenderHtml=undefined;
      const threw=await send(c,'测试问题','缺失 **粗** 文本');
      const k=kids(c);
      const bot=k[k.length-1];
      ok('P12-3c. 渲染器缺失 → 退回 textContent 不白屏（气泡有原文）',!threw&&!!bot&&String(bot.textContent).indexOf('缺失')!==-1,'threw='+threw+' tc='+JSON.stringify(bot&&bot.textContent));
    }
  }

  /* ── 组4：静态断言 ── */
  ok('P12-4a. p06 IIFE 内 bot 分支走 _mdRenderHtml',hasIIFE&&iifeSrc.indexOf('_mdRenderHtml')!==-1);
  ok('P12-4b. guard: function toast(m){ 仍在',outText.indexOf('function toast(m){')!==-1);
  ok('P12-4c. guard: function navTo(page){ 仍在',outText.indexOf('function navTo(page){')!==-1);
  ok('P12-4d. guard: async function callApiChat 仍在',outText.indexOf('async function callApiChat')!==-1);
  ok('P12-4e. guard: A PERSONAL DIGITAL SANCTUARY 仍在',outText.indexOf('A PERSONAL DIGITAL SANCTUARY')!==-1);

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
