/* 补丁清单 · P01 连接测试（电脑端 `InternalBeyond.html`）
 *
 * 对应票：`.scratch\ib-ibm-parity\issues\01-连接测试.md`
 * 依据版本：上游 `Sui-IB/InternalBeyond` `b0d7919d`（V2.7.5，2,819,874 B，sha256 a49fb343…8cbd6）
 *
 * ⚠️ 转义：锚点与产出代码一律用 String.raw —— 普通模板字符串会把 `\.` / `\s` 里的
 *    反斜杠吃掉（手机端清单踩过：差 1 字节，靠 sha256 比对才抓出来）。
 *
 * 本集共 2 处：
 *   P01-1  API 编辑器动作行加「测试连接」按钮 ＋ 一行结果区（沿用既有 .btn 样式，不新增 CSS）
 *   P01-2  插入 apiTestConnection() 等三个函数（在 saveCurrentApi 之前）
 *
 * 纯增量：不改任何既有流程，不写聊天记录、不改设置、不记用量。
 */
module.exports = {
  id: 'p01', about: '连接测试',
  upstream: { repo: 'Sui-IB/InternalBeyond', commit: 'b0d7919d', bytes: 2819874, sha256: 'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6' },
  expectCount: 2,
  /* 原有锚点：打完补丁必须还在（证明没改坏既有界面与主流程） */
  guards: [
    'onclick="cancelApiEdit()"',
    'onclick="deleteCurrentApi()" style="color:#e88">删除</button>',
    'function _cfgFmt(cfg){',
    'async function callApi(cfg,userMsg,opts){',
    'id="api-tkdash-card"'
  ],
  /* 新增锚点：证明本集真的落上了 */
  adds: [
    'id="api-ping-btn"',
    'id="api-ping-result"',
    'async function apiTestConnection(){',
    'function _pingFormCfg(){'
  ],
  /* 人工验收清单（四列，跑流水线时会渲染进自检报告） */
  accept: [
    [
      'API 编辑器动作行多一个「测试连接」按钮，下方多一行结果区（沿用既有 .btn 样式，未新增 CSS）',
      'API 页 → 点任一配置进入编辑 → 点「测试连接」',
      '通：绿色「✓ 已连通（格式 · 模型 · 毫秒）」；不通：红色「✗ 地址/密钥/模型名/超时：具体原因」',
      '把 p01-连接测试.js 移出 _patches\\ 后重跑 _driver.js（产物即回退到干净基线）'
    ],
    [
      '探活只发一条最小请求：不写聊天记录、不改任何设置、不记用量、不进提示缓存',
      '测试前后各导出一次备份对比',
      '聊天记录条数、设置项、Token 用量、导出内容均不变',
      '同上'
    ]
  ],
  patches: [
    /* ── P01-1 动作行 ── */
    {
      label: 'P01-1 编辑器动作行加「测试连接」＋结果区',
      old: String.raw`      <div class="api-actions">
        <button class="btn btn-primary" onclick="saveCurrentApi()">保存</button>
        <button class="btn" onclick="cancelApiEdit()">取消</button>
        <button class="btn" onclick="deleteCurrentApi()" style="color:#e88">删除</button>
      </div>`,
      new: String.raw`      <div class="api-actions">
        <button class="btn btn-primary" onclick="saveCurrentApi()">保存</button>
        <button class="btn" onclick="cancelApiEdit()">取消</button>
        <button class="btn" id="api-ping-btn" type="button" onclick="apiTestConnection()" title="按当前表单值发一条最小请求探活：不写聊天记录、不改任何设置、不占对话上下文">测试连接</button>
        <button class="btn" onclick="deleteCurrentApi()" style="color:#e88">删除</button>
      </div>
      <div id="api-ping-result" style="display:none;font-size:0.78rem;line-height:1.7;margin-top:10px"></div>`
    },
    /* ── P01-2 探活逻辑 ── */
    {
      label: 'P01-2 探活函数（apiTestConnection）',
      old: String.raw`async function saveCurrentApi(){`,
      new: String.raw`/* p01：连接测试——两级探活：L1 通道探活（max_tokens=16 的 "ping"），L2 对话探活（max_tokens=32 的 "请回复：ok"）；不写聊天记录、不改设置、不记用量、不进缓存 */
function _pingFormCfg(){
  const v=function(id){const e=document.getElementById(id);return e?String(e.value||'').trim():''};
  const prov=v('api-provider'),ep=v('api-endpoint');
  return {id:'__ping__',provider:prov,apiKey:v('api-key'),model:v('api-model'),endpoint:(prov==='custom'?_epTidy(ep):ep)};
}
function _pingErrText(tx){
  const t=String(tx||'');
  try{const j=JSON.parse(t);if(j){const e=j.error;if(e)return String(e.message||e||'');if(j.message)return String(j.message)}}catch(_e){}
  return t.slice(0,160);
}
async function apiTestConnection(){
  const btn=document.getElementById('api-ping-btn'),res=document.getElementById('api-ping-result');
  if(!btn||!res)return;
  const cfg=_pingFormCfg();
  function done(ok,txt){/* p01 L1 失败单行：红/绿 + 按钮恢复 */
    res.style.display='';res.style.color=ok?'#5fbf7f':'#e08a8a';
    res.style.whiteSpace='';
    res.textContent=(ok?'\u2713 ':'\u2717 ')+txt;
    btn.disabled=false;btn.textContent='测试连接';
  }
  if(!cfg.apiKey)return done(false,'通道：密钥：未填 API Key');
  if(!cfg.model)return done(false,'通道：模型名：未填模型名');
  if(!cfg.endpoint)return done(false,'通道：地址：未填接口地址');
  const fmt=_cfgFmt(cfg);
  function mkReq(tokName){/* p01 L1：通道探活请求（max_tokens=16，content='ping'） */
    if(fmt==='anthropic'){
      const ha={'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01'};
      if(cfg.provider!=='custom'||/api\.anthropic\.com/i.test(cfg.endpoint))ha['anthropic-dangerous-direct-browser-access']='true';
      return {url:cfg.endpoint,headers:ha,body:JSON.stringify({model:cfg.model,max_tokens:16,messages:[{role:'user',content:'ping'}]})};
    }
    if(fmt==='gemini')return {url:cfg.endpoint.replace('{model}',cfg.model)+'?key='+cfg.apiKey,headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'ping'}]}],generationConfig:{maxOutputTokens:16}})};
    const ob={model:cfg.model,messages:[{role:'user',content:'ping'}]};ob[tokName]=16;/* p01 S3：参数名与聊天通道共用 _tokParamGet 记忆；一次逻辑探活，至多一次参数名纠正 */
    return {url:cfg.endpoint,headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey},body:JSON.stringify(ob)};
  }
  function mkL2Req(tokName){/* p01 L2：对话探活请求——无 system、无 tools、无 prompt_cache_key，输出上限 32 */
    if(fmt==='anthropic'){
      const ha={'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01'};
      if(cfg.provider!=='custom'||/api\.anthropic\.com/i.test(cfg.endpoint))ha['anthropic-dangerous-direct-browser-access']='true';
      return {url:cfg.endpoint,headers:ha,body:JSON.stringify({model:cfg.model,max_tokens:32,messages:[{role:'user',content:'请回复：ok'}]})};
    }
    if(fmt==='gemini')return {url:cfg.endpoint.replace('{model}',cfg.model)+'?key='+cfg.apiKey,headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'请回复：ok'}]}],generationConfig:{maxOutputTokens:32}})};
    const ob={model:cfg.model,messages:[{role:'user',content:'请回复：ok'}]};ob[tokName]=32;
    return {url:cfg.endpoint,headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.apiKey},body:JSON.stringify(ob)};
  }
  function classify(status,tx,aborted,net){/* p01：错误分类（L1/L2 共用） */
    const m=_pingErrText(tx),raw=String(tx||'');
    if(/^\s*<(!doctype|html)/i.test(raw))return {kind:'地址',txt:'该地址返回的是网页而不是接口，请核对接口地址（通常以 /v1/chat/completions 或 /v1/messages 结尾）'};
    if(aborted)return {kind:'超时',txt:'请求超时（20 秒无响应），请检查网络与接口状态'};
    if(net)return {kind:'地址',txt:'无法连接，或该接口不允许浏览器跨域（CORS）'};
    if(status===401||status===403)return {kind:'密钥',txt:'密钥无效、无权限或余额不足（HTTP '+status+'）'+(m?('：'+m.slice(0,80)):'')};
    if(status===404)return /model/i.test(m)?{kind:'模型名',txt:'模型名不存在（HTTP 404）'+(m?('：'+m.slice(0,80)):'')}:{kind:'地址',txt:'接口地址不存在（HTTP 404），请核对接口地址'};
    if(status===429)return {kind:'请求',txt:'被限流或额度不足（HTTP 429）'};/* p01 P2：429 归「请求」（限流/额度），非密钥问题 */
    if(status===400||status===422){
      if(/max[_-]?(completion[_-]?)?tokens/i.test(m))return {kind:'请求',txt:'该端点不接受本次请求的输出上限参数（HTTP '+status+'）'};
      if(/model/i.test(m))return {kind:'模型名',txt:'模型名不被该端点接受（HTTP '+status+'）'+(m?('：'+m.slice(0,80)):'')};
      return {kind:'请求',txt:'请求被拒绝（HTTP '+status+'）'+(m?('：'+m.slice(0,80)):'')};
    }
    if(status>=500)return {kind:'其它',txt:'服务端错误（HTTP '+status+'）'};/* p01 P1：5xx 归「其它」，非地址问题 */
    return {kind:'其它',txt:'HTTP '+status+(m?('：'+m.slice(0,80)):'')};
  }
  btn.disabled=true;btn.textContent='测试中…';
  res.style.display='';res.style.color='';res.textContent='测试中…（最长 20 秒）';
  const ac=new AbortController(),tmr=setTimeout(function(){ac.abort()},20000),t0=Date.now();
  let tok=_tokParamGet(cfg)||'max_tokens';/* p01 S3：参数名初始取自 _tokParamGet 记忆；两级各至多一次参数名纠正 */
  try{
    /* ── L1 通道探活 ── */
    let l1ms=0;
    for(let i=0;i<2;i++){
      const req=mkReq(tok);
      let r;
      try{r=await fetch(req.url,{method:'POST',headers:req.headers,body:req.body,signal:ac.signal})}
      catch(e){clearTimeout(tmr);const ab=(e&&e.name==='AbortError');const c0=classify(0,'',ab,!ab);return done(false,'通道：'+c0.kind+'：'+c0.txt)}
      const tx=await r.text().catch(function(){return ''});
      if(r.ok){
        if((r.headers.get('content-type')||'').indexOf('text/html')!==-1){clearTimeout(tmr);return done(false,'通道：地址：该地址返回的是网页而不是接口，请核对接口地址')}
        let got=false;
        try{
          const j=JSON.parse(tx);
          if(fmt==='anthropic')got=!!(j&&j.content&&j.content.length&&j.content[0].text!=null);
          else if(fmt==='gemini')got=!!(j&&j.candidates&&j.candidates.length);
          else got=!!(j&&((j.choices&&j.choices.length)||j.content!=null));
        }catch(e2){got=false}
        if(got){l1ms=Date.now()-t0;break}
        clearTimeout(tmr);
        return done(false,'通道：其它：接口返回 200 但不是可识别的回复结构，请核对服务商选择与接口地址');
      }
      if(i===0&&fmt!=='anthropic'&&fmt!=='gemini'&&(r.status===400||r.status===422)&&/max[_-]?tokens/i.test(_pingErrText(tx))){tok='max_completion_tokens';continue}
      clearTimeout(tmr);
      const c1=classify(r.status,tx,false,false);
      return done(false,'通道：'+c1.kind+'：'+c1.txt);
    }
    clearTimeout(tmr);
    /* L1 成功：累积 lines，整体绿色，继续 L2 */
    const lines=['\u2713 通道：'+fmt+' · '+cfg.model+' · '+l1ms+' ms'];
    res.style.color='#5fbf7f';
    function render(){/* p01：统一渲染两行（textContent，防注入） */
      res.style.whiteSpace='pre-wrap';
      res.textContent=lines.join('\n');
      btn.disabled=false;btn.textContent='测试连接';
    }
    /* ── L2 对话探活（独立 AbortController / 20s 超时） ── */
    const ac2=new AbortController(),tmr2=setTimeout(function(){ac2.abort()},20000),t2=Date.now();
    try{
      for(let j=0;j<2;j++){
        const req2=mkL2Req(tok);
        let r2;
        try{r2=await fetch(req2.url,{method:'POST',headers:req2.headers,body:req2.body,signal:ac2.signal})}
        catch(e3){clearTimeout(tmr2);const ab=(e3&&e3.name==='AbortError');const c2=classify(0,'',ab,!ab);lines.push('\u2717 对话：'+c2.kind+'：'+c2.txt);return render()}
        const tx2=await r2.text().catch(function(){return ''});
        if(r2.ok){
          clearTimeout(tmr2);
          let snip='';
          try{
            const j2=JSON.parse(tx2);
            if(fmt==='anthropic'){const cc=(j2&&j2.content)||[];snip=cc.map(function(p){return typeof p.text==='string'?p.text:''}).join('')}
            else if(fmt==='gemini'){const pp=(j2&&j2.candidates&&j2.candidates.length&&j2.candidates[0].content&&j2.candidates[0].content.parts)||[];snip=pp.map(function(p){return typeof p.text==='string'?p.text:''}).join('')}
            else{const mm=(j2&&j2.choices&&j2.choices[0]&&j2.choices[0].message)||{};const cc2=mm.content;if(typeof cc2==='string')snip=cc2;else if(Array.isArray(cc2))snip=cc2.map(function(pp2){return pp2.text||''}).join('')}
          }catch(e4){snip=''}
          lines.push('\u2713 对话：'+String(snip||'(空回复)').slice(0,20)+' · '+(Date.now()-t2)+' ms');
          return render();
        }
        if(j===0&&fmt!=='anthropic'&&fmt!=='gemini'&&(r2.status===400||r2.status===422)&&/max[_-]?tokens/i.test(_pingErrText(tx2))){tok='max_completion_tokens';continue}
        clearTimeout(tmr2);
        const c3=classify(r2.status,tx2,false,false);
        lines.push('\u2717 对话：'+c3.kind+'：'+c3.txt);
        return render();
      }
    }catch(e5){
      clearTimeout(tmr2);
      lines.push('\u2717 对话：其它：请求未能发出（'+String((e5&&e5.message)||e5).slice(0,80)+'）');
      return render();
    }
  }catch(e){
    clearTimeout(tmr);
    return done(false,'通道：其它：请求未能发出（'+String((e&&e.message)||e).slice(0,80)+'）');/* p01 P1：请求未能发出归「其它」 */
  }
}
async function saveCurrentApi(){`
    }
  ]
};
