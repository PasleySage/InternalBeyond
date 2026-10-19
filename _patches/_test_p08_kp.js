/* _test_p08_kp.js —— P04-A-3 颜文字面板真机缺陷修复的语义化 DOM 测试
 *
 * 跑法：node _test_p08_kp.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 *
 * 与 _test_p04_sticker.js 的关键区别：这里的假 DOM 是「语义正确」的——
 *   document.createElement 出来的节点未入 document；
 *   document.getElementById 只返回已挂进 document 的节点；
 *   appendChild/insertBefore 会把整棵子树挂进 document（getElementById 才搜得到）；
 *   querySelector/querySelectorAll 在自身后代里搜（不管是否在 document）；
 *   innerHTML 真的解析成子节点。
 * 这正是复现根因所需的语义：面板 p 刚 createElement + 设 innerHTML、尚未 insertBefore
 * 时，document.getElementById('kp-seg') 必须返回 null（旧代码在此 .addEventListener 崩溃），
 * 而 p.querySelector('#kp-seg') 能搜到后代（修复后的写法）。
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

/* ── 抽出 p04 IIFE（与 _test_p04_sticker.js 同一截取法） ── */
const iifeStart=outText.indexOf('(function(){/* p04：表情包与颜文字 UI+数据层');
if(iifeStart<0){console.error('✗ 产物里没找到 p04 IIFE');process.exit(1)}
const endMark=outText.indexOf('else _stkBoot();',iifeStart);
const iifeEnd=outText.indexOf('})();',endMark)+5;
const iifeSrc=outText.slice(iifeStart,iifeEnd);

/* ── 语义化假 DOM ── */
const VOID={input:1,br:1,img:1,meta:1,link:1,hr:1,path:1,line:1,circle:1,rect:1,area:1,base:1,col:1,embed:1,source:1,track:1,wbr:1};

function FakeEl(tag){
  const el=this;
  this.tagName=(tag||'div').toUpperCase();
  this.children=[];
  this.parentNode=null;
  this._id='';
  this._cls=new Set();
  this.attrs={};
  this.style={};
  this.offsetParent={};          /* 默认可见；置 null 模拟隐藏 */
  this.textContent='';
  this.value='';
  this.hidden=false;
  this.checked=false;
  this.selectionStart=0;
  this.selectionEnd=0;
  this._on={};
  this.dataset={};
  this.classList={
    add(c){el._cls.add(c)},
    remove(c){el._cls.delete(c)},
    contains(c){return el._cls.has(c)},
    toggle(c,f){if(f===undefined){el._cls.has(c)?el._cls.delete(c):el._cls.add(c)}else{f?el._cls.add(c):el._cls.delete(c)}}
  };
}
Object.defineProperty(FakeEl.prototype,'id',{
  get(){return this._id},set(v){this._id=String(v)}
});
Object.defineProperty(FakeEl.prototype,'className',{
  get(){return Array.from(this._cls).join(' ')},
  set(v){this._cls=new Set(String(v).split(/\s+/).filter(Boolean))}
});
Object.defineProperty(FakeEl.prototype,'nextSibling',{
  get(){if(!this.parentNode)return null;const i=this.parentNode.children.indexOf(this);return this.parentNode.children[i+1]||null}
});
Object.defineProperty(FakeEl.prototype,'innerHTML',{
  get(){return this._html||''},
  set(v){this._html=String(v);this.children=[];parseHTML(String(v),this)}
});
FakeEl.prototype.getClientRects=function(){return [{x:0,y:0,width:1,height:1}]};
FakeEl.prototype.appendChild=function(c){
  if(c.parentNode){const i=c.parentNode.children.indexOf(c);if(i>=0)c.parentNode.children.splice(i,1)}
  c.parentNode=this;this.children.push(c);return c;
};
FakeEl.prototype.insertBefore=function(c,ref){
  if(c.parentNode){const i=c.parentNode.children.indexOf(c);if(i>=0)c.parentNode.children.splice(i,1)}
  c.parentNode=this;
  const idx=ref?this.children.indexOf(ref):this.children.length;
  if(idx<0)this.children.push(c);else this.children.splice(idx,0,c);
  return c;
};
FakeEl.prototype.addEventListener=function(t,fn){this._on[t]=fn};
FakeEl.prototype.setSelectionRange=function(){};
FakeEl.prototype.dispatchEvent=function(){return true};
FakeEl.prototype.focus=function(){};
FakeEl.prototype.click=function(){if(this._on.click)this._on.click({target:this,preventDefault(){},stopPropagation(){}})};
FakeEl.prototype.removeAttribute=function(){};
FakeEl.prototype.setAttribute=function(){};

