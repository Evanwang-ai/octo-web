# api/multica/
> L3 | 父级: packages/dmworktodo | multica 契约层 + mock 数据源(方向A UI 先行)

方向A(Multica 前端翻译)的数据层地基:类型照抄 multica 契约、client 函数签名对齐 multica fnName、实现今天是 mock、接线日整层换真实 fetch(第三套 axios 实例,X-Workspace-ID 头),消费组件零改动。真相源 = `计划文档/Multica契约对照表-2026-07-03.md`。multica 原词(issue/workspace/task/agent)只许出现在本层,UI 外显过词表(→回路/组队/执行/worker)。

成员清单
types.ts: multica 契约类型——收件箱域(InboxSeverity 三档/InboxItemType 18 型/InboxItem/InboxWorkspaceUnread),字段逐字照抄 multica core/types/inbox.ts;type 走 lenient(string &)通道容前端注入型(system_welcome);issue_status mock 期=matter 七态,接线时建映射表。后续域(worker/transcript/squads/skills)续入本文件夹。
mockInbox.ts: 内存 mock 数据库——水合策略:listMatters 取真实回路→按状态合成语义一致事件(review→review_requested/blocked→agent_blocked/done→completed/in_progress→双条验证去重…),issue_id=真 matter id(阅读窗可嵌原生详情);降级静态兜底**不缓存 seededFor**(启动早期 401 自愈);恒注入 actor=system 欢迎系统信(契约表 §2.3-⑫)。变更函数返回形状对齐契约(单条返 InboxItem/批量返 count)。
client.ts: 【换源点】收件箱域 8 端点(listInbox/markInboxRead/archiveInbox/getUnreadInboxCount/markAllInboxRead/archiveAllInbox/archiveAllReadInbox/archiveCompletedInbox)+ 纯函数 deduplicateInboxItems/unreadCountOf(镜像 multica core/inbox/queries.ts);120ms 拟真延迟接线时删。未做:unread-summary(等组队切换器)、notification-preferences(等设置页)。

法则: 类型逐字照抄契约·client 签名对齐 multica fnName·mock 只在本层·UI 词过防火墙

[PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
