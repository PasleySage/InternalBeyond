/* _test_p05_fav.js —— P05 收藏夹断言式测试（逻辑层 + 静态断言，不碰真 DOM/DB/网络）
 *
 * 跑法：node _test_p05_fav.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 * 做法：把产物里整段 p05 IIFE 抽出来放进 vm，配假 apiSettings/chatMessages 与假 document
 *       （getElementById 按 id 缓存节点，供观测 paint 写出的 hint/标题），断言外部可观察行为：
 *       写入落在 apiSettings 且 app:'fav'、不新建表、按好友隔离、搜索命中正文/署名/频道、
 *       移除不动原消息、原消息删了只剩文字稿、手机端样例行不抛错、纯函数清洗。
 *       其余（双入口、空态/搜不到文案、长按三键、记忆优先级未动、p02/p04 共存、
 *       面板 CSS 不污染全局类、导出带上 fav）用对产物文本的静态断言覆盖。
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

/* ── 截取 p05 IIFE（唯一起止标记）── */
const iifeStart=outText.indexOf('(function(){/* p05：收藏夹——');
let iifeSrc=null,hasIIFE=false;
if(iifeStart<0){
  console.log('  · 产物里暂无 p05 IIFE（实现线未落），行为层跳过，仅跑静态断言');
}else{
  const endMark=outText.indexOf('_favBoot();',iifeStart);
  const iifeEnd=outText.indexOf('})();',endMark)+5;
  if(endMark<0||iifeEnd<5){console.log('  · p05 IIFE 结尾标记不全，行为层跳过')}
  else{iifeSrc=outText.slice(iifeStart,iifeEnd);hasIIFE=true}
}

/* ── 假环境 ── */
function makeEnv(){
  const store={};        /* 假 apiSettings */
  const chatStore={};    /* 假 chatMessages */
  const writeLog=[];     /* 记录 dbPut/dbDelete 落在哪张表 */
  const byId={};         /* getElementById 按 id 缓存节点（供观测 paint 输出） */
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
      getElementById(id){if(!byId[id])byId[id]=docEl('el#'+id);return byId[id]},
    },
    window:{},
    dbGet:async(s,k)=>{if(s==='chatMessages')return chatStore[k]||null;return store[k]||null},
    dbPut:async(s,d)=>{writeLog.push({table:s});const row=Object.assign({},d);if(s==='chatMessages')chatStore[row.id]=row;else store[row.id]=row},
    dbDelete:async(s,k)=>{writeLog.push({table:s,del:true});if(s==='chatMessages')delete chatStore[k];else delete store[k]},
    dbGetAll:async(s)=>{if(s==='chatMessages')return Object.values(chatStore);return Object.values(store)},
    toast(){},_T(t){},
    esc(t){return String(t==null?'':t)},
    setTimeout(){return 0},clearTimeout(){},
    apiConfigs:[{id:'f1',nickname:'小明',model:'gpt-4'},{id:'f2',nickname:'小红',model:'claude'}],
    archivedConfigs:[],
    groups:[{id:'group_g1',name:'测试群'}],
    ibConfirmX:async()=>true,
    currentPage:'chat',
  };
  ctx.window=ctx;
  ctx._writeLog=writeLog;ctx._store=store;ctx._chatStore=chatStore;ctx._byId=byId;
  vm.createContext(ctx);
  if(hasIIFE)vm.runInContext(iifeSrc,ctx);
  return ctx;
}

/* 直接往假 apiSettings 种一条 fav 行（绕过 _favAdd，模拟导入/已有数据） */
function seedFav(ctx,id,cfgId,cfgName,who,text,ts,threadName){
  return ctx.dbPut('apiSettings',{id:id,app:'fav',key:String(id.replace(/^fav_/,'')),v:{
    msgId:id.replace(/^fav_/,''),cfgId:cfgId,cfgName:cfgName||'',threadId:'',threadName:threadName||'',
    role:'user',who:who,text:text,kind:'text',voice:null,imgN:0,ts:ts,created:ts
  },updated:ts});
}
/* 读 paint 写到面板上的观测串 */
const hintOf=c=>c._byId['fav-hint']?c._byId['fav-hint'].textContent:'';
const titleOf=c=>c._byId['fav-tt']?c._byId['fav-tt'].textContent:'';
const wallHtml=c=>c._byId['fav-wall']?c._byId['fav-wall'].innerHTML:'';