/* 选择器：支持 tag / #id / .class / [attr]，空格后代组合 */
function parseCompound(sel){
  const out={tag:null,id:null,classes:[],attrs:[]};
  const re=/([a-zA-Z][a-zA-Z0-9-]*)|#([a-zA-Z0-9_-]+)|\.([a-zA-Z0-9_-]+)|\[([a-zA-Z-]+)\]/g;
  let m;
  while((m=re.exec(sel))){
    if(m[1]!==undefined)out.tag=m[1].toLowerCase();
    else if(m[2]!==undefined)out.id=m[2];
    else if(m[3]!==undefined)out.classes.push(m[3]);
    else if(m[4]!==undefined)out.attrs.push(m[4]);
  }
  return out;
}
function compoundMatches(el,c){
  if(c.tag&&el.tagName.toLowerCase()!==c.tag)return false;
  if(c.id&&el._id!==c.id)return false;
  for(let i=0;i<c.classes.length;i++)if(!el._cls.has(c.classes[i]))return false;
  for(let j=0;j<c.attrs.length;j++){if(!(c.attrs[j] in el.attrs)&&el[c.attrs[j]]===undefined)return false}
  return true;
}
function allDescendants(el){let out=[];el.children.forEach(function(c){out.push(c);out=out.concat(allDescendants(c))});return out}
FakeEl.prototype.querySelector=function(sel){
  const parts=sel.trim().split(/\s+/);
  const pool=allDescendants(this);
  for(let k=0;k<pool.length;k++){
    let pi=parts.length-1,cur=pool[k];
    while(cur&&pi>=0){if(compoundMatches(cur,parseCompound(parts[pi])))pi--;cur=cur.parentNode}
    if(pi<0)return pool[k];
  }
  return null;
};
FakeEl.prototype.querySelectorAll=function(sel){
  const parts=sel.trim().split(/\s+/);
  const pool=allDescendants(this);const found=[];
  pool.forEach(function(node){let pi=parts.length-1,cur=node;while(cur&&pi>=0){if(compoundMatches(cur,parseCompound(parts[pi])))pi--;cur=cur.parentNode}if(pi<0)found.push(node)});
  return found;
};
FakeEl.prototype.closest=function(sel){
  const c=parseCompound(sel);let cur=this;
  while(cur){if(compoundMatches(cur,c))return cur;cur=cur.parentNode}
  return null;
};

