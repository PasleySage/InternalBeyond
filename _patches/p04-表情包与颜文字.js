/* p04-表情包与颜文字.js
 * 对标手机端 up.html 的【表情包】+【颜文字】两块，整体迁到电脑端。
 * 数据存 apiSettings 表：ib_stk（设置行 {on,cur,presets,updated}）、ib_stkimg_<id>（图片行 {v,updated}）、ib_kao（自定义颜文字 {v:{cat:[...]},updated}）。
 * 用户发：气泡出图、TA 只收叙述句「（表情包「名」：描｜用法：用）」（不受开关影响）。
 * TA 发：开关开才注入能力块；<ws_sticker name/> 渲染成图，每条回复最多 1 枚。
 * 颜文字：八组预设 + 本机自定义（加/删），插光标处；始终可用，不受开关影响。
 * 纯前端纯离线；开关默认关。
 */
module.exports={
  id:'p04',
  about:'表情包与颜文字',
  upstream:'up.html（手机端 PWA）：ws_sticker 标签、ib_stk / ib_stkimg_<id> / ib_kao 三行、八组颜文字、输入条面板与管理页。',
  expectCount:16,
  guards:[
    'id="api-ping-btn"',/* p01：连接测试按钮已在 */
    '_aiMusicCtlOn',/* p02：AI 控制播放器开关已在 */
    '_MUSICCTL_INSTR_BLOCK',/* p02：播放器控制能力块已在 */
    '_fineOn',/* p03：精细文件工具开关已在 */
    '_WS_FINE_INSTR_BLOCK',/* p03：精细工具能力块已在（p04 在 p07 之前排序，不要求 p07 标记） */
  ],
  adds:[
    'ib-stk-toggle',/* 设置卡开关 */
    'ib-stk-cur',/* 当前预设行 */
    '_stkPending',/* 待发表情包 */
    '_stkResolveSticker',/* TA 发图解析 */
    '_stkNarrate',/* 用户发叙述句 */
    'ws_sticker',/* TA 发图标签 */
    'ib_stk',/* 设置行 id */
    'ib_stkimg_',/* 图片行前缀 */
    'ib_kao',/* 自定义颜文字行 id */
    '_stkCardEl',/* TA 表情包气泡出图 */
  ],
  accept:[
    [
      '设置卡多一个「表情包与颜文字」开关（默认关）+ 当前预设名 + 管理按钮，输入条附件旁多一个笑脸按钮（沿既有控件样式，未新造视觉语言）',
      '设置页 → 勾「表情包与颜文字」→ 管理表情包… → 上传一枚（写名字/描述/用法）→ 回聊天 → 点笑脸 → 选它发出',
      '对方气泡看到图片；TA 那边只收到一句「（表情包「名」：描｜用法：用）」；TA 回 <ws_sticker name/> 时本机把标签换成图（每条回复最多 1 枚）；颜文字面板点一枚插到光标处，可加本机自定义、长按删',
      '把 p04-表情包与颜文字.js 移出 _patches → 以上入口全部消失，回到打补丁前'
    ],
  ],
  patches:[
    /* ── A-1 设置卡（锚 p02 音乐控制组收尾） ── */
    {
      label: 'P04-A-1 设置卡组追加表情包与颜文字开关卡（默认关 + 当前预设行 + 管理按钮）',
      old: String.raw`        <p style="font-size:0.72rem;opacity:0.55;margin:4px 0 0;line-height:1.6">默认关。开后 TA 可用指令播放/暂停/切歌（仅本机本地曲库，纯离线）；与「启用Sing」相互独立，关掉不影响正在听的曲目上报。</p>
      </div>`,
      new: String.raw`        <p style="font-size:0.72rem;opacity:0.55;margin:4px 0 0;line-height:1.6">默认关。开后 TA 可用指令播放/暂停/切歌（仅本机本地曲库，纯离线）；与「启用Sing」相互独立，关掉不影响正在听的曲目上报。</p>
      </div>
      <div class="api-form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="ib-stk-toggle" onchange="_stkOnChange()" style="width:auto;accent-color:var(--accent)"> 表情包与颜文字</label>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          <p id="ib-stk-cur" style="font-size:0.72rem;opacity:0.55;margin:0;line-height:1.6;flex:1">未开启</p>
          <button type="button" id="ib-stk-mgr-open" onclick="_stkOpenMgr()" style="flex:none;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--glass-border);background:rgba(175,195,228,0.06);color:var(--text-primary);font-size:0.76rem;cursor:pointer;font-family:inherit">管理表情包…</button>
        </div>
        <p style="font-size:0.72rem;opacity:0.55;margin:4px 0 0;line-height:1.6">默认关。开后 TA 可在回复里发一枚本机表情包（每条回复最多 1 枚）；颜文字面板始终可用，不受此开关影响。图片只存本机、纯离线。</p>
      </div>`
    },

    /* ── A-2a 全屏笑脸按钮：插在附件按钮**整颗关闭之后**（禁止嵌套 button） ── */
    {
      label: 'P04-A-2a 全屏输入条附件按钮后加笑脸按钮（id=ib-kp-btn-full）',
      old: String.raw`                  文件
                </div>
              </div>
            </button>`,
      new: String.raw`                  文件
                </div>
              </div>
            </button>
            <button class="chat-attach-btn" id="ib-kp-btn-full" onclick="window._kpToggle&&_kpToggle()" title="颜文字与表情包" style="margin-left:2px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </button>`
    },

    /* ── A-2b 小窗笑脸按钮：同样插在附件按钮整颗关闭之后 ── */
    {
      label: 'P04-A-2b 小窗输入条附件按钮后加笑脸按钮（id=ib-kp-btn-mini）',
      old: String.raw`          文件
        </div>
      </div>
    </button>`,
      new: String.raw`          文件
        </div>
      </div>
    </button>
    <button class="chat-attach-btn" id="ib-kp-btn-mini" onclick="window._kpToggle&&_kpToggle()" title="颜文字与表情包" style="margin-left:2px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
    </button>`
    },

    /* ── C1  双轨：sticker 在表情包开关开时本地执行 ── */
    {
      label: 'P04-1 _execWsOps 手机端通路：sticker 开关开时本地执行（双轨）',
      old: String.raw`    if(op.kind==='search'||op.kind==='ctx'){/* p03 双轨：精细开关开时本地只读；导入记录不会走到这里 */`,
      new: String.raw`    if(op.kind==='sticker'){/* p04 双轨：表情包开关开时出图；每条回复至多 1 枚 */
      var _stN=_wsAttr(op.attrs||'','name')||'';
      if(!(window._stkOn&&_stkOn())){results.push({type:'sticker',name:_stN,ok:false,mobile:true,fed:true,reason:'未开启「表情包」'});continue}
      if(results.some(function(r){return r.type==='sticker'&&r.ok})){results.push({type:'sticker',name:_stN,ok:false,mobile:true,fed:true,reason:'每条回复最多 1 枚表情包，已发过一枚'});continue}
      var _stR=(typeof _stkResolveSticker==='function')?await _stkResolveSticker(_stN):{ok:false,reason:'表情包尚未就绪'};
      results.push({type:'sticker',name:_stN,ok:!!(_stR.ok&&_stR.dataUrl),dataUrl:_stR.dataUrl||'',reason:_stR.ok?(_stR.name||_stN||'已发送'):( _stR.reason||('表情包「'+_stN+'」不在预设里')),mobile:true,fed:true});continue}
    if(op.kind==='search'||op.kind==='ctx'){/* p03 双轨：精细开关开时本地只读；导入记录不会走到这里 */`
    },

    /* ── C6 群聊注入 ── */
    {
      label: 'P04-5 群聊系统提示条件注入表情包能力块',
      old: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（与手机端一致） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */
    try{if(_fineOn())sysContent+=_WS_FINE_INSTR_BLOCK;}catch(e){}/* p03：精细开关开才注入检索/精读说明 */`,
      new: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（与手机端一致） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */
    try{if(_fineOn())sysContent+=_WS_FINE_INSTR_BLOCK;}catch(e){}/* p03：精细开关开才注入检索/精读说明 */
    try{if(window._stkOn&&_stkOn()){var _sb9=(typeof _stkBlock==='function')?_stkBlock():'';if(_sb9)sysContent+='\n\n'+_sb9;}}catch(e){}/* p04：表情包开关开且当前预设有枚才注入 */`
    },

    /* ── C7 单聊注入 ── */
    {
      label: 'P04-6 单聊系统提示条件注入表情包能力块',
      old: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（会话内稳定，缓存友好） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */
    try{if(_fineOn())sysContent+=_WS_FINE_INSTR_BLOCK;}catch(e){}/* p03：精细开关开才注入检索/精读说明 */`,
      new: String.raw`    if(await _askGlobalGet())sysContent+=_ASK_INSTR_BLOCK;/* v55：选项卡改全局开关（会话内稳定，缓存友好） */
    try{if(_aiMusicCtlOn)sysContent+=_MUSICCTL_INSTR_BLOCK;}catch(e){}/* p02：开关开才注入播放器控制说明 */
    try{if(_fineOn())sysContent+=_WS_FINE_INSTR_BLOCK;}catch(e){}/* p03：精细开关开才注入检索/精读说明 */
    try{if(window._stkOn&&_stkOn()){var _sb1=(typeof _stkBlock==='function')?_stkBlock():'';if(_sb1)sysContent+='\n\n'+_sb1;}}catch(e){}/* p04：表情包开关开且当前预设有枚才注入 */`
    },

    /* ── C8 失败回执归类 ── */
    {
      label: 'P04-7 失败回执动作归类 +sticker→发表情包',
      old: String.raw`r.type==='make_xlsx'?'生成 Excel 表格':r.type==='music'?'控制播放器':r.type==='search'?'检索工作区':r.type==='ctx'?'读取上下文':'项目操作';/* v76：新指令失败经此通道自动回传 *//* p02：music；p03：search→检索工作区、ctx→读取上下文 */`,
      new: String.raw`r.type==='make_xlsx'?'生成 Excel 表格':r.type==='music'?'控制播放器':r.type==='search'?'检索工作区':r.type==='ctx'?'读取上下文':r.type==='sticker'?'发表情包':'项目操作';/* v76：新指令失败经此通道自动回传 *//* p02：music；p03：search/ctx；p04：sticker→发表情包 */`
    },

    /* ── C9a 定义 _stkCardEl ── */
    {
      label: 'P04-8 定义 _stkCardEl（TA 表情包直接渲染成图片）',
      old: String.raw`async function _aiMusicCtlBoot(){await _aiMusicCtlWarm();_aiMusicCtlApplyUI()}`,
      new: String.raw`async function _aiMusicCtlBoot(){await _aiMusicCtlWarm();_aiMusicCtlApplyUI()}
function _stkCardEl(d){/* p04：TA 发的表情包直接出图（不走操作卡 pill）；缺图/不在预设时给占位 */
  var box=document.createElement('div');box.className='ws-stk';box.style.cssText='display:flex;margin:4px 0;justify-content:flex-start';
  if(d&&d.dataUrl){var im=document.createElement('img');im.className='chat-bubble-img';im.loading='lazy';im.decoding='async';im.src=d.dataUrl;im.alt=d.name||'';im.title=d.name||'';im.style.cssText='max-width:min(220px,60vw);max-height:200px;border-radius:12px;cursor:zoom-in';im.onclick=function(ev){ev.stopPropagation();if(typeof _viewImageFull==='function')_viewImageFull(d.dataUrl)};box.appendChild(im)}
  else{box.style.cssText='display:inline-block;margin:4px 0;padding:5px 10px;font-size:0.74rem;color:var(--text-secondary,#888);border:1px dashed var(--glass-border,#888);border-radius:8px';box.textContent='表情包「'+(d&&d.name||'')+'」'+(d&&d.reason?'：'+d.reason:'')}
  return box}`
    },

    /* ── C9b renderSegments 合并 sticker 字段 ── */
    {
      label: 'P04-9 renderSegments 合并 sticker 结果字段',
      old: String.raw`          if(data.type==='gen_image'){['dataUrl','mime','model','path','prompt','bytes'].forEach(function(k){if(r[k]!==undefined)data[k]=r[k]})}`,
      new: String.raw`          if(data.type==='gen_image'){['dataUrl','mime','model','path','prompt','bytes'].forEach(function(k){if(r[k]!==undefined)data[k]=r[k]})}
          if(data.type==='sticker'){['dataUrl','name','reason'].forEach(function(k){if(r[k]!==undefined)data[k]=r[k]})}/* p04：表情包结果带回图片 url */`
    },

    /* ── C9c sticker 直接出图不走操作卡 ── */
    {
      label: 'P04-10 renderSegments sticker 直接出图（含双轨 mobile）',
      old: String.raw`      var cardEl=_buildWsOpCard(data);
      if(cardEl)host.appendChild(cardEl);`,
      new: String.raw`      var cardEl=((data.type==='sticker')||(data.type==='mobile'&&data.kind==='sticker'&&data.res&&data.res.dataUrl))?_stkCardEl(data):_buildWsOpCard(data);/* p04：表情包直接出图；双轨 mobile 有图也出图 */
      if(cardEl)host.appendChild(cardEl);`
    },

    /* ── C10a 群聊用户发送：气泡出图 + 落 userMsg.sticker ── */
    {
      label: 'P04-11 群聊用户消息落 userMsg.sticker（TA 只收叙述句，气泡出图）',
      old: String.raw`    const _storeImgs=_callX?(Array.isArray(_callX.images)?_callX.images:[]):(_appX?(Array.isArray(_appX.images)?_appX.images:[]):sentImages);if(_storeImgs.length)userMsg.images=_storeImgs.map(img=>({dataUrl:img.dataUrl,base64:img.base64,mime:img.mime,name:img.name}));/* v63 ③：临时帧不落库 */
    if(sentFiles.length)userMsg.files=sentFiles.map(f=>({name:f.name,ext:f.ext,size:f.size,text:f.text}));
    if(_voice)userMsg.voice={dataUrl:_voice.dataUrl,mime:_voice.mime,duration:_voice.duration,transcript:_voice.transcript||'',tone:_voice.tone||''};
  if(_callX&&_callX.tone)userMsg.callTone=String(_callX.tone).slice(0,240);/* v47 通话：声学语气随消息定格 */
    await dbPut('chatMessages',userMsg);`,
      new: String.raw`    const _storeImgs=_callX?(Array.isArray(_callX.images)?_callX.images:[]):(_appX?(Array.isArray(_appX.images)?_appX.images:[]):sentImages);
    if(window._stkPending&&!_callX&&!_appX)sentImages.push({dataUrl:window._stkPending.dataUrl,base64:'',mime:'image/png',name:window._stkPending.name||'sticker',_stkDisp:true});/* p04：待发表情包进气泡预览（标记 _stkDisp，不落 images） */
    userMsg.images=_storeImgs.filter(function(img){return !img._stkDisp}).map(img=>({dataUrl:img.dataUrl,base64:img.base64,mime:img.mime,name:img.name}));/* v63 ③：临时帧不落库；p04：_stkDisp 表情包不落 images（TA 不收图） */
    if(sentFiles.length)userMsg.files=sentFiles.map(f=>({name:f.name,ext:f.ext,size:f.size,text:f.text}));
    if(_voice)userMsg.voice={dataUrl:_voice.dataUrl,mime:_voice.mime,duration:_voice.duration,transcript:_voice.transcript||'',tone:_voice.tone||''};
  if(_callX&&_callX.tone)userMsg.callTone=String(_callX.tone).slice(0,240);/* v47 通话：声学语气随消息定格 */
    if(window._stkPending){userMsg.sticker={id:window._stkPending.id,name:String(window._stkPending.name||'').slice(0,12),desc:String(window._stkPending.desc||'').slice(0,60),use:String(window._stkPending.use||'').slice(0,80),dataUrl:window._stkPending.dataUrl};window._stkPending=null;try{renderAttachPreviews()}catch(e){}}/* p04：待发表情包落成 userMsg.sticker（不受开关影响，TA 收到的是叙述句） */
    await dbPut('chatMessages',userMsg);`
    },

    /* ── C10c 1对1 用户发送 ── */
    {
      label: 'P04-12 1对1 用户消息落 userMsg.sticker（TA 只收叙述句，气泡出图）',
      old: String.raw`    const _storeImgs=_callX?(Array.isArray(_callX.images)?_callX.images:[]):(_appX?(Array.isArray(_appX.images)?_appX.images:[]):sentImages);if(_storeImgs.length)userMsg.images=_storeImgs.map(img=>({dataUrl:img.dataUrl,base64:img.base64,mime:img.mime,name:img.name}));/* v63 ③：临时帧不落库 */
    if(sentFiles.length)userMsg.files=sentFiles.map(f=>({name:f.name,ext:f.ext,size:f.size,text:f.text}));
    if(_voice)userMsg.voice={dataUrl:_voice.dataUrl,mime:_voice.mime,duration:_voice.duration,transcript:_voice.transcript||'',tone:_voice.tone||''};
  if(_callX&&_callX.tone)userMsg.callTone=String(_callX.tone).slice(0,240);/* v47 通话：声学语气随消息定格 */
    if(_targetThread)userMsg.threadId=_targetThread;`,
      new: String.raw`    const _storeImgs=_callX?(Array.isArray(_callX.images)?_callX.images:[]):(_appX?(Array.isArray(_appX.images)?_appX.images:[]):sentImages);
    if(window._stkPending&&!_callX&&!_appX)sentImages.push({dataUrl:window._stkPending.dataUrl,base64:'',mime:'image/png',name:window._stkPending.name||'sticker',_stkDisp:true});/* p04：待发表情包进气泡预览（标记 _stkDisp，不落 images） */
    userMsg.images=_storeImgs.filter(function(img){return !img._stkDisp}).map(img=>({dataUrl:img.dataUrl,base64:img.base64,mime:img.mime,name:img.name}));/* v63 ③：临时帧不落库；p04：_stkDisp 表情包不落 images（TA 不收图） */
    if(sentFiles.length)userMsg.files=sentFiles.map(f=>({name:f.name,ext:f.ext,size:f.size,text:f.text}));
    if(_voice)userMsg.voice={dataUrl:_voice.dataUrl,mime:_voice.mime,duration:_voice.duration,transcript:_voice.transcript||'',tone:_voice.tone||''};
  if(_callX&&_callX.tone)userMsg.callTone=String(_callX.tone).slice(0,240);/* v47 通话：声学语气随消息定格 */
    if(window._stkPending){userMsg.sticker={id:window._stkPending.id,name:String(window._stkPending.name||'').slice(0,12),desc:String(window._stkPending.desc||'').slice(0,60),use:String(window._stkPending.use||'').slice(0,80),dataUrl:window._stkPending.dataUrl};window._stkPending=null;try{renderAttachPreviews()}catch(e){}}/* p04：待发表情包落成 userMsg.sticker（不受开关影响，TA 只收叙述句） */
    if(_targetThread)userMsg.threadId=_targetThread;`
    },

    /* ── C11 群聊历史叙述句 ── */
    {
      label: 'P04-13 群聊历史里用户表情包前置叙述句',
      old: String.raw`if(m.role==='user'){var uc='['+userLabel+'] '+((m.quote&&m.quote.text)?('[引用 '+(m.quote.name||(m.quote.role==='user'?userLabel:'AI'))+'的消息：'+String(m.quote.text).slice(0,300)+']\n'):'')+(m.content||'');/* v97：群聊引用进成员请求（与 1对1 同格式） */`,
      new: String.raw`if(m.role==='user'){var uc='['+userLabel+'] '+((m.quote&&m.quote.text)?('[引用 '+(m.quote.name||(m.quote.role==='user'?userLabel:'AI'))+'的消息：'+String(m.quote.text).slice(0,300)+']\n'):'')+((window._stkNarrate&&m.sticker)?_stkNarrate(m.sticker)+'\n':'')+(m.content||'');/* v97：群聊引用进成员请求（与 1对1 buildHist、电脑端 v97 同格式） *//* p04：用户发表情包，TA 只收到一句叙述（名字/描述/用法），不收图 */`
    },

    /* ── C12 1对1 历史叙述句 ── */
    {
      label: 'P04-14 1对1 历史里用户表情包前置叙述句',
      old: String.raw`      var mc=m.content||'';
      if(m.role==='user'&&m.gift)mc=_giftLine(m);else if(m.role==='user'&&m.callEnd&&m.callEnd.gifts&&m.callEnd.gifts.total>0){var _gsL=_giftSumLine(m);if(_gsL)mc+='\n'+_gsL}else if(m.role==='user'&&/^\[视频通话快照\]/.test(mc))mc=_snapLine(m);`,
      new: String.raw`      var mc=m.content||'';
      if(m.role==='user'&&m.sticker&&window._stkNarrate)mc=_stkNarrate(m.sticker)+(mc?'\n':'')+mc;/* p04：用户发表情包，TA 只收到一句叙述（名字/描述/用法），不收图 */
      if(m.role==='user'&&m.gift)mc=_giftLine(m);else if(m.role==='user'&&m.callEnd&&m.callEnd.gifts&&m.callEnd.gifts.total>0){var _gsL=_giftSumLine(m);if(_gsL)mc+='\n'+_gsL}else if(m.role==='user'&&/^\[视频通话快照\]/.test(mc))mc=_snapLine(m);`
    },

    /* ── C13  历史 m.sticker 渲染交给上游 .chat-sticker（V2.7.4 已有两处，不再叠一层） ── */

    /* ── C14 boot 预热 ── */
    {
      label: 'P04-17 init() 预热表情包/颜文字缓存',
      old: String.raw`try{_askGlobalRestoreUI()}catch(e){}/* 进阶指令与选项卡开关必须等 DB 打开后再读 */try{await _aiMusicCtlBoot()}catch(e){}/* p02：预热 AI 控制播放器开关同步缓存（段入层同步读它） */`,
      new: String.raw`try{_askGlobalRestoreUI()}catch(e){}/* 进阶指令与选项卡开关必须等 DB 打开后再读 */try{await _aiMusicCtlBoot()}catch(e){}/* p02：预热 AI 控制播放器开关同步缓存（段入层同步读它） */try{await _stkBoot()}catch(e){}/* p04：预热表情包开关/预设与颜文字自定义（段入层同步读 _stkOn） */`
    },

    /* ── A-3 整段 UI+数据 IIFE（锚 dbDelete 函数尾） ── */
    {
      label: 'P04-A-3 整段 UI+数据 IIFE：style + CATS/KAO + 全部 _stk*/_kao* 函数 + 面板 + 管理页 + boot',
      old: String.raw`function dbDelete(s,k){return new Promise((r,j)=>{const t=db.transaction(s,'readwrite');t.objectStore(s).delete(k);t.oncomplete=()=>{_ibFsDirty=true;r()};t.onerror=()=>j(t.error)})}`,
      new: String.raw`function dbDelete(s,k){return new Promise((r,j)=>{const t=db.transaction(s,'readwrite');t.objectStore(s).delete(k);t.oncomplete=()=>{_ibFsDirty=true;r()};t.onerror=()=>j(t.error)})}
(function(){/* p04：表情包与颜文字 UI+数据层——自包含 IIFE；纯前端纯离线 */
'use strict';
const _st=document.createElement('style');
_st.id='ib-kaostk-css';
_st.textContent='#ib-kao-panel{display:none;flex-direction:column;box-sizing:border-box;margin:0 10px 4px;padding:8px 10px 10px;border-radius:14px;background:var(--glass-bg);border:1px solid var(--glass-border);max-height:300px;overflow:hidden}'
+'#ib-kao-panel.open{display:flex}'
+'.kp-hd{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex:none}'
+'.kp-seg{display:inline-flex;padding:2px;border-radius:999px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.08)}'
+'.kp-seg button{border:0;background:none;padding:4px 12px;border-radius:999px;font-size:0.78rem;color:var(--text-secondary);cursor:pointer;font-family:inherit}'
+'.kp-seg button.on{background:var(--accent);color:#fff}'
+'.kp-cap{margin-left:auto;font-size:0.6rem;letter-spacing:0.22em;text-transform:uppercase;color:var(--text-muted);white-space:nowrap;font-style:normal}'
+'.kp-x{flex:none;width:26px;height:26px;border-radius:50%;border:1px solid var(--glass-border);background:rgba(255,255,255,0.08);color:var(--text-secondary);font-size:0.74rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}'
+'.kao-tabs{display:flex;gap:6px;overflow-x:auto;flex:none;padding-bottom:7px;scrollbar-width:none}'
+'.kao-tabs::-webkit-scrollbar{display:none}'
+'.kao-tab{flex:none;padding:4px 11px;border-radius:999px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.08);font-size:0.74rem;color:var(--text-secondary);cursor:pointer;font-family:inherit}'
+'.kao-tab.on{background:var(--accent);border-color:var(--accent);color:#fff}'
+'.kao-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:38px;gap:7px;flex:1 1 auto;min-height:0;max-height:173px;overflow-y:auto;padding:2px 0 4px;align-content:start}'
+'.kao-it{position:relative;height:38px;padding:0 6px;display:flex;align-items:center;justify-content:center;border-radius:12px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.1);font-size:0.88rem;text-align:center;color:var(--text-primary);white-space:nowrap;overflow:hidden;cursor:pointer;font-family:inherit}'
+'.kao-it span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
+'.kao-it.mine::after{content:"";position:absolute;right:6px;top:6px;width:4px;height:4px;border-radius:50%;background:var(--accent);opacity:0.7}'
+'.kao-add{flex:none;display:flex;gap:8px;align-items:center;margin-top:6px}'
+'.kao-add input{flex:1;min-width:0;height:34px;border-radius:999px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.08);padding:0 12px;font-size:0.86rem;color:var(--text-primary);outline:none;font-family:inherit}'
+'.kao-add button{width:34px;height:34px;border-radius:50%;border:1px solid var(--glass-border);background:rgba(255,255,255,0.08);color:var(--text-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}'
+'.stk-pick{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;flex:1 1 auto;min-height:0;max-height:150px;overflow-y:auto;padding:2px 0 4px;align-content:start}'
+'.stk-pk{aspect-ratio:1;border-radius:12px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;padding:5px;cursor:pointer}'
+'.stk-pk img{max-width:100%;max-height:100%;object-fit:contain;display:block}'
+'.kao-empty{grid-column:1/-1;padding:18px 6px;text-align:center;font-size:0.76rem;color:var(--text-muted);line-height:1.6}'
+'#ib-stk-mgr{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;padding:20px}'
+'#ib-stk-mgr.open{display:flex}'
+'#ib-stk-mgr .mgr-modal{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:16px;width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,0.35);backdrop-filter:blur(12px)}'
+'#ib-stk-mgr .mgr-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--glass-border);flex:none}'
+'#ib-stk-mgr .mgr-head h3{margin:0;font-size:1rem;color:var(--text-primary)}'
+'#ib-stk-mgr .mgr-head small{font-size:0.7rem;color:var(--text-muted);margin-left:8px}'
+'#ib-stk-mgr .mgr-x{width:30px;height:30px;border-radius:50%;border:1px solid var(--glass-border);background:none;color:var(--text-secondary);cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center}'
+'#ib-stk-mgr .mgr-body{flex:1;overflow-y:auto;padding:14px 18px}'
+'.stk-sec{font-size:0.62rem;letter-spacing:0.28em;text-transform:uppercase;color:var(--text-muted);margin:14px 0 8px}'
+'.stk-chips{display:flex;flex-wrap:wrap;gap:8px}'
+'.stk-chip{padding:6px 12px;border-radius:999px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.06);color:var(--text-primary);font-size:0.78rem;cursor:pointer;font-family:inherit}'
+'.stk-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}'
+'.stk-row{display:flex;gap:8px;align-items:center;margin-top:10px}'
+'.stk-in{flex:1;min-width:0;height:38px;border-radius:12px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.06);padding:0 12px;color:var(--text-primary);font-size:0.88rem;outline:none;font-family:inherit}'
+'.stk-btn{flex:none;height:38px;padding:0 14px;border-radius:12px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.06);color:var(--text-secondary);font-size:0.78rem;cursor:pointer;font-family:inherit}'
+'.stk-btn.danger{color:#e07080}'
+'.stk-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}'
+'.stk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}'
+'.stk-cell{position:relative;border-radius:14px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.04);padding:8px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer}'
+'.stk-cell.bad{border-color:#e07080}'
+'.stk-cell .stk-img{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:10px}'
+'.stk-cell img{max-width:100%;max-height:100%;object-fit:contain}'
+'.stk-cell .stk-nm{font-size:0.78rem;color:var(--text-primary);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
+'.stk-cell .stk-us{font-size:0.66rem;color:var(--text-secondary);line-height:1.4;max-height:2.8em;overflow:hidden;text-align:center}'
+'.stk-cell.add{justify-content:center;border-style:dashed;min-height:120px;color:var(--accent);font-size:0.8rem}'
+'.stk-hint{font-size:0.72rem;color:var(--text-secondary);line-height:1.7;margin-top:12px}'
+'#ib-stk-edit{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:none;align-items:center;justify-content:center;padding:20px}'
+'#ib-stk-edit.open{display:flex}'
+'#ib-stk-edit .edit-modal{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:16px;width:100%;max-width:420px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,0.35);backdrop-filter:blur(12px)}'
+'#ib-stk-edit h3{margin:0 0 12px;font-size:1rem;color:var(--text-primary)}'
+'.stk-ed-prev{display:flex;justify-content:center;margin-bottom:12px}'
+'.stk-ed-prev img{max-width:140px;max-height:140px;border-radius:12px}'
+'.stk-fg{margin-bottom:12px}'
+'.stk-fg label{display:block;font-size:0.8rem;color:var(--text-secondary);margin-bottom:5px}'
+'.stk-fg input,.stk-fg textarea{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.06);padding:10px 12px;color:var(--text-primary);font-size:0.88rem;outline:none;font-family:inherit;resize:vertical}'
+'.stk-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}'
+'.stk-btns button{height:38px;padding:0 16px;border-radius:10px;border:1px solid var(--glass-border);background:rgba(255,255,255,0.06);color:var(--text-secondary);font-size:0.82rem;cursor:pointer;font-family:inherit}'
+'.stk-btns button.primary{background:var(--accent);border-color:var(--accent);color:#fff}'
+'.stk-btns button.danger{color:#e07080}'
+/* p04 亮色主题：对齐产品 body:not(.theme-infernal) 口径，避免模态在浅色下发灰发黑 */
+'body:not(.theme-infernal) #ib-kao-panel,body:not(.theme-infernal) #ib-stk-mgr .mgr-modal,body:not(.theme-infernal) #ib-stk-edit .edit-modal{background:rgba(245,250,255,0.92);border-color:rgba(120,150,195,0.35);color:#1a3262}'
+'body:not(.theme-infernal) .kp-seg,body:not(.theme-infernal) .kao-tab,body:not(.theme-infernal) .kao-it,body:not(.theme-infernal) .kao-add input,body:not(.theme-infernal) .kao-add button,body:not(.theme-infernal) .stk-pk,body:not(.theme-infernal) .stk-chip,body:not(.theme-infernal) .stk-in,body:not(.theme-infernal) .stk-btn,body:not(.theme-infernal) .stk-cell,body:not(.theme-infernal) .stk-fg input,body:not(.theme-infernal) .stk-fg textarea,body:not(.theme-infernal) .stk-btns button,body:not(.theme-infernal) .kp-x{background:rgba(255,255,255,0.55);border-color:rgba(120,150,195,0.35);color:#1a3262}'
+'body:not(.theme-infernal) .kp-hd,body:not(.theme-infernal) #ib-stk-mgr .mgr-head h3,body:not(.theme-infernal) #ib-stk-edit h3,body:not(.theme-infernal) .stk-cell .stk-nm,body:not(.theme-infernal) .stk-chip,body:not(.theme-infernal) .kao-it{color:#1a3262}'
+'body:not(.theme-infernal) .kp-cap,body:not(.theme-infernal) #ib-stk-mgr .mgr-head small,body:not(.theme-infernal) .stk-sec,body:not(.theme-infernal) .stk-hint,body:not(.theme-infernal) .stk-cell .stk-us,body:not(.theme-infernal) .stk-fg label,body:not(.theme-infernal) .kao-empty,body:not(.theme-infernal) .stk-btns button:not(.primary){color:#41608e}'
+'body:not(.theme-infernal) .stk-btn.danger,body:not(.theme-infernal) .stk-btns button.danger,body:not(.theme-infernal) .stk-cell.bad{color:#a85a48;border-color:#e07080}';
document.head.appendChild(_st);
const CATS=['开心','生气','伤心','惊讶','无语','Kiss','经典','双人款'];
const KAO={
 "开心":["ᕙ( •̀ ᗜ •́ )ᕗ", "ヾ(＾∇＾)", "^>⸝⸝⸝⸝<^੭", "˶ᵒ ᵕ ˂˶", "(˃ ⌑ ˂ഃ )", "(*^▽^*)", "ʚ˶˃ ᵕ ˂˶ɞ", "(≧∇≦)/", "૮₍ ˶ᵔ ᵕ ᵔ˶ ₎ა", "◍˃ᵕ˂◍", "=ᗜꇴᗜ=", "໒꒰ྀི ˶> ˕ <˶꒱ྀི১", "(o^▽^o)", "ヽ(・∀・)ﾉ", "(＾▽＾)", "૮꒰˶ᵔ ᵕ ᵔ˶꒱ა", "꒰՞> · <՞꒱", "⸝⸝(⸝⸝>ᵕ<⸝⸝)⸝⸝♡", "٩(◕‿◕)۶", "๑'ꇴ'๑"],
 "生气":["(ꐦ ^-^)", "◺ ̫ ◿ꐦ", "-᷅ ⤙ -᷄", "(╯°□°)╯︵ ┻━┻", "(ノ｀Д´)ノ彡┻━┻", "(•̀ロ•́)", "(；￣Д￣)", "(＃￣皿￣)", "(#\`皿´)", "૮₍ꐦ -᷅ ⤙ -᷄ ₎ა", "ヽ(\`Д´)ﾉ", "(╬ಠ益ಠ)", "(。-\`ω-)！", "(๑•̀ㅁ•́๑)"],
 "伤心":["꒦ິ^꒦ິ", "՞╥⩊╥՞", "•᷄⌓•᷅", "(｡•︿•｡)", "(´；ω；\`)", "(ಥ_ಥ)", "(；ω；)", "૮(◞ ‸ ◟ )ა", "૮₍˶Ó﹏Ò ⑅₎ა", "ŏ̥ㅁŏ̥", "(T_T)", "( •ʚ•̥ )", "(っ꒪ཀ꒪)っ", "｡ﾟ(ﾟ´ω\`ﾟ)ﾟ｡", "(╥﹏╥)", "꒰⑅ᐢ. ̯.ᐢ꒱", "૮꒰⸝⸝›̥̥̥ ·̭ ‹̥̥̥⸝⸝꒱১", "っω<｡"],
 "惊讶":["(°o°)", "(O_O)", "°ﾛ°", "(´⊙ω⊙\`)", "(⊙o⊙)", "(｡ﾟДﾟ)", "⌯'⊙'⌯", "⦕(>ロ<)⦖", "( ˙ε . )？", "^⎚˕⎚^", "˙º˙", "Σ(ﾟДﾟ)", "ᗒᗣᗕ", "Σ(°△°|||)", "(⊙_⊙)", "ටᆼට"],
 "无语":["┐(´～｀)┌", "(・_・;)", "(- ₃ -)", "(￣_￣)", "૮․ ․ ྀིა", "(๑˙ー˙๑)", "¯\\_(ツ)_/¯", "╸▵╺", "⦁֊⦁", "(っ. -｡)", "(＝_＝)", "( ´_ゝ\`)", "ᴗ.ᴗᶻ", "˶ｰ\`֊´ｰ", "(￣▽￣)", "ᶻz ₍^_ ̫ _^₎", "⁃ ⌓ ⁃", "(¬_¬)"],
 "Kiss":["૮꒰ ˶• ༝ •˶꒱ა ♡", "(*´з\`)", "(˵>ㅿ<˵)♡", "(っ˘з(˘⌣˘ )", "( ˘ ³˘)♥", "꒒ ০ ⌵ ୧ ♡", "₍ᐢ..ᐢ₎♡", "♪～(´ε｀　)", "(´3｀)", "՞⩌⩌՞", "( ˘ ε ˘ )", "˃͈ દ ˂͈", "(´ε｀ )", "(*￣3￣)╭♡", "˘³˘", "(*^3^)"],
 "经典":["(・ω・)", ":P", "QAQ", "₍ᐢ. ̫ .ᐢ₎", "^_^", "QwQ", "=_=", "XD", "૮₍ ´ ꒳ \`₎ა", "^^", "orz", "T_T", "OvO", "(´・ω・\`)", ":D", ">_<"],
 "双人款":["( ◜◡¯)(¯◡◝ )", "( ˶◝◡ ◜|◝◡ ◜˶ )", "૮₍ ˃ ⤙ ˂ ₎ა", "(ﾉ´ω\`)ﾉ", "⸜₍๑•⌔•๑₎⸝", "(´・ω・)(・ω・\`)", "(ノ・∀・)ノ", "(ᐡ⦁⩊⦁⸝⸝ᐡ )₊୭", "ヽ(´▽\`)人(´▽\`)ノ", "∠( ᐛ 」∠)", "(づ￣ ³￣)づ", "(づ｡◕‿‿◕｡)づ", "(´ω｀)人(´ω｀)", "(*・ω・)ノ", "(っ´ω\`)っ", "⊂(・ω・*⊂)"]
};
const PMAX=10;
let _stkState={on:false,cur:'',presets:[]};
let _stkLoaded=false;
let _stkImgCache={};
let _kaoState={mine:{},cat:CATS[0]};
let _kaoLoaded=false;
let _kp={mode:'kao',open:false};
let _stkPickCat='';
let _mgrEl=null,_editEl=null,_editing=null;
function _$(id){return document.getElementById(id)}
function _E(t){try{return esc(String(t==null?'':t))}catch(e){return String(t==null?'':t)}}
function _T(t){try{toast(t)}catch(e){}}
function _dbReady(){try{return typeof db!=='undefined'&&!!db}catch(e){return false}}
function _pid(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function _kpVis(el){try{return !!el&&(el.offsetParent!==null||(typeof el.getClientRects==='function'&&el.getClientRects().length>0))}catch(e){return !!el}}
function _activeInput(){try{var fa=_$('chat-full-input'),mi=_$('chat-input');if(_kpVis(fa))return fa;if(_kpVis(mi))return mi;return fa||mi||null}catch(e){return null}}
async function _stkLoad(){if(_stkLoaded||!_dbReady())return;try{const r=await dbGet('apiSettings','ib_stk');if(r&&typeof r==='object'){_stkState.on=!!r.on;_stkState.cur=String(r.cur||'');_stkState.presets=Array.isArray(r.presets)?r.presets:[]}}catch(e){return}_stkLoaded=true;_stkSyncCard()}
async function _stkSave(){if(!_stkLoaded){_T('本地数据库还没准备好，过几秒再试');return}try{await dbPut('apiSettings',{id:'ib_stk',on:_stkState.on,cur:_stkState.cur,presets:_stkState.presets,updated:Date.now()})}catch(e){_T('保存失败')}_stkSyncCard()}
function _stkCurPreset(){for(let i=0;i<_stkState.presets.length;i++){if(_stkState.presets[i].id===_stkState.cur)return _stkState.presets[i]}return null}
function _stkOk(it){return !!(it&&String(it.name||'').trim()&&String(it.use||'').trim())}
function _stkFindItem(name){name=String(name||'').trim();let hit=null;const p=_stkCurPreset();if(p)hit=(p.items||[]).filter(function(x){return x.name===name})[0]||null;if(!hit){_stkState.presets.forEach(function(q){if(!hit)hit=(q.items||[]).filter(function(x){return x.name===name})[0]||null})}return hit}
async function _stkImg(id){if(_stkImgCache[id]!==undefined)return _stkImgCache[id];let v='';try{const r=await dbGet('apiSettings','ib_stkimg_'+id);v=(r&&r.v)||''}catch(e){}_stkImgCache[id]=v;return v}
function _stkBlock(){try{if(!_stkState.on)return '';const p=_stkCurPreset();if(!p)return '';const items=(p.items||[]).filter(_stkOk).slice(0,PMAX);if(!items.length)return '';const ex=String(items[0].name).replace(/["<>]/g,'');return '【表情包】你可以像发一张图片一样发一枚表情包：在正文里想让它出现的位置单独写一行标签 <ws_sticker name="名字"/>，例如 <ws_sticker name="'+ex+'"/>；系统会把这一行换成图片，对方看到的是图片本身。每条回复最多 1 枚。只有这个标签会出图——写成「[表情包：名字]」之类的文字不会出图，只是文字。可用的表情包（名字：描述｜用法）：\n'+items.map(function(it){return '- '+String(it.name).replace(/["<>]/g,'')+'：'+(it.desc?String(it.desc).replace(/[<>]/g,'').slice(0,60)+'｜':'')+String(it.use).replace(/[<>]/g,'').slice(0,80)}).join('\n')+'\n只能用列表里的名字，没有合适的就不发；发了就不再用文字描述它。对方发来的表情包会以「（表情包「名字」：描述｜用法：…）」这样的一句文字出现，按名字与描述理解就好，不必回一枚。'}catch(e){return ''}}
async function _stkResolveSticker(name){const it=_stkFindItem(name);if(!it)return{ok:false,reason:'表情包「'+name+'」不在预设里'};const u=await _stkImg(it.id);if(!u)return{ok:false,name:it.name,reason:'表情包「'+name+'」的图片已不在本机'};return{ok:true,dataUrl:u,name:it.name}}
function _stkNarrate(stk){const name=String((stk&&stk.name)||'');const desc=stk&&stk.desc?String(stk.desc):'';const use=stk&&stk.use?String(stk.use):'';let s='（表情包「'+name+'」';if(desc)s+='：'+desc;if(use)s+='｜用法：'+use;s+='）';return s}
async function _stkOnChange(){const el=_$('ib-stk-toggle');_stkState.on=!!(el&&el.checked);await _stkSave();_T(_stkState.on?'表情包已开启（下一条消息重建一次缓存）':'表情包已关闭')}
function _stkSyncCard(){try{const sw=_$('ib-stk-toggle');if(sw)sw.checked=_stkState.on;const cur=_$('ib-stk-cur');if(cur){const p=_stkCurPreset();cur.textContent=p?(p.name+' · '+(p.items||[]).filter(_stkOk).length+' 枚可用'):(_stkState.presets.length?'未选择预设':'还没有预设，点「管理表情包」新建')}}catch(e){}}
async function _kaoLoad(){if(_kaoLoaded||!_dbReady())return;try{const r=await dbGet('apiSettings','ib_kao');if(r&&r.v&&typeof r.v==='object')_kaoState.mine=r.v}catch(e){return}_kaoLoaded=true}
async function _kaoSave(){if(!_kaoLoaded){_T('本地数据库还没准备好，过几秒再试');return}try{await dbPut('apiSettings',{id:'ib_kao',v:_kaoState.mine,updated:Date.now()})}catch(e){_T('保存失败')}}
function _kpEnsure(){const ta=_activeInput();let area=ta?ta.closest('.chat-input-area'):null;if(!area){try{const as=document.querySelectorAll('.chat-input-area');for(let i=0;i<as.length;i++){if(_kpVis(as[i])){area=as[i];break}}}catch(e){}}if(!area){_T('找不到输入条，颜文字面板暂无法打开');return null}let p=_$('ib-kao-panel');if(!p){p=document.createElement('div');p.id='ib-kao-panel';p.innerHTML='<div class="kp-hd"><div class="kp-seg" id="kp-seg"><button type="button" data-m="kao" class="on">颜文字</button><button type="button" data-m="stk">表情包</button></div><i class="kp-cap" id="kp-cap">Kaomoji</i><button class="kp-x" type="button" aria-label="收起">✕</button></div>'+'<div class="kao-tabs" id="kao-tabs"></div><div class="kao-grid" id="kao-grid"></div><div class="kao-add" id="kao-addrow"><input id="kao-in" placeholder="粘贴或输入颜文字，加进当前分组" maxlength="40" autocomplete="off"><button type="button" id="kao-put" aria-label="加入"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h13M13 6l6 6-6 6"/></svg></button></div>'+'<div class="kao-tabs" id="stk-pk-tabs" hidden></div><div class="stk-pick" id="stk-pick" hidden></div>';p.addEventListener('pointerdown',function(e){if(e.target&&e.target.closest&&e.target.closest('input,textarea'))return;e.preventDefault()});p.querySelector('.kp-x').addEventListener('click',function(){_kpClose()});p.querySelector('#kp-seg').addEventListener('click',function(e){const b=e.target.closest('button[data-m]');if(!b)return;_kpMode(b.dataset.m)});p.querySelector('#kao-put').addEventListener('click',async function(){const v=String(_$('kao-in').value||'').trim();if(!v)return;const c=_kaoState.cat;_kaoState.mine[c]=_kaoState.mine[c]||[];if(_kaoState.mine[c].indexOf(v)>=0||(KAO[c]||[]).indexOf(v)>=0){_T('已经有这一枚了');return}_kaoState.mine[c].push(v);_$('kao-in').value='';await _kaoSave();_kaoPaint();_T('已加入「'+c+'」')});p.querySelector('#kao-in').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();_$('kao-put').click()}})}
  if(p.parentNode!==area.parentNode||p.nextSibling!==area){area.parentNode.insertBefore(p,area)}return p}
function _kpMode(m){_kp.mode=(m==='stk')?'stk':'kao';const p=_kpEnsure();if(!p)return;p.querySelectorAll('#kp-seg button').forEach(function(b){b.classList.toggle('on',b.dataset.m===_kp.mode)});_$('kp-cap').textContent=_kp.mode==='stk'?'Stickers':'Kaomoji';['kao-tabs','kao-grid','kao-addrow'].forEach(function(id){_$(id).hidden=_kp.mode!=='kao'});['stk-pk-tabs','stk-pick'].forEach(function(id){_$(id).hidden=_kp.mode!=='stk'});if(_kp.mode==='stk'){_stkLoad().then(function(){_stkPickPaint()})}else{_kaoLoad().then(function(){_kaoPaint()})}try{localStorage.setItem('ib_kp_mode',_kp.mode)}catch(e){}}
function _kpOpen(m){const p=_kpEnsure();if(!p)return;if(m)_kp.mode=(m==='stk')?'stk':'kao';if(!p.classList.contains('open')){p.classList.add('open');_kp.open=true}_kpMode(_kp.mode)}
function _kpClose(){const p=_$('ib-kao-panel');_kp.open=false;if(p)p.classList.remove('open')}
function _kpToggle(){if(_kp.open)_kpClose();else _kpOpen()}
function _kaoIns(t){const ta=_activeInput();if(!ta)return;const v=ta.value||'';let s=ta.selectionStart,e=ta.selectionEnd;if(typeof s!=='number'){s=v.length;e=s}ta.value=v.slice(0,s)+t+v.slice(e);const pos=s+t.length;try{ta.setSelectionRange(pos,pos)}catch(x){}try{ta.dispatchEvent(new Event('input',{bubbles:true}))}catch(x){}_kpClose();try{ta.focus()}catch(x){}}
function _kaoPaint(){const tabs=_$('kao-tabs'),grid=_$('kao-grid');if(!tabs||!grid)return;tabs.innerHTML='';CATS.forEach(function(c){const b=document.createElement('button');b.type='button';b.className='kao-tab'+(c===_kaoState.cat?' on':'');b.textContent=c;b.addEventListener('click',function(){_kaoState.cat=c;_kaoPaint()});tabs.appendChild(b)});grid.innerHTML='';const base=KAO[_kaoState.cat]||[];const mine=_kaoState.mine[_kaoState.cat]||[];const put=function(t,isMine){const d=document.createElement('button');d.type='button';d.className='kao-it'+(isMine?' mine':'');const sp=document.createElement('span');sp.textContent=t;d.appendChild(sp);d.title=t;let tm=null,held=false;d.addEventListener('click',function(){if(held){held=false;return}_kaoIns(t)});if(isMine){const doDel=async function(){if(!window.confirm('删除这枚自定义颜文字？\n'+t))return;const arr=_kaoState.mine[_kaoState.cat]||[];const i=arr.indexOf(t);if(i>=0)arr.splice(i,1);await _kaoSave();_kaoPaint()};const st=function(){held=false;tm=setTimeout(function(){held=true;tm=null;doDel()},520)};const en=function(){if(tm){clearTimeout(tm);tm=null}};d.addEventListener('mousedown',st);d.addEventListener('mouseup',en);d.addEventListener('mouseleave',en);d.addEventListener('contextmenu',function(e){e.preventDefault();doDel()})}grid.appendChild(d)};mine.forEach(function(t){put(t,true)});base.forEach(function(t){put(t,false)});if(!mine.length&&!base.length)grid.innerHTML='<div class="kao-empty">这一组还是空的，在下面加一枚。</div>'}
function _stkPickPaint(){const tabs=_$('stk-pk-tabs'),grid=_$('stk-pick');if(!tabs||!grid)return;const ps=_stkState.presets||[];if(!_stkPickCat||!ps.some(function(p){return p.id===_stkPickCat})){_stkPickCat=(_stkCurPreset()&&_stkCurPreset().id)||(ps[0]&&ps[0].id)||''}tabs.innerHTML='';ps.forEach(function(p){const b=document.createElement('button');b.type='button';b.className='kao-tab'+(p.id===_stkPickCat?' on':'');b.textContent=p.name;b.addEventListener('click',function(){_stkPickCat=p.id;_stkPickPaint()});tabs.appendChild(b)});const p=ps.filter(function(x){return x.id===_stkPickCat})[0]||null;const items=p?(p.items||[]).filter(_stkOk):[];grid.innerHTML='';if(!items.length)grid.innerHTML='<div class="kao-empty">'+(p?'这套预设里还没有写好名字与用法的表情包。':'还没有表情包预设——到设置页「表情包」卡里传几枚。')+'</div>';items.forEach(function(it){const c=document.createElement('button');c.type='button';c.className='stk-pk';c.title=it.name;const im=document.createElement('img');im.alt=it.name;c.appendChild(im);_stkImg(it.id).then(function(u){if(u)im.src=u});c.addEventListener('click',function(){_stkImg(it.id).then(function(u){if(!u){_T('这枚表情包的图片已不在本机');return}window._stkPending={id:it.id,name:it.name,desc:String(it.desc||''),use:String(it.use||''),dataUrl:u};_kpClose();_T('已选表情包「'+it.name+'」，发送时带上');try{const ta=_activeInput();if(ta)ta.focus()}catch(e){}})});grid.appendChild(c)})}
function _stkOpenMgr(){_stkLoad().then(function(){if(!_mgrEl)_stkBuildMgr();_mgrEl.style.display='flex';_mgrEl.classList.add('open');_stkPaintMgr()})}
function _stkBuildMgr(){_mgrEl=document.createElement('div');_mgrEl.id='ib-stk-mgr';_mgrEl.innerHTML='<div class="mgr-modal">'+'<div class="mgr-head"><h3>表情包<small>本机保存 · 每套最多 '+PMAX+' 枚</small></h3><button class="mgr-x" type="button" aria-label="关闭">✕</button></div>'+'<div class="mgr-body">'+'<div class="stk-sec">预设</div><div class="stk-chips" id="stk-chips"></div>'+'<div class="stk-row" id="stk-prow"><input class="stk-in" id="stk-pname" placeholder="预设名" maxlength="16"><button class="stk-btn" id="stk-pren" type="button">改名</button><button class="stk-btn danger" id="stk-pdel" type="button">删除</button></div>'+'<div class="stk-sec">表情包<span id="stk-n"></span></div><div class="stk-grid" id="stk-grid"></div>'+'<p class="stk-hint">每枚表情包写名字、描述、用法：名字是标签里的那个词，描述是它长什么样（可不填），用法是一句「什么时候发、表达什么」。你发出去时 TA 只收到这三句，不收到图片；TA 发之前也只看这三句。图片存在本机、随备份往返；360KB 内的 PNG / GIF / WebP / JPEG 原样保存，更大的压到 512 像素。是否注入由设置页「表情包」开关控制。</p>'+'</div><input type="file" accept="image/*" id="stk-file" hidden></div>';document.body.appendChild(_mgrEl);_mgrEl.querySelector('.mgr-x').addEventListener('click',function(){_mgrEl.style.display='none';_mgrEl.classList.remove('open')});_mgrEl.addEventListener('click',function(e){if(e.target===_mgrEl){_mgrEl.style.display='none';_mgrEl.classList.remove('open')}});_$('stk-pren').addEventListener('click',async function(){const p=_stkCurPreset();if(!p)return;const v=String(_$('stk-pname').value||'').trim();if(!v){_T('预设名不能为空');return}p.name=v.slice(0,16);await _stkSave();_stkPaintMgr();_T('已改名')});_$('stk-pdel').addEventListener('click',async function(){const p=_stkCurPreset();if(!p)return;if(!window.confirm('删除预设「'+p.name+'」及其全部 '+((p.items||[]).length)+' 枚表情包？'))return;const its=p.items||[];for(let i=0;i<its.length;i++){try{await dbDelete('apiSettings','ib_stkimg_'+its[i].id)}catch(e){}delete _stkImgCache[its[i].id]}_stkState.presets=_stkState.presets.filter(function(q){return q.id!==p.id});_stkState.cur=_stkState.presets.length?_stkState.presets[0].id:'';await _stkSave();_stkPaintMgr()});_$('stk-file').addEventListener('change',async function(){const f=this.files&&this.files[0];this.value='';if(!f)return;const p=_stkCurPreset();if(!p){_T('先新建一套预设');return}if((p.items||[]).length>=PMAX){_T('这套已经有 '+PMAX+' 枚了');return}try{const du=await _stkProcFile(f);_stkEdit({id:_pid(),name:'',use:'',_du:du,_new:true})}catch(e){_T('图片读取失败')}})}
function _stkPaintMgr(){if(!_mgrEl)return;const chips=_$('stk-chips');chips.innerHTML='';_stkState.presets.forEach(function(p){const b=document.createElement('button');b.type='button';b.className='stk-chip'+(p.id===_stkState.cur?' on':'');b.textContent=p.name+' · '+(p.items||[]).length;b.addEventListener('click',async function(){if(_stkState.cur===p.id)return;_stkState.cur=p.id;await _stkSave();_stkPaintMgr();_T('已切换到「'+p.name+'」'+(_stkState.on?'，下一条消息重建一次缓存':''))});chips.appendChild(b)});const add=document.createElement('button');add.type='button';add.className='stk-chip';add.textContent='＋ 新预设';add.addEventListener('click',async function(){const p={id:_pid(),name:'预设 '+(_stkState.presets.length+1),items:[]};_stkState.presets.push(p);_stkState.cur=p.id;await _stkSave();_stkPaintMgr()});chips.appendChild(add);const p=_stkCurPreset();_$('stk-prow').style.display=p?'':'none';if(p)_$('stk-pname').value=p.name;const grid=_$('stk-grid');grid.innerHTML='';const items=p?(p.items||[]):[];_$('stk-n').textContent=items.length+' / '+PMAX;items.forEach(function(it){const c=document.createElement('div');c.className='stk-cell'+(_stkOk(it)?'':' bad');c.innerHTML='<div class="stk-img"><img alt=""></div><div class="stk-nm">'+_E(it.name||'（未命名）')+'</div><div class="stk-us">'+_E((it.desc?it.desc+' · ':'')+(it.use||'还没写用法'))+'</div>';_stkImg(it.id).then(function(u){const im=c.querySelector('img');if(im&&u)im.src=u});c.addEventListener('click',function(){_stkEdit(it)});grid.appendChild(c)});if(p&&items.length<PMAX){const a=document.createElement('div');a.className='stk-cell add';a.textContent='＋ 上传一枚';a.addEventListener('click',function(){_$('stk-file').click()});grid.appendChild(a)}if(!p)grid.innerHTML='<div class="stk-hint" style="grid-column:1/-1;margin:0">先新建一套预设。</div>'}
function _stkEdit(it){_editing=it;if(!_editEl)_stkBuildEdit();_$('stk-e-name').value=it.name||'';_$('stk-e-desc').value=it.desc||'';_$('stk-e-use').value=it.use||'';const im=_$('stk-e-img');im.removeAttribute('src');if(it._du)im.src=it._du;else _stkImg(it.id).then(function(u){if(u&&_editing===it)im.src=u});_$('stk-e-del').style.display=it._new?'none':'';_editEl.style.display='flex';_editEl.classList.add('open')}
function _stkBuildEdit(){_editEl=document.createElement('div');_editEl.id='ib-stk-edit';_editEl.innerHTML='<div class="edit-modal">'+'<h3>表情包</h3>'+'<div class="stk-ed-prev"><img id="stk-e-img" alt=""></div>'+'<div class="stk-fg"><label>名字 *</label><input id="stk-e-name" maxlength="12" placeholder="TA 发它时写的名字，12 字内"></div>'+'<div class="stk-fg"><label>描述</label><input id="stk-e-desc" maxlength="60" placeholder="长什么样、什么表情（可不填）"></div>'+'<div class="stk-fg"><label>用法 *</label><textarea id="stk-e-use" rows="2" maxlength="80" placeholder="什么时候发、表达什么，80 字内"></textarea></div>'+'<div class="stk-btns"><button id="stk-e-del" class="danger">删除</button><button id="stk-e-cancel">取消</button><button id="stk-e-save" class="primary">保存</button></div>'+'</div>';document.body.appendChild(_editEl);_editEl.addEventListener('click',function(e){if(e.target===_editEl){_editEl.style.display='none';_editEl.classList.remove('open')}});_$('stk-e-cancel').addEventListener('click',function(){_editing=null;_editEl.style.display='none';_editEl.classList.remove('open')});_$('stk-e-del').addEventListener('click',async function(){const it=_editing;if(!it)return;if(it._new){_editing=null;_editEl.style.display='none';_editEl.classList.remove('open');return}if(!window.confirm('删除这枚表情包？'))return;const p=_stkCurPreset();if(p)p.items=(p.items||[]).filter(function(x){return x.id!==it.id});try{await dbDelete('apiSettings','ib_stkimg_'+it.id)}catch(e){}delete _stkImgCache[it.id];await _stkSave();_editing=null;_editEl.style.display='none';_editEl.classList.remove('open');_stkPaintMgr()});_$('stk-e-save').addEventListener('click',async function(){const it=_editing;if(!it)return;const n=String(_$('stk-e-name').value||'').trim().replace(/["<>]/g,'').slice(0,12);const u=String(_$('stk-e-use').value||'').trim().replace(/[<>]/g,'').slice(0,80);const dsc=String(_$('stk-e-desc').value||'').trim().replace(/[<>]/g,'').slice(0,60);if(!n||!u){_T('名字和用法都要写，TA 才知道怎么用');return}const p=_stkCurPreset();if(!p)return;if((p.items||[]).some(function(x){return x.id!==it.id&&x.name===n})){_T('这套里已经有叫「'+n+'」的了');return}if(it._new){try{await dbPut('apiSettings',{id:'ib_stkimg_'+it.id,v:it._du,updated:Date.now()})}catch(e){_T('图片保存失败');return}_stkImgCache[it.id]=it._du;p.items=p.items||[];p.items.push({id:it.id,name:n,desc:dsc,use:u})}else{it.name=n;it.desc=dsc;it.use=u}await _stkSave();_editing=null;_editEl.style.display='none';_editEl.classList.remove('open');_stkPaintMgr();_T(_stkState.on&&p.id===_stkState.cur?'已保存，下一条消息重建一次缓存':'已保存')})}
function _stkProcFile(f){return new Promise(function(res,rej){const rd=new FileReader();rd.onerror=function(){rej(new Error('read'))};rd.onload=function(){const du=String(rd.result||'');if(!/^data:image\//.test(du)){rej(new Error('type'));return}if(f.size<=360*1024&&/^image\/(png|gif|webp|jpeg)$/.test(f.type)){res(du);return}const im=new Image();im.onload=function(){try{const W=im.naturalWidth||1,H=im.naturalHeight||1;const sc=Math.min(1,512/Math.max(W,H));const w=Math.max(1,Math.round(W*sc)),h=Math.max(1,Math.round(H*sc));const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,0,0,w,h);let out=cv.toDataURL('image/png');if(out.length>900*1024)out=cv.toDataURL('image/jpeg',0.86);res(out)}catch(e){rej(e)}};im.onerror=function(){rej(new Error('decode'))};im.src=du};rd.readAsDataURL(f)})}
async function _stkBoot(){try{if(!_dbReady()){setTimeout(_stkBoot,500);return}await _stkLoad();await _kaoLoad();_stkSyncCard();try{_kp.mode=localStorage.getItem('ib_kp_mode')==='stk'?'stk':'kao'}catch(e){}}catch(e){}}
window._stkOn=function(){return _stkState.on};
window._stkState=_stkState;
window._stkLoad=_stkLoad;window._stkSave=_stkSave;window._stkCurPreset=_stkCurPreset;window._stkImg=_stkImg;
window._stkBlock=_stkBlock;window._stkResolveSticker=_stkResolveSticker;window._stkNarrate=_stkNarrate;
window._kaoState=_kaoState;window._kaoLoad=_kaoLoad;window._kaoSave=_kaoSave;window.CATS=CATS;window.KAO=KAO;
window._kaoIns=_kaoIns;window._kaoPaint=_kaoPaint;window._kpEnsure=_kpEnsure;
window._stkPending=null;
window._kpOpen=_kpOpen;window._kpClose=_kpClose;window._kpToggle=_kpToggle;
window._stkOpenMgr=_stkOpenMgr;window._stkBoot=_stkBoot;window._stkOnChange=_stkOnChange;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_stkBoot);else _stkBoot();
})();`
    }
  ]
};
