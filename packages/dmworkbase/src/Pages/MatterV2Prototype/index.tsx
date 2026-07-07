import React, { useEffect, useState } from "react"
import {
    Archive,
    BookOpen,
    Bot,
    Briefcase,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Plus,
    Settings2,
    Circle,
    ClipboardList,
    Edit3,
    Expand,
    Eye,
    Lock,
    MoreHorizontal,
    Paperclip,
    Pin,
    Save,
    Search,
    Sparkles,
    Trash2,
    UserPlus,
    Users,
} from "lucide-react"
import WKApp from "../../App"
import { SKILLS, SkillsListSurface, ImportSkillModal, SkillDetailSurface } from "../SkillsPrototype"
import { CreateAgentModal } from "../AgentsPrototype"
import "./index.css"

// T1 换皮(蓝图 §1.2):单模块 sidebar——砍 搜索/收件箱/用量/设置/workspace 下拉,
// 并入 技能 节点;CoWorker 中文定名「AI 队友」。收件箱砍除后 review 入口=我的 Loop(T5 补四 tabs)。
type MatterView = "issues" | "myissues" | "projects" | "automation" | "coworkers" | "squads" | "skills" | "workspaces"

// ── workspace 层(③/P6/P7/P8):Hotjar 下拉 + Notion teamspace 创建/管理;成员从 Octo Space 拉,不走邮箱邀请 ──
const SPACE_NAME = "明略 · Octo Space"
const SPACE_MEMBERS = [
    { id: "u-evan", name: "王宜林", role: "产品" },
    { id: "u-lvsijia", name: "吕思佳", role: "后端" },
    { id: "u-jiawei", name: "黄佳伟", role: "IM 平台" },
    { id: "u-jianhui", name: "陈建辉", role: "搜索" },
    { id: "u-yizhou", name: "林一舟", role: "前端" },
    { id: "u-wanqing", name: "苏晚晴", role: "设计" },
]

type Workspace = { id: string; name: string; desc: string; members: number; updated: string; isDefault?: boolean }

const WORKSPACES_SEED: Workspace[] = [
    { id: "ws-product", name: "产品研发部", desc: "OctoLoop 主战场:V1 换皮与派单闭环。", members: 12, updated: "今天", isDefault: true },
    { id: "ws-growth", name: "增长实验室", desc: "转化实验与渠道自动化。", members: 6, updated: "昨天" },
    { id: "ws-support", name: "客服中台", desc: "工单分诊与知识库维护。", members: 9, updated: "3 天前" },
    { id: "ws-content", name: "内容运营", desc: "官网与公众号内容生产线。", members: 4, updated: "上周" },
    { id: "ws-core", name: "OctoLoop 核心", desc: "引擎与 runtime 联调现场。", members: 8, updated: "上周" },
    { id: "ws-sandbox", name: "个人沙盒", desc: "只属于你的试验田。", members: 1, updated: "6月30日" },
]

const SQUADS = [
    {
        id: "squad-onboard",
        name: "OctoLoop Onboarding Squad",
        leader: "Prototyper-Codex-MBOT",
        members: ["Prototyper-Codex-MBOT", "Analyser-CC-MBOT", "Documenter-Worker"],
        creator: "lvsijia",
        created: "2 小时前",
        updated: "2 小时前",
        description: "Prototyper + Analyser + Documenter：上手指南与演示链路打磨小队。",
    },
    {
        id: "squad-triage",
        name: "Loop 分诊小队",
        leader: "Triager-Worker",
        members: ["Triager-Worker", "Analyser-CC-MBOT"],
        creator: "lvsijia",
        created: "3 天前",
        updated: "昨天",
        description: "Triager + Analyser：新 Loop 补上下文、定优先级、派人。",
    },
]

const COWORKERS = [
    { id: "cw-prototyper", name: "Prototyper-Codex-MBOT", desc: "把杂乱请求整理成清晰 Loop,推进状态并给出下一步。", runtime: "Codex (kaka-mbp)", owner: "lvsijia", lastActive: "今天", runs: 5, archived: false, visibility: "personal", concurrency: 2 },
    { id: "cw-analyser", name: "Analyser-CC-MBOT", desc: "读 PDF 与上下文做独立分析,先结论后论据。", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "3 天前", runs: 5, archived: false, visibility: "workspace", concurrency: 6 },
    { id: "cw-documenter", name: "Documenter-Worker", desc: "把讨论沉淀为文档与交付说明。", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "3 天前", runs: 5, archived: false, visibility: "workspace", concurrency: 4 },
    { id: "cw-triager", name: "Triager-Worker", desc: "新 Loop 分诊:补上下文、定优先级、派人。", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "30 天内无活动", runs: 0, archived: true, visibility: "workspace", concurrency: 1 },
]

// ── 共享:按状态分组的 Loop 列表(T3 Tasks tab / T5 列表视图共用)──
const ISSUE_ROWS = [
    { key: "OCT-1", title: "test", project: "Octo-Runtime", status: "待办", pri: "none" },
    { key: "OCT-2", title: "询问当前 agent 身份和模型", project: "Octo-Runtime", status: "审核中", pri: "mid" },
    { key: "OCT-3", title: "回答运行环境询问：workspace 绝对路径、机器名称、执行状态", project: "Octo-Runtime", status: "审核中", pri: "mid" },
    { key: "OCT-4", title: "整理 OctoLoop 上手指南", project: "OctoLoop 产品手册", status: "已完成", pri: "mid" },
    { key: "OCT-5", title: "附件测试：仅 PDF → Runtime 抽取文字", project: "接线演练场", status: "已完成", pri: "urgent" },
    { key: "OCT-6", title: "等待上游接口：回调闭环验证", project: "接线演练场", status: "已阻塞", pri: "mid" },
] as const

const ISSUE_STATUSES = [
    { label: "待规划", tone: "backlog" },
    { label: "待办", tone: "todo" },
    { label: "进行中", tone: "doing" },
    { label: "审核中", tone: "review" },
    { label: "已完成", tone: "done" },
    { label: "已阻塞", tone: "blocked" },
] as const

function PriorityIcon({ pri }: { pri: "none" | "mid" | "urgent" }) {
    if (pri === "none") return <span className="wk-mv2-pri is-none" aria-label="无优先级">—</span>
    return (
        <svg className={`wk-mv2-pri${pri === "urgent" ? " is-urgent" : ""}`} width="14" height="12" viewBox="0 0 14 12" aria-hidden>
            <rect x="1" y="7" width="3" height="4" rx="1" />
            <rect x="5.5" y="4" width="3" height="7" rx="1" />
            <rect x="10" y="1" width="3" height="10" rx="1" opacity={pri === "urgent" ? 1 : 0.35} />
        </svg>
    )
}

function IssueGroupList({ rows }: { rows: ReadonlyArray<typeof ISSUE_ROWS[number]> }) {
    return (
        <div className="wk-mv2-grouplist">
            {ISSUE_STATUSES.map((st) => {
                const group = rows.filter((r) => r.status === st.label)
                return (
                    <section key={st.label}>
                        <header className={`wk-mv2-grouplist__head is-${st.tone}`}>
                            <input type="checkbox" aria-label={`选择 ${st.label} 组`} />
                            <ChevronDown size={13} />
                            <i className="wk-mv2-status-dot" />
                            <strong>{st.label}</strong>
                            <small>{group.length}</small>
                        </header>
                        {group.length === 0 ? (
                            <div className="wk-mv2-grouplist__empty">无 Loop</div>
                        ) : (
                            group.map((r) => (
                                <button key={r.key} type="button" className="wk-mv2-grouplist__row">
                                    <PriorityIcon pri={r.pri} />
                                    <span className="wk-mv2-grouplist__key">{r.key}</span>
                                    <span className="wk-mv2-grouplist__title">{r.title}</span>
                                    <span className="wk-mv2-grouplist__proj">📁 {r.project}</span>
                                    <span className="wk-mv2-grouplist__bot"><Bot size={13} /></span>
                                </button>
                            ))
                        )}
                    </section>
                )
            })}
        </div>
    )
}

