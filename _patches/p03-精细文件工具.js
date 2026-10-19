/* 补丁清单 · P03 精细文件工具（电脑端 `InternalBeyond.html`）
 *
 * 对应票：`.scratch\ib-ibm-parity\issues\03-精细文件工具.md`
 * 派活单：`.scratch\ib-ibm-parity\派活-p03-精细文件工具.md`
 * 依据版本：上游 `Sui-IB/InternalBeyond` `b0d7919d`（V2.7.5，2,819,874 B，sha256 a49fb343…8cbd6）
 *
 * ⚠️ 转义：锚点与产出代码一律用 String.raw。
 * ⚠️ 本集锚点落在 p01+p02 打完之后的文本上（文件名序 p01→p02→p03→p07）；
 *    单跑 `--only p03` 打干净基线会因锚点不存在而停下——这是预期，自测走全链。
 *
 * 目标：让 TA 读大文件先定位、再精读，不把整份正文塞进对话。对齐手机端
 *   `<ws_search q/>`（至多 20 处「路径:行号＋前后文」）与 `<ws_ctx path outline|from/to|line/span/>`
 *   （目录 / 按行段 / 某行附近，单次 6000 字符）。纯只读：检索与精读均不写工作区、不发网络。
 *
 * 三档附件正文上限（对齐手机端 ib_fileCap）：省 15000 / 均衡 30000（默认）/ 全读 120000；
 *   仅精细开关开时生效，超限截断并自动附「行号｜该段首行」目录。关时维持原有 _ibInjectMax(100 万) 行为。
 * 开关（localStorage.ib_wsFineTools，默认关）与三档（localStorage.ib_fileCap）只存本机，与手机端同键。
 *
 * 本集共 12 处：
 *   P03-1a  设置（DIY 文件解析库卡）加「启用精细文件工具」checkbox + 三档上限 select
 *   P03-1b  设置绑定：checkbox/select 写 localStorage，还原勾选与档位
 *   P03-2   _WS_OPEN_RE 增加 search/ctx（锚 p02 打完后的正则，含 music）
 *   P03-3a  清洗链：精细开关开时 search/ctx 不再洗成占位（锚 p02 打完后的条件正则）
 *   P03-3b  解析器新增 kind==='search' / kind==='ctx' 分支（锚 p02 music 解析分支尾）
 *   P03-3c  执行器 _execWsOps 新增 search/ctx 只读分支（锚 p02 music 执行分支尾）
 *   P03-4   _capFileText 重写：开关开时按三档截断并附目录；附 fine 辅助函数
 *   P03-5   两处附件注入调用传文件名 _capFileText(f.text,f.name)（expect:2）
 *   P03-6a  定义 _WS_FINE_INSTR_BLOCK 能力块常量（锚 p02 能力块尾）
 *   P03-6b  群聊系统提示条件注入能力块（锚 p02 群聊注入尾）
 *   P03-6c  单聊系统提示条件注入能力块（锚 p02 单聊注入尾）
 *   P03-7   失败回执动作归类 +search→检索工作区 / +ctx→读取上下文（锚 p02 归类尾）
 *
 * 不做：任何写入/编辑/删除文件、改 ws_read 既有语义、动解析库开关、动聊天主链请求体与数据表、
 *   动 Sing/播放器（p02）、手改 InternalBeyond.html 当唯一真相。
 */
