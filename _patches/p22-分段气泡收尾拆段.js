/* 补丁清单 · P22 分段气泡收尾拆段（电脑端 `InternalBeyond.html`）
 *
 * 对应问题：API 设置「分段气泡显示」开时，实时回复在会话内始终不拆段，
 *           重进对话（历史加载）才拆 —— 上游 `_wsFinalizeBubble` 收尾只走
 *           `_renderSegments`，不走 `_renderAiContent` → `_bsSplit`。
 *           差分 loop 实测：干净基线 b0d7919d / 9ef2ed12 与补丁产物三跑同红 → 上游问题。
 * 上游依据：待发 issue + 参考实现 PR（Sui-IB/InternalBeyond）。
 * 依据版本：上游 `Sui-IB/InternalBeyond` `b0d7919d`（V2.7.5，2,819,874 B，sha256 a49fb343…8cbd6）
 *
 * ⚠️ 转义：锚点与产出代码一律用 String.raw。
 *
 * 本集共 4 处（同一根因家族：非全屏/收尾渲染没走 `_bsSplit`，或配套只盖全屏）：
 *   P22-1 收尾 finalize（全屏 + 小窗实时流式共用）：开关开 → `_renderAiContent`；
 *        小窗 TextNode 先归一出 `r-text` 容器。
 *   P22-2 小窗历史 `_buildMsgEl` 非全屏分支：开关开 → 归一 `r-text` 后走 `_renderAiContent`
 *        （与全屏历史同路径；原调用不传 wsResults，保持原样语义）。
 *   P22-3 小窗侧 `appendChatBubble`（群聊实时 / 非流式落定）：同 P22-2 手法。
 *   P22-4 CSS：分段消息隐藏消息级引用/删除的规则原只盖 `#page-chat`（全屏），
 *        小窗拆段后消息级「引用此消息」与段级「引用这一段」并存（双引用）→ 规则扩到
 *        `#chat-panel`，与全屏设计对齐（段级接管引用/删除）。
 *   P22-1~3 的 JS 分支一律 `_bsOn()` 守卫（关 = 原句）；P22-4 是纯 CSS 覆盖面补齐。
 *
 * 不动：流式 writers、`_bsSplit` 判定、全屏历史与全屏 append（本就拆）、群聊全屏侧、
 *      消息级 ★↻✏ 键的位置（全屏分段本就浮贴外层顶部，小窗对齐同款视觉）。
 */