export default function MatterV2Prototype() {
    const [activeView, setActiveView] = useState<MatterView>("issues")
    const [createIssueOpen, setCreateIssueOpen] = useState(false)
    const [workspaces, setWorkspaces] = useState<Workspace[]>(WORKSPACES_SEED)
    const [currentWsId, setCurrentWsId] = useState("ws-product")
    const [wsMenuOpen, setWsMenuOpen] = useState(false)
    const [createWsOpen, setCreateWsOpen] = useState(false)
    const currentWs = workspaces.find((w) => w.id === currentWsId) ?? workspaces[0]

    function setView(nextView: MatterView) {
        setActiveView(nextView)
    }

    function showSurface(view = activeView) {
        if (view === "workspaces") {
            WKApp.routeRight.replaceToRoot(
                <MatterWorkspacesManage
                    workspaces={workspaces}
                    currentWsId={currentWsId}
                    onCreate={() => setCreateWsOpen(true)}
                    onDelete={(id) => {
                        setWorkspaces((list) => list.filter((w) => w.id !== id))
                        if (currentWsId === id) setCurrentWsId(WORKSPACES_SEED[0].id)
                    }}
                />
            )
            return
        }
        if (view === "myissues") {
            WKApp.routeRight.replaceToRoot(
                <MatterIssuesBoard title="我的 Loop" tabs={["全部", "已分配", "我创建的", "我的智能体和小队"]} defaultTab={1} />
            )
            return
        }
        if (view === "projects") {
            WKApp.routeRight.replaceToRoot(<MatterProjectsList />)
            return
        }
        if (view === "automation") {
            WKApp.routeRight.replaceToRoot(<MatterAutomationList />)
            return
        }
        if (view === "coworkers") {
            WKApp.routeRight.replaceToRoot(<MatterCoWorkersList />)
            return
        }
        if (view === "squads") {
            WKApp.routeRight.replaceToRoot(<MatterSquadsList />)
            return
        }
        if (view === "skills") {
            WKApp.routeRight.replaceToRoot(<MatterSkillsHost />)
            return
        }
        WKApp.routeRight.replaceToRoot(<MatterIssuesBoard />)
    }

    useEffect(() => {
        showSurface()
    }, [activeView, workspaces, currentWsId])

    useEffect(() => {
        const handleActivated = (payload: { menuId?: string }) => {
            if (payload?.menuId === "matter-v2") showSurface()
        }
        WKApp.mittBus.on("wk:nav-menu-activated" as any, handleActivated as any)
        return () => WKApp.mittBus.off("wk:nav-menu-activated" as any, handleActivated as any)
    }, [activeView])

    return (
        <>
        <aside className="wk-matter-v2-sidebar" aria-label="MatterV2 sidebar">
            {/* workspace 切换器(P6=Hotjar Site Search):当前工作区名 + ⌄,面板渲染在 aside 外 */}
            <header className="wk-matter-v2-sidebar__workspace">
                <button
                    type="button"
                    className="wk-matter-v2-sidebar__workspace-btn is-switch"
                    aria-haspopup="menu"
                    aria-expanded={wsMenuOpen}
                    onClick={() => setWsMenuOpen((v) => !v)}
                >
                    <span className="wk-matter-v2-sidebar__mark">{currentWs.name.slice(0, 1)}</span>
                    <strong>{currentWs.name}</strong>
                    <ChevronDown size={14} className="wk-matter-v2-sidebar__chev" />
                </button>
            </header>

            <div className="wk-matter-v2-sidebar__quick">
                <button type="button" onClick={() => setCreateIssueOpen(true)}><Edit3 size={16} />新建 Loop<kbd>C</kbd></button>
            </div>

            <nav className="wk-matter-v2-sidebar__nav">
                <button type="button" className={activeView === "myissues" ? "is-active" : ""} onClick={() => setView("myissues")}>
                    <Circle size={16} />
                    我的 Loop
                </button>
            </nav>

            <div className="wk-matter-v2-sidebar__group">
                <span>工作区</span>
                <button type="button" className={activeView === "issues" ? "is-active" : ""} onClick={() => setView("issues")}>
                    <ClipboardList size={16} />
                    Loops
                </button>
                <button type="button" className={activeView === "projects" ? "is-active" : ""} onClick={() => setView("projects")}>
                    <Briefcase size={16} />
                    项目
                </button>
                <button type="button" className={activeView === "automation" ? "is-active" : ""} onClick={() => setView("automation")}>
                    <Sparkles size={16} />
                    自动化
                </button>
                <button type="button" className={activeView === "coworkers" ? "is-active" : ""} onClick={() => setView("coworkers")}>
                    <Bot size={16} />
                    AI 队友
                </button>
                <button type="button" className={activeView === "squads" ? "is-active" : ""} onClick={() => setView("squads")}>
                    <Users size={16} />
                    小队
                </button>
                <button type="button" className={activeView === "skills" ? "is-active" : ""} onClick={() => setView("skills")}>
                    <BookOpen size={16} />
                    技能
                </button>
            </div>

        </aside>
        {/* 弹窗必须在 aside 外:sidebar 的 button{width:100%} 会泄漏进弹窗(原型遗留 bug) */}
        {createIssueOpen && <MatterCreateIssueModal onClose={() => setCreateIssueOpen(false)} />}
        {wsMenuOpen && (
            <MatterWorkspaceMenu
                workspaces={workspaces}
                currentWsId={currentWsId}
                onPick={(id) => {
                    setCurrentWsId(id)
                    setWsMenuOpen(false)
                }}
                onCreate={() => {
                    setWsMenuOpen(false)
                    setCreateWsOpen(true)
                }}
                onManage={() => {
                    setWsMenuOpen(false)
                    setView("workspaces")
                }}
                onClose={() => setWsMenuOpen(false)}
            />
        )}
        {createWsOpen && (
            <MatterWorkspaceCreateModal
                onClose={() => setCreateWsOpen(false)}
                onCreate={(ws) => {
                    setWorkspaces((list) => [...list, ws])
                    setCurrentWsId(ws.id)
                    setCreateWsOpen(false)
                }}
            />
        )}
        </>
    )
}

export { MatterV2Prototype }

