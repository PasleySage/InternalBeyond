/* p06-小助手.js
 * 票 06：说明书页内「小助手」——不翻说明书就能问「某功能在哪、怎么用」，
 * 按内嵌的《电脑端说明书》正文回答，并能替用户打开某一页（navTo / 滚动到小节）。
 * 只做问答层：① 按说明书正文回答；② 替你打开某一页。
 * 不做：替你改设置、撤销栈（本期明确不做，被问起要如实说）。
 * 回答用 API 与聊天分开可配：选择落在 apiSettings 行 id='wsA_cfg' / app='wsA'，
 *   复用全局 callApiChat(cfg,messages)，完全不碰 activeFriendId / 聊天记录。
 * 知识源＝内嵌说明书 + 运行时取 #guide-modules（功能模块）；叙事/思考块不用；
 *   应用内 Guide 是艺术写作，禁用；手机端说明书禁用（会教出说假话的助手）。
 *
 * ⚠️ 锚点与产出代码一律 String.raw；产出代码内不用模板字符串/反引号（沿用 p01–p05 纪律，
 *   普通字符串用单引号 + 拼接），避免与外层 String.raw 嵌套踩转义。
 */
module.exports={
  id:'p06',about:'小助手',
  upstream:{repo:'Sui-IB/InternalBeyond',commit:'b0d7919d',bytes:2819874,sha256:'a49fb343e69771e0ebf79d57e4c374c3e5b432db11e988c984cc30fc6eb8cbd6'},
  expectCount:2,
  /* 原有锚点：打完 p06 必须还在（基线锚点；跨补丁共存由全链闸门与本集测试静态核对） */
  guards:[
    'function toast(m){',/* 挂载点原位 */
    'function navTo(page){',/* 打开页面用 */
    'async function callApiChat(cfg,messages,opts){',/* 独立回答复用，未被改 */
    'A PERSONAL DIGITAL SANCTUARY'/* guide-header 原位 */
  ],
  /* 新增锚点：证明本集真的落上了（p14：入口从 guide-header 挪到右下角 fab-dock） */
  adds:[
    'id="ws-a-fab"',/* fab-dock 入口 */
    'p15：fab 去字贴邻居',/* p15：fab 去字贴邻居 */
    '(function(){/* p06：小助手',/* 主 IIFE */
    'function _wsAParse(',/* 跳转标记解析 */
    'function _wsADoOpen(',/* 打开页面 */
    'function _wsADoSet(',/* p18：改设置 */
    'function _wsARun(',/* p18：run 动作 */
    '_wsAUndoStack',/* p18：撤销栈 */
    "className='ws-a-act'",/* p18：动作行样式 */
    "[[set:",/* p18：动作标记 */
    "id:'wsA_cfg'",/* 独立回答 API 选择存储 */
    "app:'wsA'",
    "css.id='p06-ws-a-css'",/* 样式 */
    'ib_helper_hist',/* p19：对话持久化 localStorage 键 */
    'id="ws-a-clr"',/* p19：清空按钮 */
    'id="ws-a-qrow"',/* 常用问题文字签行 */
    '执笔 API — 小助手用哪个 API 回答'/* API 选择弹出菜单标题 */
  ],
  /* 人工验收清单（四列） */
  accept:[
    [
      '右下角底栏日历左侧多一枚小助手纯图标入口，与日历/电话同一光学重量，无 Guide 字样；悬停/点击反馈与邻居一致；点开是对话小窗；Guide 标题区不再出现旧版问询胶囊按钮',
      '看右下角底栏 → 点该入口',
      '纯图标、无文字标签；悬停无额外光斑、反馈与邻居一致；弹出窗题为「小助手」的对话窗，可输入、可关闭',
      '把 p06-小助手.js 移出 _patches\\ 后重跑 _driver.js，入口与窗口全部消失'
    ],
    [
      '按说明书正文回答：只依据内嵌的电脑端说明书；问电脑端确有的功能（如收藏夹、连接测试、精细文件工具）答得与说明书一致；问手机端独有功能如实说电脑端暂无',
      '问「怎么收藏一条消息」；再问「锁屏怎么设」',
      '前者答出悬停星钮/纸墙/按好友等说明书内容；后者答「电脑端暂无锁屏」，不编造入口',
      '同上'
    ],
    [
      '替你打开某一页（p13 起改「点击才去」）：回答带跳转标记时窗口保持打开、气泡下出现「去<页名> →」跳转键；用户点击才 navTo 并关窗；说明书内小节点击后滚动定位',
      '问「摘要在哪里看」（回答带 [[open:api]]）；再问「音乐播放器怎么控制」',
      '答案完整留在窗内、不自动切页/关窗；点「跳转 →」才切到 API 页并关窗；或停在 Guide 滚动到音乐播放器小节',
      '同上'
    ],
    [
      '动作边界：问「帮我把表情包打开」时走 p18 设置表白名单可改并回显；表外/密钥/人设等明确拒绝并指路',
      '问「帮我把表情包打开」',
      '回答说明本期不能替你改设置/开关，只告诉你在哪改；不真的去改',
      '同上'
    ],
    [
      '独立配置：右上角文字签单独选「回答用的接口」，与聊天用的好友 API 分开；切换后只影响小助手回答，不影响聊天',
      '在小助手窗口右上角文字签选一个 API；再去聊天页发消息',
      '小助手用所选接口回答；聊天仍用原来的好友，互不影响',
      '同上'
    ]
  ],
  patches:[
    /* ── P06-1 guide-header 入口还原（p14：入口挪到 fab-dock；此处恒等替换，不再插按钮） ── */
    {
      label:'P06-1 guide-header 还原（p14：入口挪到 fab-dock）',
      old:String.raw`      <p>A PERSONAL DIGITAL SANCTUARY — CRAFTED BY SUI & CLAUDE</p>
    </div>`,
      new:String.raw`      <p>A PERSONAL DIGITAL SANCTUARY — CRAFTED BY SUI & CLAUDE</p>
    </div>`
    },
    /* ── P06-2 主 IIFE：知识源内嵌 + 系统提示 + 面板 + 独立 API + 跳转（锚 toast 函数尾） ── */
    {
      label:'P06-2 整段 IIFE：小助手问答窗 + 内嵌说明书知识源 + 独立 API 选择 + 打开页',
      old:String.raw`function toast(m){let s=document.getElementById('toast-stack');if(!s){s=document.createElement('div');s.id='toast-stack';s.className='toast-stack';document.body.appendChild(s)}while(s.children.length>=4){s.firstChild.remove()}const t=document.createElement('div');t.className='toast';t.textContent=m;s.appendChild(t);setTimeout(()=>t.remove(),2800)}`,
      new:String.raw`function toast(m){let s=document.getElementById('toast-stack');if(!s){s=document.createElement('div');s.id='toast-stack';s.className='toast-stack';document.body.appendChild(s)}while(s.children.length>=4){s.firstChild.remove()}const t=document.createElement('div');t.className='toast';t.textContent=m;s.appendChild(t);setTimeout(()=>t.remove(),2800)}
(function(){/* p06：小助手——说明书问答层；知识源=内嵌电脑端说明书正文；回答用 API 独立可选；只答+打开页，不改设置 */
'use strict';
/* ── 知识源：docs/说明书-电脑端.md 全文（唯一知识源；应用内 Guide 是艺术写作，禁用）── */
const _wsAMANUAL=[
'# 电脑端说明书（知识源 · 截至 2026-09-28 · 上游 V2.7.5）',
'',
'用途：p06 小助手的唯一知识源。回答只允许依据本文件正文；禁止改用手机端说明书或应用内 Guide（Guide 是艺术写作）。只写电脑端真实存在的功能；手机端独有（锁屏、Desk、AI 付等）一律不写。',
'',
'## 0. 小助手能为你做什么（预设问题总答）',
'本文件是小助手（说明书问答）的唯一知识源。问「某个功能在哪、怎么用」会按正文答；也会：',
'1. 答功能位置与步骤（页名 → 卡片/按钮中文名 + 编号步骤）。',
'2. 打开那一页：回答里带跳转键时，点「去××」即可。',
'3. 改设置（当次会话可撤销）：对话摘要、Presence、Sing、AI 控制播放器、表情包与颜文字、精细文件工具、每个 API 的功能开关、AI 读取范围。说「设置清单」可列当前值。',
'4. 不能做：进 TA 对话、发消息、看聊天记录；不改密钥/人设/记忆条目/备份/聊天记录/图片素材。',
'常见预设问题：你是谁 / 你能做什么（即本节）/ 设置清单（本地列现值）/ 精细文件工具（DIY→文件解析库→启用）/ 三种注入方式（API 功能设置→Auto Memory：hybrid 混合、retrieval 纯语义检索、full 全量；见 4.3）/ 备份（API 页→数据区→导出备份）/ 导入聊天记录（导航栏 Import→官方聊天记录；见 9）/ 接中转站（见 4.2）/ 表情包（颜文字常开；表情包 DIY 开关+管理）。',
'',
'## 1. 这是什么',
'Internal Beyond 电脑端是单文件网页应用（InternalBeyond.html）：纯前端、数据存在浏览器本机（IndexedDB + localStorage），无后端。可离线使用；接大模型需在 API 页自备接口配置。',
'两条 Chat 界面是同一套数据、两套 UI：全屏页（导航栏→Chat）与浮动小窗（右下角聊天面板）。共读学习室的停靠 dockTo 不是这两种形态的切换。',
'',
'## 2. 页面一览（导航栏）',
'Guide=世界观与叙事向说明（不是操作说明书）；Profile=角色/档案；Blog=日志；Room=像素风互动空间；Chat=AI 多端口聊天；Letters=信件；Memory=长期记忆库；API=大模型接口配置；DIY=进阶工具与外观。顶部左侧站点图标与名称可返回主页。',
'',
'## 3. Chat 聊天',
'### 3.0 V2.7.4 新增（上游）',
'- 社交圈名称：原 Circle，现叫 Beyond（API 编辑器「Beyond 权限」；右下角入口标签 Beyond）。',
'- 手机端专属操作卡：从手机备份导入的聊天里，控制手机/查岗/付款/闹钟等画成操作卡，电脑端只展示不执行；点开可看步骤与回执。',
'- 视频卡片：手机端生成的视频导入后是拍立得卡片（封面/播放/时长/查看提示词）。视频本体在「本机媒体库」；导出备份可勾「连本机媒体库一起导出」。设置底部可「清空本机视频」。',
'- Blog 可改可读：TA 可写日志（正文上限 10000 字），也可改自己写过的（按标题找，整篇替换或改标题）。',
'- ICode 删文件：TA 可请求删除文件，每次都需你点「确认删除」（不可恢复）。',
'- 备份跨端：导出带 origin 标记；导入手机备份时会保留本机电脑端设置，不会被手机旧副本覆盖。',
'- 传统节日提醒：默认改为开（已手动关过的仍关着）。',
'- 摘要：「经过 + 确认下来的」两段式；回看窗口字数上调（60 条约 700 字）。',
'- 记忆写入：可标 resolved（已解决/未解决）。',
'### 3.1 对话',
'- 选择好友/配置后发消息；支持文字、附件、语音条（若已配置）。',
'- 消息可引用、修改、删除（悬停出现操作键）。',
'- 群聊与一对一是不同会话形态；群聊可管理成员、Save Memory 等（顶栏按钮）。',
'### 3.2 收藏一条消息【本地补丁 p05】',
'- 收藏：悬停消息→点星形收藏键（与引用/修改同列）。',
'- 打开收藏夹：全屏 Chat 顶栏 ICode 旁的星钮，或小窗顶栏名字右侧的星钮。',
'- 面板是按好友分存的纸墙；左右切换好友；标题为「XX的收藏夹」。',
'- 搜索：放大镜展开输入框；可搜正文、署名、频道名。',
'- 长文默认折叠，点右下角折角展开。',
'- 移除：纸右上角×→确认，只删收藏，不动原聊天消息。',
'- 只存引用与文字；语音/图片按原消息回看；原消息删了仍留文字稿。',
'- 收藏随导出备份往返；导入后仍在。',
'注意：记忆页的 ★/◐/○ 是记忆优先级，不是收藏。',
'### 3.3 表情包与颜文字【本地补丁 p04】',
'颜文字（始终可用）：输入条附件按钮旁点笑脸→八组预设→点一枚插到光标处；可自加本机颜文字，自加的可删（预设不可删）。',
'表情包（需在设置打开，默认关）：DIY/设置区开开关→管理表情包建预设上传图片；每枚必填名字、用法（名字≤12、描述≤60、用法≤80），每套最多10枚；点一枚再发送气泡出图；对方（TA）收到的是叙述句不是图片；开关开时 TA 每条回复最多发1枚。图片只存本机，随备份往返。',
'### 3.4 播放器与一起听/Sing【本地补丁 p02】',
'- Sing/一起听：开启后播放中每条消息带正在听什么（单向注入）。',
'- 允许 AI 控制播放器（默认关）：设置区 Music/Presence 组。开启后 TA 可用指令播放/暂停/上一首/下一首（仅本机本地曲库），不碰音量、歌单管理、在线音源；与 Sing 相互独立。',
'',
'## 4. API 页（接大模型）',
'### 4.1 怎么配',
'1. 打开 API 页 → 新建或编辑一份配置。',
'2. 服务商：官方 OpenAI / Claude / Gemini / DeepSeek 等，或自定义（中转站）。',
'3. 填接口地址、API Key、模型名（三项都要与服务商/中转站说明一致）。',
'4. 点「测试连接」【本地补丁 p01】看是否连通及失败分类。',
'5. 回聊天：顶部选中这位 TA / 该配置，即可对话。',
'### 4.2 中转站怎么填、连不上怎么排查（高频）',
'填写：服务商选自定义；接口地址必须填到完整路径，形如 https://某站.com/v1/chat/completions，不要只填域名；密钥=中转站的 Key；模型名=中转站模型 id（常带厂商前缀，以站点列表为准）；提示缓存/思考链可先关再试。',
'排查：① 点「测试连接」看分类（地址/密钥/模型名/参数被拒/超时/限流/服务端错误）；② 地址是否完整路径、是否允许浏览器跨域；③ 密钥是否完整有效有余额；④ 模型名是否与中转列表逐字一致；⑤ 参数被拒可关思考链/提示缓存；⑥ 超时稍后重试（聊天默认 120 秒）。',
'### 4.3 Auto Memory 的三种注入方式有什么区别？',
'在每个 API 的功能设置里，Auto Memory 三选一：hybrid（混合，默认）= always 常驻 + 其余语义浮现，日常用；retrieval（纯语义检索）= 只在需要时检索，省 Token；full（全量注入）= 可见记忆尽量全带，要最全用。同处可设档案字数上限（约 300–6000 字）。',
'',
'## 5. 文件与工作区（ICode）',
'- ICode 工作区：创建/读取/修改/生成文件，可运行环境支持的代码；操作以卡片出现在聊天里。',
'- 附件：聊天可上传文本类附件；解析库开启后可读 PDF/DOCX/XLSX 等（见 DIY）。',
'- 精细文件工具【本地补丁 p03，默认关，只读】：DIY→文件解析库卡→勾选启用；三档附件正文上限（省15000/均衡30000/全读120000字符）；开启后 TA 可检索工作区与本会话附件（至多20处「路径:行号+前后文」）、看目录、按行读段；只读不改文件。',
'',
'## 6. 对话摘要【本地补丁 p07】',
'### 在哪里',
'导航栏 → API 页 → 向下找到标题为「对话摘要」的卡片（与 API 配置同页，不在 DIY）。',
'### 怎么开启（逐步）',
'1. 打开 API 页。',
'2. 滚动到「对话摘要」卡片。',
'3. 勾选「启用对话摘要」（#api-summary-toggle，改动即时保存）。',
'4. 按需设置「摘要覆盖范围」下拉：默认「只保留近期 N 条，其余交给摘要」；可选「上下文之外」。',
'5. 同卡片设置「近期消息保留条数」：3 / 6（默认）/ 10 / 20 / 30 / 60；仅在「只保留近期」模式下生效。',
'6. 「摘要生成 API」：默认「跟随对话 API」；可另选一份更廉价的模型以省开销。',
'6b. 「摘要回看窗口」：默认 60 条（约 700 字）；可选 100 条（约 1000 字）、200 条（约 1500 字）。',
'7. 说明：开启后每 10 条新消息会触发一次摘要生成（消耗少量额外 Token）；摘要作后台参考注入，AI 不会向你复述摘要内容。',
'### 开启后怎样触发',
'- 自动：打开某个好友/群聊/话题时，若已启用且旧消息超过保留范围，会自动压缩成摘要笔记。',
'- 手动：在对话里使用摘要相关操作（若界面提供「更新/整理摘要」一类按钮则点该按钮）；连点会提示「正在整理中」。',
'- 摘要笔记会按消息频率更新写入，用于减少长对话幻觉。',
'### 失败时',
'会给出分类原因（思考吃光输出预算、安全策略、空内容、并发整理中、暂无新内容等），而不是笼统「未收到有效回复」。摘要请求对 DeepSeek 等会显式关闭思考，以降低无效 Token。',
'回答此类问题时必须写出：API 页 →「对话摘要」卡片 →「启用对话摘要」，并给上述步骤；禁止只说「在设置里启用、以界面为准」。',
'',
'## 7. DIY 页',
'外观/主题；文件解析库（开关各文档解析、DOCX 图片上限、单文件注入上限、精细文件工具）；表情包与颜文字开关与管理；外部工具/MCP（HTTP 或 MCP，可要求调用前确认）；其它进阶项打开 DIY 页查看各卡片标题与说明文字。',
'',
'## 8. Memory 长期记忆库',
'- 保存长期记忆条目；可编辑、可设优先级。',
'- 优先级：★ always / ◐ normal / ○ low——影响注入权重，不是消息收藏。',
'- Save Memory 在 Chat 顶栏，用于把当前对话内容存入记忆。',
'',
'## 9. 备份与数据',
'- 导出/导入备份：导出本机主要数据（含聊天、设置、收藏等）。',
'- 官方聊天记录导入（V2.7.5 新增）：导航栏 Import → 顶部切「官方聊天记录」。可读 ChatGPT/Claude 官方导出（zip 或 conversations.json）、其它 JSON/JSONL、逐行 .txt（填日期范围把时间均匀排上）。选一位好友后默认自动分频道（每个对话窗口各建一个话题频道，认不出的并进以文件名命名的频道），也可选「并入主线」；重复导入自动跳过；图片与附件只留占位、工具调用不导入；「最近导入」可一键撤销（连带删掉那次的消息与频道）。全程本机完成，不联网。',
'- 数据默认只在本机浏览器；换浏览器或清站点数据会丢失，请定期导出。',
'- 同一浏览器多标签打开同一应用共用同一本地数据库，避免同时多开写入。',
'',
'## 10. 电脑端没有的功能（勿向用户承诺）',
'以下在手机端有、电脑端没有（截至本说明书）：锁屏、Desk 桌面、AI 付、定时推送/勿扰与通知权限那一套 Presence、闹钟/计时器、蓝牙相关能力。若用户问起，应说明电脑端暂无，不要编造入口。',
'小助手（p06/p18）能按本说明书回答、替你打开某一页，并能直接改下面这些 IB 电脑端实有的开关（改完逐条回显、可撤销）：对话摘要与 Presence / Sing、AI 控制播放器、表情包与颜文字、精细文件工具、每一个 API 的十二项功能开关、AI 读取范围。改不了的（密钥/人设/记忆条目/备份/聊天记录/图片素材，以及手机端独有的视觉一整套 ui.*、权限 perms.*、定时推送、美化包、自制 APP、探针）如实说边界、一句话指路。',
'本线不做手机端的「缓存探针/图片探针」，也不能替你进 TA 对话、发消息、看聊天记录。'
].join('\n');
/* ── p18：【设置表】合法 path 文档（提示词用；唯一合法集合，表外一律拒绝）── */
const _wsA_PATHDOC=
'分组 摘要/Presence/Sing（在 API 页）：\n'
+'  sum.enabled=true|false（启用对话摘要）\n'
+'  sum.keepCount=3|6|10|20|30|60（近期消息保留条数）\n'
+'  sum.summaryScope=keep|ctx（摘要覆盖范围）\n'
+'  sum.summaryWindow=60|100|200（摘要回看窗口条数）\n'
+'  sum.summaryApiId=空(跟随对话API) 或某个 API 的配置 id\n'
+'  presence.welcomeEnabled=true|false（启用Presence）\n'
+'  presence.welcomeInterval=1|2|4|8（Presence 触发间隔，小时）\n'
+'  music.sing=true|false（启用Sing/一起听）\n'
+'分组 独立开关：\n'
+'  music.ctl=true|false（允许 AI 控制播放器）\n'
+'  stk.on=true|false（表情包与颜文字）\n'
+'  fine.on=true|false（启用精细文件工具）\n'
+'  fine.cap=15000|30000|120000（附件正文上限）\n'
+'分组 AI 读取范围（在 API 页）：\n'
+'  read.chat=5|10|20|30|50|999（读取聊天记录条数，999=全部）\n'
+'  read.groupChat=10|20|50|999（群聊读取条数）\n'
+'  read.feed=0|10|20|30|50（读取动态条数）\n'
+'  read.posts=0|-1|1|5|10（读取日志篇数，0=不读 -1=仅提供权限）\n'
+'分组 每个 API（path 形如 api.配置id.字段；拿不准是哪个配置就先问用户一句）：\n'
+'  temperature=0~2 小数 / streaming=true|false（流式）/ thinking=true|false（思考链）\n'
+'  webSearch=true|false（联网搜索）/ cache=true|false（提示缓存）/ cacheTtl=true|false（缓存保留1小时）\n'
+'  vision=true|false（图片识别）/ imageGen=true|false（图像生成）\n'
+'  autoMem=true|false / autoMemMode=hybrid|retrieval|full / autoMemBudget=300~6000 / memWrite=true|false（记忆库写入）\n';
/* ── 系统提示：知识源＝内嵌说明书 + 页面 Guide「功能模块」节（叙事头/思考块不用） ── */
function _wsAGuideModules(){/* 运行时从本页 #guide-modules 取功能说明；上游改 Guide 自动跟上 */
  try{
    var el=document.getElementById('guide-modules');
    if(!el)return '';
    var n=el.cloneNode(true);
    try{var bs=n.querySelectorAll('button');for(var i=0;i<bs.length;i++)bs[i].remove()}catch(e){}
    return String(n.textContent||'').replace(/\n{3,}/g,'\n\n').trim().slice(0,24000);
  }catch(e){return ''}
}
const _wsASYS='你是 Internal Beyond 电脑端的说明书小助手（就叫「小助手」）。知识来源两段：①《电脑端说明书》正文（本地补丁与操作步骤以此为准）；②应用内 Guide 的「功能模块」节（上游功能细节、中转站、常见问题）。Guide 开头的叙事与思考块不是知识，不要引用。规则：\n'
+'1. 优先依据说明书；说明书未写清的上游功能，可依据 Guide「功能模块」节回答。两处都没有的，不要编造，直说「资料里没提到」。\n'
+'2. 手机端才有、电脑端没有的功能（锁屏、Desk、AI 付、闹钟、蓝牙、Presence 定时推送、视觉一整套 ui.*、权限 perms.*、美化包 skinReset、自制 APP、缓存/图片探针），如实说电脑端暂无，不要假装能做。\n'
+'3. 用户要改设置时，只准改下面【设置表】里的 path；在回复末尾逐行输出动作标记，每条一行，至多 5 个：\n'
+'   [[set:path=value]]   改一项设置（布尔写 true/false；选项类写【设置表】里给出的值；数字写阿拉伯数字）。\n'
+'   [[open:键]]          答案落在某一页/某个开关那里时，给一个跳转键（键见第 6 条）。\n'
+'   [[run:theme]]        切换明暗主题（run 目前只有 theme 可用；skinReset/openApp/export 一律说电脑端暂无）。\n'
+'   路径与数值不带颜文字；改完在正文里用一句话说明改了什么。拿不准改哪一项，先问一句再动，不要瞎写 path。\n'
+'4. 不能做：进 TA 对话、替用户发消息、看聊天记录；不改 API 密钥/人设/系统提示/记忆条目/备份/聊天记录/图片素材——这些要改就一句话指路（密钥与人设→API 页该 TA 的配置里；记忆→Memory 页；备份→API 页数据区）。\n'
+'5. 回答简洁，像说明书一样陈述；不要世界观叙事、不要颜文字（电脑端小助手无颜文字）。\n'
+'6. 跳转键只能用：profile/blog/room/chat/letters/memory/api/diy/guide，或说明书小节 gm-profile/gm-chat/gm-api/gm-music/gm-memory/gm-icode/gm-blog，或设置落点 set-presence/set-music/set-music-ctl/set-summary/set-sticker/set-fine。不需要跳转就不要输出这个标记。\n'
+'7. 回答「在哪 / 怎么用 / 怎么开启」时，必须写出明确入口（页名 → 卡片或按钮中文名）和编号步骤；禁止用「以界面为准」代替步骤。说明书已写明位置的，照抄路径。\n'
+'8. 问「在哪/某个设置怎么开」时，优先在回答最后输出 [[open:对应页键]]（设置类用 set-... 落点），而不是只描述位置。\n'
+'\n===《电脑端说明书》正文 ===\n'+_wsAMANUAL
+'\n\n===【设置表】（path = 可改什么；只准用这些 path，表外不写动作）===\n'+_wsA_PATHDOC;
/* ── 可打开页面映射：app 页走 navTo；gm- 小节落在 guide 页再滚动定位 ── */
const _wsAPAGES={
profile:{page:'profile'},blog:{page:'blog'},room:{page:'room'},chat:{page:'chat'},
letters:{page:'letters'},memory:{page:'memory'},api:{page:'api'},diy:{page:'diy'},guide:{page:'guide'},
'gm-profile':{page:'guide',anchor:'gm-profile'},
'gm-chat':{page:'guide',anchor:'gm-chat'},
'gm-api':{page:'guide',anchor:'gm-api'},
'gm-music':{page:'guide',anchor:'gm-music'},
'gm-memory':{page:'guide',anchor:'gm-memory'},
'gm-icode':{page:'guide',anchor:'gm-icode'},
'gm-blog':{page:'guide',anchor:'gm-blog'},
'set-presence':{page:'api',anchor:'api-welcome-toggle'},
'set-music':{page:'api',anchor:'api-music-toggle'},
'set-music-ctl':{page:'api',anchor:'api-music-ctl-toggle'},
'set-summary':{page:'api',anchor:'api-summary-toggle'},
'set-sticker':{page:'diy',anchor:'ib-stk-toggle'},
'set-fine':{page:'diy',anchor:'ib-fine-toggle'}
};
/* ── 跳转键文案：页键 → 中文名（仅按钮显示用，不参与解析；_wsAPAGES 键集合不变）── */
const _wsAPAGE_LABEL={profile:'角色档案',blog:'日志',room:'互动空间',chat:'聊天',letters:'信件',memory:'长期记忆',api:'API 配置',diy:'DIY 工具',guide:'说明书'};
let _wsAOv=null,_wsABusy=false,_wsACurCfgId='';
let _wsAHist=[];
/* ── 常用问题文字签：点击即发送；q[0]=签文案，q[1]=实际发送的提问 ── */
const _wsAQUICK=[['你是谁','你是谁？'],['你能做什么','你能为我做什么？'],['设置清单','设置清单'],['精细文件工具','精细文件工具是什么，怎么开？'],['三种注入方式','Auto Memory 的三种注入方式有什么区别？'],['备份在哪','怎么导出备份？'],['导入聊天记录','怎么导入官方聊天记录？'],['接中转站','我用的是中转站，怎么填接口地址、密钥和模型？连不上怎么排查？'],['表情包在哪','表情包和颜文字在哪里开？']];
/* ── 预设问题本地直答：不调 API、不耗额度；覆盖全部常用问题，避免「没选 API 就没答案」 ── */
const _wsAFAQ={
'你能为我做什么？':'我是说明书小助手。可以：① 按内嵌《电脑端说明书》答「某个功能在哪、怎么用」；② 用 [[open:页键]] 带你跳到那一页；③ 按你的要求改【设置表】里的开关（摘要、Presence、Sing、播放器控制、表情包、精细文件工具、读取范围等），改完可撤销。上面一排是常用问题，点一下就发。不能替你进 TA 对话、发消息、看聊天记录，也不能改密钥/人设/记忆条目。',
'精细文件工具是什么，怎么开？':'精细文件工具是只读的文件检索/精读能力（本地补丁 p03）。\n开启：DIY 页 → 文件解析库卡 → 勾「启用精细文件工具」；再选附件正文上限（省 15000 / 均衡 30000 / 全读 120000 字符）。\n开启后 TA 可检索工作区与本会话附件（至多 20 处「路径:行号 + 前后文」）、看目录、按行读段；只读不改文件。\n[[open:set-fine]]',
'Auto Memory 的三种注入方式有什么区别？':'在每个 API 的功能设置里，Auto Memory 有三种模式：\nhybrid（混合，默认）：既给检索到的相关记忆，也带一份精简档案。\nretrieval（仅检索）：只在需要时检索相关条目，上下文更省。\nfull（全文）：把可见记忆尽量多塞进上下文，最全也最费 Token。\n按「想让 TA 记住多少」选：日常 hybrid，省额度 retrieval，要最全才用 full。',
'怎么导出备份？':'API 页 → 数据区 → 导出备份。导出的是本机主要数据（聊天、设置、收藏、记忆等），含 API 密钥明文，请只在自己的设备间流转。\nV2.7.4 起导出会带来源标记；可勾「连本机媒体库一起导出」把视频也带上。导入时合并写入，手机备份不会覆盖本机电脑端设置。\n[[open:api]]',
'怎么导入官方聊天记录？':'导航栏 → Import → 顶部切到「官方聊天记录」。\n可直接选 ChatGPT（设置 → 数据控制 → 导出数据）或 Claude（Settings → Privacy → Export data）的压缩包，也可先解压选 conversations.json；别的 JSON/JSONL（如 Operit）、自己记的「名字：内容」逐行 .txt 也能读（txt 填日期范围，消息按顺序均匀排上）。\n选一位好友后默认自动分频道（每个对话窗口各建一个话题频道），也可选「并入主线」；重复导入自动跳过；图片附件只留占位；「最近导入」可一键撤销。全程在本机完成，不联网。',
'我用的是中转站，怎么填接口地址、密钥和模型？连不上怎么排查？':'中转站填写：API 页 → 新建/编辑配置 → 服务商选「自定义」→ 接口地址填到完整路径（形如 https://xxx.com/v1/chat/completions，不要只填域名）→ 密钥与模型名按中转站说明填。\n连不上排查：① 点「测试连接」看分类原因（地址/密钥/模型名/超时）；② 地址是否允许浏览器跨域；③ 密钥是否有效、有余额；④ 模型名是否与中转站一致。\n[[open:set-summary]]',
'表情包和颜文字在哪里开？':'颜文字：始终可用——输入条附件按钮旁点笑脸 → 八组预设 → 点一枚插到光标处。\n表情包：需开关——DIY 页（或设置区）→「表情包与颜文字」→ 管理表情包，建预设、上传图片（每枚必填名字、用法）。点一枚再发送，气泡出图；TA 收到的是叙述句。开关开时 TA 每条回复最多发 1 枚。\n[[open:set-sticker]]'
};
function _wsAFaqHit(q){
  const s=String(q||'').replace(/[\s？?！!。.~～、,，]/g,'');
  if(/^(你是谁|你是什么|你叫什么|你是啥|你的名字|whoareyou|你是小助手吗)$/i.test(s))return null;/* 走既有本地直答 */
  if(/^设置(清单|列表|表)$/.test(s))return null;/* 走设置清单 */
  for(const k in _wsAFAQ){if(s===String(k).replace(/[\s？?！!。.~～、,，]/g,''))return _wsAFAQ[k]}
  const short={'你能做什么':'你能为我做什么？','精细文件工具':'精细文件工具是什么，怎么开？','三种注入方式':'Auto Memory 的三种注入方式有什么区别？','备份在哪':'怎么导出备份？','导入聊天记录':'怎么导入官方聊天记录？','导入聊天记录在哪':'怎么导入官方聊天记录？','接中转站':'我用的是中转站，怎么填接口地址、密钥和模型？连不上怎么排查？','表情包在哪':'表情包和颜文字在哪里开？'};
  if(short[q]||short[String(q||'').trim()])return _wsAFAQ[short[q]||short[String(q||'').trim()]];
  return null;
}
/* ── 独立回答 API 的选择：apiSettings 行 id='wsA_cfg' / app='wsA'，与聊天 activeFriendId 完全分开 ── */
async function _wsACfgId(){try{const r=await dbGet('apiSettings','wsA_cfg');return (r&&String(r.v||''))||''}catch(e){return ''}}
async function _wsASetCfgId(id){try{await dbPut('apiSettings',{id:'wsA_cfg',app:'wsA',key:'cfg',v:String(id||''),updated:Date.now()})}catch(e){}}
async function _wsALoadCfg(){_wsACurCfgId=await _wsACfgId();return _wsACurCfgId}
function _wsACfg(){const list=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];for(let i=0;i<list.length;i++){if(list[i]&&list[i].id===_wsACurCfgId)return list[i]}return null}
/* ── p18 统一动作解析：[[set:path=value]] / [[open:key]] / [[run:name]]，一套管道剥标记 ── */
function _wsAParse(text){
  const t=String(text||'');
  const acts=[];
  let out=t;
  out=out.replace(/\[\[set:([^\]=]+)=([^\]]*)\]\]/g,function(_m,p,v){acts.push({op:'set',path:String(p).trim(),value:String(v).trim()});return ''});
  out=out.replace(/\[\[open:([a-zA-Z\-]+)\]\]/g,function(_m,k){acts.push({op:'open',key:String(k).toLowerCase()});return ''});
  out=out.replace(/\[\[run:([a-zA-Z\-]+)\]\]/g,function(_m,n){acts.push({op:'run',name:String(n).toLowerCase()});return ''});
  return {text:out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim(),acts:acts.slice(0,5)};
}
/* ── p18 设置表：唯一合法 path 集合（表外一律拒绝）。分组 A 读改写 summarySettings 单键；
 *   分组 B 各自独立存储；分组 D 读改写 readingLimits 单键；分组 C 动态 api.<id>.<field> ── */
function _wsATable(){return [
 {path:'sum.enabled',label:'启用对话摘要',type:'bool'},
 {path:'sum.keepCount',label:'近期消息保留条数',type:'num',opts:[3,6,10,20,30,60]},
 {path:'sum.summaryScope',label:'摘要覆盖范围',type:'enum',opts:['keep','ctx']},
 {path:'sum.summaryWindow',label:'摘要回看窗口',type:'num',opts:[60,100,200]},
 {path:'sum.summaryApiId',label:'摘要生成 API',type:'str'},
 {path:'presence.welcomeEnabled',label:'启用Presence',type:'bool'},
 {path:'presence.welcomeInterval',label:'Presence 触发间隔(小时)',type:'num',opts:[1,2,4,8]},
 {path:'music.sing',label:'启用Sing/一起听',type:'bool'},
 {path:'music.ctl',label:'允许 AI 控制播放器',type:'bool'},
 {path:'stk.on',label:'表情包与颜文字',type:'bool'},
 {path:'fine.on',label:'启用精细文件工具',type:'bool'},
 {path:'fine.cap',label:'附件正文上限',type:'enum',opts:[15000,30000,120000]},
 {path:'read.chat',label:'读取聊天记录条数',type:'enum',opts:[5,10,20,30,50,999]},
 {path:'read.groupChat',label:'群聊读取条数',type:'enum',opts:[10,20,50,999]},
 {path:'read.feed',label:'读取动态条数',type:'enum',opts:[0,10,20,30,50]},
 {path:'read.posts',label:'读取日志篇数',type:'enum',opts:[0,-1,1,5,10]}
];}
/* 分组 C：public path 后缀 → 真实 cfg 字段（thinking/cache/cacheTtl 是别名） */
const _wsA_API_FIELDS={
 temperature:{label:'温度',type:'num',min:0,max:2,field:'temperature'},
 streaming:{label:'流式传输',type:'bool',field:'streaming'},
 thinking:{label:'启用思考链',type:'bool',field:'thinkingEnabled'},
 webSearch:{label:'联网搜索',type:'bool',field:'webSearch'},
 cache:{label:'提示缓存',type:'bool',field:'promptCache'},
 cacheTtl:{label:'缓存保留1小时',type:'bool',field:'cacheTtl1h'},
 vision:{label:'图片识别',type:'bool',field:'vision'},
 imageGen:{label:'图像生成',type:'bool',field:'imageGen'},
 autoMem:{label:'Auto Memory',type:'bool',field:'autoMem'},
 autoMemMode:{label:'Auto Memory 注入方式',type:'enum',opts:['hybrid','retrieval','full'],field:'autoMemMode'},
 autoMemBudget:{label:'Auto Memory 预算',type:'num',min:300,max:6000,field:'autoMemBudget'},
 memWrite:{label:'记忆库写入',type:'bool',field:'memWrite'}
};
const _wsA_AFIELD={'sum.enabled':'enabled','sum.keepCount':'keepCount','sum.summaryScope':'summaryScope','sum.summaryWindow':'summaryWindow','sum.summaryApiId':'summaryApiId','presence.welcomeEnabled':'welcomeEnabled','presence.welcomeInterval':'welcomeInterval','music.sing':'musicEnabled'};
const _wsA_DFIELD={'read.chat':'chatLimit','read.groupChat':'groupChatLimit','read.feed':'feedLimit','read.posts':'postsLimit'};
let _wsAUndoStack=[];
function _wsAFmt(v){return typeof v==='boolean'?(v?'开':'关'):(v===''||v==null?'空':String(v))}
function _wsALabel(path){
  var rows=_wsATable();for(var i=0;i<rows.length;i++){if(rows[i].path===path)return rows[i].label}
  if(path.indexOf('api.')===0){var pa=path.slice(4),ix=pa.indexOf('.'),f=pa.slice(ix+1);var F=_wsA_API_FIELDS[f];return F?F.label:path}
  return path;
}
/* 读当前值（undo 旧值 + 设置清单用）；不抛错 */
async function _wsARead(path){
  if(_wsA_AFIELD.hasOwnProperty(path)){var s=await dbGet('apiSettings','summarySettings')||{};var v=s[_wsA_AFIELD[path]];return v===undefined?_wsADefFor(path):v}
  if(path==='music.ctl'){var r1=await dbGet('apiSettings','aiMusicCtl');return !!(r1&&r1.on)}
  if(path==='stk.on'){var r2=await dbGet('apiSettings','ib_stk');return !!(r2&&r2.on)}
  if(path==='fine.on'){try{return localStorage.getItem('ib_wsFineTools')==='1'}catch(e){return false}}
  if(path==='fine.cap'){try{var fc=parseInt(localStorage.getItem('ib_fileCap')||'',10);if(fc===15000||fc===30000||fc===120000)return fc}catch(e){}return 30000}
  if(_wsA_DFIELD.hasOwnProperty(path)){var r3=await dbGet('apiSettings','readingLimits')||{};return r3[_wsA_DFIELD[path]]}
  if(path.indexOf('api.')===0){var pa=path.slice(4),ix=pa.indexOf('.'),id=pa.slice(0,ix),f=pa.slice(ix+1);var list=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];for(var i=0;i<list.length;i++){if(list[i]&&list[i].id===id){var F=_wsA_API_FIELDS[f];return list[i][F?F.field:f]}}return undefined}
  return undefined;
}
function _wsADefFor(path){if(path==='sum.keepCount')return 6;if(path==='sum.summaryWindow')return 60;if(path==='presence.welcomeInterval')return 2;if(path==='sum.summaryApiId')return '';return undefined}
/* 底层写：读改写单键、不同步校验、不推 undo；undo 也走这里 */
async function _wsAWrite(path,v){
  if(_wsA_AFIELD.hasOwnProperty(path)){var s=await dbGet('apiSettings','summarySettings');s=s||{};s.id='summarySettings';s[_wsA_AFIELD[path]]=v;await dbPut('apiSettings',s);try{if(typeof loadSummarySettingsUI==='function')await loadSummarySettingsUI()}catch(e){}return}
  if(path==='music.ctl'){var r1=await dbGet('apiSettings','aiMusicCtl');r1=r1||{};r1.id='aiMusicCtl';r1.on=!!v;await dbPut('apiSettings',r1);try{_aiMusicCtlOn=!!v;if(typeof _aiMusicCtlApplyUI==='function')_aiMusicCtlApplyUI()}catch(e){}return}
  if(path==='stk.on'){var r2=await dbGet('apiSettings','ib_stk');r2=r2||{on:false,cur:'',presets:[]};r2.id='ib_stk';r2.on=!!v;await dbPut('apiSettings',r2);try{if(typeof _stkState!=='undefined')_stkState.on=!!v;if(typeof _stkSyncCard==='function')_stkSyncCard()}catch(e){}return}
  if(path==='fine.on'){try{localStorage.setItem('ib_wsFineTools',v?'1':'0')}catch(e){}var e1=document.getElementById('ib-fine-toggle');if(e1)e1.checked=!!v;return}
  if(path==='fine.cap'){try{localStorage.setItem('ib_fileCap',String(v))}catch(e){}var e2=document.getElementById('ib-fine-cap');if(e2)e2.value=String(v);return}
  if(_wsA_DFIELD.hasOwnProperty(path)){var r3=await dbGet('apiSettings','readingLimits');r3=r3||{};r3.id='readingLimits';r3[_wsA_DFIELD[path]]=v;await dbPut('apiSettings',r3);try{if(typeof loadReadingLimitsUI==='function')await loadReadingLimitsUI()}catch(e){}return}
  if(path.indexOf('api.')===0){var pa=path.slice(4),ix=pa.indexOf('.'),id=pa.slice(0,ix),f=pa.slice(ix+1);var F=_wsA_API_FIELDS[f];var list=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];var row=null;for(var i=0;i<list.length;i++){if(list[i]&&list[i].id===id)row=list[i]}if(!row)throw new Error('没有这个 API');row[F.field]=v;await dbPut('apiConfigs',row);try{if(typeof editingApiId!=='undefined'&&editingApiId===id&&typeof editApi==='function')editApi(id)}catch(e){}return}
  throw new Error('设置表里没有 '+path);
}
/* doSet：类型校验 → noop → 写 → 推 undo。回显 ✓ label：from → to；noop：· label：本来就是 x */
async function _wsADoSet(path,valueStr){
  path=String(path||'').trim();valueStr=String(valueStr==null?'':valueStr);
  var type,opts,min,max;
  if(path.indexOf('api.')===0){
    var pa=path.slice(4),ix=pa.indexOf('.'),id=pa.slice(0,ix),f=pa.slice(ix+1);
    var list=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];var row=null;for(var i=0;i<list.length;i++){if(list[i]&&list[i].id===id)row=list[i]}
    if(!row)return {ok:false,line:'✗ 设置表里没有 '+path};
    var F=_wsA_API_FIELDS[f];if(!F)return {ok:false,line:'✗ 设置表里没有 '+path};
    type=F.type;opts=F.opts;min=F.min;max=F.max;
  }else{
    var rows=_wsATable();row=null;for(var j=0;j<rows.length;j++){if(rows[j].path===path)row=rows[j]}
    if(!row)return {ok:false,line:'✗ 设置表里没有 '+path};
    type=row.type;opts=row.opts;
  }
  var v;
  if(type==='bool'){if(!/^(true|false|1|0|on|off|开|关)$/i.test(valueStr))return {ok:false,line:'✗ '+path+' 只接受 true/false'};v=/^(true|1|on|开)$/i.test(valueStr)}
  else if(type==='num'){v=Number(valueStr);if(!isFinite(v))return {ok:false,line:'✗ '+path+' 只接受数字'};if(min!=null)v=Math.max(min,v);if(max!=null)v=Math.min(max,v)}
  else{v=String(valueStr).slice(0,60);if(path==='sum.summaryApiId'&&v!==''){var l2=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];var found=false;for(var k=0;k<l2.length;k++){if(l2[k]&&l2[k].id===v){found=true;break}}if(!found)return {ok:false,line:'✗ 没有这个 API：'+v}}}
  if(opts&&opts.length){var okv=false;for(var o=0;o<opts.length;o++){if(String(opts[o])===String(v)){okv=true;break}}if(!okv)return {ok:false,line:'✗ '+path+' 只接受 '+opts.join(' / ')};v=(typeof opts[0]==='number')?Number(v):String(v)}
  var old=await _wsARead(path);
  var label=_wsALabel(path);
  var same=(typeof v==='boolean')?(old===v):(String(old)===String(v));
  if(same)return {ok:true,noop:true,line:'· '+label+'：本来就是 '+_wsAFmt(v)};
  await _wsAWrite(path,v);
  var idx=_wsAUndoStack.length;_wsAUndoStack.push({path:path,old:old});
  return {ok:true,line:'✓ '+label+'：'+_wsAFmt(old)+' → '+_wsAFmt(v),undoIdx:idx};
}
/* run：只 theme；其余一律拒绝（手机端独有） */
async function _wsARun(name){
  name=String(name||'').trim();
  if(name==='theme'){try{if(typeof toggleTheme==='function'){toggleTheme();return {ok:true,line:'✓ 已切换主题'}}return {ok:false,line:'✗ 电脑端暂无此动作'}}catch(e){return {ok:false,line:'✗ 主题切换失败'}}}
  return {ok:false,line:'✗ 电脑端暂无此动作（'+name+'）'};
}
/* undo：只撤本会话内小助手改过的项，写回 old 并同步 UI */
async function _wsAUndo(idx){var it=_wsAUndoStack[idx];if(!it)return;try{await _wsAWrite(it.path,it.old)}catch(e){}}
/* 设置清单：本地列当前值，不调 API */
async function _wsABuildSettingsList(){
  var lines=[];var rows=_wsATable();
  for(var i=0;i<rows.length;i++){var v=await _wsARead(rows[i].path);lines.push('· '+rows[i].label+'：'+_wsAFmt(v))}
  var list=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];
  var n=0;for(var k=0;k<list.length;k++){if(list[k]&&list[k].id)n++}
  return '现在我能直接帮你改的电脑端设置有这些（想改哪项直接说）：\n\n'+lines.join('\n')+(n?'\n\n另有每个 API 各自的十二项（温度/流式/思考链/联网/缓存/识图/生图/Auto Memory/记忆写入等），想改哪个 API 的哪项直接说。':'\n')+'\n\n改不了的（密钥/人设/记忆条目/备份/聊天记录/图片素材，以及手机端独有能力）我会如实说并指给你去哪。';
}
/* ── 打开页面：点击跳转键才调用；navTo →（gm- 锚点照旧滚）→ 再关窗（对齐手机端「点了才去并关」）── */
function _wsADoOpen(key){
  const t=_wsAPAGES[key];
  if(!t)return;
  try{
    navTo(t.page);
    if(t.anchor){setTimeout(function(){try{const el=document.getElementById(t.anchor);if(el)el.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){}},80)}
    _wsAClose();
  }catch(e){}
}
/* ── 跳转键：bot 气泡下出现可点键，用户点击才 navTo + 关窗（对齐手机端，不再自动跳）── */
function _wsAJumpBtn(key){
  const t=_wsAPAGES[key];
  if(!t)return null;
  let label;
  if(key.indexOf('set-')===0){label='设置'}
  else if(t.anchor){label='说明书小节'}
  else{label=_wsAPAGE_LABEL[key]||'页面'}
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='ws-a-jump';
  btn.textContent='去'+label+' →';
  btn.addEventListener('click',function(){_wsADoOpen(key)});
  return btn;
}
/* ── 面板 ── */
function _wsABubble(role,text,jumpKey){
  try{
    var r=(role==='assistant')?'bot':role;
    const body=document.getElementById('ws-a-body');
    if(!body)return;
    const d=document.createElement('div');
    d.className='ws-a-msg ws-a-'+r;
    if(r!=='user'){try{d.innerHTML=(typeof _mdRenderHtml==='function')?_mdRenderHtml(String(text==null?'':text),false):'';if(!d.innerHTML)d.textContent=String(text==null?'':text)}catch(e){d.textContent=String(text==null?'':text)}}
    else{d.textContent=String(text==null?'':text)}
    body.appendChild(d);
    if(r==='bot'&&jumpKey){try{const jb=_wsAJumpBtn(jumpKey);if(jb)body.appendChild(jb)}catch(e){}}
  }catch(e){}
}
/* p18：动作结果行——set/run 出 .ws-a-act（含撤销），open 出跳转键；都挂在气泡下 */
function _wsAActRow(res){
  try{
    const body=document.getElementById('ws-a-body');
    if(!body||!res)return;
    if(res.jump){const jb=_wsAJumpBtn(res.jump);if(jb)body.appendChild(jb);return}
    const d=document.createElement('div');
    d.className='ws-a-act'+(res.ok?'':' err');
    const dot=document.createElement('i');
    const b=document.createElement('b');b.textContent=res.line||'';
    d.appendChild(dot);d.appendChild(b);
    if(res.undoIdx!==undefined){(function(idx){
      const u=document.createElement('button');u.type='button';u.className='ws-a-act-undo';u.textContent='撤销';
      u.addEventListener('click',function(){u.disabled=true;u.textContent='已撤销';_wsAUndo(idx)});
      d.appendChild(u);
    })(res.undoIdx)}
    body.appendChild(d);
  }catch(e){}
}
/* ── p19：持久化 / 恢复 / 重画 / 清空 ── */
function _wsAPersist(){
  try{
    localStorage.setItem('ib_helper_hist',JSON.stringify(_wsAHist.slice(-30).map(function(m){
      return {role:m.role,text:m.text,acts:(m.acts||[]).map(function(a){return {ok:a.ok,line:a.line}})};
    })));
  }catch(e){}
}
function _wsARestore(){
  try{
    var arr=JSON.parse(localStorage.getItem('ib_helper_hist')||'[]');
    if(!Array.isArray(arr)){_wsAHist=[];return}
    _wsAHist=arr.map(function(m){
      var role=(m&&m.role==='user')?'user':'assistant';
      var text=String((m&&m.text)!=null?m.text:'');
      var acts=[];
      if(m&&Array.isArray(m.acts)){
        for(var i=0;i<m.acts.length;i++){
          var a=m.acts[i];
          if(a&&a.line){acts.push({ok:!!a.ok,line:String(a.line)})}
        }
      }
      return {role:role,text:text,acts:acts};
    });
  }catch(e){_wsAHist=[]}
}
function _wsAPaintAll(){
  try{
    var body=document.getElementById('ws-a-body');
    if(!body)return;
    while(body.firstChild)body.removeChild(body.firstChild);
    if(!_wsAHist.length){
      var tip=document.createElement('div');
      tip.className='ws-a-tip';
      tip.textContent='我是小助手，只按电脑端说明书回答。问某个功能在哪、怎么用，也可以直接说出想改什么。';
      body.appendChild(tip);
      return;
    }
    for(var i=0;i<_wsAHist.length;i++){
      var m=_wsAHist[i];
      _wsABubble(m.role,m.text);
      if(Array.isArray(m.acts)){
        for(var j=0;j<m.acts.length;j++){
          _wsAActRow(m.acts[j]);
        }
      }
    }
  }catch(e){}
}
function _wsAClear(){
  _wsAHist.length=0;
  _wsAUndoStack.length=0;
  _wsAPersist();
  _wsAPaintAll();
  try{toast('对话已清空')}catch(e){}
}
/* API 文字签：读当前 _wsACfg 与 apiConfigs，刷新 #ws-a-api 文案与禁用态 */
function _wsARelabel(){
  const btn=document.getElementById('ws-a-api');
  if(!btn)return;
  const list=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];
  const cfg=_wsACfg();
  if(cfg){
    const nm=String(cfg.nickname||cfg.model||cfg.id||'?');
    btn.textContent='执笔 API · '+nm+' ▾';
    btn.disabled=false;
  }else{
    btn.textContent='还没有可用的 API';
    btn.disabled=!list.length;
  }
}
/* API 选择弹出菜单：点文字签弹出；点外部关闭；选中即写配置并重画 */
function _wsAPopApiMenu(){
  const old=document.getElementById('ws-a-apimenu');
  if(old){old.remove();return}
  const list=(typeof apiConfigs!=='undefined'&&apiConfigs)||[];
  if(!list.length){try{toast('先到 API 页添加一个 API')}catch(e){}return}
  const menu=document.createElement('div');
  menu.id='ws-a-apimenu';
  const t=document.createElement('div');
  t.className='ws-a-apimenu-t';
  t.textContent='执笔 API — 小助手用哪个 API 回答';
  menu.appendChild(t);
  for(let i=0;i<list.length;i++){
    const a=list[i];if(!a)continue;
    const nm=String(a.nickname||a.model||a.id||'?');
    const id=String(a.id||'');
    const b=document.createElement('button');
    b.type='button';
    b.textContent=nm;
    b.setAttribute('data-id',id);
    if(id===_wsACurCfgId)b.className='on';
    b.addEventListener('click',async function(ev){
      ev.stopPropagation();
      try{
        await _wsASetCfgId(id);
        await _wsALoadCfg();
        _wsARelabel();
        menu.remove();
        try{toast('小助手改用：'+nm)}catch(e){}
      }catch(e){}
    });
    menu.appendChild(b);
  }
  const modal=_wsAOv?_wsAOv.querySelector('.ws-a-modal'):null;
  if(modal)modal.appendChild(menu);else if(_wsAOv)_wsAOv.appendChild(menu);
  setTimeout(function(){
    function onDocDown(e){
      if(!menu.parentNode)return;
      const tgt=e.target;
      if(tgt&&tgt.closest&&tgt.closest('#ws-a-apimenu'))return;
      menu.remove();
      document.removeEventListener('pointerdown',onDocDown,true);
    }
    document.addEventListener('pointerdown',onDocDown,true);
  },0);
}
function _wsABuild(){
  const css=document.createElement('style');
  css.id='p06-ws-a-css';
  css.textContent=
   '#ws-a-fab{position:relative;display:flex;align-items:center;box-sizing:border-box;background:none;border:none;cursor:pointer;padding:0 13px 0 16px}'
  +'#ws-a-fab::before{content:\'\';position:absolute;top:3px;bottom:3px;left:3px;right:1px;border-radius:999px;background:rgba(175,195,228,0);transition:background 0.45s var(--transition);pointer-events:none}'
  +'#ws-a-fab:hover::before{background:rgba(175,195,228,0.14)}'
  +'#ws-a-fab:active::before{background:rgba(175,195,228,0.2);transition-duration:0.25s}'
  +'#ws-a-fab>*{position:relative;z-index:1}'
  +'#ws-a-fab .mini-icon{display:flex;align-items:center;flex-shrink:0;opacity:0.8;transition:opacity 0.45s var(--transition)}'
  +'#ws-a-fab:hover .mini-icon{opacity:1}'
  +'#ws-a-fab .mini-icon svg{display:block;color:var(--silver)}'
  +'body:not(.theme-infernal) #ws-a-fab:hover::before{background:rgba(255,255,255,0.4)}'
  +'body:not(.theme-infernal) #ws-a-fab:active::before{background:rgba(255,255,255,0.5)}'
  +'body:not(.theme-infernal) #ws-a-fab .mini-icon svg{color:#2a5070}'
  +'.ws-a-ov{position:fixed;inset:0;z-index:9998;background:rgba(10,18,38,0.18);display:none;align-items:flex-end;justify-content:center;box-sizing:border-box}'
  +'.ws-a-ov.open{display:flex}'
  +'.ws-a-modal{position:relative;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:22px 22px 0 0;width:100%;max-width:560px;max-height:min(82vh,640px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -12px 40px rgba(20,35,70,0.18);color:var(--text-primary)}'
  +'.ws-a-head{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--glass-border);flex:none}'
  +'.ws-a-title{flex:none;font:500 1rem \'Noto Serif SC\',\'Songti SC\',serif;letter-spacing:.04em;color:var(--light)}'
  +'.ws-a-api{flex:1;min-width:0;text-align:left;font-size:.72rem;color:var(--text-muted);background:none;border:0;padding:0;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:inherit}'
  +'.ws-a-api[disabled]{cursor:default}'
  +'.ws-a-mini{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid rgba(175,195,228,0.25);background:rgba(175,195,228,0.08);color:var(--mist);font-size:1rem;line-height:1;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center}'
  +'.ws-a-mini:hover{color:var(--white);background:rgba(175,195,228,0.16);border-color:rgba(175,195,228,0.4)}'
  +'.ws-a-qrow{display:flex;flex:none;gap:6px;overflow-x:auto;overflow-y:hidden;margin:0 16px 8px;padding-right:20px;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 20px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 20px),transparent)}'
  +'.ws-a-qrow::-webkit-scrollbar{display:none}'
  +'.ws-a-chip{flex:none;white-space:nowrap;font-size:.74rem;line-height:1.3;color:var(--text-muted);background:rgba(175,195,228,0.06);border:1px solid var(--glass-border);border-radius:999px;padding:5px 11px;cursor:pointer}'
  +'.ws-a-chip:hover{color:var(--light);background:rgba(175,195,228,0.14)}'
  +'#ws-a-apimenu{position:absolute;left:16px;top:52px;z-index:6;min-width:220px;max-width:calc(100% - 32px);max-height:min(50vh,320px);overflow-y:auto;padding:8px;border-radius:14px;border:1px solid var(--glass-border);background:rgba(20,32,58,0.96);box-shadow:0 14px 40px rgba(0,0,0,0.4);backdrop-filter:blur(12px) saturate(1.2);-webkit-backdrop-filter:blur(12px) saturate(1.2)}'
  +'#ws-a-apimenu .ws-a-apimenu-t{font-size:.7rem;color:var(--text-muted);padding:4px 8px 8px}'
  +'#ws-a-apimenu button{display:block;width:100%;text-align:left;font:inherit;font-size:.86rem;color:var(--text-primary);background:none;border:0;border-radius:9px;padding:9px 10px;cursor:pointer}'
  +'#ws-a-apimenu button.on{background:rgba(114,168,216,0.18);color:var(--accent)}'
  +'#ws-a-apimenu button:active{background:rgba(114,168,216,0.26)}'
  +'.ws-a-body{flex:1;min-height:0;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}'
  +'.ws-a-msg{max-width:85%;padding:12px 16px;border-radius:14px;font-size:0.92rem;line-height:1.6;white-space:pre-wrap;word-break:break-word}'
  +'.ws-a-user{align-self:flex-end;background:rgba(74,122,178,0.26);border:1px solid rgba(74,122,178,0.32);color:var(--light);border-bottom-right-radius:4px}'
  +'.ws-a-bot{align-self:flex-start;background:rgba(175,195,228,0.08);border:1px solid var(--glass-border);color:var(--text-primary);border-bottom-left-radius:4px}'
  +'.ws-a-input{display:flex;align-items:center;gap:8px;margin:0 16px 16px;padding:6px 6px 6px 16px;border-radius:22px;background:rgba(175,195,228,0.06);border:1px solid var(--glass-border);flex:none}'
  +'#ws-a-q{flex:1;min-width:0;border:0;background:none;color:var(--text-primary);padding:8px 0;font-size:.85rem;outline:none;line-height:1.5}'
  +'#ws-a-q::placeholder{color:var(--text-muted)}'
  +'.ws-a-send{background:rgba(80,128,176,0.2);border:1px solid rgba(80,128,176,0.3);color:var(--accent-light);border-radius:50%;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.3s;flex-shrink:0;padding:0}'
  +'.ws-a-send:hover{background:rgba(80,128,176,0.35);color:var(--white)}'
  +'.ws-a-send:disabled{opacity:0.5;cursor:not-allowed}'
  +'.ws-a-jump{align-self:flex-start;margin:-4px 0 2px;background:rgba(175,195,228,0.06);border:1px solid var(--glass-border);color:var(--text-muted);border-radius:8px;padding:4px 10px;font-size:0.75rem;cursor:pointer;transition:all 0.2s}'
  +'.ws-a-jump:hover{background:rgba(175,195,228,0.14);color:var(--silver);border-color:rgba(175,195,228,0.35)}'
  +'.ws-a-bot{white-space:normal}'
  +'.ws-a-user{white-space:pre-wrap}'
  +'.ws-a-msg ol,.ws-a-msg ul{margin:.4em 0;padding-left:1.5em}'
  +'.ws-a-msg li{list-style-position:outside;margin:.15em 0}'
  +'.ws-a-msg p{margin:.35em 0}'
  +'.ws-a-msg p:first-child{margin-top:0}'
  +'.ws-a-msg p:last-child{margin-bottom:0}'
  +'.ws-a-msg h1,.ws-a-msg h2,.ws-a-msg h3,.ws-a-msg h4{margin:.5em 0 .25em;font-size:inherit;font-weight:600}'
  +'.ws-a-msg code{padding:0 .25em;border-radius:4px;background:rgba(114,168,216,0.1);border:1px solid rgba(114,168,216,0.14);color:var(--light)}'
  +'body:not(.theme-infernal) .ws-a-modal{background:rgba(255,255,255,0.32);border-color:rgba(180,215,245,0.5);box-shadow:0 -12px 40px rgba(100,160,220,0.18);backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5);color:#1a3262}'
  +'body:not(.theme-infernal) .ws-a-head{border-bottom-color:rgba(220,235,250,0.5)}'
  +'body:not(.theme-infernal) .ws-a-title{color:#152c58}'
  +'body:not(.theme-infernal) #ws-a-close{color:#30507c;background:rgba(255,255,255,0.5);border-color:rgba(170,210,245,0.3)}'
  +'body:not(.theme-infernal) #ws-a-close:hover{color:#0a1e42;background:rgba(255,255,255,0.7)}'
  +'body:not(.theme-infernal) #ws-a-api{color:#3f5e8c}'
  +'body:not(.theme-infernal) #ws-a-api:hover{color:#0a1e42}'
  +'body:not(.theme-infernal) .ws-a-chip{background:rgba(248,252,255,0.4);border-color:rgba(170,210,245,0.25);color:#30507c}'
  +'body:not(.theme-infernal) .ws-a-chip:hover{color:#0a1e42;background:rgba(240,248,255,0.6)}'
  +'body:not(.theme-infernal) #ws-a-apimenu{background:rgba(255,255,255,0.92);border-color:rgba(170,210,245,0.4);box-shadow:0 14px 40px rgba(100,160,220,0.2)}'
  +'body:not(.theme-infernal) #ws-a-apimenu .ws-a-apimenu-t{color:#3f5e8c}'
  +'body:not(.theme-infernal) #ws-a-apimenu button{color:#1a3262}'
  +'body:not(.theme-infernal) #ws-a-apimenu button.on{background:rgba(110,160,238,0.12);color:#12468c}'
  +'body:not(.theme-infernal) .ws-a-user{background:rgba(110,160,238,0.08);border-color:rgba(255,255,255,0.4);color:#0a1e42}'
  +'body:not(.theme-infernal) .ws-a-bot{background:rgba(248,252,255,0.4);border-color:rgba(200,225,248,0.25);color:#0a1e42}'
  +'body:not(.theme-infernal) .ws-a-input{background:rgba(248,252,255,0.4);border-color:rgba(170,210,245,0.25)}'
  +'body:not(.theme-infernal) #ws-a-q{background:none;color:#1a3262}'
  +'body:not(.theme-infernal) #ws-a-q::placeholder{color:#3f5e8c}'
  +'body:not(.theme-infernal) .ws-a-send{background:rgba(120,175,242,0.1);border-color:rgba(90,155,235,0.18);color:#12468c}'
  +'body:not(.theme-infernal) .ws-a-send:hover{background:rgba(100,160,235,0.18);color:#0a1e42}'
  +'body:not(.theme-infernal) .ws-a-jump{color:#30507c;background:rgba(240,248,255,0.35);border-color:rgba(130,185,242,0.16)}'
  +'body:not(.theme-infernal) .ws-a-jump:hover{color:#0a1e42;background:rgba(205,225,252,0.4)}'
  +'.ws-a-act{align-self:flex-start;display:flex;align-items:center;gap:8px;margin:-2px 0 2px;background:rgba(175,195,228,0.06);border:1px solid var(--glass-border);border-radius:8px;padding:5px 10px;font-size:0.75rem;color:var(--text-muted);max-width:85%;box-sizing:border-box}'
  +'.ws-a-act i{width:6px;height:6px;border-radius:50%;background:var(--accent);flex:none}'
  +'.ws-a-act.err{color:#c98a7a}'
  +'.ws-a-act.err i{background:#d08a7a}'
  +'.ws-a-act b{font-weight:400;flex:1;min-width:0;word-break:break-word}'
  +'.ws-a-act-undo{background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.72rem;padding:0 0 0 4px;flex:none;text-decoration:underline;font-family:inherit}'
  +'.ws-a-act-undo:disabled{color:var(--text-muted);cursor:default;text-decoration:none}'
  +'body:not(.theme-infernal) .ws-a-act{background:rgba(240,248,255,0.35);border-color:rgba(130,185,242,0.16);color:#30507c}'
  +'body:not(.theme-infernal) .ws-a-act.err{color:#a85a48}'
  +'body:not(.theme-infernal) .ws-a-act-undo{color:#12468c}'
  +'body:not(.theme-infernal) .ws-a-msg code{background:rgba(50,120,200,0.08);border-color:rgba(50,120,200,0.14);color:#1a3a6c}'
  +'.ws-a-clr{background:none;border:none;color:var(--mist);cursor:pointer;font-size:0.7rem;padding:4px 6px;flex:none;font-family:inherit}'
  +'.ws-a-clr:hover{color:var(--white)}'
  +'body:not(.theme-infernal) .ws-a-clr{color:#30507c}'
  +'body:not(.theme-infernal) .ws-a-clr:hover{color:#0a1e42}'
  +'.ws-a-tip{font-size:0.8rem;color:var(--text-muted);text-align:center;padding:26px 12px 8px;line-height:1.7}'
  +'body:not(.theme-infernal) .ws-a-tip{color:#30507c}';
  document.head.appendChild(css);
  _wsAOv=document.createElement('div');
  _wsAOv.className='ws-a-ov';
  _wsAOv.innerHTML='<div class="ws-a-modal glass-card">'
   +'<div class="ws-a-head"><b class="ws-a-title">小助手</b>'
   +'<button type="button" id="ws-a-api" class="ws-a-api" title="切换回答用的 API">还没有可用的 API</button>'
   +'<button type="button" id="ws-a-clr" class="ws-a-clr" title="清空对话">清空</button>'
   +'<button type="button" id="ws-a-close" class="ws-a-mini" aria-label="关闭">×</button></div>'
   +'<div class="ws-a-qrow" id="ws-a-qrow">'+_wsAQUICK.map(function(q){return '<span class="ws-a-chip" data-q="'+q[1]+'">'+q[0]+'</span>'}).join('')+'</div>'
   +'<div class="ws-a-body" id="ws-a-body"></div>'
   +'<div class="ws-a-input"><input id="ws-a-q" type="text" placeholder="问它怎么用，或让它直接改" autocomplete="off">'
   +'<button id="ws-a-send" class="ws-a-send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg></button></div></div>';
  document.body.appendChild(_wsAOv);
  _wsAOv.addEventListener('click',function(e){if(e.target===_wsAOv)_wsAClose()});
  document.getElementById('ws-a-close').addEventListener('click',_wsAClose);
  document.getElementById('ws-a-send').addEventListener('click',function(){_wsASendQ()});
  document.getElementById('ws-a-q').addEventListener('keydown',function(e){if(e.key==='Enter')_wsASendQ()});
  document.getElementById('ws-a-api').addEventListener('click',function(e){e.stopPropagation();_wsAPopApiMenu()});
  document.getElementById('ws-a-qrow').addEventListener('click',function(e){
    var chip=(e.target&&e.target.closest)?e.target.closest('.ws-a-chip'):null;
    if(!chip)return;
    var dq=chip.getAttribute('data-q')||'';
    if(dq)_wsASendQ(dq);
  });
  document.getElementById('ws-a-clr').addEventListener('click',_wsAClear);
  _wsARestore();
  _wsAPaintAll();
}
/* ── 发送：独立 callApiChat，系统提示=内嵌说明书；不写聊天记录、不改设置 ── */
async function _wsASendQ(q){
  if(_wsABusy)return;
  if(q==null){const i=document.getElementById('ws-a-q');q=i?String(i.value||'').trim():'';if(i)i.value=''}
  q=String(q||'').trim();
  if(!q)return;
  /* p19：发首条前移除空态 tip（用 children 遍历，不用 querySelector） */
  try{
    var _tipBody=document.getElementById('ws-a-body');
    if(_tipBody){
      for(var _ti=_tipBody.children.length-1;_ti>=0;_ti--){
        if(_tipBody.children[_ti].className&&String(_tipBody.children[_ti].className).indexOf('ws-a-tip')>=0){
          _tipBody.removeChild(_tipBody.children[_ti]);
        }
      }
    }
  }catch(e){}
  /* 本地直答「你是谁」——不调 API、不耗额度 */
  if(/^(你是谁|你是什么|你叫什么|你是啥|你的名字|whoareyou|你是小助手吗)$/i.test(q.replace(/[\s？?！!。.~～、,，]/g,''))){
    var _whoTxt='我是小助手，Internal Beyond 电脑端的说明书小助手。只按内嵌《电脑端说明书》回答：问某个功能在哪、怎么用，或直接说出想改什么（改完会列出改了什么，都能撤销）。上面一排是常用问题，点一下就发。';
    _wsABubble('user',q);
    _wsABubble('bot',_whoTxt);
    _wsAHist.push({role:'user',text:q},{role:'assistant',text:_whoTxt,acts:[]});
    _wsAPersist();
    return;
  }
  /* p18：本地指令「设置清单/列表/表」——不调 API、不耗额度，直接列当前值 */
  if(/^设置(清单|列表|表)[？?！!。.～~\s]*$/.test(q)){
    _wsABusy=true;
    _wsABubble('user',q);
    try{var _listTxt=await _wsABuildSettingsList();_wsABubble('bot',_listTxt);_wsAHist.push({role:'user',text:q},{role:'assistant',text:_listTxt,acts:[]});_wsAPersist()}catch(e){var _errTxt='（读取设置失败：'+String((e&&e.message)||e)+'）';_wsABubble('bot',_errTxt);_wsAHist.push({role:'user',text:q},{role:'assistant',text:_errTxt,acts:[]});_wsAPersist()}
    _wsABusy=false;
    return;
  }
  /* 预设问题本地直答：不调 API 也有答案（2026-09-26） */
  var _faqTxt=_wsAFaqHit(q);
  if(_faqTxt){
    _wsABubble('user',q);
    var _faqParsed=_wsAParse(_faqTxt);
    var _faqOpen=null;
    (_faqParsed.acts||[]).forEach(function(a){if(a.op==='open')_faqOpen=a.key});
    _wsABubble('bot',_faqParsed.text,_faqOpen);
    _wsAHist.push({role:'user',text:q},{role:'assistant',text:_faqParsed.text,acts:_faqParsed.acts||[]});
    _wsAPersist();
    return;
  }
  await _wsALoadCfg();
  const cfg=_wsACfg();
  if(!cfg){try{toast('请先在右上角选一个回答用的 API')}catch(e){}return}
  _wsABusy=true;
  _wsABubble('user',q);
  _wsABubble('bot','…');
  let reply='';
  try{
    var _sysExtra='';
    try{var _gm=_wsAGuideModules();if(_gm)_sysExtra='\n\n===【Guide · 功能模块】（上游功能细节，含中转站/常见问题；不含叙事）===\n'+_gm}catch(e){}
    const messages=[{role:'system',content:_wsASYS+_sysExtra}].concat(_wsAHist.slice(-12).map(function(m){return {role:m.role,content:m.text}})).concat([{role:'user',content:q}]);
    const r=await callApiChat(cfg,messages,{maxTokens:1024,wantMeta:true});
    reply=(typeof r==='string')?r:((r&&r.text)||'');
  }catch(e){var _d=(typeof _apiDiagText==='function')?_apiDiagText(e):('请求失败：'+String((e&&e.message)||e).slice(0,80));reply='（'+_d+'）';try{console.warn('[ib-api] 小助手请求失败：'+String((e&&e.message)||e))}catch(_e2){}}
  try{const body=document.getElementById('ws-a-body');if(body&&body.lastChild)body.removeChild(body.lastChild)}catch(e){}
  const parsed=_wsAParse(reply);
  var _dispText=parsed.text||'（接口返回空文本）';
  _wsABubble('bot',_dispText,null);
  var _actResults=[];
  for(var _ai=0;_ai<parsed.acts.length;_ai++){
    var _a=parsed.acts[_ai],_res=null;
    try{
      if(_a.op==='set')_res=await _wsADoSet(_a.path,_a.value);
      else if(_a.op==='open')_res={ok:true,jump:_a.key};
      else if(_a.op==='run')_res=await _wsARun(_a.name);
      else _res={ok:false,line:'✗ 不认识的动作'};
    }catch(_e){_res={ok:false,line:'✗ '+String((_e&&_e.message)||_e)}}
    _wsAActRow(_res);
    _actResults.push(_res);
  }
  _wsAHist.push({role:'user',text:q},{role:'assistant',text:_dispText,acts:_actResults});
  _wsAPersist();
  _wsABusy=false;
}
async function _wsAOpen(){
  if(!_wsAOv)_wsABuild();
  await _wsALoadCfg();
  _wsARelabel();
  _wsAOv.classList.add('open');_wsAOv.style.display='flex';
  try{const i=document.getElementById('ws-a-q');if(i)i.focus()}catch(e){}
}
function _wsAClose(){if(_wsAOv){_wsAOv.classList.remove('open');_wsAOv.style.display='none'}}
/* ── p15：fab 去字贴邻居：向右下角 #fab-dock 注入纯图标小助手入口（#cal-mini 之前，带一枚 fab-sep）── */
function _wsAInjectFab(){
  try{
    const dock=document.getElementById('fab-dock');
    if(!dock)return;
    if(document.getElementById('ws-a-fab'))return;
    const wrap=document.createElement('div');
    wrap.innerHTML='<div id="ws-a-fab" class="ws-a-fab" title="小助手：某功能在哪、怎么用，可替你打开对应页面"><span class="mini-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/></svg></span></div>';
    const fab=wrap.firstElementChild;
    if(!fab)return;
    fab.addEventListener('click',_wsAOpen);
    const sep=document.createElement('span');
    sep.className='fab-sep';
    const cal=document.getElementById('cal-mini');
    if(cal&&cal.parentNode===dock){dock.insertBefore(fab,cal);dock.insertBefore(sep,cal)}
    else{dock.appendChild(fab);dock.appendChild(sep)}
  }catch(e){}
}
function _wsABoot(){try{if(!_wsAOv)_wsABuild()}catch(e){}try{_wsAInjectFab()}catch(e){}}
window._wsAMANUAL=_wsAMANUAL;
window._wsASYS=_wsASYS;
window._wsAPAGES=_wsAPAGES;
window._wsAParse=_wsAParse;
window._wsADoOpen=_wsADoOpen;
window._wsATable=_wsATable;
window._wsADoSet=_wsADoSet;
window._wsARun=_wsARun;
window._wsAUndo=_wsAUndo;
window._wsAWrite=_wsAWrite;
window._wsASetCfgId=_wsASetCfgId;
window._wsACfgId=_wsACfgId;
window._wsALoadCfg=_wsALoadCfg;
window._wsASendQ=_wsASendQ;
window._wsAOpen=_wsAOpen;
window._wsAClose=_wsAClose;
window._wsAClear=_wsAClear;
window._wsARelabel=_wsARelabel;
window._wsAQUICK=_wsAQUICK;
window._wsABoot=_wsABoot;
if(document.readyState==='complete')_wsABoot();else document.addEventListener('DOMContentLoaded',_wsABoot);
})();`
    }
  ]
};
