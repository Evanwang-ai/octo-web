# MatterListView/
> L2 | 父级: packages/dmworktodo (包级 L2 待补) | 原生 React 回路工作台(替 iframe)

回路(Loop/Matter)的原生 React 表面。绞杀式迁移:已建表面走原生,未建暂留 iframe;真相源 = octo-matter `feat/loop` 分支 API + vanilla SPA 交互。一切色取 dmworkbase `--wk-*`,组件复用设计系统(ContextMenus/WKAvatar/SmartCreateModal),后端不动。

成员清单
MatterRouteHost.tsx: 绞杀式复合宿主,portal 到 body 覆盖 NavRail 右侧全区;view=matters 原生列表 / detail 原生详情 / iframe 未迁表面(收件箱/项目/自动化/经验);监听 wk:nav-menu-activated·open-matter-workspace·open-matter-detail。
index.tsx: 列表主视图,list/board 双布局 + 状态分组 + Tab;**全交互**:新建(emit wk:open-create-matter-modal)、多选 checkbox+批量条(状态/删除,Promise.all 并发)、优先级·状态点击快改、行右键上下文菜单、实时刷新(监听 wk:matter-updated/deleted/created→reload);**看板**卡拖拽换列(HTML5 DnD→transitionMatter,列高亮)+ 协作者"等 N 人"(displayed=leader||assignees[0])。字段:优先级·状态·标题·子任务·项目·M-id·领队·日期(列表 assignee=leader-only 对齐 vanilla)。
index.css: 列表/看板/批量条/checkbox 装订线/选中态样式,全 `--wk-*`,行 40px 内缩圆角 hover。
icons.tsx: 优先级(紧急琥珀方块/三柱)+ 状态(Linear 几何七态)SVG 原子图标;导出 STATUS_ORDER/STATUS_LABEL。SVG 着色用 style fill/stroke(属性不解析 CSS var)。
rowMenus.ts: ContextMenus 菜单数据构建器(纯函数),priorityMenu/statusMenu/rowContextMenu;落库由调用方注入的 onPick/on* 闭包完成,无副作用。
useMatterActions.ts: 单条回路写操作 hook,setPriority/setStatus/remove = 乐观更新 + updateMatter/transitionMatter/deleteMatter 落库 + emit wk:matter-updated 广播 + 失败 reload 回滚;列表快改·看板拖拽复用的单一真相。
MatterSubNav.tsx: 左子导航(全部回路/项目/自动化/经验),内联 SVG 图标;SubNavKey 类型。
MatterDetailView.tsx: 原生详情,getMatter/listTimeline/listOutputs + composer addTimelineEntry + 状态流转 transitionMatter + Inspector(编号/优先级/发起人/领队/协作者/项目)+ Brief 软卡片。
detail.css: 详情 + Inspector 样式,全 `--wk-*`。

法则: 成员完整·一行一文件·复用设计系统件·真相源 vanilla feat/loop·不碰 Go 后端

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