// ── P6 workspace 下拉(参考 Hotjar Web Site Search):搜索(≥5 才出现)+ 组标签 + 列表 + 底部两动作 ──
function MatterWorkspaceMenu({
    workspaces,
    currentWsId,
    onPick,
    onCreate,
    onManage,
    onClose,
}: {
    workspaces: Workspace[]
    currentWsId: string
    onPick: (id: string) => void
    onCreate: () => void
    onManage: () => void
    onClose: () => void
}) {
    const [query, setQuery] = useState("")
    const q = query.trim().toLowerCase()
    const visible = workspaces.filter((w) => w.name.toLowerCase().includes(q))
    return (
        <div className="wk-ws-menu" role="presentation" onMouseDown={onClose}>
            <div className="wk-ws-menu__panel" role="menu" aria-label="切换工作区" onMouseDown={(e) => e.stopPropagation()}>
                {workspaces.length >= 5 && (
                    <label className="wk-ws-menu__search">
                        <Search size={14} />
                        <input placeholder="搜索工作区..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
                    </label>
                )}
                <div className="wk-ws-menu__list">
                    <span className="wk-ws-menu__group">{SPACE_NAME}</span>
                    {visible.map((w) => (
                        <button
                            key={w.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={w.id === currentWsId}
                            className={w.id === currentWsId ? "wk-ws-menu__item is-current" : "wk-ws-menu__item"}
                            onClick={() => onPick(w.id)}
                        >
                            <span className="wk-ws-menu__mark">{w.name.slice(0, 1)}</span>
                            <span className="wk-ws-menu__name">{w.name}</span>
                            <span className="wk-ws-menu__meta">{w.members} 成员</span>
                            {w.id === currentWsId && <Check size={14} className="wk-ws-menu__check" />}
                        </button>
                    ))}
                    {visible.length === 0 && <div className="wk-ws-menu__empty">没有匹配的工作区</div>}
                </div>
                <div className="wk-ws-menu__foot">
                    <button type="button" onClick={onCreate}>
                        <Plus size={14} />
                        新建工作区
                    </button>
                    <button type="button" onClick={onManage}>
                        <Settings2 size={14} />
                        管理工作区
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── P7 新建工作区(参考 Notion Creating a teamspace;Open 权限砍除,换「从 Octo Space 拉人」)──
function MatterWorkspaceCreateModal({
    onClose,
    onCreate,
}: {
    onClose: () => void
    onCreate: (ws: Workspace) => void
}) {
    const [name, setName] = useState("")
    const [desc, setDesc] = useState("")
    const [picked, setPicked] = useState<string[]>(["u-evan"])
    const [query, setQuery] = useState("")
    const visibleMembers = SPACE_MEMBERS.filter((m) => m.name.includes(query.trim()))

    function toggle(id: string) {
        setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
    }

    function submit() {
        const trimmed = name.trim() || "未命名工作区"
        onCreate({
            id: `ws-${Math.random().toString(36).slice(2, 8)}`,
            name: trimmed,
            desc: desc.trim() || "刚创建的工作区。",
            members: picked.length,
            updated: "刚刚",
        })
    }

    return (
        <div className="wk-ws-create" role="presentation" onMouseDown={onClose}>
            <div className="wk-ws-create__dialog" role="dialog" aria-modal="true" aria-label="新建工作区" onMouseDown={(e) => e.stopPropagation()}>
                <header className="wk-ws-create__head">
                    <div>
                        <h2>新建工作区</h2>
                        <p>工作区是团队组织 Loop、成员与协作的地方。</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="关闭">✕</button>
                </header>
                <main className="wk-ws-create__body">
                    <div className="wk-ws-create__field">
                        <span className="wk-ws-create__label">图标和名称</span>
                        <div className="wk-ws-create__namerow">
                            <span className="wk-ws-create__icon">{(name.trim() || "工").slice(0, 1)}</span>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:增长实验室" autoFocus />
                        </div>
                    </div>
                    <div className="wk-ws-create__field">
                        <span className="wk-ws-create__label">描述</span>
                        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="这个工作区负责什么..." />
                    </div>
                    <div className="wk-ws-create__field">
                        <span className="wk-ws-create__label">
                            成员<em>从 {SPACE_NAME} 选择,而不是邮箱邀请</em>
                        </span>
                        <label className="wk-ws-create__search">
                            <Search size={14} />
                            <input placeholder="搜索 Space 成员..." value={query} onChange={(e) => setQuery(e.target.value)} />
                        </label>
                        <div className="wk-ws-create__members">
                            {visibleMembers.map((m) => (
                                <label key={m.id} className="wk-ws-create__member">
                                    <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
                                    <span className="wk-ws-create__avatar">{m.name.slice(0, 1)}</span>
                                    <span className="wk-ws-create__mname">{m.name}</span>
                                    <span className="wk-ws-create__mrole">{m.role}</span>
                                </label>
                            ))}
                            {visibleMembers.length === 0 && <div className="wk-ws-create__empty">没有匹配的成员</div>}
                        </div>
                    </div>
                </main>
                <footer className="wk-ws-create__foot">
                    <span className="wk-ws-create__picked">已选 {picked.length} 人</span>
                    <div className="wk-ws-create__actions">
                        <button type="button" className="wk-ws-create__cancel" onClick={onClose}>取消</button>
                        <button type="button" className="wk-ws-create__submit" onClick={submit}>创建工作区</button>
                    </div>
                </footer>
            </div>
        </div>
    )
}

// ── P8 工作区管理(参考 Notion Teamspaces 设置页):默认工作区卡 + 无列头行 + ⋯ 行菜单 ──
function MatterWorkspacesManage({
    workspaces,
    currentWsId,
    onCreate,
    onDelete,
}: {
    workspaces: Workspace[]
    currentWsId: string
    onCreate: () => void
    onDelete: (id: string) => void
}) {
    const [query, setQuery] = useState("")
    const [menuFor, setMenuFor] = useState<string | null>(null)
    const visible = workspaces.filter((w) => w.name.includes(query.trim()))
    const defaultWs = workspaces.find((w) => w.isDefault)

    return (
        <section className="wk-wsmg" aria-label="工作区管理">
            <header className="wk-wsmg__head">
                <div>
                    <h1>
                        工作区 <em>{workspaces.length}</em>
                    </h1>
                    <p>管理 {SPACE_NAME} 下的工作区。</p>
                </div>
                <div className="wk-wsmg__tools">
                    <label className="wk-wsmg__search">
                        <Search size={14} />
                        <input placeholder="搜索工作区..." value={query} onChange={(e) => setQuery(e.target.value)} />
                    </label>
                    <button type="button" className="wk-wsmg__new" onClick={onCreate}>
                        <Plus size={15} />
                        新建工作区
                    </button>
                </div>
            </header>

            <section className="wk-wsmg__default">
                <div>
                    <strong>默认工作区</strong>
                    <p>Space 新成员加入时,会自动进入这个工作区。</p>
                </div>
                <select defaultValue={defaultWs?.id}>
                    {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    ))}
                </select>
            </section>

            <div className="wk-wsmg__list">
                {visible.map((w) => (
                    <div key={w.id} className="wk-wsmg__row">
                        <span className="wk-wsmg__mark">{w.name.slice(0, 1)}</span>
                        <div className="wk-wsmg__main">
                            <strong>
                                {w.name}
                                {w.isDefault && <i>默认</i>}
                                {w.id === currentWsId && <i className="is-cur">当前</i>}
                            </strong>
                            <span>{w.desc}</span>
                        </div>
                        <span className="wk-wsmg__meta">{w.members} 成员 · 更新于 {w.updated}</span>
                        <div className="wk-wsmg__more">
                            <button type="button" aria-label="更多操作" onClick={() => setMenuFor(menuFor === w.id ? null : w.id)}>
                                <MoreHorizontal size={16} />
                            </button>
                            {menuFor === w.id && (
                                <div className="wk-wsmg__menu" role="menu">
                                    <button type="button" role="menuitem" onClick={() => setMenuFor(null)}>重命名...</button>
                                    <button type="button" role="menuitem" onClick={() => setMenuFor(null)}>移交负责人...</button>
                                    {!w.isDefault && (
                                        <button
                                            type="button"
                                            role="menuitem"
                                            className="is-danger"
                                            onClick={() => {
                                                setMenuFor(null)
                                                onDelete(w.id)
                                            }}
                                        >
                                            删除工作区
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {visible.length === 0 && <div className="wk-wsmg__empty">没有匹配的工作区</div>}
            </div>
        </section>
    )
}

// 技能节点宿主:复用 SkillsPrototype 的 surfaces(列表/详情/导入),Skill 库长期迁「我的」(User 级)
function MatterSkillsHost() {
    const [query, setQuery] = useState("")
    const [importOpen, setImportOpen] = useState(false)

    const normalizedQuery = query.trim().toLowerCase()
    const visibleSkills = SKILLS.filter(
        (skill) =>
            !normalizedQuery
            || skill.title.toLowerCase().includes(normalizedQuery)
            || skill.description.toLowerCase().includes(normalizedQuery),
    )

    return (
        <>
            <SkillsListSurface
                skills={visibleSkills}
                query={query}
                onQueryChange={setQuery}
                onOpenImport={() => setImportOpen(true)}
                onOpenSkill={(skill) => WKApp.routeRight.replaceToRoot(<SkillDetailSurface skill={skill} />)}
            />
            {importOpen && <ImportSkillModal onClose={() => setImportOpen(false)} />}
        </>
    )
}

// T5:看板对齐真身——6 列(已阻塞淡红/进行中淡黄/审核中淡绿)、卡片(优先级/进度环/小队形态)、
// 筛选 7 维、显示面板(卡片属性 8 开关,真正驱动卡片渲染)、视图切换(看板/列表;泳道 V1 不做)。
interface BoardCard {
    key: string
    title: string
    desc: string
    project: string
    agent: string
    agentType: "bot" | "squad" | "none"
    updated: string
    pri: "none" | "mid" | "urgent"
    progress?: { done: number; total: number }
}

const BOARD_COLUMNS: Array<{ id: string; label: string; tone: string; cards: BoardCard[] }> = [
    { id: "backlog", label: "待规划", tone: "backlog", cards: [] },
    {
        id: "todo",
        label: "待办",
        tone: "todo",
        cards: [
            { key: "OCT-1", title: "test", desc: "", project: "Octo-Runtime", agent: "未分配", agentType: "none", updated: "", pri: "none" },
        ],
    },
    {
        id: "doing",
        label: "进行中",
        tone: "warm",
        cards: [
            { key: "OCT-7", title: "打磨 OctoLoop 演示脚本：一句话派单全链路", desc: "从建单到回报,把演示脚本走顺。", project: "OctoLoop 产品手册", agent: "OctoLoop Onboarding Squad", agentType: "squad", updated: "更新于 1 小时前", pri: "mid", progress: { done: 3, total: 5 } },
        ],
    },
    {
        id: "review",
        label: "审核中",
        tone: "green",
        cards: [
            { key: "OCT-3", title: "回答运行环境询问：workspace 绝对路径、机器名称、执行状态", desc: "User request 请回答以下关于当前运行环...", project: "Octo-Runtime", agent: "CC-Protoper", agentType: "bot", updated: "更新于 4 小时前", pri: "mid" },
            { key: "OCT-2", title: "询问当前 agent 身份和模型", desc: "User request 你是什么agents 什么模型", project: "Octo-Runtime", agent: "Prototyper", agentType: "bot", updated: "更新于 4 小时前", pri: "mid" },
        ],
    },
    {
        id: "done",
        label: "已完成",
        tone: "done",
        cards: [
            { key: "OCT-4", title: "整理 OctoLoop 上手指南", desc: "七条上手 Loop 的正文与截图。", project: "OctoLoop 产品手册", agent: "Documenter-Worker", agentType: "bot", updated: "更新于 昨天", pri: "mid", progress: { done: 4, total: 4 } },
            { key: "OCT-5", title: "附件测试：仅 PDF → Runtime 抽取文字", desc: "", project: "接线演练场", agent: "Analyser-CC-MBOT", agentType: "bot", updated: "更新于 3 天前", pri: "urgent" },
        ],
    },
    {
        id: "blocked",
        label: "已阻塞",
        tone: "red",
        cards: [
            { key: "OCT-6", title: "等待上游接口：回调闭环验证", desc: "上游 webhook 就绪后解除。", project: "接线演练场", agent: "Analyser-CC-MBOT", agentType: "bot", updated: "更新于 2 天前", pri: "mid" },
        ],
    },
]

function ProgressRing({ done, total }: { done: number; total: number }) {
    const r = 5
    const c = 2 * Math.PI * r
    const frac = total === 0 ? 0 : done / total
    return (
        <span className="wk-mv2-ring" title={`子 Loop ${done}/${total}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <circle cx="7" cy="7" r={r} fill="none" stroke="var(--wk-border-default)" strokeWidth="2" />
                <circle cx="7" cy="7" r={r} fill="none" stroke={frac >= 1 ? "#2f6fed" : "#2ea44f"} strokeWidth="2" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 7 7)" strokeLinecap="round" />
            </svg>
            {done}/{total}
        </span>
    )
}

const CARD_PROPS = ["优先级", "描述", "负责人", "开始日期", "截止日期", "项目", "标签", "子 Loop 进度"]

function MatterIssuesBoard({
    title = "Loops",
    tabs = ["全部", "成员", "智能体"],
    defaultTab = 0,
}: {
    title?: string
    tabs?: string[]
    defaultTab?: number
}) {
    const [createIssueOpen, setCreateIssueOpen] = useState(false)
    const [activeTab, setActiveTab] = useState(defaultTab)
    const [view, setView] = useState<"board" | "list">("board")
    const [filterOpen, setFilterOpen] = useState(false)
    const [dateSub, setDateSub] = useState(false)
    const [displayOpen, setDisplayOpen] = useState(false)
    const [viewOpen, setViewOpen] = useState(false)
    const [cardProps, setCardProps] = useState<string[]>([...CARD_PROPS])

    const toggleProp = (p: string) => setCardProps((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))

    return (
        <section className="wk-matter-board" aria-label="MatterV2 Loops kanban">
            <header className="wk-matter-board__head">
                <div className="wk-matter-board__title">
                    <ClipboardList size={17} />
                    <strong>{title}</strong>
                </div>
            </header>

            <div className="wk-matter-board__toolbar">
                <div className="wk-matter-board__tabs">
                    {tabs.map((t, i) => (
                        <button key={t} type="button" className={i === activeTab ? "is-active" : ""} onClick={() => setActiveTab(i)}>{t}</button>
                    ))}
                </div>
                <div className="wk-matter-board__actions">
                    <button type="button">0 工作中</button>

                    <div className="wk-mv2-filterwrap">
                        <button type="button" aria-haspopup="menu" aria-expanded={filterOpen} onClick={() => { setFilterOpen((v) => !v); setDateSub(false); setDisplayOpen(false); setViewOpen(false) }}>筛选</button>
                        {filterOpen && (
                            <div className="wk-mv2-menu" role="menu">
                                <button type="button" role="menuitem"><Circle size={13} />状态<em>›</em></button>
                                <button type="button" role="menuitem"><PriorityIcon pri="mid" />优先级<em>›</em></button>
                                <button type="button" role="menuitem" onClick={() => setDateSub((v) => !v)}>📅 日期<em>›</em></button>
                                <button type="button" role="menuitem"><Users size={13} />负责人<em>›</em></button>
                                <button type="button" role="menuitem"><Edit3 size={13} />创建者<em>›</em></button>
                                <button type="button" role="menuitem"><Briefcase size={13} />项目<em>›</em></button>
                                <button type="button" role="menuitem">🏷 标签<em>›</em></button>
                                {dateSub && (
                                    <div className="wk-mv2-menu is-sub" role="menu">
                                        <span className="wk-mv2-panel__label">字段</span>
                                        <button type="button" role="menuitem">创建时间<em>✓</em></button>
                                        <button type="button" role="menuitem">更新时间</button>
                                        <hr />
                                        <button type="button" role="menuitem">今天</button>
                                        <button type="button" role="menuitem">最近 3 天</button>
                                        <button type="button" role="menuitem">最近 7 天</button>
                                        <button type="button" role="menuitem">自定义日期或范围</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="wk-mv2-filterwrap">
                        <button type="button" aria-haspopup="menu" aria-expanded={displayOpen} onClick={() => { setDisplayOpen((v) => !v); setFilterOpen(false); setViewOpen(false) }}>手动</button>
                        {displayOpen && (
                            <div className="wk-mv2-panel" role="menu">
                                <div className="wk-mv2-panel__row">
                                    <span>分组</span>
                                    <select defaultValue="状态"><option>状态</option><option>项目</option><option>负责人</option></select>
                                </div>
                                <div className="wk-mv2-panel__row">
                                    <span>排序</span>
                                    <select defaultValue="手动"><option>手动</option><option>更新时间</option><option>创建时间</option></select>
                                </div>
                                <hr />
                                <span className="wk-mv2-panel__label">卡片属性</span>
                                {CARD_PROPS.map((p) => (
                                    <div key={p} className="wk-mv2-panel__row">
                                        <span>{p}</span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={cardProps.includes(p)}
                                            aria-label={p}
                                            className={`wk-toggle${cardProps.includes(p) ? " is-on" : ""}`}
                                            onClick={() => toggleProp(p)}
                                        >
                                            <i />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="wk-mv2-filterwrap">
                        <button type="button" aria-haspopup="menu" aria-expanded={viewOpen} onClick={() => { setViewOpen((v) => !v); setFilterOpen(false); setDisplayOpen(false) }}>{view === "board" ? "看板" : "列表"}</button>
                        {viewOpen && (
                            <div className="wk-mv2-menu" role="menu">
                                <span className="wk-mv2-panel__label">视图</span>
                                <button type="button" role="menuitem" onClick={() => { setView("board"); setViewOpen(false) }}>▦ 看板{view === "board" && <em>✓</em>}</button>
                                <button type="button" role="menuitem" onClick={() => { setView("list"); setViewOpen(false) }}>☰ 列表{view === "list" && <em>✓</em>}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {view === "list" ? (
                <div className="wk-matter-board__listwrap">
                    <IssueGroupList rows={ISSUE_ROWS} />
                </div>
            ) : (
                <div className="wk-matter-board__columns">
                    {BOARD_COLUMNS.map((column) => (
                        <section key={column.id} className={`wk-matter-board__column wk-matter-board__column--${column.tone}`}>
                            <header>
                                <span className="wk-matter-board__status-dot" />
                                <strong>{column.label}</strong>
                                <small>{column.cards.length}</small>
                                <MoreHorizontal size={15} />
                                <button type="button" onClick={() => setCreateIssueOpen(true)}>+</button>
                            </header>

                            {column.cards.length === 0 ? (
                                <div className="wk-matter-board__empty">无 Loop</div>
                            ) : (
                                <div className="wk-matter-board__cards">
                                    {column.cards.map((card) => (
                                        <button
                                            key={card.key}
                                            type="button"
                                            className="wk-matter-board__card"
                                            onClick={() => WKApp.routeRight.replaceToRoot(<MatterIssueDetail issue={card} />)}
                                        >
                                            <div className="wk-matter-board__card-key">
                                                {cardProps.includes("优先级") && <PriorityIcon pri={card.pri} />}
                                                <span>{card.key}</span>
                                            </div>
                                            <h3>{card.title}</h3>
                                            {cardProps.includes("描述") && card.desc && <p>{card.desc}</p>}
                                            {cardProps.includes("项目") && <span className="wk-matter-board__project">📁 {card.project}</span>}
                                            <footer>
                                                {cardProps.includes("负责人") && (
                                                    <span className="wk-matter-board__agent">
                                                        {card.agentType === "squad" ? <Users size={12} /> : card.agentType === "bot" ? <Bot size={12} /> : null}
                                                        {card.agent}
                                                    </span>
                                                )}
                                                {cardProps.includes("子 Loop 进度") && card.progress && <ProgressRing done={card.progress.done} total={card.progress.total} />}
                                                {card.updated && <time>{card.updated}</time>}
                                            </footer>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            )}

            {createIssueOpen && <MatterCreateIssueModal onClose={() => setCreateIssueOpen(false)} />}
        </section>
    )
}

// T2 建单双模式(照 Multica 真身 0701 实拍):手动 ⇄ AI 队友互切;
// 手动=标题/描述+提示行+chips(⋯菜单:开始日期/父Loop/子Loop);AI 队友=创建者行+意图框+项目下拉+⌘↵。
const CREATE_ISSUE_AGENT = "Prototyper-Codex-MBOT"
const CREATE_ISSUE_PROJECTS = ["Octo-Runtime", "OctoLoop 产品手册", "接线演练场"]

function MatterCreateIssueModal({ onClose }: { onClose: () => void }) {
    const [mode, setMode] = useState<"manual" | "agent">("manual")
    const [keepCreating, setKeepCreating] = useState(false)
    const [moreOpen, setMoreOpen] = useState(false)
    const [projectOpen, setProjectOpen] = useState(false)
    const [project, setProject] = useState("")

    return (
        <div className="wk-matter-create-issue" role="presentation" onMouseDown={onClose}>
            <section
                className="wk-matter-create-issue__dialog"
                role="dialog"
                aria-modal="true"
                aria-label="新建 Loop"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="wk-matter-create-issue__head">
                    <div className="wk-matter-create-issue__crumb">
                        <span>OctoLoop</span>
                        <ChevronRight size={13} />
                        <strong>{mode === "manual" ? "手动创建" : "通过 AI 队友创建"}</strong>
                    </div>
                    <div className="wk-matter-create-issue__tools">
                        <button type="button" aria-label="展开"><Expand size={16} /></button>
                        <button type="button" aria-label="关闭" onClick={onClose}>×</button>
                    </div>
                </header>

                {mode === "manual" ? (
                    <>
                        <main className="wk-matter-create-issue__body">
                            <input className="wk-matter-create-issue__title" placeholder="Loop 标题" autoFocus />
                            <textarea className="wk-matter-create-issue__desc" placeholder="添加描述..." />
                        </main>

                        <div className="wk-matter-create-issue__hint">
                            <Bot size={13} />
                            创建后 {CREATE_ISSUE_AGENT} 会立即开始工作。
                        </div>

                        <div className="wk-matter-create-issue__chips">
                            <button type="button"><Circle size={14} />待办</button>
                            <button type="button">— 无优先级</button>
                            <button type="button"><Bot size={14} />{CREATE_ISSUE_AGENT}</button>
                            <button type="button">截止日期</button>
                            <button type="button">📁 Octo-Runtime</button>
                            <button type="button" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
                                <MoreHorizontal size={15} />
                            </button>
                            {moreOpen && (
                                <div className="wk-matter-create-issue__more" role="menu">
                                    <button type="button" role="menuitem" onClick={() => setMoreOpen(false)}>📅 设置开始日期...</button>
                                    <button type="button" role="menuitem" onClick={() => setMoreOpen(false)}>↑ 设置父 Loop...</button>
                                    <button type="button" role="menuitem" onClick={() => setMoreOpen(false)}>↓ 添加子 Loop...</button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="wk-matter-create-issue__creator">
                            <span>创建者</span>
                            <em><Bot size={13} /></em>
                            <strong>{CREATE_ISSUE_AGENT}</strong>
                        </div>
                        <main className="wk-matter-create-issue__body">
                            <textarea
                                className="wk-matter-create-issue__intent"
                                autoFocus
                                placeholder='告诉 AI 队友要做什么,例如:"让 Bohan 修一下 Web 项目里收件箱加载慢的问题"'
                            />
                        </main>

                        <div className="wk-matter-create-issue__chips">
                            <button type="button" aria-haspopup="menu" aria-expanded={projectOpen} onClick={() => setProjectOpen((v) => !v)}>
                                <Briefcase size={14} />{project || "无项目"}
                            </button>
                            {projectOpen && (
                                <div className="wk-matter-create-issue__more is-up" role="menu">
                                    {CREATE_ISSUE_PROJECTS.map((p) => (
                                        <button key={p} type="button" role="menuitem" onClick={() => { setProject(p); setProjectOpen(false) }}>
                                            📁 {p}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <footer className="wk-matter-create-issue__foot">
                    <button type="button" aria-label="添加附件"><Paperclip size={17} /></button>
                    <div className="wk-matter-create-issue__actions">
                        <button type="button" onClick={() => setMode((m) => (m === "manual" ? "agent" : "manual"))}>
                            ⇄ {mode === "manual" ? "切换到 AI 队友" : "切换到手动"}
                        </button>
                        <div className="wk-matter-create-issue__keep">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={keepCreating}
                                aria-label="继续创建"
                                className={`wk-toggle${keepCreating ? " is-on" : ""}`}
                                onClick={() => setKeepCreating((v) => !v)}
                            >
                                <i />
                            </button>
                            <span>继续创建</span>
                        </div>
                        <button type="button" className="wk-matter-create-issue__submit" onClick={onClose}>
                            {mode === "manual" ? "创建 Loop" : "创建 (⌘↵)"}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    )
}

// A1 自动化(0707 批改):列表=Obvious 式卡片(标题+说明两行+频率 tag,参照 11-Obvious Daily Briefing);
// 新建=单页表单(全字段一屏,不分步);详情页=feat/loop-react AutomationDetailView 语法(属性/任务说明/运行历史)。
interface AutomationRow {
    id: string
    title: string
    desc: string
    enabled: boolean
    cronText: string
    target: string
    executor: string
    next: string
    health: Array<"ok" | "skip" | "fail">
    runs: Array<{ state: "ok" | "skip" | "fail"; dur: string; at: string }>
}

const AUTOMATIONS_SEED: AutomationRow[] = [
    {
        id: "auto-digest",
        title: "Daily news digest",
        desc: "每天早上收集团队相关的行业动态,汇总成一份晨报发到项目里。",
        enabled: true,
        cronText: "每天 09:00",
        target: "Octo-Runtime",
        executor: "Prototyper-Codex-MBOT",
        next: "明天 09:00",
        health: ["ok", "ok", "ok", "skip", "ok", "ok", "ok", "ok"],
        runs: [
            { state: "ok", dur: "2m 41s", at: "今天 09:00" },
            { state: "ok", dur: "2m 58s", at: "昨天 09:00" },
            { state: "skip", dur: "—", at: "6月28日 09:00" },
            { state: "ok", dur: "3m 02s", at: "6月27日 09:00" },
            { state: "ok", dur: "2m 33s", at: "6月26日 09:00" },
        ],
    },
    {
        id: "auto-weekly",
        title: "周报汇总",
        desc: "每周五扫描本周完成的 Loop,生成周报草稿等确认。",
        enabled: false,
        cronText: "每周五 17:00",
        target: "OctoLoop 产品手册",
        executor: "Documenter-Worker",
        next: "",
        health: ["ok", "ok", "fail", "ok"],
        runs: [
            { state: "ok", dur: "4m 12s", at: "6月27日 17:00" },
            { state: "fail", dur: "0m 41s", at: "6月20日 17:00" },
            { state: "ok", dur: "3m 55s", at: "6月13日 17:00" },
        ],
    },
]

// 单页新建:全字段一屏(0707 批改:不分步)
function AutomationCreateModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="wk-awz" role="presentation" onMouseDown={onClose}>
            <section className="wk-awz__dialog" role="dialog" aria-modal="true" aria-label="新建自动化" onMouseDown={(e) => e.stopPropagation()}>
                <header className="wk-awz__head">
                    <strong>新建自动化</strong>
                    <button type="button" aria-label="关闭" onClick={onClose}>×</button>
                </header>

                <main className="wk-awz__body">
                    <label className="wk-awz__field">
                        <span>名称</span>
                        <input autoFocus placeholder="例如：每日晨报" />
                    </label>
                    <label className="wk-awz__field">
                        <span>任务说明<em>AI 队友每次运行时读取</em></span>
                        <textarea rows={5} placeholder={"# 目标\n你希望 AI 队友完成什么?\n\n# 步骤\n1. ...\n2. ..."} spellCheck={false} />
                    </label>
                    <div className="wk-awz__grid">
                        <label className="wk-awz__field">
                            <span>频率</span>
                            <select defaultValue="每天"><option>每天</option><option>每个工作日</option><option>每周五</option><option>每月 1 日</option></select>
                        </label>
                        <label className="wk-awz__field">
                            <span>时间</span>
                            <input type="time" defaultValue="09:00" />
                        </label>
                    </div>
                    <div className="wk-awz__grid">
                        <label className="wk-awz__field">
                            <span>执行方</span>
                            <select defaultValue="Prototyper-Codex-MBOT">
                                {COWORKERS.map((c) => <option key={c.id}>{c.name}</option>)}
                                {SQUADS.map((s) => <option key={s.id}>{s.name}(小队)</option>)}
                            </select>
                        </label>
                        <label className="wk-awz__field">
                            <span>发到哪</span>
                            <select defaultValue="Octo-Runtime">
                                {PROJECTS_ROWS.map((p) => <option key={p.name}>{p.name}</option>)}
                            </select>
                        </label>
                    </div>
                    <p className="wk-awz__hint">保存后会自动运行,直到停用。</p>
                </main>

                <footer className="wk-awz__foot">
                    <button type="button" className="wk-awz__text" onClick={onClose}>取消</button>
                    <button type="button" className="wk-awz__primary" onClick={onClose}>创建自动化</button>
                </footer>
            </section>
        </div>
    )
}

const RUN_STATE_LABEL = { ok: "运行成功", skip: "已跳过", fail: "运行失败" } as const

function MatterAutomationDetail({ row, onToggle }: { row: AutomationRow; onToggle: (id: string) => void }) {
    return (
        <section className="wk-avd" aria-label="自动化详情">
            <header className="wk-avd__top">
                <div className="wk-avd__crumb">
                    <span>自动化</span>
                    <ChevronRight size={13} />
                    <strong>{row.title}</strong>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={row.enabled}
                        aria-label="启用开关"
                        className={`wk-toggle${row.enabled ? " is-on" : ""}`}
                        onClick={() => onToggle(row.id)}
                    >
                        <i />
                    </button>
                    <em className={row.enabled ? "is-on" : ""}>{row.enabled ? "启用中" : "已停用"}</em>
                </div>
                <button type="button" className="wk-avd__run">▶ 立即运行</button>
            </header>

            <div className="wk-avd__main">
                <section className="wk-avd__card">
                    <h4>属性</h4>
                    <dl>
                        <div><dt>执行方</dt><dd><Bot size={13} />{row.executor}</dd></div>
                        <div><dt>频率</dt><dd>{row.cronText}</dd></div>
                        <div><dt>发到</dt><dd>📁 {row.target}</dd></div>
                        <div><dt>下次运行</dt><dd>{row.enabled && row.next ? row.next : "—"}</dd></div>
                    </dl>
                </section>

                <section className="wk-avd__card">
                    <h4>任务说明<span>AI 队友每次运行时读取</span></h4>
                    <p>{row.desc}</p>
                </section>

                <section className="wk-avd__card">
                    <h4>运行历史<span>近 {row.runs.length} 次</span></h4>
                    <div className="wk-avd__runs">
                        {row.runs.map((r, i) => (
                            <div key={i} className="wk-avd__runrow">
                                <i className={`is-${r.state}`} />
                                <span>{RUN_STATE_LABEL[r.state]}</span>
                                <em>{r.dur}</em>
                                <time>{r.at}</time>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </section>
    )
}

function MatterAutomationList() {
    const [rows, setRows] = useState<AutomationRow[]>(AUTOMATIONS_SEED)
    const [createOpen, setCreateOpen] = useState(false)
    const [detailId, setDetailId] = useState<string | null>(null)

    const toggle = (id: string) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
    const detail = detailId ? rows.find((r) => r.id === detailId) : null

    if (detail) {
        return (
            <div className="wk-avd__host">
                <button type="button" className="wk-avd__back" onClick={() => setDetailId(null)}>‹ 自动化</button>
                <MatterAutomationDetail row={detail} onToggle={toggle} />
            </div>
        )
    }

    return (
        <section className="wk-av" aria-label="自动化">
            <header className="wk-av-head">
                <div className="wk-av-titlebar">
                    <strong>自动化</strong>
                    <span>{rows.length}</span>
                </div>
                <button type="button" className="wk-av-new" onClick={() => setCreateOpen(true)}><PlusIcon />新建自动化</button>
            </header>

            {rows.length === 0 ? (
                <div className="wk-av-empty">
                    <Sparkles size={26} />
                    <p>暂无自动化</p>
                    <button type="button" className="wk-av-new" onClick={() => setCreateOpen(true)}><PlusIcon />新建自动化</button>
                </div>
            ) : (
                <div className="wk-av-grid">
                    {rows.map((r) => (
                        <div key={r.id} className={`wk-av-card${r.enabled ? "" : " is-off"}`}>
                            <button type="button" className="wk-av-card__hit" onClick={() => setDetailId(r.id)} aria-label={`打开 ${r.title}`} />
                            <div className="wk-av-card__head">
                                <strong>{r.title}</strong>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={r.enabled}
                                    aria-label={`${r.title} 开关`}
                                    className={`wk-toggle${r.enabled ? " is-on" : ""}`}
                                    onClick={(e) => { e.stopPropagation(); toggle(r.id) }}
                                >
                                    <i />
                                </button>
                            </div>
                            <p className="wk-av-card__desc">{r.desc}</p>
                            <div className="wk-av-card__freq">
                                {r.cronText}
                                {!r.enabled && <span className="wk-av-off">已停用</span>}
                            </div>
                            <div className="wk-av-card__foot">
                                <span className="wk-av-exec"><Bot size={13} />{r.executor}</span>
                                <span className="wk-av-dots" aria-label="近 8 次运行">
                                    {r.health.map((h, i) => <i key={i} className={`is-${h}`} />)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {createOpen && <AutomationCreateModal onClose={() => setCreateOpen(false)} />}
        </section>
    )
}

// T8:项目列表对齐真身(名称 emoji/状态/优先级/进度圆环 x·y/负责人/创建时间 + 工具行)。
const PROJECTS_ROWS = [
    { icon: "📁", name: "Octo-Runtime", status: "计划中", pri: "— 无优先级", done: 2, total: 4, owner: "lvsijia", created: "22 天前" },
    { icon: "📘", name: "OctoLoop 产品手册", status: "计划中", pri: "— 无优先级", done: 5, total: 7, owner: "lvsijia", created: "1 个月前" },
    { icon: "🧪", name: "接线演练场", status: "计划中", pri: "— 无优先级", done: 1, total: 3, owner: "", created: "1 个月前" },
    { icon: "🧭", name: "OctoLoop 上手指南", status: "计划中", pri: "— 无优先级", done: 7, total: 7, owner: "lvsijia", created: "1 个月前" },
]

function MatterProjectsList() {
    return (
        <section className="wk-mv2-projects" aria-label="项目列表">
            <header className="wk-mv2-projects__head">
                <div className="wk-mv2-projects__title">
                    <Briefcase size={17} />
                    <strong>项目</strong>
                    <span>{PROJECTS_ROWS.length}</span>
                </div>
                <button type="button" className="wk-mv2-projects__create"><PlusIcon />新建项目</button>
            </header>

            <div className="wk-mv2-projects__toolbar">
                <label className="wk-mv2-projects__search"><Search size={14} /><input placeholder="搜索项目..." /></label>
                <div className="wk-mv2-projects__actions">
                    <button type="button">筛选</button>
                    <button type="button">↓ 创建时间</button>
                    <button type="button">表格</button>
                </div>
            </div>

            <div className="wk-mv2-projects__table" role="table" aria-label="项目列表">
                <div className="wk-mv2-projects__row wk-mv2-projects__headrow" role="row">
                    <div role="columnheader">名称</div>
                    <div role="columnheader">状态</div>
                    <div role="columnheader">优先级</div>
                    <div role="columnheader">进度</div>
                    <div role="columnheader">负责人</div>
                    <div role="columnheader">创建时间 ↓</div>
                </div>
                {PROJECTS_ROWS.map((p) => (
                    <button key={p.name} type="button" className="wk-mv2-projects__row wk-mv2-projects__item" role="row">
                        <div className="wk-mv2-projects__name" role="cell"><i>{p.icon}</i>{p.name}</div>
                        <div className="wk-mv2-projects__muted" role="cell">{p.status}</div>
                        <div className="wk-mv2-projects__muted" role="cell">{p.pri}</div>
                        <div role="cell"><ProgressRing done={p.done} total={p.total} /></div>
                        <div className="wk-mv2-projects__muted" role="cell">{p.owner ? <><i className="wk-mv2-projects__avatar">L</i>{p.owner}</> : "—"}</div>
                        <div className="wk-mv2-projects__muted" role="cell">{p.created}</div>
                    </button>
                ))}
            </div>
        </section>
    )
}

function MatterCoWorkersList() {
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <section className="wk-matter-coworkers" aria-label="AI 队友列表">
            <header className="wk-matter-coworkers__head">
                <div className="wk-matter-coworkers__title">
                    <Bot size={17} />
                    <strong>AI 队友</strong>
                    <span>{COWORKERS.length}</span>
                    <p>能领取 Loop、留下评论、推进状态的 AI 队友。</p>
                    <a href="#coworker-learn">了解更多 →</a>
                </div>
                <button type="button" className="wk-matter-coworkers__create" onClick={() => setCreateOpen(true)}><PlusIcon />新建 AI 队友</button>
            </header>

            <div className="wk-matter-coworkers__toolbar">
                <div className="wk-matter-coworkers__tabs">
                    <button type="button" className="is-active">我的 <span>4</span></button>
                    <button type="button">全部 <span>4</span></button>
                    <button type="button">已归档 <span>3</span></button>
                </div>
                <div className="wk-matter-coworkers__actions">
                    <button type="button">筛选</button>
                    <button type="button">最近活跃</button>
                </div>
            </div>

            <div className="wk-matter-coworkers__table" role="table" aria-label="AI 队友列表">
                <div className="wk-matter-coworkers__row wk-matter-coworkers__head-row" role="row">
                    <div role="columnheader">AI 队友</div>
                    <div role="columnheader">状态</div>
                    <div role="columnheader">Owner</div>
                    <div role="columnheader">运行时</div>
                    <div role="columnheader">最近活跃 ↓</div>
                    <div role="columnheader">运行次数</div>
                </div>
                {COWORKERS.map((coworker) => (
                    <button
                        key={coworker.id}
                        type="button"
                        className="wk-matter-coworkers__row wk-matter-coworkers__item"
                        role="row"
                        onClick={() => WKApp.routeRight.replaceToRoot(<MatterCoWorkerDetail coworker={coworker} />)}
                    >
                        <div className="wk-matter-coworkers__name" role="cell">
                            <span><Bot size={16} /><i /></span>
                            <div className="wk-matter-coworkers__nd">
                                <strong>
                                    {coworker.name}
                                    {coworker.visibility === "personal" && <Lock size={12} aria-label="Personal" />}
                                    <em>你</em>
                                </strong>
                                <small>{coworker.desc}</small>
                            </div>
                        </div>
                        <div className="wk-matter-coworkers__status" role="cell"><i />在线</div>
                        <div className="wk-matter-coworkers__owner" role="cell"><span>L</span>{coworker.owner}</div>
                        <div className="wk-matter-coworkers__muted" role="cell">{coworker.runtime}</div>
                        <div className={coworker.archived ? "wk-matter-coworkers__quiet" : "wk-matter-coworkers__muted"} role="cell">{coworker.lastActive}</div>
                        <div className="wk-matter-coworkers__runs" role="cell">{coworker.runs}</div>
                    </button>
                ))}
            </div>

            {createOpen && <CreateAgentModal onClose={() => setCreateOpen(false)} />}
        </section>
    )
}

// T3:五 tab(动态/Tasks/指令/Skills/Connectors[MCP+CLI]);Properties 先按真身字段,后续换 Agent Card。
const CW_TABS = [
    { key: "activity", label: "动态" },
    { key: "tasks", label: "Tasks" },
    { key: "instructions", label: "指令" },
    { key: "skills", label: "Skills" },
    { key: "connectors", label: "Connectors" },
] as const
type CwTab = typeof CW_TABS[number]["key"]

const CW_SKILLS = ["lark-base", "lark-doc", "lark-drive", "lark-event", "lark-markdown", "lark-openapi-explorer", "lark-sheets", "lark-skill-maker", "lark-wiki"]

function AddSkillModal({ onClose }: { onClose: () => void }) {
    const options = [
        { name: "MCA-Agent假设挑战", desc: "专门挑战 agent 输出中的隐含假设、范围膨胀…" },
        { name: "MCA-Agent验收", desc: "把 agent 产出转译为可执行验收清单…" },
        { name: "MCA-产品决策评审", desc: "逐项评审产品议题,明确现状、方案、工作量…" },
        { name: "MCA-信息组织", desc: "把零散材料整理成结构、层级、索引…" },
        { name: "grill-me", desc: "A relentless interview to sharpen a plan or design." },
    ]
    const [picked, setPicked] = useState<string[]>([])

    return (
        <div className="wk-cw-addskill" role="presentation" onMouseDown={onClose}>
            <section className="wk-cw-addskill__dialog" role="dialog" aria-modal="true" aria-label="添加 skill" onMouseDown={(e) => e.stopPropagation()}>
                <header>
                    <div>
                        <h2>添加 skill</h2>
                        <p>选择一个工作区 skill 分配给该 AI 队友。</p>
                    </div>
                    <button type="button" aria-label="关闭" onClick={onClose}>×</button>
                </header>
                <label className="wk-cw-addskill__search">
                    <Search size={14} />
                    <input placeholder="搜索 skill..." />
                </label>
                <div className="wk-cw-addskill__list">
                    {options.map((opt) => (
                        <label key={opt.name}>
                            <input
                                type="checkbox"
                                checked={picked.includes(opt.name)}
                                onChange={() => setPicked((p) => (p.includes(opt.name) ? p.filter((n) => n !== opt.name) : [...p, opt.name]))}
                            />
                            <strong>{opt.name}</strong>
                            <small>{opt.desc}</small>
                        </label>
                    ))}
                </div>
                <footer>
                    <button type="button" onClick={onClose}>取消</button>
                    <button type="button" className="wk-cw-addskill__submit" disabled={picked.length === 0} onClick={onClose}>添加</button>
                </footer>
            </section>
        </div>
    )
}

// ④ WorkOS 骨架(06-WorkOS 蒸馏):全宽单栏 = 身份头(大头像+名+元数据 chips)→ 水平 tab → section 卡片流。
function MatterCoWorkerDetail({
    coworker,
}: {
    coworker: typeof COWORKERS[number]
}) {
    const [page, setPage] = useState<CwTab>("activity")
    const [addSkillOpen, setAddSkillOpen] = useState(false)

    return (
        <section className="wk-matter-coworker-detail" aria-label="AI 队友详情">
            <header className="wk-matter-coworker-detail__top">
                <div className="wk-matter-coworker-detail__crumb">
                    <span>AI 队友</span>
                    <ChevronRight size={13} />
                    <strong>{coworker.name}</strong>
                </div>
                <MoreHorizontal size={17} />
            </header>

            <div className="wk-idhost">
                {/* 身份头:头像 + 名 + 描述 + 元数据 chips 行(WorkOS org_id/域名 chips 位) */}
                <div className="wk-idhead">
                    <span className="wk-idhead__avatar"><Bot size={26} /><i /></span>
                    <div className="wk-idhead__main">
                        <h1>{coworker.name}</h1>
                        <p>{coworker.desc}</p>
                        <div className="wk-idhead__chips">
                            <span className="wk-chip is-online"><i />在线</span>
                            <span className="wk-chip is-mono">{coworker.runtime}</span>
                            <span className="wk-chip is-mono">gpt-5.5</span>
                            <span className="wk-chip">{coworker.visibility === "personal" ? <><Lock size={11} /> Personal</> : "Workspace"}</span>
                            <span className="wk-chip">并发 {coworker.concurrency}</span>
                            <span className="wk-chip">思考 · 跟随 CLI</span>
                        </div>
                    </div>
                </div>

                <main className="wk-idhead__content">
                    <nav className="wk-matter-coworker-detail__tabs">
                        {CW_TABS.map((tab) => (
                            <button key={tab.key} type="button" className={page === tab.key ? "is-active" : ""} onClick={() => setPage(tab.key)}>{tab.label}</button>
                        ))}
                    </nav>

                    {page === "activity" && (
                        <div className="wk-matter-coworker-detail__cards">
                            <section className="wk-seccard">
                                <h4>概览</h4>
                                <dl className="wk-seccard__dl">
                                    <div><dt>所有者</dt><dd><b className="wk-minav">L</b>{coworker.owner}</dd></div>
                                    <div><dt>创建时间</dt><dd>3 天前</dd></div>
                                    <div><dt>更新时间</dt><dd>1 小时前</dd></div>
                                    <div><dt>Skills</dt><dd>{CW_SKILLS.length} 个</dd></div>
                                </dl>
                            </section>
                            <section className="wk-seccard">
                                <h4>当前<span>无进行中的工作</span></h4>
                                <p>这个 AI 队友当前没有在跑任何 task。</p>
                            </section>
                            <section className="wk-seccard wk-matter-coworker-detail__metric">
                                <h4>近 30 天<span>表现</span></h4>
                                <strong>{coworker.runs}</strong>
                                <p>100% 成功 · 平均 12s</p>
                                <i />
                            </section>
                            <section className="wk-seccard">
                                <h4>最近工作<span>还没有完成的 task</span></h4>
                                <p>这个 AI 队友还没有完成过任何 task。</p>
                            </section>
                        </div>
                    )}

                    {page === "tasks" && (
                        <div className="wk-cw-tasks wk-seccard">
                            <h4>Tasks<span>分配给这个 AI 队友的 Loop</span></h4>
                            <div className="wk-cw-tasks__toolbar">
                                <label className="wk-cw-tasks__search"><Search size={14} /><input placeholder="搜索 Loop..." /></label>
                                <div className="wk-cw-tasks__chips">
                                    <button type="button" className="is-active">已分配</button>
                                    <button type="button">已创建</button>
                                </div>
                                <div className="wk-cw-tasks__actions">
                                    <button type="button">筛选</button>
                                    <button type="button">手动</button>
                                </div>
                            </div>
                            <IssueGroupList rows={ISSUE_ROWS} />
                        </div>
                    )}

                    {page === "instructions" && (
                        <div className="wk-cw-pane wk-seccard">
                            <h4>指令</h4>
                            <p className="wk-cw-help">定义这个 AI 队友的身份和工作风格。会注入到每个 task 的上下文。支持 Markdown。</p>
                            <textarea
                                className="wk-cw-editor"
                                spellCheck={false}
                                defaultValue={`你是 ${coworker.name},负责把杂乱请求整理成清晰的 Loop、评论和下一步动作。\n\n# 工作风格\n- 回复简洁、行动导向。\n- 只在缺失信息会改变结论时提一个澄清问题。\n\n# 范围\n把 workspace 上下文、Loop 状态、运行时可用性当作输入。`}
                            />
                            <div className="wk-cw-savebar"><button type="button" className="wk-cw-save"><Save size={14} />保存</button></div>
                        </div>
                    )}

                    {page === "skills" && (
                        <div className="wk-cw-pane wk-seccard">
                            <h4>Skills<span>来自 我的 Skills(User 层)</span></h4>
                            <p className="wk-cw-help">分配给该 AI 队友的 skill。本地运行时 skill 会自动可用。</p>
                            <div className="wk-cw-skillgrid">
                                {CW_SKILLS.map((skill) => (
                                    <span key={skill} className="wk-cw-skillchip">{skill}</span>
                                ))}
                            </div>
                            <div className="wk-seccard__actions">
                                <button type="button" className="wk-cw-save" onClick={() => setAddSkillOpen(true)}>+ 添加 skill</button>
                            </div>
                        </div>
                    )}

                    {page === "connectors" && (
                        <div className="wk-cw-pane wk-cw-connectors">
                            <section>
                                <h4>MCP</h4>
                                <p className="wk-cw-help">转发给运行时 CLI 的 MCP 服务器配置。原样保存,可能包含密钥——只有 AI 队友所有者和工作区管理员可以读取。留空则回退到 CLI 自身的默认设置。</p>
                                <textarea
                                    className="wk-cw-editor is-json"
                                    spellCheck={false}
                                    defaultValue={`{\n  "mcpServers": {\n    "fetch": {\n      "command": "uvx",\n      "args": ["mcp-server-fetch"]\n    }\n  }\n}`}
                                />
                            </section>
                            <section>
                                <h4>CLI · 环境变量</h4>
                                <p className="wk-cw-help">在 AI 队友进程启动时注入(例如 <code>ANTHROPIC_API_KEY</code>、<code>ANTHROPIC_BASE_URL</code>)。</p>
                                <div className="wk-cw-kv">
                                    <input placeholder="KEY" />
                                    <input placeholder="值" type="password" />
                                    <button type="button" aria-label="显示值"><Eye size={14} /></button>
                                    <button type="button" aria-label="删除"><Trash2 size={14} /></button>
                                </div>
                                <button type="button" className="wk-cw-addbtn">+ 添加</button>
                            </section>
                            <section>
                                <h4>CLI · 自定义参数</h4>
                                <p className="wk-cw-help">启动命令追加的额外 CLI 参数。多 token 的参数可以共用一行——传给 CLI 前会按空白拆分。</p>
                                <div className="wk-cw-kv is-one">
                                    <input placeholder="--flag 值" />
                                    <button type="button" aria-label="删除"><Trash2 size={14} /></button>
                                </div>
                                <button type="button" className="wk-cw-addbtn">+ 添加</button>
                            </section>
                            <div className="wk-cw-savebar"><button type="button" className="wk-cw-save"><Save size={14} />保存</button></div>
                        </div>
                    )}
                </main>
            </div>

            {addSkillOpen && <AddSkillModal onClose={() => setAddSkillOpen(false)} />}
        </section>
    )
}

function MatterSquadsList() {
    const [createOpen, setCreateOpen] = useState(false)
    const [filterOpen, setFilterOpen] = useState(false)
    const [filterSub, setFilterSub] = useState<"leader" | "creator" | null>(null)

    const leaders = [...new Set(SQUADS.map((s) => s.leader))]

    return (
        <section className="wk-matter-squads" aria-label="MatterV2 squads list">
            <header className="wk-matter-squads__head">
                <div className="wk-matter-squads__title">
                    <Users size={17} />
                    <strong>小队</strong>
                    <span>{SQUADS.length}</span>
                </div>
                <button type="button" className="wk-matter-squads__create" onClick={() => setCreateOpen(true)}>
                    <UserPlus size={15} />
                    新建小队
                </button>
            </header>

            <div className="wk-matter-squads__toolbar">
                <div className="wk-matter-squads__tabs">
                    <button type="button" className="is-active">我的 <span>{SQUADS.length}</span></button>
                    <button type="button">全部 <span>{SQUADS.length}</span></button>
                </div>
                <div className="wk-matter-squads__actions">
                    <div className="wk-mv2-filterwrap">
                        <button type="button" aria-haspopup="menu" aria-expanded={filterOpen} onClick={() => { setFilterOpen((v) => !v); setFilterSub(null) }}>筛选</button>
                        {filterOpen && (
                            <div className="wk-mv2-menu" role="menu">
                                <button type="button" role="menuitem" onClick={() => setFilterSub((s) => (s === "leader" ? null : "leader"))}>
                                    <Bot size={13} />队长<em>›</em>
                                </button>
                                <button type="button" role="menuitem" onClick={() => setFilterSub((s) => (s === "creator" ? null : "creator"))}>
                                    <Users size={13} />创建者<em>›</em>
                                </button>
                                {filterSub === "leader" && (
                                    <div className="wk-mv2-menu is-sub" role="menu">
                                        {leaders.map((l) => (
                                            <button key={l} type="button" role="menuitem" onClick={() => setFilterOpen(false)}>
                                                <Bot size={13} />{l}<small>{SQUADS.filter((s) => s.leader === l).length}</small>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {filterSub === "creator" && (
                                    <div className="wk-mv2-menu is-sub" role="menu">
                                        <button type="button" role="menuitem" onClick={() => setFilterOpen(false)}>
                                            <Users size={13} />lvsijia<small>{SQUADS.length}</small>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button type="button">小队 ↑</button>
                </div>
            </div>

            <div className="wk-matter-squads__table" role="table" aria-label="小队列表">
                <div className="wk-matter-squads__row wk-matter-squads__head-row" role="row">
                    <div role="columnheader">小队 ↑</div>
                    <div role="columnheader">队长</div>
                    <div role="columnheader">成员</div>
                    <div role="columnheader">创建者</div>
                </div>
                {SQUADS.map((squad) => (
                    <button
                        key={squad.id}
                        type="button"
                        className="wk-matter-squads__row wk-matter-squads__item"
                        role="row"
                        onClick={() => WKApp.routeRight.replaceToRoot(<MatterSquadDetail squad={squad} />)}
                    >
                        <div className="wk-matter-squads__name" role="cell">
                            <span><Users size={16} /></span>
                            <div className="wk-matter-squads__nd">
                                <strong>{squad.name}</strong>
                                <small>{squad.description}</small>
                            </div>
                        </div>
                        <div className="wk-matter-squads__leader" role="cell"><Bot size={14} />{squad.leader}</div>
                        <div className="wk-matter-squads__members" role="cell">
                            {squad.members.map((member) => <i key={member}><Bot size={12} /></i>)}
                        </div>
                        <div className="wk-matter-squads__creator" role="cell"><i>L</i>{squad.creator}</div>
                    </button>
                ))}
            </div>

            {createOpen && <MatterCreateSquadModal onClose={() => setCreateOpen(false)} />}
        </section>
    )
}

function MatterCreateSquadModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="wk-matter-squad-modal" role="presentation" onMouseDown={onClose}>
            <section
                className="wk-matter-squad-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-label="创建 Squad"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="wk-matter-squad-modal__head">
                    <div>
                        <h2>创建 Squad</h2>
                        <p>创建一个由 Leader Agent 协调团队的协作 Squad，可选添加成员。</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="关闭">×</button>
                </header>

                <main className="wk-matter-squad-modal__body">
                    <button type="button" className="wk-matter-squad-modal__image" aria-label="上传小队头像">
                        <Users size={24} />
                    </button>
                    <div className="wk-matter-squad-modal__form">
                        <label>
                            <span>名称</span>
                            <input autoFocus placeholder="例如 前端团队" />
                        </label>
                        <label>
                            <span>描述</span>
                            <input placeholder="描述这个 Squad 负责什么..." />
                            <small>0 / 255</small>
                        </label>
                    </div>

                    <section className="wk-matter-squad-modal__leader">
                        <span>Leader Agent</span>
                        <p>Leader 接收分配给此 Squad 的所有任务并协调团队。</p>
                        <button type="button">
                            <UserPlus size={16} />
                            选择一个 Leader Agent
                            <ChevronDown size={15} />
                        </button>
                        <span className="wk-matter-squad-modal__label2">附加成员 (可选)</span>
                        <p>Leader 可以委派子任务的成员。也可稍后再加。</p>
                        <button type="button">
                            <UserPlus size={16} />
                            添加 Agent 或工作区成员
                            <ChevronDown size={15} />
                        </button>
                    </section>
                </main>

                <footer className="wk-matter-squad-modal__foot">
                    <button type="button" onClick={onClose}>取消</button>
                    <button type="button" className="wk-matter-squad-modal__submit" disabled>创建 Squad</button>
                </footer>
            </section>
        </div>
    )
}

function MatterSquadDetail({
    squad,
}: {
    squad: typeof SQUADS[number]
}) {
    const [activeTab, setActiveTab] = useState<"members" | "instructions">("members")

    return (
        <section className="wk-matter-squad-detail" aria-label="小队详情">
            <header className="wk-matter-squad-detail__top">
                <div className="wk-matter-squad-detail__crumb">
                    <span>小队</span>
                    <ChevronRight size={13} />
                    <strong><Users size={15} />{squad.name}</strong>
                </div>
                <button type="button"><Trash2 size={15} />归档</button>
            </header>

            {/* ⑤ WorkOS 骨架:身份头 + 水平 tab + section 卡片流(Members=卡内表格+底部操作) */}
            <div className="wk-idhost">
                <div className="wk-idhead">
                    <span className="wk-idhead__avatar is-squad"><Users size={26} /></span>
                    <div className="wk-idhead__main">
                        <h1>{squad.name}</h1>
                        <p>{squad.description}</p>
                        <div className="wk-idhead__chips">
                            <span className="wk-chip">👑 {squad.leader}</span>
                            <span className="wk-chip">成员 {squad.members.length}</span>
                            <span className="wk-chip">由 {squad.creator} 创建 · {squad.created}</span>
                        </div>
                    </div>
                </div>

                <main className="wk-idhead__content">
                    <nav className="wk-matter-squad-detail__tabs">
                        <button type="button" className={activeTab === "members" ? "is-active" : ""} onClick={() => setActiveTab("members")}>
                            <Users size={15} />
                            Members
                        </button>
                        <button type="button" className={activeTab === "instructions" ? "is-active" : ""} onClick={() => setActiveTab("instructions")}>
                            <ClipboardList size={15} />
                            Instructions
                        </button>
                    </nav>

                    {activeTab === "members" ? (
                        <section className="wk-seccard">
                            <h4>成员<span>该小队有 {squad.members.length} 名成员</span></h4>
                            <div className="wk-sqtable">
                                {squad.members.map((member, index) => (
                                    <div key={member} className="wk-sqtable__row">
                                        <span className="wk-sqtable__avatar"><Bot size={15} /><i /></span>
                                        <div className="wk-sqtable__who">
                                            <strong>{member}</strong>
                                            <small>Agent · 最近活动 1 分钟前</small>
                                        </div>
                                        <span className={`wk-chip${index === 0 ? " is-leader" : ""}`}>{index === 0 ? "负责人" : "成员"}</span>
                                        <span className="wk-sqtable__state">空闲</span>
                                    </div>
                                ))}
                            </div>
                            <div className="wk-seccard__actions">
                                <button type="button" className="wk-cw-save"><PlusIcon />添加成员</button>
                                <button type="button" className="wk-cw-addbtn"><PlusIcon />创建 AI 队友</button>
                            </div>
                        </section>
                    ) : (
                        <section className="wk-seccard">
                            <h4>Instructions</h4>
                            <p className="wk-cw-help">小队指引会在 Leader 处理分配给该小队的 Loop 时注入到它的 prompt 中。可用来给 Leader 提供贯穿全队的指导、协作规范，或每次任务都应遵循的上下文。</p>
                            <textarea className="wk-cw-editor" placeholder="e.g. Always start by writing a failing test. Prefer small, atomic commits." />
                            <div className="wk-seccard__actions">
                                <button type="button" className="wk-cw-save"><Save size={14} />保存</button>
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </section>
    )
}

function PlusIcon() {
    return <span aria-hidden="true">＋</span>
}

function MatterIssueDetail({
    issue,
}: {
    issue: {
        key: string
        title: string
        desc: string
        project: string
        agent: string
        updated: string
    }
}) {
    const isRuntimeQuestion = issue.key === "OCT-3"

    return (
        <section className="wk-matter-issue-detail" aria-label="Loop detail prototype">
            <header className="wk-matter-issue-detail__top">
                <div className="wk-matter-issue-detail__crumb">
                    <span>📁 {issue.project}</span>
                    <ChevronRight size={14} />
                    <strong>{issue.key} {issue.title}</strong>
                </div>
                <div className="wk-matter-issue-detail__tools">
                    <Pin size={17} />
                    <MoreHorizontal size={17} />
                    <button type="button" onClick={() => WKApp.routeRight.replaceToRoot(<MatterIssuesBoard />)}>看板</button>
                </div>
            </header>

            <main className="wk-matter-issue-detail__main">
                <article className="wk-matter-issue-detail__content">
                    <section className="wk-matter-issue-detail__request">
                        <h1>User request</h1>
                        {isRuntimeQuestion ? (
                            <>
                                <p>请回答以下关于当前运行环境的问题：</p>
                                <ol>
                                    <li>你的工作 workspace 的绝对路径是什么？</li>
                                    <li>当前机器名称是什么？</li>
                                    <li>执行的状态如何？</li>
                                </ol>
                            </>
                        ) : (
                            <>
                                <p>{issue.desc || "请继续推进这个 Loop，并补充下一步处理建议。"}</p>
                                <ol>
                                    <li>确认当前任务目标。</li>
                                    <li>补齐必要上下文。</li>
                                    <li>给出可执行的下一步。</li>
                                </ol>
                            </>
                        )}
                        <div className="wk-matter-issue-detail__inline-actions">☺︎　📎</div>
                        <button type="button" className="wk-matter-issue-detail__add">＋ 添加子 Loop</button>
                    </section>

                    <section className="wk-matter-issue-detail__activity">
                        <header>
                            <h2>动态</h2>
                            <span>取消订阅　🤖 L</span>
                        </header>
                        <div className="wk-matter-issue-detail__fold">› 2 条动态</div>
                        <MessageCard
                            author={issue.agent === "未分配" ? "Prototyper" : issue.agent}
                            time={issue.updated || "4 小时前"}
                            body={[
                                "运行环境询问回答：",
                                "1. Workspace 绝对路径： /Users/lvsijia/multica_workspaces/bfa7830c-929d-493d-9650-4f31d86e54ff/550c0581/workdir",
                                "2. 机器名称： kaka-mbp（macOS / Darwin 25.5.0，arm64 架构，Apple Silicon）",
                                "3. 执行状态：正常。CLI 认证有效，可以正常读写 Loop、评论及状态，环境健康无异常。",
                            ]}
                        />
                        <div className="wk-matter-issue-detail__events">
                            <div><CheckCircle2 size={15} />CC-Protoper 状态从 进行中 改为 审核中 <time>4 小时前</time></div>
                            <div><Archive size={15} />CC-Protoper 完成了 task（1 次）<time>4 小时前</time></div>
                        </div>
                        <div className="wk-matter-issue-detail__comment">
                            <span>留下评论...</span>
                            <span>📎</span>
                            <button type="button">↑</button>
                        </div>
                    </section>
                </article>

                <aside className="wk-matter-issue-detail__props">
                    <h3>属性⌄</h3>
                    <dl>
                        <dt>状态</dt>
                        <dd><CheckCircle2 size={15} />审核中</dd>
                        <dt>负责人</dt>
                        <dd>🤖 {issue.agent === "未分配" ? "CC-Protoper" : issue.agent}</dd>
                        <dt>项目</dt>
                        <dd>📁 {issue.project}</dd>
                    </dl>
                    <button type="button">＋ 添加字段</button>

                    <h3>Pull Request⌄</h3>
                    <p>还没有关联的 PR。在 PR 的分支名、标题或正文里引用本 Loop 的 identifier 即可自动关联。</p>

                    <h3>详情⌄</h3>
                    <dl>
                        <dt>创建者</dt>
                        <dd>🤖 CC-Protoper</dd>
                        <dt>创建时间</dt>
                        <dd>Jul 2</dd>
                        <dt>更新时间</dt>
                        <dd>Jul 2</dd>
                    </dl>

                    <h3>执行日志⌄</h3>
                    <p>› 显示历史运行（2）</p>

                    <h3>Token 用量⌄</h3>
                    <dl>
                        <dt>输入</dt>
                        <dd>3.1k</dd>
                        <dt>输出</dt>
                        <dd>1.5k</dd>
                        <dt>缓存</dt>
                        <dd>343.9k 读 / 78.6k 写</dd>
                        <dt>运行次数</dt>
                        <dd>2</dd>
                    </dl>
                </aside>
            </main>
        </section>
    )
}

function MessageCard({
    author,
    time,
    body,
    user,
    highlighted,
    shaded,
}: {
    author: string
    time: string
    body: string[]
    user?: boolean
    highlighted?: boolean
    shaded?: boolean
}) {
    return (
        <section className={`wk-matter-v2-card${highlighted ? " is-highlighted" : ""}${shaded ? " is-shaded" : ""}`}>
            <header>
                <ChevronDown size={14} />
                <span className={user ? "wk-matter-v2-card__user" : "wk-matter-v2-card__agent"}>
                    {user ? "L" : <Bot size={14} />}
                    {!user && <i />}
                </span>
                <strong>{author}</strong>
                <time>{time}</time>
                <MoreHorizontal size={16} />
            </header>
            <div className="wk-matter-v2-card__body">
                {body.map((line) => (
                    <p key={line}>{line}</p>
                ))}
            </div>
            <footer>
                <span className="wk-matter-v2-card__reply">L</span>
                <span>回复...</span>
                <span>📎</span>
                <span>↑</span>
            </footer>
        </section>
    )
}
