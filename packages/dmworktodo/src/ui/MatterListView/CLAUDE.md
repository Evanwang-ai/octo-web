# MatterListView/
> L2 | 父级: packages/dmworktodo (包级 L2 待补) | 原生 React 回路工作台(替 iframe)

回路(Loop/Matter)的原生 React 表面。绞杀式迁移:已建表面走原生,未建暂留 iframe;真相源 = octo-matter `feat/loop` 分支 API + vanilla SPA 交互。一切色取 dmworkbase `--wk-*`,组件复用设计系统(ContextMenus/WKAvatar/SmartCreateModal),后端不动。

成员清单
MatterRouteHost.tsx: 绞杀式复合宿主,portal 到 body 覆盖 NavRail 右侧全区;view=matters 原生列表 / detail 原生详情 / cards / automation / projects / **projectDetail 原生项目详情** / iframe 未迁表面(**仅剩收件箱 mailbox**);监听 wk:nav-menu-activated·open-matter-workspace·open-matter-detail。openProjectDetail 已从 iframe 翻为原生 ProjectDetailView。
index.tsx: 列表主视图,**ViewSpec 驱动** list/board(分组/排序/筛选/显示属性)+ Tab;**全交互**:新建(emit wk:open-create-matter-modal)、多选 checkbox+批量条(状态/删除,Promise.all 并发)、优先级·状态点击快改、行右键上下文菜单、实时刷新(监听 wk:matter-updated/deleted/created→reload);**看板**卡拖拽换列(HTML5 DnD,按 groupBy 分派 status→改状态/priority→改优先级,列高亮 + 空列补齐/隐藏 + 密度)+ 协作者"等 N 人"(去重,displayed=leader||assignees[0])。工具条"筛选/显示"开合 FilterMenu/DisplayPanel。字段:优先级·状态·标题·子任务·来源·项目·M-id·领队·日期(按 displayProps 显隐;列表 assignee=leader-only 对齐 vanilla)。
viewSpec.ts: 视图规格单一真相 —— ViewSpec 类型 + VIEW_SPEC_DEFAULTS + 字段注册表(GROUPABLE/ORDERABLE/DISPLAY_PROPS,剔 deadline/labels 幻影)+ load/save(key=mlv.viewspec)+ 纯变换 filterMatters/sortMatters/groupMatters + MatterRow 增广类型。全 client-side,无 React/DOM。
DisplayPanel.tsx: Display 面板 popover(Linear 招牌)—— 布局/分组/排序+方向/看板密度·隐藏空列/显示属性 chips/重置为默认。受控,改动走 onChange(Partial<ViewSpec>)。
FilterMenu.tsx: Filter 面板 popover —— 状态多选 / 项目单选 / 发起人单选(从已载入行派生)/ 清空。受控,onChange(MatterFilters)。
panels.css: Display/Filter popover 样式(锚定右对齐 + 全屏遮罩关闭),全 --wk-*。
index.css: 列表/看板/批量条/checkbox 装订线/选中态样式,全 `--wk-*`,行 40px 内缩圆角 hover。
icons.tsx: 优先级(紧急琥珀方块/三柱)+ 状态(Linear 几何七态)SVG 原子图标;导出 STATUS_ORDER/STATUS_LABEL。SVG 着色用 style fill/stroke(属性不解析 CSS var)。
rowMenus.ts: ContextMenus 菜单数据构建器(纯函数),priorityMenu/statusMenu/rowContextMenu;落库由调用方注入的 onPick/on* 闭包完成,无副作用。
useMatterActions.ts: 单条回路写操作 hook,setPriority/setStatus/remove = 乐观更新 + updateMatter/transitionMatter/deleteMatter 落库 + emit wk:matter-updated 广播 + 失败 reload 回滚;列表快改·看板拖拽复用的单一真相。
MatterSubNav.tsx: 左子导航(全部回路/项目/自动化/经验),内联 SVG 图标;SubNavKey 类型。
CardsView.tsx: 原生经验页(替 iframe),listPreferenceCards + 按 scope 分组 + 状态 chip(draft/authorized/hit/miss/discarded,统一 --wk-*)+ 行展开(全文/依据/不适用)+ 动作(确认/弃用/恢复/删除,乐观+回滚)+ 搜索(后端 500 降级内存过滤)。真相源 vanilla renderCards/paintCards。
cards.css: 经验页样式(状态 chip 语义色替 bespoke),全 --wk-*。
AutomationView.tsx: 原生自动化列表(替 iframe),listSchedules + cronHuman(← automationCron)+ enabled 开关(乐观+回滚+pending)+ executor/target/runbook 展示;**新建/编辑走原生 ScheduleModal(内部 editing 状态),自动化编辑器 iframe 已杀**。真相源 vanilla renderAutomation。
ScheduleModal.tsx: 自动化 create/edit 巨型表单(P3,替 iframe 编辑器)—— 名称/RUNBOOK textarea/执行方(useMemberList 过滤 isBot)/输出模式(track=创建issue|runonly=仅运行)/关联项目 or 目标群(listBotChannels)/cron+cronHuman 预览+预设/时区/启用 → createSchedule|updateSchedule。字段对齐后端 scheduleReq struct。真相源 vanilla renderAutomation modal。
automationCron.ts: cron 人话纯函数(cronHuman),AutomationView 列表 + ScheduleModal 预览共用。
automation.css / schedModal.css: 自动化页 / modal 样式,全 --wk-*。todoApi 新增 listBotChannels(GET /bots/:uid/channels)。
ProjectsView.tsx: 原生项目列表(替 iframe 列表),listProjects(富字段)+ 名称/领队/范围/创建 表格 + 新建项目 modal(name+scope→createProject)+ 归档切换(updateProject archived,乐观+pending)+ 显示已归档;项目详情(内嵌看板/成员/上下文,GET /projects/:id 404 靠列表缓存)暂走 iframe(onOpenDetail→#/project/:id 单数)。真相源 vanilla renderProjects。
projects.css: 项目页样式(表格行/新建 modal),全 --wk-*。
ProjectDetailView.tsx: 原生项目详情(P2,替 iframe #/project/:id)—— 头[名/scope]+ 3 tab:**看板**(内嵌 MatterListView,baseFilters={project_id},embedded,复用全部 board/viewSpec/交互)/ **成员**(MemberPicker controlled 管人 diff→add/removeProjectMember + 常驻 bot 列表/移除)/ **上下文**(sources 列表/移除 + **加来源** 文本 link/note/doc + **↥上传文件** 跨仓 octo-server /api/v1/file/upload → kind=file 来源)。GET /projects/:id 404 靠 listProjects(true) 缓存取名/scope/creator。真相源 vanilla renderProjectDetail/projectSourceUpload。todoApi.uploadProjectFile(单开 fetch,非 matter BASE)。
projectDetail.css: 项目详情样式(头/tab/成员行/来源卡),全 --wk-*。
index.tsx 新增 props: **baseFilters**(并入列表查询,JSON-key 稳定化)+ **embedded**(is-embedded);MatterListParams 补 project_id。
MatterDetailView.tsx: 原生详情,getMatter/listTimeline/listOutputs/listActivities/**getIterations/getMatterTree/createSubMatter/addFeedback**;区块:标题/状态/blocker banner/**review banner[通过=transition done · 需要修改=addFeedback,后端在 review 态自动打回 review→in_progress]**/Brief/计划(mode)/**迭代=iterations 轮次(第N轮+outcome 徽章 待确认/已通过/需修改)**/**进度=activities 审计轨迹(actHuman 人话)**/动态=timeline/产出=outputs/发车 composer(addTimelineEntry);Inspector:状态 select、优先级(**可编辑**→ContextMenus+updateMatter)、项目(**可编辑 select**→updateMatter project_id)、编号/发起人/领队/协作者(只读,对齐 vanilla)。**详情长尾(P1)**:**子任务**(children 来自 getMatterTree 扁平摘要;**+派一个子任务**=createSubMatter{parent_matter_id,step_id/order},乐观 reloadTree,树即权限后端守卫)→ **计划图**(children>0 时渲染 PlanGraph)。todoApi 新增 getIterations/getMatterTree/createSubMatter/addFeedback/sendBack(feat/loop 后端就绪,curl 实测;/tree children 扁平非递归)。真相源 vanilla paintMatter/paintInspector/openSubMatterModal/planGraphHTML。
PlanGraph.tsx: 计划图(几何即语义,P1 子件④)—— 领队 root → 子任务节点列 → 汇总 join,SVG 贝塞尔连线(useLayoutEffect 测量节点位置),mode-aware 线性(critic/pipeline 链)/扇形(split/swarm/roundtable)布局;节点=状态环点+role tag+title+assignee+state 徽章。真相源 vanilla planGraphHTML/drawPlanEdges。
planGraph.css → 并入 detail.css(.plan-graph/.pg-* 全 --wk-*)。
detail.css: 详情 + Inspector 样式,全 `--wk-*`。

法则: 成员完整·一行一文件·复用设计系统件·真相源 vanilla feat/loop·不碰 Go 后端

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