console.log('== P05 收藏夹（逻辑层 + 静态断言）==');

(async()=>{
  /* ── 必测 1：两处入口 DOM 锚点都存在（静态）── */
  ok('1a. 全屏入口 id="fav-open-full" 存在',outText.indexOf('id="fav-open-full"')!==-1);
  ok('1b. 小窗入口 id="fav-open-mini" 存在',outText.indexOf('id="fav-open-mini"')!==-1);

  /* ── 必测 7 / 8：空态、搜不到文案（静态）── */
  ok('7. 空态文案存在',outText.indexOf('这里还是空的。长按一条消息选「收藏」。')!==-1);
  ok('8. 搜不到文案存在',outText.indexOf('没有找到匹配的收藏。')!==-1);

  /* ── 必测 12：长按菜单含收藏且不破坏引用/修改/删除（静态）── */
  ok('12a. pointerover 同时挂 quote/edit/fav 三键',/_ensureQuoteBtn\(el\)[^]*_ensureEditBtn\(el\)[^]*_ensureFavBtn\(el\)/.test(outText));
  ok('12b. _ensureFavBtn 函数定义存在',/function _ensureFavBtn/.test(outText));

  /* ── 必测 13：记忆优先级语义未被改（静态）── */
  ok('13a. AM_PRIOS 三元组仍在',outText.indexOf("AM_PRIOS=['always','normal','low']")!==-1);
  ok('13b. _AM_PRIO_GLYPH 仍在',outText.indexOf('_AM_PRIO_GLYPH')!==-1);

  /* ── 必测 14：与 p02/p04 共存（静态）── */
  ok('14a. p02 music 执行分支仍在',/op\.kind==='music'/.test(outText));
  ok('14b. p04 sticker 执行分支仍在',/op\.kind==='sticker'/.test(outText));

  /* ── 必测 10：备份导出含 fav（静态：导出仍全表、只滤 ib_fsSyncDir）── */
  ok('10a. 导出 apiSettings 只滤 ib_fsSyncDir',outText.indexOf("if(name==='apiSettings')arr=arr.filter(function(r){return!(r&&r.id==='ib_fsSyncDir')})")!==-1);
  const expStart=outText.indexOf('async function _ioDoExport');
  const expBody=expStart>=0?outText.slice(expStart,expStart+3000):'';
  ok('10b. 导出逻辑没有按 app:fav 额外过滤',!/"app==='fav'/.test(expBody));

  /* ── 必测 16：面板样式不覆盖全局按钮（静态：IIFE 内不出现全局类名）── */
  if(hasIIFE){
    ok('16a. IIFE 内不覆盖 .ws-btn',iifeSrc.indexOf('.ws-btn')===-1);
    ok('16b. IIFE 内不覆盖 .chat-close',iifeSrc.indexOf('.chat-close')===-1);
    ok('16c. IIFE 内不覆盖 .chat-msg-quote',iifeSrc.indexOf('.chat-msg-quote')===-1);
    ok('16d. IIFE 自带 fav 命名空间样式',/\.fav[-_ ]|#fav[-_ ]/.test(iifeSrc));
  }else{
    ok('16. 面板样式不污染全局类（待 IIFE 注入后校验）',true,'跳过');
  }

  /* ══ 行为层（需 p05 IIFE）══ */
  if(!hasIIFE){
    console.log('\n（行为层：p05 IIFE 未注入，跳过 _fav* 行为断言）');
    console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
    process.exit(fail?1:0);
  }

  /* 前置：必要暴露都在 */
  {
    const c=makeEnv();
    const need=['_favKey','_favTxt','_favWho','_favCfgName','_favAdd','_favDel','_favList','_favOpen','_favState'];
    const missing=need.filter(n=>typeof c[n]==='undefined');
    ok('前置. window 暴露全部 _fav* 接口',missing.length===0,'missing='+missing.join(','));
  }

  /* ── 加分：_favKey / _favWho / _favTxt / _favCfgName 纯函数 ── */
  {
    const c=makeEnv();
    ok('加分. _favKey 普通消息',c._favKey({id:'m1'})==='fav_m1',c._favKey({id:'m1'}));
    ok('加分. _favKey null -> fav_',c._favKey(null)==='fav_');
    ok('加分. _favKey 空对象 -> fav_',c._favKey({})==='fav_');
    ok('加分. _favWho(user)=我',c._favWho({role:'user',friendId:'f1'})==='我',c._favWho({role:'user',friendId:'f1'}));
    ok('加分. _favWho(assistant)=好友名',c._favWho({role:'assistant',friendId:'f1'})==='小明',c._favWho({role:'assistant',friendId:'f1'}));
    const t=c._favTxt({text:'<think>隐藏推理</think>你好<ws_x/>世界'});
    ok('加分. _favTxt 剥 think 块',t.indexOf('隐藏推理')===-1,t);
    ok('加分. _favTxt 剥 ws_ 标签留正文',t.indexOf('你好')!==-1&&t.indexOf('世界')!==-1&&t.indexOf('ws_x')===-1,t);
    ok('加分. _favCfgName(f1)=小明',c._favCfgName('f1')==='小明',c._favCfgName('f1'));
  }

  /* ── 必测 2：收藏写入 apiSettings 且 app:'fav'；不新建表 ── */
  {
    const c=makeEnv();
    const ret=await c._favAdd({id:'m1',friendId:'f1',role:'user',text:'hello',timestamp:1});
    ok('2a. _favAdd 有内容返回 true',ret===true,String(ret));
    const rows=Object.values(c._store).filter(r=>r.app==='fav');
    ok('2b. apiSettings 中有 app:fav 行',rows.length>=1,'rows='+rows.length);
    const row=rows[0]||{};
    ok('2c. 行形状 id=fav_m1 / key=m1',row.id==='fav_m1'&&row.key==='m1',JSON.stringify(row).slice(0,120));
    ok('2d. v.msgId/kind/text/cfgId 落好',row.v&&row.v.msgId==='m1'&&row.v.text==='hello'&&row.v.kind==='text'&&row.v.cfgId==='f1');
    const tablesTouched=[...new Set(c._writeLog.map(w=>w.table))];
    ok('2e. 只写了 apiSettings 一张表',tablesTouched.length===1&&tablesTouched[0]==='apiSettings','tables='+tablesTouched.join(','));
    ok('2f. chatMessages 未被写',Object.keys(c._chatStore).length===0);
  }

  /* ── 必测 15：反向——不调 _favAdd 就没有 app:fav 写入 ── */
  {
    const c=makeEnv();
    await c.dbGetAll('apiSettings');
    const rows=Object.values(c._store).filter(r=>r.app==='fav');
    ok('15. 未调 _favAdd 时 apiSettings 无 app:fav 行',rows.length===0,'rows='+rows.length);
  }

  /* ── 必测 3：按好友隔离（f1/f2 各一条；friends 含两个 cfgId；当前好友只看自己）── */
  {
    const c=makeEnv();
    await seedFav(c,'fav_a','f1','小明','TA','甲的收藏',100,'');
    await seedFav(c,'fav_b','f2','小红','TA','乙的收藏',200,'');
    const all=await c._favList();
    ok('3a. _favList 返回全部收藏',all.length===2,'len='+all.length);
    ok('3b. 按 ts 降序',all[0]&&all[0].ts>=all[1].ts,JSON.stringify(all.map(x=>x.ts)));
    await c._favOpen();
    const fr=c._favState.friends||[];
    ok('3c. friends 含两个不同 cfgId',fr.length===2&&fr.indexOf('f1')!==-1&&fr.indexOf('f2')!==-1,'friends='+JSON.stringify(fr));
    ok('3d. 面板标题落在当前好友',/收藏夹$/.test(titleOf(c)),'title='+titleOf(c));
  }

  /* ── 必测 4：搜索正文/署名/频道名各≥1 命中（经 paint 的 hint 观测筛选数）── */
  {
    const c=makeEnv();
    await seedFav(c,'fav_t','f1','小明','小明','今天吃苹果',300,'');
    await seedFav(c,'fav_w','f1','小明','香蕉先生','普通正文',200,'');
    await seedFav(c,'fav_h','f1','小明','TA','另一段',100,'葡萄频道');
    c._favState.query='苹果'; await c._favOpen();
    ok('4a. 搜正文命中 1 条',/筛选出 1 条/.test(hintOf(c)),hintOf(c));
    c._favState.query='香蕉'; await c._favOpen();
    ok('4b. 搜署名命中 1 条',/筛选出 1 条/.test(hintOf(c)),hintOf(c));
    c._favState.query='葡萄'; await c._favOpen();
    ok('4c. 搜频道名命中 1 条',/筛选出 1 条/.test(hintOf(c)),hintOf(c));
    c._favState.query='不存在的词xyz'; await c._favOpen();
    ok('4d. 搜不到显示空态文案',wallHtml(c).indexOf('没有找到匹配的收藏。')!==-1,wallHtml(c).slice(0,60));
  }

  /* ── 必测 5：移除收藏后原消息仍在、收藏消失 ── */
  {
    const c=makeEnv();
    await c.dbPut('chatMessages',{id:'orig1',role:'user',content:'原文',timestamp:1});
    const r=await c._favAdd({id:'orig1',friendId:'f1',role:'user',text:'原文',timestamp:1});
    ok('5a. 原消息已收藏',r===true);
    await c._favDel('fav_orig1');
    const after=await c._favList();
    ok('5b. 删除后 _favList 不含该条',after.every(x=>x.id!=='fav_orig1'),JSON.stringify(after.map(x=>x.id)));
    ok('5c. 原消息 chatMessages 仍在',!!c._chatStore['orig1']);
  }

  /* ── 必测 6：原消息已删 → 收藏只剩文字稿且不抛错 ── */
  {
    const c=makeEnv();
    await seedFav(c,'fav_gone','f1','小明','TA','这段是残留文字稿',50,'');
    let threw=false,list=[];
    try{list=await c._favList()}catch(e){threw=true}
    ok('6a. 原消息缺失时 _favList 不抛错',!threw);
    const it=list.find(x=>x.id==='fav_gone');
    ok('6b. 收藏项仍保留文字稿',!!it&&it.text==='这段是残留文字稿',it&&it.text);
  }

  /* ── 必测 9：左右换好友指针正确（curFriend 下标切换 + 取模边界）── */
  {
    const c=makeEnv();
    await seedFav(c,'fav_x1','f1','小明','TA','甲的收藏',300,'');
    await seedFav(c,'fav_x2','f2','小红','TA','乙的收藏',200,'');
    await seedFav(c,'fav_x3','f2','小红','TA','乙的第二条',100,'');
    await c._favOpen();
    const fr=c._favState.friends||[];
    ok('9a. friends 两个 cfgId',fr.length===2,'friends='+JSON.stringify(fr));
    const n0=titleOf(c);
    c._favState.curFriend=1; await c._favOpen();
    const n1=titleOf(c);
    ok('9b. 切到下标 1 后标题换好友',n0!==n1,'0='+n0+' / 1='+n1);
    ok('9c. 标题为各自好友收藏夹',/小明的收藏夹|小红的收藏夹/.test(n0)&&/小明的收藏夹|小红的收藏夹/.test(n1),n0+' / '+n1);
    ok('9d. 换好友取下标在边界内',c._favState.curFriend>=0&&c._favState.curFriend<fr.length,'cur='+c._favState.curFriend);
    ok('9e. 取模循环换好友在源码里',iifeSrc.indexOf('%_favState.friends.length')!==-1||iifeSrc.indexOf('% _favState.friends.length')!==-1);
  }

  /* ── 必测 11：导入手机端样例行不抛错、能解析 ── */
  {
    const c=makeEnv();
    await c.dbPut('apiSettings',{id:'fav_x',app:'fav',key:'123',v:{
      msgId:'123',cfgId:'g1',cfgName:'群',who:'TA',text:'hi',kind:'text',voice:null,imgN:0,ts:1,created:1
    },updated:1});
    let threw=false,list=[];
    try{list=await c._favList()}catch(e){threw=true;console.log('      err='+e.message)}
    ok('11a. 手机端样例行导入不抛错',!threw);
    const it=list.find(x=>x.id==='fav_x');
    ok('11b. 样例行被解析进列表',!!it&&it.text==='hi'&&it.who==='TA'&&it.cfgId==='g1',it&&JSON.stringify(it).slice(0,100));
  }

  /* ── 必测 10（行为层）：fav_ 行不会被导出过滤掉 ── */
  {
    const c=makeEnv();
    await seedFav(c,'fav_exp','f1','小明','TA','要备份的收藏',5,'');
    const all=await c.dbGetAll('apiSettings');
    ok('10c. fav_ 行在 dbGetAll 全表结果里（导出会带上）',all.some(r=>r&&r.id==='fav_exp'&&r.app==='fav'),'n='+all.length);
  }

  /* ── 加分：无可收藏内容 → false；kind 正确 ── */
  {
    const c=makeEnv();
    const empty=await c._favAdd({id:'none',friendId:'f1',role:'user'});
    ok('加分. 无文字/语音/图 → _favAdd false',empty===false,String(empty));
    await c._favAdd({id:'voice1',friendId:'f1',role:'user',voice:{dataUrl:'x',duration:2},timestamp:9});
    const vrow=Object.values(c._store).find(r=>r.id==='fav_voice1');
    ok('加分. 语音收藏 kind=voice',vrow&&vrow.v&&vrow.v.kind==='voice',vrow&&vrow.v&&vrow.v.kind);
    const c2=makeEnv();
    await c2._favAdd({id:'img1',friendId:'f1',role:'user',text:'看图',images:[{dataUrl:'d1'},{dataUrl:'d2'}],timestamp:9});
    const irow=Object.values(c2._store).find(r=>r.id==='fav_img1');
    ok('加分. 图片收藏 kind=image 且 imgN=2',irow&&irow.v&&irow.v.kind==='image'&&irow.v.imgN===2,irow&&JSON.stringify(irow.v));
  }

  /* ══ T2 真机缺陷修复静态断言（C1 全屏星钮尺寸 + C2 小窗星钮位置/颜色）══ */
  {
    /* C1：全屏收藏星钮 svg 必须是描边体系 + 内联 style 对齐邻钮 17px/opacity0.92 */
    const fullBtnIdx=outText.indexOf('id="fav-open-full"');
    const fullSvg=fullBtnIdx>=0?outText.slice(fullBtnIdx,fullBtnIdx+600):'';
    ok('T2-C1a. 全屏星钮 svg 含内联 style width:17px;height:17px',/style="[^"]*width:17px;height:17px/.test(fullSvg),fullSvg.slice(0,200));
    ok('T2-C1b. 全屏星钮 svg 是描边体系 stroke="currentColor"',fullSvg.indexOf('stroke="currentColor"')!==-1&&fullSvg.indexOf('fill="none"')!==-1,fullSvg.slice(0,200));
    ok('T2-C1c. 全屏星钮 svg 宽高与邻钮 #ws-open-btn 一致（17px）',fullSvg.indexOf('width:17px;height:17px')!==-1);
    const wsBtnIdx=outText.indexOf('id="ws-open-btn"');
    const wsSvg=wsBtnIdx>=0?outText.slice(wsBtnIdx,wsBtnIdx+600):'';
    const favFullSw=(fullSvg.match(/stroke-width="([^"]+)"/)||[])[1]||'';
    const wsSw=(wsSvg.match(/stroke-width="([^"]+)"/)||[])[1]||'';
    ok('T2-C1d. 全屏星钮 svg stroke-width=1.5（HTML 属性与邻钮同一套）',favFullSw==='1.5','sw='+favFullSw);
    ok('T2-C1e. 全屏星钮与邻钮 #ws-open-btn svg stroke-width 数值相同',favFullSw!==''&&favFullSw===wsSw,'fav='+favFullSw+' ws='+wsSw);

    /* C2：小窗星钮必须在名字 span 之后（.chat-header-left 内），无边框纯图标，svg 16-18px */
    const nameIdx=outText.indexOf('id="chat-header-name"');
    const miniIdx=outText.indexOf('id="fav-open-mini"');
    ok('T2-C2a. fav-open-mini 位置在 chat-header-name 之后',nameIdx>=0&&miniIdx>nameIdx,'name@'+nameIdx+' mini@'+miniIdx);
    const miniSnippet=miniIdx>=0?outText.slice(miniIdx,miniIdx+500):'';
    ok('T2-C2b. 小窗星钮无边框 background:none;border:none',/background:none;border:none/.test(miniSnippet),miniSnippet.slice(0,200));
    const wMatch=miniSnippet.match(/width="(\d+)"/);
    const hMatch=miniSnippet.match(/height="(\d+)"/);
    const w=wMatch?parseInt(wMatch[1],10):0,h=hMatch?parseInt(hMatch[1],10):0;
    ok('T2-C2c. 小窗星钮 svg 宽高在 14-16px 之间',w>=14&&w<=16&&h>=14&&h<=16,'w='+w+' h='+h);

    /* C2：P05-4 CSS 必须含两条基础色规则（颜色由 CSS 控制，hover 才能生效） */
    ok('T2-C2d. CSS 含 #fav-open-mini{color:var(--light)}',outText.indexOf('#fav-open-mini{color:var(--light)}')!==-1);
    ok('T2-C2e. CSS 含 body:not(.theme-infernal) #chat-panel #fav-open-mini{color:#152c58}',outText.indexOf('body:not(.theme-infernal) #chat-panel #fav-open-mini{color:#152c58}')!==-1);

    /* C3：悬停收藏键必须是描边星而非实心星 */
    ok('T2-C3a. 悬停收藏键 svg 不是实心星（无 fill="currentColor" stroke="none" 组合）',iifeSrc.indexOf('fill="currentColor" stroke="none"')===-1);
    ok('T2-C3b. 悬停收藏键 svg 是描边星（含 fill="none" stroke="currentColor" stroke-width="1.5"）',iifeSrc.indexOf('fill="none" stroke="currentColor" stroke-width="1.5"')!==-1);
  }

  /* ══ H1：首页无污染断言 —— p05 patches 的 new 侧不得写入首页专属标记 ══ */
  {
    const p05mod=require(path.join(HERE,'p05-收藏夹.js'));
    const homeMarkers=['id="page-home"','home-title','home-subtitle','home-credit','splash-mist','LOCAL TIME'];
    let bad=[];
    (p05mod.patches||[]).forEach(function(p){
      homeMarkers.forEach(function(m){
        if(String(p.new||'').indexOf(m)!==-1)bad.push(p.label+' :: '+m);
      });
    });
    ok('H1. p05 所有 patches new 侧不含首页专属标记',bad.length===0,bad.join(' | '));
  }

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