/* 迷你 HTML 解析器：把 innerHTML 字符串解析成 FakeEl 子树（面板 HTML 全用双引号） */
function parseHTML(html,host){
  const re=/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\s*((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let m;const stack=[host];
  while((m=re.exec(html))){
    if(m[5]!==undefined){const top=stack[stack.length-1];top.textContent=(top.textContent||'')+m[5];continue}
    const closing=m[1]==='/',tag=m[2].toLowerCase(),attrs=m[3]||'',selfClose=m[4]==='/';
    if(closing){stack.pop();continue}
    const el=new FakeEl(tag);
    const are=/([a-zA-Z-]+)(?:\s*=\s*"([^"]*)")?/g;
    let am;
    while((am=are.exec(attrs))){
      const an=am[1],av=am[2];
      if(an==='id')el._id=String(av);
      else if(an==='class')el._cls=new Set(String(av).split(/\s+/).filter(Boolean));
      else if(an==='hidden')el.hidden=true;
      else if(an.indexOf('data-')===0)el.dataset[an.slice(5)]=av;
      else el.attrs[an]=av;
    }
    const parent=stack[stack.length-1];
    parent.children.push(el);el.parentNode=parent;
    if(!VOID[tag]&&!selfClose)stack.push(el);
  }
}

/* 搭建环境：body 下两个 .chat-input-area，各含一个输入框 */
function makeEnv(opts){
  opts=opts||{};
  const toasts=[];
  const body=new FakeEl('body');
  const head=new FakeEl('head');
  const els={body:body,head:head,areaFull:null,fullInput:null,areaMini:null,miniInput:null};
  if(!opts.noAreas){
    els.areaFull=new FakeEl('div');els.areaFull._cls=new Set(['chat-input-area']);
    els.fullInput=new FakeEl('textarea');els.fullInput._id='chat-full-input';
    els.areaFull.appendChild(els.fullInput);body.appendChild(els.areaFull);
    els.areaMini=new FakeEl('div');els.areaMini._cls=new Set(['chat-input-area']);
    els.miniInput=new FakeEl('textarea');els.miniInput._id='chat-input';
    els.areaMini.appendChild(els.miniInput);body.appendChild(els.areaMini);
    const fVis=opts.fullVisible!==false, mVis=opts.miniVisible!==false;
    els.fullInput.offsetParent=fVis?{}:null;
    els.areaFull.offsetParent=fVis?{}:null;
    els.miniInput.offsetParent=mVis?{}:null;
    els.areaMini.offsetParent=mVis?{}:null;
  }
  const doc={
    readyState:'complete',
    head:head,body:body,
    addEventListener(){},
    createElement(tag){return new FakeEl(tag)},
    getElementById(id){let found=null;(function walk(n){if(found)return;n.children.forEach(function(c){if(c._id===id){found=c;return}walk(c)})})(body);return found},
    querySelectorAll(sel){const c=parseCompound(sel);const out=[];(function walk(n){n.children.forEach(function(x){if(compoundMatches(x,c))out.push(x);walk(x)})})(body);return out}
  };
  const store={};
  const ctx={
    console:console,
    localStorage:{_m:{},getItem(k){return this._m[k]||null},setItem(k,v){this._m[k]=String(v)}},
    document:doc,
    window:{},
    dbGet:async(s,k)=>store[k]||null,
    dbPut:async(s,d)=>{store[d.id]=Object.assign({},d)},
    dbDelete:async(s,k)=>{delete store[k]},
    toast(t){toasts.push(String(t))},
    esc(t){return String(t)},
    setTimeout(){return 0},clearTimeout(){},
    currentPage:'chat',
    renderAttachPreviews(){},
    Event:function(){},
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(iifeSrc,ctx);
  return {ctx:ctx,els:els,toasts:toasts};
}

console.log('== P08 颜文字面板真机缺陷（语义化 DOM）==');

/* 1. 无 localStorage/API 时 _kpToggle 存在且可调用不抛错 */
let r=makeEnv({});
let threw1=false;
try{r.ctx._kpToggle()}catch(e){threw1=true}
ok('1. _kpToggle 存在且可调用不抛错',typeof r.ctx._kpToggle==='function'&&!threw1);

/* 2. #chat-full-input 在 .chat-input-area 内且可见 → _kpEnsure 非 null 且面板已入 document */
r=makeEnv({});
let p2=null,threw2=false;
try{p2=r.ctx._kpEnsure()}catch(e){threw2=e.message}
ok('2a. 全屏输入可见时 _kpEnsure() 返回非 null',!!p2,threw2||'');
ok('2b. 面板已 insertBefore 进 document（getElementById 找得到）',r.ctx.document.getElementById('ib-kao-panel')!==null);
ok('2c. 面板内 #kp-seg / #kao-put / #kao-in 都找得到',
  !!(p2&&p2.querySelector('#kp-seg')&&p2.querySelector('#kao-put')&&p2.querySelector('#kao-in')));

/* 3. 仅 #chat-input 可见（全屏输入框隐藏）→ _kpEnsure 仍非 null */
r=makeEnv({fullVisible:false,miniVisible:true});
let p3=null,threw3=false;
try{p3=r.ctx._kpEnsure()}catch(e){threw3=e.message}
ok('3. 仅小窗输入可见时 _kpEnsure() 仍非 null',!!p3,threw3||'');

/* 4. 两者都无（无 .chat-input-area）→ _kpEnsure 返回 null 且有 toast 文案 */
r=makeEnv({noAreas:true});
let p4='SENTINEL',threw4=false;
try{p4=r.ctx._kpEnsure()}catch(e){threw4=e.message;p4='THREW'}
ok('4a. 无输入条时 _kpEnsure() 返回 null',p4===null,JSON.stringify(p4));
ok('4b. 无输入条时 toast 被调用且文案非空',r.toasts.length>0&&r.toasts[0].length>0,'toasts='+JSON.stringify(r.toasts));

/* 5. KAO 八组非空；_kaoIns 不依赖 _stkState.on */
r=makeEnv({});
const groups=['开心','生气','伤心','惊讶','无语','Kiss','经典','双人款'];
ok('5a. CATS 八组',r.ctx.CATS.length===8&&groups.every(g=>r.ctx.CATS.indexOf(g)!==-1));
ok('5b. KAO 八组都有内容',groups.every(g=>(r.ctx.KAO[g]||[]).length>0));
r.ctx._stkState.on=false;            /* 表情包开关关，颜文字仍应可用 */
let threw5=false;
try{r.ctx._kaoIns('(^_^)')}catch(e){threw5=true}
ok('5c. _stkState.on=false 时 _kaoIns 调用不抛错',!threw5);
ok('5d. _kaoIns 把颜文字插进了可见输入框',r.els.fullInput&&r.els.fullInput.value.indexOf('(^_^)')!==-1,r.els.fullInput&&r.els.fullInput.value);

/* 6. 根因复现：修复后创建面板时不依赖 getElementById（静态断言新写法） */
/*    旧代码：p.innerHTML 后尚未 insertBefore 就用 _$('kp-seg')=getElementById → null.addEventListener 崩溃。
 *    本假 DOM 里 getElementById 只认已入 document 的节点，所以修复前的写法必然抛
 *    "Cannot read properties of null (reading 'addEventListener')"；修复后用 p.querySelector 不抛。
 *    行为层已由 2a/2c 覆盖；这里静态锁死新写法，防止回退成旧的 _$ 绑定。 */
ok('6a. 事件绑定走 p.querySelector（未入 DOM 也能搜后代）',
  outText.indexOf("p.querySelector('#kp-seg').addEventListener")!==-1
  &&outText.indexOf("p.querySelector('#kao-put').addEventListener")!==-1
  &&outText.indexOf("p.querySelector('#kao-in').addEventListener")!==-1);
ok('6b. 不再用 _$ 绑定 kp-seg/kao-put/kao-in（创建期）',
  outText.indexOf("_$('kp-seg').addEventListener")===-1
  &&outText.indexOf("_$('kao-put').addEventListener")===-1
  &&outText.indexOf("_$('kao-in').addEventListener")===-1);
ok('6c. 可见性辅助 _kpVis 存在',outText.indexOf('function _kpVis(')!==-1);
ok('6d. 找不到输入条时有 toast 兜底文案',outText.indexOf('找不到输入条，颜文字面板暂无法打开')!==-1);
ok('6e. _activeInput 不再绑死 currentPage',iifeSrc.indexOf("currentPage==='chat'")===-1);

console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
process.exit(fail?1:0);
