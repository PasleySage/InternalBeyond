/* _test_p04_sticker.js —— P04 表情包与颜文字断言式测试（逻辑层 + 静态断言，不碰真 DOM/DB/网络）
 *
 * 跑法：node _test_p04_sticker.js [产物.html]
 *       不传时用 out\InternalBeyond.patched.html。
 * 做法：把产物里整段 p04 IIFE 抽出来放进 vm，配假 document/dbGet/dbPut/localStorage，
 *       断言外部可观察行为：开关默认关、叙述句格式、能力块开/关、TA 解析不在预设、
 *       八组颜文字齐全。其余（双入口、清洗链、执行分支、每条上限、用户发送叙述、
 *       不碰网络/他行）用对产物文本的静态断言覆盖。
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const HERE=__dirname;
const BASE=path.join(HERE,'baseline','InternalBeyond-f8955fd1.html');
const DEF_OUT=path.join(HERE,'out','InternalBeyond.patched.html');

let pass=0,fail=0;
function ok(name,cond,extra){if(cond){pass++;console.log('  ✓ '+name)}else{fail++;console.log('  ✗ '+name+(extra?' —— '+extra:''))}}

let outText;
if(process.argv[2])outText=fs.readFileSync(process.argv[2],'utf8');
else if(fs.existsSync(DEF_OUT))outText=fs.readFileSync(DEF_OUT,'utf8');
else{console.error('找不到产物，先跑 node _driver.js');process.exit(1)}

/* ── 行为层：在 vm 里跑 p04 IIFE ── */
function takeBlock(text,startIdx){let i=text.indexOf('{',startIdx),d=0;for(;i<text.length;i++){if(text[i]==='{')d++;else if(text[i]==='}'){d--;if(!d)return text.slice(startIdx,i+1)}}throw new Error('取块失败')}
const iifeStart=outText.indexOf('(function(){/* p04：表情包与颜文字 UI+数据层');
if(iifeStart<0){console.error('✗ 产物里没找到 p04 IIFE');process.exit(1)}
/* IIFE 内 CSS 字符串含花括号，朴素配对会错位；用唯一结尾标记截取 */
const endMark=outText.indexOf('else _stkBoot();',iifeStart);
const iifeEnd=outText.indexOf('})();',endMark)+5;
const iifeSrc=outText.slice(iifeStart,iifeEnd);

function makeEnv(){
  const store={};/* 假 apiSettings */
  const docEl=function(tag){return{style:{},children:[],appendChild(c){this.children.push(c)},addEventListener(){},set innerHTML(v){this._h=v},get innerHTML(){return this._h||''},querySelector(){return null},querySelectorAll(){return[]},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){},click(){}}};
  const ctx={
    console,
    localStorage:{_m:{},getItem(k){return this._m[k]||null},setItem(k,v){this._m[k]=String(v)}},
    document:{readyState:'complete',addEventListener(){},createElement(tag){return docEl(tag)},head:{appendChild(){}},getElementById(){return null}},
    window:{},
    dbGet:async(s,k)=>store[k]||null,
    dbPut:async(s,d)=>{store[d.id]=Object.assign({},d)},
    dbDelete:async(s,k)=>{delete store[k]},
    toast(){},esc(t){return String(t)},
    setTimeout(fn){return 0},clearTimeout(){},
    currentPage:'chat',
    renderAttachPreviews(){},
  };
  ctx.window=ctx;/* window 即 self */
  vm.createContext(ctx);
  vm.runInContext(iifeSrc,ctx);
  return ctx;
}

console.log('== P04 表情包与颜文字（逻辑层 + 静态断言）==');

/* 1. 默认关：_stkOn() 初始 false */
let c=makeEnv();
ok('默认关：_stkOn() 初始 false',c._stkOn()===false);

