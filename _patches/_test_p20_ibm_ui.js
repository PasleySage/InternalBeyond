/* _test_p20_ibm_ui.js —— P20 IBM UI 还原断言（旧产物 RED 验证）
 *
 * 跑法：node _test_p20_ibm_ui.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 * 切片标记：(function(){/* p06：小助手（新标记，不含旧版昵称词）
 * 做法：同 _test_p06_water.js，假环境 vm，静态断言为主 + 轻量行为断言。
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const HERE=__dirname;
const DEF_OUT=path.join(HERE,'out','InternalBeyond.patched.html');

let pass=0,fail=0;
function ok(name,cond,extra){if(cond){pass++;console.log('  ✓ '+name)}else{fail++;console.log('  ✗ '+name+(extra?' —— '+extra:''))}}

let outText;
if(process.argv[2])outText=fs.readFileSync(process.argv[2],'utf8');
else if(fs.existsSync(DEF_OUT))outText=fs.readFileSync(DEF_OUT,'utf8');
else{console.error('找不到产物');process.exit(1)}

/* ── 截取 p06 IIFE（新切片标记：不含旧版昵称词）── */
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

/* ── 假环境（照 p06 测试）── */
function makeEnv(){
  const store={};
  const writeLog=[];
  const navCalls=[];
  const scrollCalls=[];
  const apiCalls=[];
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
    callApiChat:async function(cfg,messages,opts){apiCalls.push({cfg:cfg&&cfg.id,messages:messages,opts:opts});if(ctx.__fakeReturn!==undefined)return ctx.__fakeReturn;return {text:ctx.__fakeReply||'',truncated:false}},
  };
  ctx.window=ctx;
  ctx.__navCalls=navCalls;ctx.__scrollCalls=scrollCalls;ctx.__apiCalls=apiCalls;
  ctx.__store=store;ctx.__writeLog=writeLog;ctx.__fakeReply='';ctx.__fakeReturn=undefined;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}

console.log('== P20 IBM UI 还原断言 ==');

