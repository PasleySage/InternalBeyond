/* 补丁清单 · P07 摘要关思考与真因（电脑端 `InternalBeyond.html`）
 *
 * 对应方案：`.scratch\ib-summary-patch\Windows与手机合并方案-issue5.md（该 effort 在手机端工作区）`
 * 派活单：`.scratch\ib-summary-patch\派活-摘要p07.md`
 * 上游依据：`Sui-IB/InternalBeyond-Mobile#5` ＋ 参考实现 PR #6（手机端 `fix-r6` 已修）
 * 依据版本：上游 `Sui-IB/InternalBeyond` `b0d7919d`（V2.7.5，2,819,874 B，sha256 a49fb343…8cbd6）
 *
 * ⚠️ 转义：锚点与产出代码一律用 String.raw。
 *
 * 本集共 8 处（W8 抛错文案作 guards 保留，不改；W3 Anthropic 关思考默认不做）：
 *   P07-1  W7 新增模块级 `_sumLastErr` ＋ generateSummary 入口清空
 *   P07-1b P4 无 Key 人话文案（generateSummary 入口，会 toast 的失败路径）
 *   P07-2  W1 摘要 cleanCfg 打标 `_noThink:true`（侵入最小：cfg 临时字段，聊天路径永不带）
 *   P07-3  W6+W7 `!result` 补写真因（不再恒为默认文案）；catch 写入 `_sumLastErr`
 *   P07-4  W2 OpenAI 兼容请求体：仅 DeepSeek 目标下发 thinking:{type:'disabled'}
 *   P07-5  W4 并发早退补文案
 *   P07-6  W5 无料可摘补文案
 *   P07-7  P4 未启用人话文案（_doSummarize 入口；自动路径已前置检查 enabled，到不了这里）
 *
 * 不动：聊天主链 callApiChat/callApiChatStream、摘要窗口/覆盖/触发、`_sumFailCdD`、备份与数据表。
 */