module.exports = {
  id: 'p03', about: '精细文件工具',
  upstream: { repo: 'Sui-IB/InternalBeyond', commit: 'b0d7919d', bytes: 2819874, sha256: 'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6' },
  expectCount: 9,
  /* 原有锚点：打完补丁必须还在（证明没改坏读文件主链、解析库、p01/p02/p07 关键落点） */
  guards: [
    'function wsGetFileByPath(projId,path)',
    'async function wsGetFiles(projId)',
    'function _ibInjectMax()',
    'function _wsExtractRichText(f)',
    'WS_DEFAULT_PROJ_ID=\'proj_icode_default\'',
    'async function callApi(cfg,userMsg,opts){',
    'function _musicCtl(action)',
    'id="api-music-toggle"',
    'FILE_INJECT_DEFAULT=1000000'
  ],
  /* 新增锚点：证明本集真的落上了 */
  adds: [
    'id="ib-fine-toggle"',
    'id="ib-fine-cap"',
    'function _fineOn()',
    'function _fineCap()',
    'function _fineSearch(op)',
    'function _fineCtx(op)',
    'function _fileOutline(t,maxN,maxC)',
    '_WS_FINE_INSTR_BLOCK',
    "op.kind==='search'",
    "op.kind==='ctx'"
  ],
  /* 人工验收清单（四列，跑流水线时渲染进自检报告） */
  accept: [
    [
      'DIY 文件解析库卡多「启用精细文件工具」复选框（默认不勾）＋三档上限下拉，仅开启后生效',
      '设置 → DIY 文件解析库/解析库卡（DOCX 图片上限下方）',
      '默认不勾；勾上后 toast 提示、三档下拉可选；不破坏单文件注入上限等原设置',
      '把 p03-精细文件工具.js 移出 _patches\\ 后重跑 _driver.js（产物即回退到干净基线）'
    ],
    [
      '开开关后 TA 可 <ws_search q/> 检索工作区与本会话附件，回传至多 20 处「路径:行号＋前后文」，不整份重发',
      '工作区放一个长文件、另发一个大附件 → 开开关 → 让 TA 找某个关键词',
      '回传 N 处命中（≤20），每条形如「路径:行号 ｜ …上下文…」；无命中也返回可读空结果',
      '同上'
    ],
    [
      '<ws_ctx/> 三种用法：outline=1 目录、from/to 按行段、line/span 某行附近，都带行号',
      '开开关后让 TA 看目录、按行读一段、读某行附近',
      '目录是「行号| 首行」；按行段带行号且末尾提示下一段从第几行起；越界 from/to 返回可读错误',
      '同上'
    ],
    [
      '三档上限：最低档(15000)＋超大附件 → 正文截断并自动附「行号｜首行」目录；未超限不附目录',
      '开开关、选「省·15000」，发一个超过 15000 字符的附件',
      '正文只发前 15000 字符，截断提示后随一份整文目录；改回「全读」后不再截断',
      '同上'
    ],
    [
      '只读边界：开满后让 TA 改/写文件也不会发生写入；开关关时 search/ctx 被二次拦截',
      '开满后让 TA 「把某文件改一行」；再关开关让它检索',
      '工作区文件不被修改；关开关后收到「未开启精细文件工具」回执，不检索',
      '同上'
    ]
  ],
  patches: [
    /* ── P03-1a  设置卡加 checkbox + 三档 select ── */
    {
      label: 'P03-1a 解析库卡加「启用精细文件工具」checkbox + 三档上限 select',
      old: String.raw`    +'<label>DOCX 内嵌图片提取张数上限（1–30）<input type="number" id="ib-richlib-din" class="ib-num" min="1" max="30" style="width:64px;margin-left:6px"></label>'
    +'</div>'`,
      new: String.raw`    +'<label>DOCX 内嵌图片提取张数上限（1–30）<input type="number" id="ib-richlib-din" class="ib-num" min="1" max="30" style="width:64px;margin-left:6px"></label>'
    +'</div>'
    +'<div style="border-top:1px solid var(--line);margin:10px 0 2px;padding-top:10px;display:flex;flex-direction:column;gap:8px">'/* p03：精细文件工具设置组（默认关） */
    +'<label style="cursor:pointer;font-size:0.82rem"><input type="checkbox" id="ib-fine-toggle" style="width:auto;accent-color:var(--accent)"> 启用精细文件工具</label>'
    +'<label style="font-size:0.8rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap">随消息附上的附件正文上限<div class="ib-select" id="ib-fine-cap" style="min-width:168px;max-width:220px"></div></label>'/* p03：真源 makeSelect / ib-select，不用原生 select */
    +'<div style="font-size:0.72rem;opacity:0.6;line-height:1.7">默认关。开后 AI 可用 &lt;ws_search/&gt; 检索、&lt;ws_ctx/&gt; 按行精读大文件，只读不改；附件正文超过上限时截断并自动附「行号｜首行」目录。设置只存本机。</div></div>'`
    },
    /* ── P03-1b  设置绑定 ── */
    {
      label: 'P03-1b 绑定 checkbox/select：读写 localStorage 并还原',
      old: String.raw`  wire('ib-richlib-din',_ibDocxImgMax,'ib_docxImgN',1);`,
      new: String.raw`  wire('ib-richlib-din',_ibDocxImgMax,'ib_docxImgN',1);
  (function(){/* p03：开关与三档——真源 makeSelect（ib-select），键同手机端 ib_wsFineTools / ib_fileCap */
    let _ft=document.getElementById('ib-fine-toggle');
    if(_ft){_ft.checked=localStorage.getItem('ib_wsFineTools')==='1';
      _ft.onchange=function(){try{localStorage.setItem('ib_wsFineTools',_ft.checked?'1':'0')}catch(e){}toast('精细文件工具已'+(_ft.checked?'开启（下一条消息重建一次提示缓存）':'关闭'))}}
    try{
      var _caps=[15000,30000,120000],_labs=['省 · 15000 字符','均衡 · 30000 字符','全读 · 120000 字符'];
      var _ci=_caps.indexOf(_fineCap());if(_ci<0)_ci=1;
      if(typeof makeSelect==='function'){
        makeSelect('ib-fine-cap',_labs,_ci,function(i){
          var v=_caps[i]||30000;try{localStorage.setItem('ib_fileCap',String(v))}catch(e){}
          toast('附件正文上限已设为：'+_labs[i]);
        });
      }else{/* 兜底：makeSelect 不可用时退回原生，功能不丢 */
        var _h=document.getElementById('ib-fine-cap');
        if(_h){_h.classList.remove('ib-select');_h.innerHTML='<select id="ib-fine-cap-fb"><option value="15000">省 · 15000 字符</option><option value="30000">均衡 · 30000 字符</option><option value="120000">全读 · 120000 字符</option></select>';
          var _fb=document.getElementById('ib-fine-cap-fb');_fb.value=String(_fineCap());
          _fb.onchange=function(){try{localStorage.setItem('ib_fileCap',_fb.value)}catch(e){}toast('附件正文上限已设为：'+((_fb.options[_fb.selectedIndex]||{}).textContent||_fb.value))}}
      }
    }catch(e){}
  })();`
    },
    /* ── P03-2  双轨：手机端通路上的 search/ctx，精细开关开时本地只读执行 ── */
    {
      label: 'P03-2 _execWsOps 手机端通路：search/ctx 开关开时本地执行（双轨）',
      old: String.raw`    results.push({type:op.kind,ok:false,mobile:true,fed:true,reason:'手机端专属，电脑端不执行'});continue}/* v139 */`,
      new: String.raw`    if(op.kind==='search'||op.kind==='ctx'){/* p03 双轨：精细开关开时本地只读；导入记录不会走到这里 */
      var _fA=op.attrs||'';
      if(!_fineOn()){results.push({type:op.kind,ok:false,mobile:true,fed:true,reason:'未开启「精细文件工具」'});continue}
      var _fOp={q:_wsAttr(_fA,'q')||_wsAttr(_fA,'query')||'',path:_wsAttr(_fA,'path')||'',outline:_wsAttr(_fA,'outline')||'',from:_wsAttr(_fA,'from')||'',to:_wsAttr(_fA,'to')||'',line:_wsAttr(_fA,'line')||'',span:_wsAttr(_fA,'span')||'',body:String(op.body||'')};
      if(op.kind==='search'&&_fOp.body&&!_fOp.q)_fOp.q=_fOp.body;
      var _fR=(op.kind==='search')?await _fineSearch(_fOp):await _fineCtx(_fOp);
      var _fTxt=_fR.content||'';try{_wsPendingReads.push({path:op.kind==='search'?'检索结果':((_fOp.path||'精读结果')+'（精读）'),actor:authorName,total:_fTxt.length,content:_fTxt})}catch(e){}
      results.push({type:op.kind,ok:!!_fR.ok,detail:_fR.detail||'',reason:_fR.ok?(_fR.detail||'已完成'):(_fR.detail||'失败'),mobile:true,fed:true});continue}
    results.push({type:op.kind,ok:false,mobile:true,fed:true,reason:'手机端专属，电脑端不执行'});continue}/* v139 */`
    },
    /* ── P03-4  _capFileText 重写 + fine 辅助函数 ── */
    {
      label: 'P03-4 _capFileText 三档截断+目录，并定义 fine 辅助函数',
      old: String.raw`function _capFileText(t){t=t||'';var MAX=_ibInjectMax();return t.length<=MAX?t:t.slice(0,MAX)+'\n[…文件过长，已截断至前 '+MAX+' 字符（原文共 '+t.length+' 字符）。如需处理后续部分，请告知用户分段发送]'}`,
      new: String.raw`function _capFileText(t,name){t=t||'';/* p03：开关开时按三档上限截断并附整文目录；关时维持原有 _ibInjectMax(默认100万) 行为 */
  if(_fineOn()){
    let cap=_fineCap();
    if(t.length>cap){
      let ol='';try{ol=_fileOutline(t,120,Math.max(800,cap>30000?3000:1600))}catch(e){}
      return t.slice(0,cap)+'\n[…文件过长，已截断至前 '+cap+' 字符（原文共 '+t.length+' 字符、'+t.split('\n').length+' 行）。后面的内容用 <ws_ctx path="'+String(name||'附件').replace(/"/g,'')+'" from="起始行" to="结束行"/> 按行读取，先按下面的目录定位。]'+(ol?'\n[目录 · 行号| 该段首行]\n'+ol:'');
    }
    return t;
  }
  let MAX=_ibInjectMax();return t.length<=MAX?t:t.slice(0,MAX)+'\n[…文件过长，已截断至前 '+MAX+' 字符（原文共 '+t.length+' 字符）。如需处理后续部分，请告知用户分段发送]'}
function _fineOn(){/* p03：精细文件工具总开关（默认关；与手机端 ib_wsFineTools 同键，只存本机） */try{return localStorage.getItem('ib_wsFineTools')==='1'}catch(e){return false}}
function _fineCap(){/* p03：附件正文三档上限（对齐手机端：省15000/均衡30000/全读120000，默认均衡30000） */try{let v=parseInt(localStorage.getItem('ib_fileCap')||'',10);if(v===15000||v===30000||v===120000)return v}catch(e){}return 30000}
function _fileOutline(t,maxN,maxC){/* p03：整文目录——标题行优先、其后按空行首行抽样，输出「行号| 该段首行」 */
  maxN=maxN||60;maxC=maxC||1600;let lines=String(t||'').split('\n'),out=[],last=-99,gap=Math.max(6,Math.ceil(lines.length/maxN));
  let head=/^\s*(#{1,6}\s|第[一二三四五六七八九十百千零〇0-9]+[章节回卷部篇集]|chapter\s+\d+|part\s+\d+|[一二三四五六七八九十]+[、.．]|\d+[.、．]\s*\S)/i;
  for(let i=0;i<lines.length;i++){let l=lines[i].trim();if(!l)continue;let isH=head.test(l)&&l.length<=40,isP=(i===0)||!lines[i-1].trim();
    if(!(isH||isP))continue;if(!isH&&i-last<gap)continue;last=i;out.push((i+1)+'| '+l.replace(/\s+/g,' ').slice(0,40));if(out.length>=maxN)break}
  let r='';for(let k=0;k<out.length;k++){if(r.length+out[k].length+1>maxC)break;r+=(r?'\n':'')+out[k]}
  return r}
async function _fineAttachList(){/* p03：本会话（当前好友）上传过的文本附件，新→旧；只读 chatMessages，不写 */
  let o=[];try{let ms=await dbGetByIndex('chatMessages','byFriend',activeFriendId);for(let i=(ms||[]).length-1;i>=0;i--){let m=ms[i];if(!m||!Array.isArray(m.files))continue;for(let k=0;k<m.files.length;k++){let f=m.files[k];if(f&&typeof f.text==='string'&&f.text&&f.name)o.push({name:String(f.name),text:f.text})}}}catch(e){}return o}
async function _fineSearch(op){/* p03：全工作区+本会话附件只读检索，至多 20 处「路径:行号 ｜ 前后文」 */
  let q=(op.q||'').trim();
  if(!q)return{ok:false,detail:'缺少关键词 q'};
  let pf=(op.path||'').trim().toLowerCase();
  let hits=[],scanned=0,projs=[];try{projs=await dbGetAll('projects')}catch(e){}
  for(let pi=0;pi<projs.length;pi++){let pj=projs[pi];
    let fl=[];try{fl=await wsGetFiles(pj.id)}catch(e){}
    for(let fi=0;fi<fl.length;fi++){let f=fl[fi];
      let rel=(pj.id===WS_DEFAULT_PROJ_ID?'':((pj.name||'')+'/'))+(f.path||f.name||'');
      if(pf&&rel.toLowerCase().indexOf(pf)===-1)continue;
      let c=typeof f.content==='string'?f.content:'';
      if(!c||c.length>500000||/^data:/.test(c))continue;
      scanned++;
      let lc=c.toLowerCase(),lq=q.toLowerCase(),from=0,x;
      while(hits.length<20&&(x=lc.indexOf(lq,from))!==-1){
        let ln=c.slice(0,x).split('\n').length;
        let a=Math.max(0,x-110),b=Math.min(c.length,x+q.length+110);
        hits.push(rel+':'+ln+' ｜ …'+c.slice(a,b).replace(/\s+/g,' ')+'…');
        from=x+q.length;
      }
      if(hits.length>=20)break;
    }
    if(hits.length>=20)break;
  }
  try{let ats=await _fineAttachList();for(let ai=0;ai<ats.length&&hits.length<20;ai++){let af=ats[ai],rel2=af.name;if(pf&&rel2.toLowerCase().indexOf(pf)===-1)continue;let c2=String(af.text||'');if(!c2)continue;scanned++;let lc2=c2.toLowerCase(),lq2=q.toLowerCase(),fr=0,x2;while(hits.length<20&&(x2=lc2.indexOf(lq2,fr))!==-1){let ln2=c2.slice(0,x2).split('\n').length,a2=Math.max(0,x2-110),b2=Math.min(c2.length,x2+q.length+110);hits.push('（附件）'+rel2+':'+ln2+' ｜ …'+c2.slice(a2,b2).replace(/\s+/g,' ')+'…');fr=x2+q.length}}}catch(e){}
  let lb=hits.length+' 处命中';
  return{ok:true,label:'检索工作区',detail:lb,content:'检索「'+q+'」：'+lb+'（扫描 '+scanned+' 个文件/附件'+(pf?'，路径过滤「'+op.path+'」':'')+'）'+(hits.length?'\n'+hits.join('\n')+'\n（读命中处附近：<ws_ctx path="路径" line="行号"/>；按行读一段：<ws_ctx path="路径" from="起始行" to="结束行"/>）':'')};
}
async function _fineCtx(op){/* p03：目录/按行段/某行附近——只读精读，单次 6000 字符上限 */
  let rawPath=(op.path||'').trim();
  if(!rawPath)return{ok:false,detail:'缺少文件路径（path 属性为空或无法解析）'};
  let src=null,fr='';
  try{let projs=await dbGetAll('projects');let pid=WS_DEFAULT_PROJ_ID,fpath=rawPath;let seg0=rawPath.split('/')[0];
    for(let pi=0;pi<projs.length;pi++){if(projs[pi].name===seg0){pid=projs[pi].id;fpath=rawPath.slice(seg0.length+1);break}}
    let fl=[];try{fl=await wsGetFiles(pid)}catch(e){}
    for(let fi=0;fi<fl.length;fi++){if((fl[fi].path||fl[fi].name)===fpath){let f=fl[fi];let c=typeof f.content==='string'?f.content:'';if(c&&/^data:/.test(c)){try{c=await _wsExtractRichText(f)}catch(e){c=''}}src=c;break}}
  }catch(e){}
  if(!src){/* 工作区没有则找本会话附件 */
    try{let ats=await _fineAttachList(),name=rawPath.toLowerCase().replace(/^附件[\/／]/,'');
      for(let ai=0;ai<ats.length;ai++){let n2=ats[ai].name.toLowerCase();if(n2===name||n2.indexOf(name)!==-1||name.indexOf(n2)!==-1){src=String(ats[ai].text||'');fr='（本会话附件）';break}}}catch(e){}
  }
  if(src==null)return{ok:false,detail:'文件不存在：'+rawPath+'（工作区与本会话附件里都没有）'};
  let lines=src.split('\n'),CAP=6000;
  if(/^(1|true|yes)$/i.test(String(op.outline||''))){let ol=_fileOutline(src,120,CAP-300);return{ok:true,label:'读取上下文',detail:rawPath+' · 目录',content:'【'+rawPath+fr+' · 目录】共 '+lines.length+' 行、'+src.length+' 字符。每行是「行号| 该段首行」，用 <ws_ctx path="'+rawPath+'" from="起始行" to="结束行"/> 读任一段：\n'+(ol||'（太短，没有可列的段落）')}}
  if(op.from||op.to){let a=Math.max(1,Math.min(lines.length,parseInt(op.from)||1)),b=Math.min(lines.length,parseInt(op.to)||(a+79));if(b<a)b=a;let out=[],used=0,e=a-1;
    for(let li=a-1;li<b;li++){let row=(li+1)+'| '+lines[li];if(used+row.length+1>CAP)break;out.push(row);used+=row.length+1;e=li+1}
    return{ok:true,label:'读取上下文',detail:rawPath+':'+a+'–'+e,content:'【'+rawPath+fr+'：第 '+a+'–'+e+' 行 / 共 '+lines.length+' 行】\n'+out.join('\n')+(e<b?'\n…（到 6000 字符上限，第 '+(e+1)+' 行起还没读，下一次 from="'+(e+1)+'"）':(b<lines.length?'\n（下一段从第 '+(b+1)+' 行起）':'\n（已到文件末尾）'))}}
  let ln=Math.max(1,Math.min(lines.length,parseInt(op.line)||1));
  let span=Math.max(3,Math.min(200,parseInt(op.span)||20));
  let rows=[],used2=0;let put=function(li){let row=(li+1)+'| '+lines[li];if(used2+row.length+1>CAP)return false;rows.push([li,row]);used2+=row.length+1;return true};
  put(ln-1);for(let d=1;d<=span;d++){let up=ln-1-d,dn=ln-1+d;if(up<0&&dn>=lines.length)break;if(up>=0&&!put(up))break;if(dn<lines.length&&!put(dn))break}
  rows.sort(function(x,y){return x[0]-y[0]});let f2=rows.length?rows[0][0]+1:ln,l2=rows.length?rows[rows.length-1][0]+1:ln;
  return{ok:true,label:'读取上下文',detail:rawPath+':'+ln,content:'【'+rawPath+fr+'：第 '+ln+' 行附近，第 '+f2+'–'+l2+' 行 / 共 '+lines.length+' 行】\n'+rows.map(function(r){return r[1]}).join('\n')};
}`
    },
    /* ── P03-5  两处附件注入传文件名（expect:2） ── */
    {
      label: 'P03-5 附件注入调用传文件名（群聊+单聊共 2 处）',
      old: String.raw`_capFileText(f.text)`,
      new: String.raw`_capFileText(f.text,f.name)`,
      expect: 2
    },
    /* ── P03-6a  定义能力块常量（锚 p02 能力块尾） ── */
    {
      label: 'P03-6a 定义 _WS_FINE_INSTR_BLOCK 能力说明常量',
      old: String.raw`不要在文字里复述选项。';/* v88：删逐模块主动性措辞（全开语义漂移第二刀） */`,
      new: String.raw`不要在文字里复述选项。';/* v88：删逐模块主动性措辞（全开语义漂移第二刀） */
const _WS_FINE_INSTR_BLOCK='\n\n【精细文件工具】已开启，path 可以是工作区文件，也可以是本会话里上传过的附件名：\n<ws_search q="关键词" path="可选路径过滤"/> 全工作区与本会话附件检索，回传至多 20 处「路径:行号 ｜ 命中行前后」；\n<ws_ctx path="文件名" outline="1"/> 整文目录：每段的「行号| 首行」，读大文件先看它定位；\n<ws_ctx path="文件名" from="起始行" to="结束行"/> 按行读一段（单次 6000 字符，回传末尾写着下一段从第几行起）；\n<ws_ctx path="文件名" line="行号" span="上下行数（选填，默认 20）"/> 读某一行附近（以该行为中心向两侧扩）。两个标签都只读，不改动任何文件。';/* p03 */`
    },
    /* ── P03-6b  群聊注入（锚 p02 群聊注入尾） ── */
    {
      label: 'P03-6b 群聊系统提示条件注入精细能力块',
      old: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（与手机端一致） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */`,
      new: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（与手机端一致） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */
    try{if(_fineOn())sysContent+=_WS_FINE_INSTR_BLOCK;}catch(e){}/* p03：精细开关开才注入检索/精读说明 */`
    },
    /* ── P03-6c  单聊注入（锚 p02 单聊注入尾） ── */
    {
      label: 'P03-6c 单聊系统提示条件注入精细能力块',
      old: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（会话内稳定，缓存友好） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */`,
      new: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（会话内稳定，缓存友好） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */
    try{if(_fineOn())sysContent+=_WS_FINE_INSTR_BLOCK;}catch(e){}/* p03：精细开关开才注入检索/精读说明 */`
    },
    /* ── P03-7  失败回执归类（锚 p02 归类尾） ── */
    {
      label: 'P03-7 失败回执动作归类 +search→检索工作区 / +ctx→读取上下文',
      old: String.raw`r.type==='make_xlsx'?'生成 Excel 表格':r.type==='music'?'控制播放器':'项目操作';/* v76：新指令失败经此通道自动回传 *//* p02：music 失败归「控制播放器」 */`,
      new: String.raw`r.type==='make_xlsx'?'生成 Excel 表格':r.type==='music'?'控制播放器':r.type==='search'?'检索工作区':r.type==='ctx'?'读取上下文':'项目操作';/* v76：新指令失败经此通道自动回传 *//* p02：music；p03：search→检索工作区、ctx→读取上下文 */`
    }
  ]
};