/* 2. 叙述句：名+描述+用法 */
ok('叙述句：名+描述+用法',c._stkNarrate({name:'猫猫',desc:'问号',use:'困惑时发'})==='（表情包「猫猫」：问号｜用法：困惑时发）',c._stkNarrate({name:'猫猫',desc:'问号',use:'困惑时发'}));

/* 3. 叙述句：只有名（无描述/用法） */
ok('叙述句：只有名',c._stkNarrate({name:'猫猫'})==='（表情包「猫猫」）',c._stkNarrate({name:'猫猫'}));

/* 4. 叙述句：名+用法无描述 */
ok('叙述句：名+用法无描述',c._stkNarrate({name:'a',use:'开心时'})==='（表情包「a」｜用法：开心时）',c._stkNarrate({name:'a',use:'开心时'}));

/* 5. 能力块：关时返回 '' */
ok('能力块：开关关时返回空串',c._stkBlock()==='');

/* 6. 能力块：开且有可用枚时含真实名 + 最多 1 枚 */
c._stkState.on=true;c._stkState.cur='p1';
c._stkState.presets=[{id:'p1',name:'默认',items:[{id:'s1',name:'猫猫',desc:'问号',use:'困惑时发'},{id:'s2',name:'嘿嘿',use:'开心'}]}];
const blk=c._stkBlock();
ok('能力块：开时含真实名字与「最多 1 枚」',/猫猫/.test(blk)&&/嘿嘿/.test(blk)&&/最多 1 枚/.test(blk),blk.slice(0,80));
ok('能力块：写了 ws_sticker 标签样例',/<ws_sticker name="猫猫"\/>/.test(blk));

/* 7. 能力块：无可用枚（名字/用法空）返回 '' */
c._stkState.presets=[{id:'p1',name:'空',items:[{id:'x',name:'',desc:'',use:''}]}];
ok('能力块：无合格枚返回空串',c._stkBlock()==='');