module.exports = {
  id: 'p22', about: '分段气泡收尾拆段',
  upstream: { repo: 'Sui-IB/InternalBeyond', commit: 'b0d7919d', bytes: 2819874, sha256: 'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6' },
  expectCount: 5,
  /* 原有锚点：收尾函数、拆段渲染与切段入口都必须还在 */
  guards: [
    'function _wsFinalizeBubble(ref,rawText,wsResults){',
    'function _renderAiContent(textEl,container,text,wsResults){',
    'function _renderSegments(host,text,wsResults){',
    'var segs=_bsOn()?_bsSplit(text):null;'
  ],
  /* 新增锚点：证明 p22 真的落上了 */
  adds: [
    'var _te22=ref.txt;',
    'var _te22h=div.querySelector',
    'var _te22a=div.querySelector',
    'p22：分段气泡开时',
    '#chat-panel .chat-msg.bs-msg>.chat-msg-quote',
    '.bs-seg .bs-act{top:3px}'
  ],
  /* 人工验收清单（四列） */
  accept: [
    [
      '分段气泡开时实时拆段：AI 回复多段（空行分隔、每段不超 900 字），流式结束当下即拆成多个气泡',
      'API 设置勾「分段气泡显示」→ 全屏 Chat 发一条会多段回复的话',
      '说完立刻见多气泡，无需重进对话；对照未打补丁版：会话内始终单气泡、重进才拆',
      '把 p22-分段气泡收尾拆段.js 移出 _patches\\ 后重跑 _driver.js'
    ],
    [
      '关开关行为不变：走原 `_renderSegments` 整段渲染',
      '取消勾选「分段气泡显示」→ 再发一条多段回复',
      '单气泡整段显示，与补丁前一致',
      '同上'
    ],
    [
      '小窗（右下角聊天面板）实时收尾同样拆段：归一出 r-text 容器后与历史同结构',
      '开着小窗发一条多段回复',
      '小窗内说完当下拆成多气泡（与全屏同时各拆各的）',
      '同上'
    ],
    [
      '小窗历史也拆：重进对话后小窗内同样是多气泡（与全屏历史一致）',
      '刷新/重开对话，再打开右下角小窗',
      '小窗内该条为多气泡；关开关则与补丁前一致（单气泡）',
      '同上'
    ],
    [
      '群聊小窗（appendChatBubble 路径）同样拆段；带 ws 指令的回复操作卡仍按序落在末段',
      '群聊里发一条多段回复（开着小窗）；1对1 发一条带文件/工具指令的话',
      '小窗群聊回复拆段；操作卡出现在末段且可点',
      '同上'
    ],
    [
      '小窗分段消息不出现双引用：消息级「引用此消息」与「✕」随 bs-msg 隐藏，由段级「引用这一段」「✕」接管（与全屏一致）',
      '小窗里 hover 分段消息的段',
      '只有一组引用键（tooltip「引用这一段」在段内右上）；不再同时出现「引用此消息」',
      '把 p22-分段气泡收尾拆段.js 移出 _patches\\ 后重跑 _driver.js（回退后小窗不拆段，本条随之消失）'
    ]
  ],
  patches: [
    /* ── P22-1 收尾 finalize 按分段开关走拆段渲染 ── */
    {
      label: 'P22-1 收尾 finalize 分段开关开时走 _renderAiContent 拆段',
      old: String.raw`  var mode=_mdMode();
  if(mode==='full'||mode==='partial'){ref.div.classList.add('md-rendered')}
  _renderSegments(ref.isTextNode?_panelMdHost(host):host,rawText,wsResults);
}`,
      new: String.raw`  var mode=_mdMode();
  if(mode==='full'||mode==='partial'){ref.div.classList.add('md-rendered')}
  if(_bsOn()){/* p22：分段气泡开时，实时收尾与历史加载走同一拆段渲染（_renderAiContent → _bsSplit → .bs-seg）；小窗 TextNode 先归一出 r-text 容器；关开关走原路径不变 */
    var _te22=ref.txt;
    if(ref.isTextNode){_te22=ref.div.querySelector(':scope>.r-text');if(!_te22){_te22=document.createElement('div');_te22.className='r-text';ref.div.appendChild(_te22)}}
    _renderAiContent(_te22,ref.div,rawText,wsResults);
  }else{_renderSegments(ref.isTextNode?_panelMdHost(host):host,rawText,wsResults)}
}`
    },

    /* ── P22-2 小窗历史 _buildMsgEl 非全屏分支 ── */
    {
      label: 'P22-2 小窗历史按分段开关拆段（归一 r-text 后与全屏历史同路径）',
      old: String.raw`    if(!isUser){
      var _pm2=_mdMode();if(_pm2==='full'||_pm2==='partial')div.classList.add('md-rendered');
      if((m.friendId||'').startsWith('group_')&&m.senderName){var _sn9=document.createElement('div');_sn9.className='chat-msg-sender';_sn9.textContent=m.senderName;div.appendChild(_sn9)}
      var _pv9=_vbStripD(m.content);_renderSegments(_panelMdHost(div),_pv9.text);_vbMountD(div,null,_pv9.vb,_pv9.text);/* v112：面板同样剥 <ibvoice> 出条 */`,
      new: String.raw`    if(!isUser){
      var _pm2=_mdMode();if(_pm2==='full'||_pm2==='partial')div.classList.add('md-rendered');
      if((m.friendId||'').startsWith('group_')&&m.senderName){var _sn9=document.createElement('div');_sn9.className='chat-msg-sender';_sn9.textContent=m.senderName;div.appendChild(_sn9)}
      var _pv9=_vbStripD(m.content);/* p22：小窗历史按分段开关拆段（归一 r-text 后与全屏历史同路径；保持原不传 wsResults 的语义） */
      if(_bsOn()){var _te22h=div.querySelector(':scope>.r-text');if(!_te22h){_te22h=document.createElement('div');_te22h.className='r-text';div.appendChild(_te22h)};_renderAiContent(_te22h,div,_pv9.text);_vbMountD(div,null,_pv9.vb,_pv9.text)}
      else{_renderSegments(_panelMdHost(div),_pv9.text);_vbMountD(div,null,_pv9.vb,_pv9.text)}/* v112：面板同样剥 <ibvoice> 出条 */`
    },

    /* ── P22-3 小窗侧 appendChatBubble（群聊实时 / 非流式落定） ── */
    {
      label: 'P22-3 小窗 appendChatBubble 按分段开关拆段',
      old: String.raw`      if(!isUser){
        var _acm2=_mdMode();if(_acm2==='full'||_acm2==='partial')div.classList.add('md-rendered');
        if((activeFriendId||'').startsWith('group_')&&senderName){var _sn9=document.createElement('div');_sn9.className='chat-msg-sender';_sn9.textContent=senderName;div.appendChild(_sn9)}/* v97 */
        var _pv9=_vbStripD(text);_renderSegments(_panelMdHost(div),_pv9.text,wsResults);_vbMountD(div,null,_pv9.vb,_pv9.text);/* v112 */
      }else if(voice){`,
      new: String.raw`      if(!isUser){
        var _acm2=_mdMode();if(_acm2==='full'||_acm2==='partial')div.classList.add('md-rendered');
        if((activeFriendId||'').startsWith('group_')&&senderName){var _sn9=document.createElement('div');_sn9.className='chat-msg-sender';_sn9.textContent=senderName;div.appendChild(_sn9)}/* v97 */
        var _pv9=_vbStripD(text);/* p22：小窗 append 同样按分段开关拆段（归一 r-text 后同路径） */
        if(_bsOn()){var _te22a=div.querySelector(':scope>.r-text');if(!_te22a){_te22a=document.createElement('div');_te22a.className='r-text';div.appendChild(_te22a)};_renderAiContent(_te22a,div,_pv9.text,wsResults);_vbMountD(div,null,_pv9.vb,_pv9.text)}
        else{_renderSegments(_panelMdHost(div),_pv9.text,wsResults);_vbMountD(div,null,_pv9.vb,_pv9.text)}/* v112 */
      }else if(voice){`
    },

    /* ── P22-4 CSS：分段消息隐藏消息级引用/删除的规则扩到小窗 ── */
    {
      label: 'P22-4 分段消息隐藏规则扩到小窗（消除双引用）',
      old: String.raw`#page-chat .chat-msg.bs-msg>.chat-msg-del,#page-chat .chat-msg.bs-msg>.chat-msg-quote{display:none}`,
      new: String.raw`#page-chat .chat-msg.bs-msg>.chat-msg-del,#page-chat .chat-msg.bs-msg>.chat-msg-quote,#chat-panel .chat-msg.bs-msg>.chat-msg-del,#chat-panel .chat-msg.bs-msg>.chat-msg-quote{display:none}/* p22：小窗分段消息同样隐藏消息级引用/删除，由段级键接管（原规则只盖全屏） */`
    },

    /* ── P22-5 CSS：段级键顶对齐消息级键（消 2px 垂直错位，五键一条线） ── */
    {
      label: 'P22-5 段级键 top 对齐消息级（消 2px 错位）',
      old: String.raw`.bs-seg .bs-act{position:absolute;top:5px;right:6px;display:flex;gap:3px;opacity:0;transition:opacity 0.2s}`,
      new: String.raw`.bs-seg .bs-act{position:absolute;top:5px;right:6px;display:flex;gap:3px;opacity:0;transition:opacity 0.2s}
.chat-msg .r-text.bs-split .bs-seg .bs-act{top:3px}/* p22：段级键顶与消息级键（top:4＋段边框1）对齐，五键同框一条线 */`
    }
  ]
};
