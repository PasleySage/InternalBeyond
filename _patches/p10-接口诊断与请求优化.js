/* p10-接口诊断与请求优化.js
 * 票 A+C：接口诊断与请求优化。
 *
 * 依据版本：上游 `Sui-IB/InternalBeyond` `b0d7919d`（V2.7.5，2,819,874 B，sha256 a49fb343…8cbd6）
 *
 * ⚠️ 锚点与产出代码一律 String.raw；产出代码内只用单引号拼接、不用反引号模板串（沿用 p01–p07 纪律）。
 *
 * 本集共 6 处：
 *   P10-1  插入纯函数 `_apiDiagText(e)`：把错误分类成一句人话（展示层用，绝不改写原始 error.message）
 *   P10-2  `_callApiChatOnce` 默认超时 60s → 120s（流式版不动，靠 4 行锚点区分）
 *   P10-3  OpenAI 分支 return 兼容：content 数组拼接（含裸字符串元素）；仅有 reasoning_content 时抛「空回复（仅有思考字段）」
 *   P10-4  Anthropic/Gemini 两支 catch 的「请求超时」带秒数（OpenAI 支已是带秒版，不动）
 *   P10-5  在 `_errWantsCompletionParam` 之后追加一条更宽的 max_tokens→max_completion_tokens 触发条件
 *   P10-6  私聊发送外层 catch 用 `_apiDiagText(err)` 替换硬编码分类（地址/密钥/限流），聊天面失败文案对齐 P01，带 console.warn [ib-api]
 *
 * 不动：wantMeta 返回契约、思考/tools 开关、p07 的 thinking:{type:'disabled'} 语义、_errWantsCompletionParam 本体。
 * 纯函数 _apiDiagText 不接收 cfg，故天然不含 apiKey。
 */