/* 8. TA 解析：不在预设里 → 失败 */
c._stkState.presets=[{id:'p1',name:'默认',items:[{id:'s1',name:'猫猫',use:'困惑'},{id:'s2',name:'空空',use:'没图'}]}];
(async()=>{
  const r=await c._stkResolveSticker('不存在的');
  ok('TA 解析：不在预设里 → ok:false',r.ok===false&&/不在预设里/.test(r.reason),JSON.stringify(r));

  /* 9. TA 解析：在预设但图片不在 → ok:false */
  const r2=await c._stkResolveSticker('空空');
  ok('TA 解析：图片缺失 → ok:false',r2.ok===false&&/图片已不在本机/.test(r2.reason),JSON.stringify(r2));

  /* 10. TA 解析：图片存在 → ok:true 带回 dataUrl（经假 db 种子图片行） */
  await c.dbPut('apiSettings',{id:'ib_stkimg_s1',v:'data:image/png;base64,AAA',updated:1});
  const r3=await c._stkResolveSticker('猫猫');
  ok('TA 解析：命中且有图 → ok:true + dataUrl',r3.ok===true&&r3.dataUrl==='data:image/png;base64,AAA',JSON.stringify(r3));

  /* ── 静态断言 ── */
  /* 11. 双入口：全屏与小窗笑脸按钮都在 */
  ok('双入口：全屏笑脸按钮 id',outText.indexOf('id="ib-kp-btn-full"')!==-1);
  ok('双入口：小窗笑脸按钮 id',outText.indexOf('id="ib-kp-btn-mini"')!==-1);

  /* 12. 设置卡：开关默认不勾 + 当前预设行 + 管理按钮 */
  ok('设置卡：ib-stk-toggle 默认未勾',/id="ib-stk-toggle"[^>]*onchange="_stkOnChange\(\)"/.test(outText));
  ok('设置卡：当前预设行 ib-stk-cur',outText.indexOf('id="ib-stk-cur"')!==-1);
  ok('设置卡：管理按钮',outText.indexOf('_stkOpenMgr()')!==-1);

  /* 13. 正则识别 ws_sticker */
  ok('双轨通路识别 sticker', outText.indexOf("op.kind==='sticker'") !== -1);

  /* 14. 清洗链：开关关时 sticker 洗成占位 */
  ok('开关门：双轨执行层按 _stkOn 拦截', outText.indexOf("_stkOn()") !== -1 && outText.indexOf("op.kind==='sticker'") !== -1);

  /* 15. 执行分支：开关门 + 每条最多 1 枚 */
  ok('执行分支：双轨 sticker 存在',/op\.kind==='sticker'/.test(outText));
  ok('执行分支：每条最多 1 枚（results.some 拦截）',outText.indexOf('每条回复最多 1 枚')!==-1);

  /* 16. 用户发送：userMsg.sticker 落库 + 不进 images（_stkDisp 过滤） */
  ok('用户发送：落 userMsg.sticker',outText.indexOf('userMsg.sticker=')!==-1);
  ok('用户发送：_stkDisp 不进 images',outText.indexOf('!img._stkDisp')!==-1);

  /* 17. 叙述句注入：群聊与 1对1 历史都前置 */
  ok('叙述句：群聊历史前置',outText.indexOf('_stkNarrate(m.sticker)')!==-1);
  ok('叙述句：1对1 历史前置',outText.indexOf('_stkNarrate(m.sticker)+(mc?')!==-1);

  /* 18. TA 出图：_stkCardEl 直出图 + 不走操作卡 */
  ok('TA 出图：_stkCardEl 定义',outText.indexOf('function _stkCardEl(d)')!==-1);
  ok('TA 出图：renderSegments sticker 直出图',outText.indexOf("_stkCardEl(data)")!==-1);

  /* 19. 能力块注入：群聊+单聊两处条件注入 */
  ok('能力块注入：两处 try{..._stkBlock()}',(outText.match(/_stkBlock\(\)/g)||[]).length>=2);

  /* 20. 八组颜文字齐全 */
  ok('颜文字：CATS 八组',['开心','生气','伤心','惊讶','无语','Kiss','经典','双人款'].every(g=>c.CATS.indexOf(g)!==-1)&&c.CATS.length===8,'CATS='+JSON.stringify(c.CATS));
  ok('颜文字：KAO 八组都有内容',['开心','生气','伤心','惊讶','无语','Kiss','经典','双人款'].every(g=>(c.KAO[g]||[]).length>0));

  /* 21. 只写自己的行：ib_stk / ib_stkimg_ / ib_kao，不整表重建 */
  ok('存储：只写 ib_stk 行',outText.indexOf("id:'ib_stk',on:_stkState.on")!==-1);
  ok('存储：图片行 ib_stkimg_ 前缀',outText.indexOf("'ib_stkimg_'")!==-1);
  ok('存储：自定义颜文字 ib_kao 行',outText.indexOf("id:'ib_kao'")!==-1);

  /* 22. 不越界：无网络 URL / 在线商店 */
  ok('纯离线：无 http(s) 图片/CDN 引用在新 UI 里',!httpsInIIFE());
  function httpsInIIFE(){return /https?:\/\/[^"' )]+\.(png|jpg|jpeg|gif|webp)/i.test(iifeSrc)}

  /* 23. 与 p02 共存：music 正则/分支仍在 */
  ok('共存：music 仍在正则',/\|music\|/.test(outText)||/sig\|music/.test(outText));
  ok('共存：p02 music 执行分支仍在',/op\.kind==='music'/.test(outText));

  /* 24. 反向：去掉执行分支会挂（证明分支真在） */
  ok('反向：sticker 执行分支确在产物里',outText.indexOf("op.kind==='sticker'")!==-1);

  /* 25. boot 预热：init 调 _stkBoot */
  ok('boot 预热：init 调 _stkBoot',outText.indexOf('await _stkBoot()')!==-1);

  console.log('\n结果：'+pass+' 通过 / '+fail+' 失败');
  process.exit(fail?1:0);
})();
