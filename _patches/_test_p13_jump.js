/* _test_p13_jump.js —— P13 跳转改点击：bot 回答含 [[open:key]] 时不再自动 navTo，
 *   而是在 bot 气泡后追加一个「去<页名> →」跳转键（ws-a-jump，bot 气泡的兄弟节点），
 *   用户点击该键才 _wsADoOpen（关窗 + navTo；guide 小节再滚动定位）。
 *
 * 跑法：node _test_p13_jump.js [产物.html]
 * 做法与 _test_p06_water.js 一致：截 p06 IIFE → vm + 假环境跑行为断言。
 * 假 DOM 现实化：addEventListener 记录 handler（可模拟点击）、classList 记录调用
 *   （可断言 _wsAClose 的 remove('open')）、document.body.appendChild 记录（可摸到 _wsAOv）、
 *   setTimeout 记录回调（可手动 flush 80ms 滚动）。
 *
 * 红相：对尚未落地 p13 的产物（旧代码自动跳、无跳转键），J1–J8 必须 RED。
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

/* ── 截取 p06 IIFE（唯一起止标记，与 _test_p06_water.js 一致）── */
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

/* ── 假环境（现实版：记录 handler / classList / body 子节点 / setTimeout 回调）── */
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
  };
  ctx.window=ctx;
  ctx.__navCalls=navCalls;ctx.__scrollCalls=scrollCalls;ctx.__apiCalls=apiCalls;
  ctx.__pendingTimeouts=pendingTimeouts;
  ctx.__store=store;ctx.__writeLog=writeLog;ctx.__fakeReply='';ctx.__fakeReturn=undefined;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}

/* helper：跑一次发送，字符串契约直接返回 reply */
async function send(c,q,reply){
  await c._wsASetCfgId('cfgB');
  c.__fakeReturn=reply;
  let threw=false;
  try{await c._wsASendQ(q)}catch(e){threw=true;console.log('      send err='+e.message)}
  return threw;
}
function bodyKidsOf(c){const b=c.document.getElementById('ws-a-body');return (b&&b.children)||[]}
function jumpBtns(c){return bodyKidsOf(c).filter(function(el){return el&&typeof el.className==='string'&&el.className.indexOf('ws-a-jump')!==-1})}
function flush(c){(c.__pendingTimeouts||[]).forEach(function(fn){try{fn()}catch(e){}});c.__pendingTimeouts.length=0}
function overlay(c){return (c.document.body.children||[]).find(function(el){return el&&typeof el.className==='string'&&el.className.indexOf('ws-a-ov')!==-1})}

console.log('== P13 跳转改点击（J1–J8：不自动跳 / 出现跳转键 / 点击才跳 / 关窗 / 滚动锚点）==');

(async()=>{
  if(!hasIIFE){console.log('\n结果：'+pass+' 通过 / '+fail+' 失败（p06 IIFE 未注入）');process.exit(fail?1:0)}

  /* ── J1–J4：含 [[open:api]] 的回答 ── */
  {
    const c=makeEnv();
    const threw=await send(c,'摘要在哪看','在 API 页的对话摘要卡 [[open:api]]');
    ok('J1. 含 [[open:api]] 的回答发送后不自动 navTo',!threw&&c.__navCalls.length===0,'threw='+threw+' calls='+JSON.stringify(c.__navCalls));
    const btns=jumpBtns(c);
    ok('J2. ws-a-body 下出现 ws-a-jump 跳转键（bot 气泡兄弟节点）',btns.length>=1,'n='+btns.length);
    if(btns.length){
      const btn=btns[0];
      const tc=String(btn.textContent||'');
      ok('J3. 跳转键文案以「去」开头且含目标页中文名',tc.indexOf('去')===0&&tc.indexOf('API')!==-1,'tc='+JSON.stringify(tc));
      /* 模拟点击 */
      const handlers=btn._handlers&&btn._handlers.click;
      const hasClick=Array.isArray(handlers)&&handlers.length>0;
      if(hasClick)handlers[0]();
      flush(c);
      ok('J4. 点击跳转键后 navTo(api) 且关窗（classList.remove(open)/display=none）',
        hasClick&&c.__navCalls.indexOf('api')!==-1&&(function(){const ov=overlay(c);return !!ov&&ov.style.display==='none'&&ov._clsLog.some(function(l){return l.op==='remove'&&l.cls==='open'})})(),
        'hasClick='+hasClick+' calls='+JSON.stringify(c.__navCalls)+' ov='+(overlay(c)?('display='+overlay(c).style.display+' clsLog='+JSON.stringify(overlay(c)._clsLog)):'(none)'));
    }else{
      ok('J4. （无跳转键可点，J4 失败）',false);
    }
  }

  /* ── J5：gm- 小节键 → navTo(guide) + 滚动锚点 ── */
  {
    const c=makeEnv();
    const threw=await send(c,'播放器怎么控制','在说明书播放器小节 [[open:gm-music]]');
    const btns=jumpBtns(c);
    let clicked=false;
    if(btns.length&&btns[0]._handlers.click)btns[0]._handlers.click[0](),clicked=true;
    flush(c);
    ok('J5. gm-music 跳转键点击后 navTo(guide) 且 scrollIntoView(gm-music)',
      !threw&&clicked&&c.__navCalls.indexOf('guide')!==-1&&c.__scrollCalls.indexOf('gm-music')!==-1,
      'threw='+threw+' clicked='+clicked+' nav='+JSON.stringify(c.__navCalls)+' scroll='+JSON.stringify(c.__scrollCalls));
  }

  /* ── J6：无 [[open: 的回复 → 不出现跳转键 ── */
  {
    const c=makeEnv();
    await send(c,'你好','这是普通回答，没有任何跳转标记');
    ok('J6. 无 [[open: 的回答不出现跳转键',jumpBtns(c).length===0,'n='+jumpBtns(c).length);
  }

  /* ── J7：user 气泡不带跳转键（jumpKey 只对 bot 生效）── */
  {
    const c=makeEnv();
    await send(c,'去聊天页 [[open:chat]]','回复内容 [[open:chat]]');
    const kids=bodyKidsOf(c);
    const user=kids[0];
    ok('J7. user 气泡存在且 className 含 ws-a-user、不含 ws-a-jump',
      !!user&&typeof user.className==='string'&&user.className.indexOf('ws-a-user')!==-1&&user.className.indexOf('ws-a-jump')===-1,
      'user.className='+(user&&user.className));
    ok('J7b. body 下所有跳转键都不是 user 气泡',jumpBtns(c).every(function(b){return String(b.className).indexOf('ws-a-user')===-1}));
  }

  /* ── J8：多次发送，跳转键只对当次回答追加；期间始终不自动跳 ── */
  {
    const c=makeEnv();
    await send(c,'问题一','去聊天页 [[open:chat]]');
    await send(c,'问题二','去长期记忆页 [[open:memory]]');
    const btns=jumpBtns(c);
    ok('J8. 两次含 key 的回答后跳转键数量=2，且全程未自动 navTo',
      btns.length===2&&c.__navCalls.length===0,'btns='+btns.length+' nav='+JSON.stringify(c.__navCalls));
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