module.exports = {
  id: 'p07', about: '摘要关思考与真因',
  upstream: { repo: 'Sui-IB/InternalBeyond', commit: 'b0d7919d', bytes: 2819874, sha256: 'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6' },
  expectCount: 7,
  /* 原有锚点：打完补丁必须还在（含 W8 空正文三支抛错文案、callApi 签名）。
   * 注：p01 的 `id="api-ping-btn"` 由 p01 自己的 adds 守卫，这里不重复挂 ——
   * 方案 §三「若已应用」：单独跑 p07 时基线还没有它，挂上会让 --only p07 误报。 */
  guards: [
    'async function callApi(cfg,userMsg,opts){',
    "if(/sensitive|content_filter/i.test(_fr))throw new Error('内容被该服务商的安全策略拦截（finish_reason: '+_fr+'），未生成正文；请调整措辞后重试');",
    "if(_fr==='length')throw new Error('输出上限耗尽而正文为空（finish_reason: length）'+(_ch.message?.reasoning_content?'——模型把输出预算用在了思考上':'')+'；请换用非思考型号，或联系服务商确认该模型的输出限制');",
    "throw new Error('API 返回了空内容'+(_fr?'（finish_reason: '+_fr+'）':'')+'，请稍后重试');",
    'async function generateSummary(cfg,prevSummary,newMessages,charLimit,names){',
    'async function maybeSummarize(cfg,friendId,threadId,allMsgs){'
  ],
  /* 新增锚点：证明本集真的落上了 */
  adds: [
    '_sumLastErr',
    '摘要正在整理中',
    '暂时没有要补的内容'
  ],
  /* 人工验收清单（四列） */
  accept: [
    [
      '摘要请求显式关思考：DeepSeek 目标请求体带 thinking:{type:"disabled"}；其它服务商不加字段',
      '摘要专用 API 指向 DeepSeek 默认思考型号 → 触发自动摘要',
      '摘要写出；Token 台账输出 ≪ 4096（对照：未修时固定顶满）',
      '把 p07-摘要关思考与真因.js 移出 _patches\\ 后重跑 _driver.js'
    ],
    [
      '空正文真因直达：finish=length 说「思考吃光预算」；安全策略/空内容各自如实；并发/无料可摘不再静默',
      '对照坏地址/坏 Key；连点两次摘要（并发早退）',
      '提示为分类真因，不是「未收到有效回复」；并发提示「正在整理中」；toSummarize<2 时提示「已是最新」（默认触发数=10 时该支几乎不可达，属防御文案）',
      '同上'
    ],
    [
      '聊天主链不受影响：普通对话请求体不带 thinking:{type:"disabled"}',
      '随便聊几句，抓包或看网络面板请求体',
      '聊天请求体无 thinking 字段；对话正常',
      '同上'
    ]
  ],
  patches: [
    /* ── P07-1  W7 真因暂存变量 ── */
    {
      label: 'P07-1 W7 _sumLastErr 模块变量＋入口清空',
      old: String.raw`async function generateSummary(cfg,prevSummary,newMessages,charLimit,names){
  const SUMMARY_CHAR_LIMIT=charLimit||600;`,
      new: String.raw`let _sumLastErr='';/* p07 W7：真因暂存，每次尝试前清空（对齐手机端 _sumLastErrM） */
async function generateSummary(cfg,prevSummary,newMessages,charLimit,names){
  _sumLastErr='';/* p07 W7：防读到上一次陈旧原因 */
  const SUMMARY_CHAR_LIMIT=charLimit||600;`
    },
    /* ── P07-1b  P4 无 Key 人话 ── */
    {
      label: 'P07-1b P4 无 Key 人话文案（generateSummary 入口）',
      old: String.raw`  _sumLastErr='';/* p07 W7：防读到上一次陈旧原因 */
  const SUMMARY_CHAR_LIMIT=charLimit||600;`,
      new: String.raw`  _sumLastErr='';/* p07 W7：防读到上一次陈旧原因 */
  if(!cfg||!cfg.apiKey){toast('摘要生成失败：摘要用的 API 没填 Key，去 API 页补上就能用');return null}/* p07 P4：无 Key 给一句人话，替代 Bearer undefined 的 401 */
  const SUMMARY_CHAR_LIMIT=charLimit||600;`
    },
    /* ── P07-2/4  关思考已由上游 _dsThinkOffD + opts.noThink 承担（定案：按上游，本地不叠） ── */
    /* ── P07-3  W6+W7 真因贯通 ── */
    {
      label: 'P07-3 W6+W7 !result 补写真因；catch 写入 _sumLastErr',
      old: String.raw`    if(!result){toast('摘要生成失败：未收到有效回复');return null}
    let text=result.trim();`,
      new: String.raw`    if(!result){_sumLastErr=_sumLastErr||'API 返回了空内容（模型未输出正文），请换型号或稍后再试';toast('摘要生成失败：'+_sumLastErr);return null}/* p07 W6：!result 补写真因 */
    let text=result.trim();`
    },
    {
      label: 'P07-3b catch 写入 _sumLastErr（不吞 e.message）',
      old: String.raw`  }catch(e){toast('摘要生成失败：'+(e.message||'API 无法连接'));return null}`,
      new: String.raw`  }catch(e){_sumLastErr=String((e&&e.message)||e)||'API 无法连接';toast('摘要生成失败：'+_sumLastErr);return null}/* p07 W7 */`
    },
    /* ── P07-5  W4 并发早退 ── */
    {
      label: 'P07-5 W4 并发早退补文案',
      old: String.raw`async function maybeSummarize(cfg,friendId,threadId,allMsgs){
  if(_summarizing)return null;_summarizing=true;`,
      new: String.raw`async function maybeSummarize(cfg,friendId,threadId,allMsgs){
  if(_summarizing){toast('摘要正在整理中，稍等十几秒再点一次');return null}/* p07 W4 */_summarizing=true;`
    },
    /* ── P07-6  W5 无料可摘 ── */
    {
      label: 'P07-6 W5 无料可摘补文案',
      old: String.raw`  if(toSummarize.length<2)return existing?existing.summary:null;`,
      new: String.raw`  if(toSummarize.length<2){toast('摘要已是最新：暂时没有要补的内容（再聊多些，会自动跟上）');return existing?existing.summary:null}/* p07 W5 */`
    },
    /* ── P07-7  P4 未启用人话 ── */
    {
      label: 'P07-7 P4 摘要未启用人话文案（_doSummarize 入口）',
      old: String.raw`async function _doSummarize(cfg,friendId,threadId,allMsgs){
  const ss=await getSummarySettings();if(!ss.enabled)return null;`,
      new: String.raw`async function _doSummarize(cfg,friendId,threadId,allMsgs){
  const ss=await getSummarySettings();if(!ss.enabled){toast('对话摘要没有开启：API 页 → 全局设置 → 对话摘要 里打开');return null}/* p07 P4：未启用给一句人话；自动路径已前置检查 enabled，到不了这里 */`
    }
  ]
};