(async()=>{
  /* ① 产物全文不含旧版昵称词 */
  ok('① outText 不含旧版昵称词',outText.indexOf('\u6c34\u6c34')===-1,'found '+((outText.match(/\u6c34\u6c34/g)||[]).length)+' times');

  /* ② IIFE 不含旧版昵称词 */
  ok('② iifeSrc 不含旧版昵称词',hasIIFE&&iifeSrc.indexOf('\u6c34\u6c34')===-1,hasIIFE?('found '+((iifeSrc.match(/\u6c34\u6c34/g)||[]).length)+' times'):'no IIFE');

  /* ③ 窗头结构 */
  ok('③a ws-a-title">小助手</ 存在',hasIIFE&&/ws-a-title">小助手</.test(iifeSrc));
  ok('③b id="ws-a-api" 存在',hasIIFE&&iifeSrc.indexOf('id="ws-a-api"')!==-1);
  ok('③c id="ws-a-clr" 存在',hasIIFE&&iifeSrc.indexOf('id="ws-a-clr"')!==-1);
  ok('③d id="ws-a-close" 存在',hasIIFE&&iifeSrc.indexOf('id="ws-a-close"')!==-1);
  ok('③e aria-label="关闭" 存在',hasIIFE&&iifeSrc.indexOf('aria-label="关闭"')!==-1);

  /* ④ 无旧选择器 */
  ok('④a iifeSrc 不含 ws-a-sel',hasIIFE&&iifeSrc.indexOf('ws-a-sel')===-1);
  ok('④b iifeSrc 不含 _wsAPopSel',hasIIFE&&iifeSrc.indexOf('_wsAPopSel')===-1);

  /* ⑤ 菜单标题 */
  ok('⑤ 菜单标题含「执笔 API — 小助手用哪个 API 回答」',hasIIFE&&iifeSrc.indexOf('执笔 API — 小助手用哪个 API 回答')!==-1);

  /* ⑥ chips 行 */
  let qrowFrag='';
  if(hasIIFE){
    const qi=iifeSrc.indexOf('id="ws-a-qrow"');
    if(qi>=0)qrowFrag=iifeSrc.slice(qi,qi+3000);
  }
  ok('⑥a chips 行 id="ws-a-qrow" 存在',hasIIFE&&iifeSrc.indexOf('id="ws-a-qrow"')!==-1);
  ok('⑥b chips 含「你是谁」',qrowFrag.indexOf('你是谁')!==-1);
  ok('⑥c chips 含「设置清单」',qrowFrag.indexOf('设置清单')!==-1);
  ok('⑥d chips 含「精细文件工具」',hasIIFE&&iifeSrc.indexOf('精细文件工具')!==-1);
  ok('⑥e chips 含「接中转站」',hasIIFE&&iifeSrc.indexOf('接中转站')!==-1);
  ok('⑥f chips 不含「缓存探针」',qrowFrag.indexOf('缓存探针')===-1);
  ok('⑥g chips 不含「图片探针」',qrowFrag.indexOf('图片探针')===-1);
  ok('⑥h chips 不含「自制 APP」',qrowFrag.indexOf('自制 APP')===-1);
  ok('⑥i chips 不含「通话说英文」',qrowFrag.indexOf('通话说英文')===-1);
  ok('⑥j chips 不含「减少动效」',qrowFrag.indexOf('减少动效')===-1);
  ok('⑥k chips 不含「特效质量」',qrowFrag.indexOf('特效质量')===-1);

  /* ⑦ .ws-a-ov 规则 */
  let ovBody='';
  if(hasIIFE){const m=iifeSrc.match(/\.ws-a-ov\{([^}]*)\}/);if(m)ovBody=m[1];}
  ok('⑦a .ws-a-ov 含 align-items:flex-end',ovBody.indexOf('align-items:flex-end')!==-1,'body='+ovBody.slice(0,120));
  ok('⑦b .ws-a-ov 含 rgba(10,18,38,0.18)',ovBody.indexOf('rgba(10,18,38,0.18)')!==-1,'body='+ovBody.slice(0,120));

  /* ⑧ .ws-a-modal 规则 */
  let modalBody='';
  if(hasIIFE){const m=iifeSrc.match(/\.ws-a-modal\{([^}]*)\}/);if(m)modalBody=m[1];}
  ok('⑧a .ws-a-modal 含 border-radius:22px 22px 0 0',modalBody.indexOf('border-radius:22px 22px 0 0')!==-1,'body='+modalBody.slice(0,160));
  ok('⑧b .ws-a-modal 含 max-width:560px',modalBody.indexOf('max-width:560px')!==-1);
  ok('⑧c .ws-a-modal 含 max-height:min(82vh,640px)',modalBody.indexOf('max-height:min(82vh,640px)')!==-1);

  /* ⑨ 胶囊输入 */
  let inputBody='';
  if(hasIIFE){const m=iifeSrc.match(/\.ws-a-input\{([^}]*)\}/);if(m)inputBody=m[1];}
  ok('⑨a .ws-a-input 含 border-radius:22px',inputBody.indexOf('border-radius:22px')!==-1,'body='+inputBody.slice(0,120));
  let sendBody='';
  if(hasIIFE){const m=iifeSrc.match(/\.ws-a-send\{([^}]*)\}/);if(m)sendBody=m[1];}
  ok('⑨b .ws-a-send 含 border-radius:50%',sendBody.indexOf('border-radius:50%')!==-1,'body='+sendBody.slice(0,120));

  /* ⑩ 禁禁用色 */
  ok('⑩a iifeSrc 不含 #cfe0ff',hasIIFE&&iifeSrc.indexOf('#cfe0ff')===-1);
  ok('⑩b iifeSrc 不含 #9ab',hasIIFE&&iifeSrc.indexOf('#9ab')===-1);

  /* ⑪ guards（在 outText 上，非 iifeSrc） */
  ok('⑪a guard: toast 仍在',outText.indexOf('function toast(m){')!==-1);
  ok('⑪b guard: navTo 仍在',outText.indexOf('function navTo(page){')!==-1);
  ok('⑪c guard: callApiChat 仍在',outText.indexOf('async function callApiChat(cfg,messages,opts){')!==-1);
  ok('⑪d guard: A PERSONAL DIGITAL SANCTUARY 仍在',outText.indexOf('A PERSONAL DIGITAL SANCTUARY')!==-1);

  /* ⑫ require p06-小助手.js */
  {
    let mod=null,reqErr=null;
    try{mod=require('./p06-小助手.js')}catch(e){reqErr=e.message}
    ok('⑫a require ./p06-小助手.js 成功',!!mod,reqErr||'');
    ok('⑫b expectCount === 2',!!mod&&mod.expectCount===2,'got='+(mod?mod.expectCount:'N/A'));
  }

  /* ⑮ title="切换回答用的 API" */
  ok('⑮ title="切换回答用的 API" 存在',hasIIFE&&iifeSrc.indexOf('title="切换回答用的 API"')!==-1);

  /* ══ 行为层 ══ */
  if(!hasIIFE){
    console.log('\n（行为层：p06 IIFE 未注入，跳过）');
    console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
    process.exit(fail?1:0);
  }

  /* ⑬ _wsARelabel 行为 */
  {
    try{
      const c=makeEnv();
      if(typeof c._wsARelabel!=='function')throw new Error('_wsARelabel not exposed on window');
      /* 无配置场景 */
      c.apiConfigs=[];
      c._wsARelabel();
      const apiEl=c.document.getElementById('ws-a-api');
      const txt=String(apiEl.textContent||'');
      ok('⑬a 无配置时 #ws-a-api textContent=还没有可用的 API',txt==='还没有可用的 API','got='+JSON.stringify(txt));
      /* 有配置场景 */
      c.apiConfigs=[{id:'cfgA',nickname:'小明',model:'gpt-x',systemPrompt:''},{id:'cfgB',nickname:'小红',model:'claude-y'}];
      await c._wsASetCfgId('cfgB');
      await c._wsALoadCfg();
      c._wsARelabel();
      const txt2=String(apiEl.textContent||'');
      ok('⑬b 选 cfgB 后 #ws-a-api 含「执笔 API · 小红」',txt2.indexOf('执笔 API · 小红')!==-1,'got='+JSON.stringify(txt2));
    }catch(e){
      ok('⑬a 无配置时 #ws-a-api textContent=还没有可用的 API',false,'threw: '+e.message);
      ok('⑬b 选 cfgB 后 #ws-a-api 含「执笔 API · 小红」',false,'threw: '+e.message);
    }
  }

  /* ⑭ _wsASendQ('你是谁') 本地直答 */
  {
    try{
      const c=makeEnv();
      if(typeof c._wsASendQ!=='function')throw new Error('_wsASendQ not exposed on window');
      await c._wsASendQ('你是谁');
      ok('⑭a 「你是谁」不调 callApiChat',c.__apiCalls.length===0,'calls='+c.__apiCalls.length);
      const body=c.document.getElementById('ws-a-body');
      const kids=(body&&body.children)||[];
      const last=kids[kids.length-1];
      const txt=String((last&&last._tc)||'');
      ok('⑭b 末个 bot 气泡含「我是小助手」',txt.indexOf('我是小助手')!==-1,'got='+JSON.stringify(txt.slice(0,80)));
    }catch(e){
      ok('⑭a 「你是谁」不调 callApiChat',false,'threw: '+e.message);
      ok('⑭b 末个 bot 气泡含「我是小助手」',false,'threw: '+e.message);
    }
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
