# 历史窗口按固定步长前移，导致提示缓存周期性整段重建（电脑端同款）

**目标仓库**：`Sui-IB/InternalBeyond`（issue）
**形态**：只报不改，不附参考实现
**基线**：上游 `f8955fd1`（2026-09-26 重锚）
**相关**：手机端同款问题 [InternalBeyond-Mobile#10](https://github.com/Sui-IB/InternalBeyond-Mobile/issues/10)

---

## 定位

电脑端两处取窗逻辑与手机端同源，步长公式一致：

`_cacheStableSlice`（基线约 15033 行）

```js
function _cacheStableSlice(list, keepCount) {
  keepCount = Math.max(1, keepCount | 0);
  const total = (list && list.length) || 0;
  if (total <= keepCount) return (list || []).slice();
  const step = Math.max(6, Math.min(24, Math.ceil(keepCount / 2)));
  const start = Math.floor((total - keepCount) / step) * step;
  return list.slice(start);
}
```

`_apiHistWinD`（基线约 15020 行）用同一 `step` 决定条数：

```js
const step = Math.max(6, Math.min(24, Math.ceil(keep / 2)));
// …
const n = total <= keep ? out.length : Math.min(out.length, keep + ((total - keep) % step));
```

调用点：

- 群聊（约 14123 行）：`const history = _cacheStableSlice(gMsgs, gKeepCount);`，注释写着「缓存修复：阶梯窗口，起点不再逐条滑动」
- 单聊（约 14471 行）：`const history = await _apiHistWinD(...)`，同一注释

## 机制

当读取条数较大时，`Math.ceil(keepCount / 2)` 远超 24，`step` 被封顶为 **24**。此后每新增一条消息，`total - keepCount` 对 24 取余的余数从 23 归零时：

- 窗口起点一次向前跳 24，
- 窗口内条数从 `keep + 23` 收缩为 `keep`，
- 最旧约 23 条被挤出、尾部并入 1 条新消息，**净减约 22 条**。

对提示缓存而言，system 块可以保持不变，但**历史前缀从第一条起整体更换**。缓存按最长公共前缀命中，前缀在历史开头分叉 ⇒ system 之后的全部内容按未缓存计费。

「阶梯窗口」把逐条滑动改成了按步长跳，降低了变更频率，但**跳档那一次仍然整段重建**，这是公式决定的，不是偶发。

手机端同款逻辑已用服务商侧 token 明细核对过（[InternalBeyond-Mobile#10](https://github.com/Sui-IB/InternalBeyond-Mobile/issues/10)）：断档时残留缓存值稳定在 system 量级、净减条数与公式一致、间隔与 24 条步长一致。电脑端公式与调用形态相同，行为可同样推出。

## 触发条件

1. 「AI 读取范围」里的聊天 / 群聊条数设为较大值（单聊可到 9999，群聊可到 999；默认为 5 / 10，较小）。
2. 原始消息条数超过该读取上限。
3. 此后约每新增 `step` 条消息（上限 ≥ 48 时 step = 24），窗口越过一个步长边界。

摘要开启且覆盖范围不是「ctx」时，`keepCount` 改为摘要的「近期保留条数」（3/6/10/20/30/60），步长随之变小，但跳档行为相同。

## 现象

观察环境：电脑端单文件 HTML，浏览器打开；缓存按服务商前缀命中统计。

在读取上限设大、且同一角色连续对话超过上限后，提示缓存会按约 24 条消息一次的节奏出现整段重建：未缓存输入冲高、缓存读掉到 system 量级，下一轮又恢复。不需要改人设、不需要动协议开关。

电脑端还带有面向缓存的专项设计，会被这一行为削弱：

- Anthropic：`_injectAnthropicMsgCache`（约 15089 行）在「倒数第 2 条」与「倒数第 26 条」打 `cache_control` 断点（26 = 24 + 2，与步长对齐）；system 侧另有 `_sysBlocksD` 分块缓存。
- OpenAI：`prompt_cache_key` 按角色固定，用于提升前缀命中。
- 另有「提示缓存」开关与「缓存保留 1 小时」（`cacheTtl1h`）。

断点都落在窗口**尾部**，而跳档发生在窗口**头部**；头部一换，到尾部断点为止的整段前缀都变了，尾部断点随之失效。结果是：断点位置设计得再准，也挡不住起点跳变带来的重建。

## 验证状态

- 机制层：以上游基线源码为准；电脑端与手机端两处函数为同构实现，步长公式一致。
- 计量层：手机端已有生产环境 token 明细与上述机制对照（[InternalBeyond-Mobile#10](https://github.com/Sui-IB/InternalBeyond-Mobile/issues/10)）。电脑端侧服务商 token 明细尚未采集，目前完成的是代码机制核对与两端公式比对。
- 缓存策略层：`cache_control` 断点相对窗口尾部，与头部跳变的失效关系由前缀缓存语义直接推出。

## 没动什么

- 未修改取窗算法、缓存断点与请求体。
- 未向远端推送任何提交；行号以干净基线 `f8955fd1` 为准，本地为补丁模式、与基线逐项对照后引用。
- 手机端诊断展示字段与本 issue 无关，也不改变上述行为。

以上是抛砖引玉。若打算换一种取窗与断点对齐策略，或先在设置里限制读取上限的可选值，都请随意安排💗。