module.exports={
  id:'p10',about:'接口诊断与请求优化',
  upstream:{repo:'Sui-IB/InternalBeyond',commit:'b0d7919d',bytes:2819874,sha256:'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6'},
  expectCount:6,
  /* 原有锚点：打完 p10 必须还在。
   * 注：p07 引入的 `if(cfg._noThink&&` 不在基线里，单独跑 p10 时基线没有它，挂上会让 --only p10 误报
   * （沿用 p07 文件头注释的既定约定：跨补丁引入的串由该补丁自己的 adds 守卫，这里不重复挂）。
   * 第三 guard 改用基线里 p07-4 落 thinking-disable 的请求体锚点 `if(cfg.temperature!=null)...`，
   * 证明 p10 没动到那段请求体构造。 */
  guards:[
    'async function callApi(cfg,userMsg,opts){',
    'async function saveCurrentApi(){',
    'if(cfg.temperature!=null)ob.temperature=cfg.temperature;'
  ],
  /* 新增锚点：证明本集真的落上了 */
  adds:[
    'function _apiDiagText(e){',
    '120000',
    '仅有思考字段'
  ],
  /* 人工验收清单（四列） */
  accept:[
    [
      '聊天/小助手失败可诊断：故意改错模型/断网/错密钥，文案含类别词＋状态码或厂商信息前120字',
      'API 页配一个坏模型 → 聊天发消息；断网再发',
      '失败文案含「模型名/地址/密钥/参数被拒/超时」类别词及 HTTP 状态码，不再是笼统「请求失败」',
      '把 p10-接口诊断与请求优化.js 移出 _patches\\ 后重跑 _driver.js'
    ],
    [
      '正式请求成功率优化：_callApiChatOnce 默认超时 120s；400 提 max_tokens 时换 max_completion_tokens 重试；content 数组/reasoning_content 兼容',
      '用 doubao 类中转配置聊天；mock 400 max_tokens 响应',
      '慢模型不再 60s 超时；400 max_tokens 自动换参数名重试成功；content 为数组时正确拼接；仅有 reasoning_content 时报「空回复（仅有思考字段）」',
      '同上'
    ],
    [
      '无泄密：console.warn [ib-api] 日志与复制错误区域不含 API Key 明文',
      '触发失败后看控制台',
      '日志前缀 [ib-api]，内容为错误 message，不含 Bearer/sk- 密钥',
      '同上'
    ],
    [
      'p01/p06/p07 共存：两级探活、小助手 catch 用 _apiDiagText、摘要 thinking:disabled 语义不变',
      '全链干跑 + 各单元测试',
      '_driver.js --dry 三层自检全绿；_test_p01_ping.js / _test_p06_water.js / _test_p10_api_diag.js 全过',
      '同上'
    ]
  ],
  patches:[
    /* ── P10-1 插入诊断函数 _apiDiagText（在 callApiChat 之前） ── */
    {
      label:'P10-1 插入纯函数 _apiDiagText(e)：错误分类成人话',
      old:String.raw`async function callApiChat(cfg,messages,opts){`,
      new:String.raw`/* p10 接口诊断：把错误对象分类成一句人话（展示层用）；纯函数，不接收 cfg，绝不改写原始 error.message */
function _apiDiagText(e){
  const msg=String((e&&e.message)||e||'');
  const sm=msg.match(/^(\d{3})[:\s]/);
  const status=sm?parseInt(sm[1],10):0;
  const body=sm?msg.slice(sm[0].length):msg;
  let m=String(body||'');
  try{const j=JSON.parse(body);if(j){if(j.error&&j.error.message)m=String(j.error.message);else if(j.message)m=String(j.message);else m=String(body||'')}}catch(_e){m=String(body||'')}
  if(/Failed to fetch|NetworkError|Load failed|CORS|跨域/i.test(msg)||(e&&e.name==='TypeError'))return '地址：无法连接，或该接口不允许浏览器跨域（CORS）';
  if(status===401||status===403)return '密钥：密钥无效、无权限或余额不足（HTTP '+status+'）'+(m?('——'+m.slice(0,80)):'');
  if(status===404)return /model/i.test(m)?('模型名：模型名不存在（HTTP 404）'+(m?('——'+m.slice(0,80)):'')):'地址：接口地址不存在（HTTP 404），请核对接口地址';
  if(status===429)return '请求：被限流或额度不足（HTTP 429）';
  if(status===400||status===422){
    if(/max[_-]?(completion[_-]?)?tokens/i.test(m))return '参数被拒：输出上限参数不被该端点接受（HTTP '+status+'）'+(m?('——'+m.slice(0,80)):'');
    if(/tools/i.test(m))return '参数被拒：tools 不被中转接受（HTTP '+status+'）'+(m?('——'+m.slice(0,80)):'');
    if(/fallbacks/i.test(m))return '参数被拒：fallbacks 不被中转接受（HTTP '+status+'）'+(m?('——'+m.slice(0,80)):'');
    if(/search|web_search/i.test(m))return '参数被拒：搜索参数不被中转接受（HTTP '+status+'）'+(m?('——'+m.slice(0,80)):'');
    return '参数被拒（HTTP '+status+'）——'+m.slice(0,120);
  }
  if(/超时|AbortError/i.test(msg)||(e&&e.name==='AbortError')){
    const sec=msg.match(/(\d+)\s*秒/);
    return sec?('请求超时（'+sec[1]+'秒），请检查网络连接或API服务状态'):'请求超时（请检查网络连接或API服务状态）';
  }
  if(status>=500)return '服务端错误（HTTP '+status+'）'+(m?('——'+m.slice(0,80)):'');
  if(/仅有思考字段/.test(msg))return msg;/* p10：思考字段专用诊断原样保留，不归一化成通用空文本 */
  if(/空文本|空回复|空内容/.test(msg))return '返回了空文本（HTTP 200）——响应里没有可用正文';
  return status?('其它（HTTP '+status+'）——'+m.slice(0,120)):('其它——'+msg.slice(0,120));
}
async function callApiChat(cfg,messages,opts){`
    },
    /* ── P10-2 _callApiChatOnce 默认超时 60s → 120s（4 行锚点唯一：流式版第 4 行是 const onChunk） ── */
    {
      label:'P10-2 _callApiChatOnce 默认超时 60000→120000',
      old:String.raw`  const maxTok=opts.maxTokens||4096;
  const timeoutMs=opts.timeoutMs||60000;
  const wantThink=!!opts.wantThinking;
  const pack=`,
      new:String.raw`  const maxTok=opts.maxTokens||4096;
  const timeoutMs=opts.timeoutMs||120000;/* p10：正式聊天默认超时 120s，慢模型不再 60s 误超时 */
  const wantThink=!!opts.wantThinking;
  const pack=`
    },
    /* ── P10-3 OpenAI 分支 return 兼容 content 数组 / 仅有思考字段 ── */
    {
      label:'P10-3 OpenAI 响应兼容：content 数组拼接；仅有 reasoning_content 给诊断',
      old:String.raw`  return pack((ch.message&&ch.message.content)||'',ch.finish_reason==='length');`,
      new:String.raw`  let _ctx=(ch.message&&ch.message.content);/* p10：content 可能是字符串/数组/null */
  if(Array.isArray(_ctx))_ctx=_ctx.map(function(pp){return typeof pp==='string'?pp:(pp&&pp.text||'')}).join('');/* p10：对齐 callApi 旧链，数组元素可能是裸字符串 */
  if(!_ctx){
    if((ch.message&&(ch.message.reasoning_content||ch.message.thinking)))throw new Error('空回复（仅有思考字段）：模型把输出用在了思考上，未返回正文（finish_reason: '+ch.finish_reason+'）');/* p10：reasoning_content 不得当成正文 */
    throw new Error('接口返回空文本（HTTP 200）——响应里没有可用正文'+(ch.finish_reason?'（finish_reason: '+ch.finish_reason+'）':''));/* p10：空正文给诊断 */
  }
  return pack(_ctx,ch.finish_reason==='length');`
    },
    /* ── P10-4 Anthropic + Gemini 两支 catch 超时文案带秒（expect 2；OpenAI 支已是带秒版不动） ── */
    {
      label:'P10-4 Anthropic/Gemini catch 超时文案带秒',
      expect:2,
      old:String.raw`}catch(e){clearTimeout(tm);if(e.name==='AbortError')throw new Error('请求超时');throw e}`,
      new:String.raw`}catch(e){clearTimeout(tm);if(e.name==='AbortError')throw new Error('请求超时（'+Math.round(timeoutMs/1000)+'秒），请检查网络连接或API服务状态');throw e}`
    },
    /* ── P10-5 放宽 max_tokens 参数名纠正触发条件（expect 2；不动 _errWantsCompletionParam 本体） ── */
    {
      label:'P10-5 追加更宽的 max_tokens→max_completion_tokens 触发条件',
      expect:2,
      old:String.raw`if(!tokenParam&&round===0&&_errWantsCompletionParam(e)){tokenParam='max_completion_tokens';_tokParamRemember(cfg);round--;continue}`,
      new:String.raw`if(!tokenParam&&round===0&&_errWantsCompletionParam(e)){tokenParam='max_completion_tokens';_tokParamRemember(cfg);round--;continue}
  if(!tokenParam&&round===0&&/^4(00|22)\b/.test(String(e&&e.message||''))&&/max[_-]?tokens/i.test(String(e&&e.message||''))&&/unknown|unsupported|unrecognized|invalid[^.]{0,24}(parameter|param)|不支持|未知参数|不允许的参数/i.test(String(e&&e.message||''))&&!/too\s+large|maximum|exceed|不能超过|不得超过|上限|at most|no more than|max_output|超出/i.test(String(e&&e.message||''))){tokenParam='max_completion_tokens';_tokParamRemember(cfg);round--;continue}/* p10：放宽 max_tokens 参数名纠正触发条件，覆盖 doubao 等中转的 400 文案 */`
    },
    /* ── P10-6 私聊发送外层 catch 用 _apiDiagText 替换硬编码分类（聊天面 A1） ── */
    {
      label:'P10-6 私聊发送外层 catch：errText 改用 _apiDiagText 分类 + console.warn [ib-api]',
      old:String.raw`    let errText='请求失败';
    if(err.message)errText=err.message;
    if(errText.includes('Failed to fetch')||errText.includes('NetworkError'))errText='无法连接到 API';
    if(errText.includes('401'))errText='API Key 无效';
    if(errText.includes('429'))errText='请求频率过高';
    toast(errText);`,
      new:String.raw`    let errText='请求失败：'+_apiDiagText(err);/* p10：聊天失败分类对齐 P01（地址/密钥/模型名/超时/参数/空回复/其它），带状态码与厂商信息前120字 */
    try{console.warn('[ib-api] 聊天请求失败：'+String((err&&err.message)||err))}catch(_e2){}
    toast(errText);`
    }
  ]
};
