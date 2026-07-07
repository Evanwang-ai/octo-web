import React, { useEffect, useState } from "react"
import {
    Archive,
    Bot,
    Briefcase,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Plus,
    Settings2,
    Circle,
    CircleUserRound,
    ClipboardList,
    Edit3,
    Eye,
    Infinity as LoopIcon,
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
    X,
} from "lucide-react"
import WKApp from "../../App"
import { CreateAgentModal } from "../AgentsPrototype"
import "./index.css"

// ── monogram 头像(换皮 R3 B2):抛弃 Multica 盒装机器人/人群 glyph。
// AgentAvatar=圆角方(bot)、SquadAvatar=圆(队伍),按名字 hash 上色 + 首字 monogram。
function avatarHue(name: string): number {
    let h = 0
    const s = name || ""
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return h % 360
}
function avatarInitial(name: string): string {
    const t = (name || "").trim()
    const m = t.match(/[A-Za-z0-9\u4e00-\u9fff]/)
    const ch = m ? m[0] : "·"
    return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch
}
function AgentAvatar({ name, size = 20, dot, className = "" }: { name: string; size?: number; dot?: "online" | "idle" | "busy"; className?: string }) {
    const hue = avatarHue(name)
    return (
        <span
            className={`wk-avatarm${className ? " " + className : ""}`}
            style={{ width: size, height: size, borderRadius: Math.max(5, Math.round(size * 0.28)), background: `hsl(${hue} 52% 91%)`, color: `hsl(${hue} 42% 36%)`, fontSize: Math.round(size * 0.44) }}
            aria-hidden
        >
            {avatarInitial(name)}
            {dot && <i className={`wk-avatarm__dot is-${dot}`} />}
        </span>
    )
}
function SquadAvatar({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
    const hue = (avatarHue(name) + 140) % 360
    return (
        <span
            className={`wk-avatarm is-round${className ? " " + className : ""}`}
            style={{ width: size, height: size, borderRadius: "50%", background: `hsl(${hue} 50% 90%)`, color: `hsl(${hue} 40% 34%)`, fontSize: Math.round(size * 0.42) }}
            aria-hidden
        >
            {avatarInitial(name)}
        </span>
    )
}

// T1 换皮(蓝图 §1.2):单模块 sidebar——砍 搜索/收件箱/用量/设置/workspace 下拉,
// 并入 技能 节点;CoWorker 中文定名「AI 队友」。收件箱砍除后 review 入口=我的回路(T5 补四 tabs)。
type MatterView = "issues" | "myissues" | "projects" | "automation" | "coworkers" | "squads" | "workspaces"

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

type WsMember = { id: string; name: string; role: "admin" | "member"; joined: string }
type Workspace = { id: string; name: string; desc: string; members: number; updated: string }

const WORKSPACES_SEED: Workspace[] = [
    { id: "ws-product", name: "产品研发部", desc: "OctoLoop 主战场:V1 换皮与派单闭环。", members: 12, updated: "今天" },
    { id: "ws-growth", name: "增长实验室", desc: "转化实验与渠道自动化。", members: 6, updated: "昨天" },
    { id: "ws-support", name: "客服中台", desc: "工单分诊与知识库维护。", members: 9, updated: "3 天前" },
    { id: "ws-content", name: "内容运营", desc: "官网与公众号内容生产线。", members: 4, updated: "上周" },
    { id: "ws-core", name: "OctoLoop 核心", desc: "引擎与 runtime 联调现场。", members: 8, updated: "上周" },
    { id: "ws-sandbox", name: "个人沙盒", desc: "只属于你的试验田。", members: 1, updated: "6月30日" },
]

// 成员池取自 Octo Space 成员;首位为管理员(创建者),其余为成员。
const MEMBER_JOINED = ["创建者", "2 周前", "11 天前", "1 周前", "4 天前", "前天"]
function wsMembers(ws: Workspace): WsMember[] {
    const n = Math.max(1, Math.min(ws.members, SPACE_MEMBERS.length))
    return SPACE_MEMBERS.slice(0, n).map((m, i) => ({
        id: m.id,
        name: m.name,
        role: i === 0 ? "admin" : "member",
        joined: MEMBER_JOINED[i] ?? "本周",
    }))
}

const SQUADS = [
    {
        id: "squad-onboard",
        name: "OctoLoop 上手小队",
        leader: "Prototyper-Codex-MBOT",
        members: ["Prototyper-Codex-MBOT", "Analyser-CC-MBOT", "Documenter-Worker"],
        creator: "lvsijia",
        created: "2 小时前",
        updated: "2 小时前",
        description: "Prototyper + Analyser + Documenter：上手指南与演示链路打磨小队。",
    },
    {
        id: "squad-triage",
        name: "回路分诊小队",
        leader: "Triager-Worker",
        members: ["Triager-Worker", "Analyser-CC-MBOT"],
        creator: "lvsijia",
        created: "3 天前",
        updated: "昨天",
        description: "Triager + Analyser：新回路 补上下文、定优先级、派人。",
    },
]

const COWORKERS = [
    { id: "cw-prototyper", name: "Prototyper-Codex-MBOT", desc: "把杂乱请求整理成清晰回路,推进状态并给出下一步。", runtime: "Codex (kaka-mbp)", owner: "lvsijia", lastActive: "今天", runs: 5, archived: false, visibility: "personal", concurrency: 2 },
    { id: "cw-analyser", name: "Analyser-CC-MBOT", desc: "读 PDF 与上下文做独立分析,先结论后论据。", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "3 天前", runs: 5, archived: false, visibility: "workspace", concurrency: 6 },
    { id: "cw-documenter", name: "Documenter-Worker", desc: "把讨论沉淀为文档与交付说明。", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "3 天前", runs: 5, archived: false, visibility: "workspace", concurrency: 4 },
    { id: "cw-triager", name: "Triager-Worker", desc: "新回路 分诊:补上下文、定优先级、派人。", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "30 天内无活动", runs: 0, archived: true, visibility: "workspace", concurrency: 1 },
]

// ── 共享:按状态分组的 Loop 列表(T3 Tasks tab / T5 列表视图共用)──
const ISSUE_ROWS = [
    { key: "OCT-1", title: "test", project: "Octo-Runtime", status: "待办", pri: "none", agent: "未分配", updated: "2 天前" },
    { key: "OCT-2", title: "询问当前 agent 身份和模型", project: "Octo-Runtime", status: "审核中", pri: "mid", agent: "Prototyper-Codex-MBOT", updated: "4 小时前" },
    { key: "OCT-3", title: "回答运行环境询问：workspace 绝对路径、机器名称、执行状态", project: "Octo-Runtime", status: "审核中", pri: "mid", agent: "CC-Protoper", updated: "4 小时前" },
    { key: "OCT-4", title: "整理 OctoLoop 上手指南", project: "OctoLoop 产品手册", status: "已完成", pri: "mid", agent: "Documenter-Worker", updated: "1 天前" },
    { key: "OCT-5", title: "附件测试：仅 PDF → Runtime 抽取文字", project: "接线演练场", status: "已完成", pri: "urgent", agent: "Analyser-CC-MBOT", updated: "3 天前" },
    { key: "OCT-6", title: "等待上游接口：回调闭环验证", project: "接线演练场", status: "已阻塞", pri: "mid", agent: "Triager-Worker", updated: "5 天前" },
] as const

const ISSUE_STATUSES = [
    { label: "待规划", tone: "backlog" },
    { label: "待办", tone: "todo" },
    { label: "进行中", tone: "doing" },
    { label: "审核中", tone: "review" },
    { label: "已完成", tone: "done" },
    { label: "已阻塞", tone: "blocked" },
] as const

// 优先级 + 状态 = Linear 几何原子(端口自 feat/loop-react mlv icons.tsx,着色走 --wk-* 带 fallback)。
function PriorityIcon({ pri, size = 16 }: { pri: "none" | "mid" | "urgent"; size?: number }) {
    if (pri === "urgent") {
        return (
            <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="紧急">
                <rect x="1" y="1" width="14" height="14" rx="3.5" style={{ fill: "var(--wk-color-warning, #d99e21)" }} />
                <rect x="7" y="3.6" width="2" height="5.4" rx="1" fill="#fff" />
                <rect x="7" y="10.6" width="2" height="2" rx="1" fill="#fff" />
            </svg>
        )
    }
    const on = pri === "mid" ? 2 : 0
    const bars = [{ x: 1.5, y: 9, h: 5 }, { x: 6.5, y: 6, h: 8 }, { x: 11.5, y: 3, h: 11 }]
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="优先级">
            {bars.map((b, i) => (
                <rect key={i} x={b.x} y={b.y} width="3" height={b.h} rx="1" style={{ fill: i < on ? "var(--wk-text-primary, #1f2329)" : "var(--wk-text-disabled, #c9cdd4)" }} />
            ))}
        </svg>
    )
}

// restyle 状态 tone → benchmark 状态键
const STATUS_KEY: Record<string, string> = { backlog: "backlog", todo: "open", doing: "in_progress", warm: "in_progress", review: "review", green: "review", done: "done", blocked: "blocked", red: "blocked" }
function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
    const ring = (color: string, dash?: string) => (
        <circle cx="8" cy="8" r="6" fill="none" style={{ stroke: color }} strokeWidth={1.6} strokeDasharray={dash} />
    )
    switch (status) {
        case "backlog":
            return <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="待规划">{ring("var(--wk-text-tertiary, #8f959e)", "2.4 2.2")}</svg>
        case "open":
            return <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="待办">{ring("var(--wk-text-tertiary, #8f959e)")}</svg>
        case "in_progress":
            return (
                <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="进行中">
                    {ring("var(--wk-color-info, #2f6fed)")}
                    <path d="M8 8 L8 3 A5 5 0 0 1 13 8 Z" style={{ fill: "var(--wk-color-info, #2f6fed)" }} />
                </svg>
            )
        case "review":
            return (
                <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="审核中">
                    {ring("var(--wk-color-warning, #d99e21)")}
                    <path d="M8 8 L8 3 A5 5 0 1 1 4.46 11.54 Z" style={{ fill: "var(--wk-color-warning, #d99e21)" }} />
                </svg>
            )
        case "done":
            return (
                <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="已完成">
                    <circle cx="8" cy="8" r="7" style={{ fill: "var(--wk-color-success, #2ea44f)" }} />
                    <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        case "blocked":
            return (
                <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="已阻塞">
                    <circle cx="8" cy="8" r="7" style={{ fill: "var(--wk-color-error, #e5484d)" }} />
                    <rect x="7" y="4" width="2" height="5" rx="1" fill="#fff" />
                    <rect x="7" y="10.5" width="2" height="2" rx="1" fill="#fff" />
                </svg>
            )
        default:
            return <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon">{ring("var(--wk-text-tertiary, #8f959e)")}</svg>
    }
}

function IssueGroupList({ rows }: { rows: ReadonlyArray<typeof ISSUE_ROWS[number]> }) {
    return (
        <div className="mlv-list">
            {ISSUE_STATUSES.map((st) => {
                const group = rows.filter((r) => r.status === st.label)
                if (group.length === 0) return null
                const skey = STATUS_KEY[st.tone] || "open"
                return (
                    <div key={st.label} className="mlv-group">
                        <button type="button" className="mlv-group-head">
                            <span className="mlv-chev is-open">›</span>
                            <StatusIcon status={skey} size={14} />
                            <span className="mlv-group-label">{st.label}</span>
                            <span className="mlv-group-count">{group.length}</span>
                        </button>
                        {group.map((r) => (
                            <div
                                key={r.key}
                                className="mlv-row"
                                role="button"
                                tabIndex={0}
                                onClick={() => WKApp.routeRight.replaceToRoot(<MatterIssueDetail issue={r} />)}
                            >
                                <label className="mlv-check" onClick={(e) => e.stopPropagation()}>
                                    <input type="checkbox" aria-label="选择回路" />
                                </label>
                                <span className="mlv-cell mlv-icon-btn"><PriorityIcon pri={r.pri} size={16} /></span>
                                <span className="mlv-cell mlv-icon-btn"><StatusIcon status={skey} size={16} /></span>
                                <span className="mlv-title">{r.title}</span>
                                <span className="mlv-flex" />
                                <span className="mlv-proj">{r.project}</span>
                                <span className="mlv-id">{r.key}</span>
                                {r.agent !== "未分配" ? (
                                    <span className="mlv-leader">
                                        <AgentAvatar name={r.agent} size={18} />
                                        <span className="mlv-leader-name">{r.agent}</span>
                                        <span className="mlv-ai">AI</span>
                                    </span>
                                ) : (
                                    <span className="mlv-leader mlv-leader--none">未分配</span>
                                )}
                                <span className="mlv-date">{r.updated}</span>
                            </div>
                        ))}
                    </div>
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
        if (workspaces.length === 0) {
            WKApp.routeRight.replaceToRoot(<MatterWorkspaceGate onCreate={() => setCreateWsOpen(true)} />)
            return
        }
        if (view === "workspaces") {
            WKApp.routeRight.replaceToRoot(
                <MatterWorkspacesManage
                    workspaces={workspaces}
                    currentWsId={currentWsId}
                    onCreate={() => setCreateWsOpen(true)}
                    onDelete={(id) => {
                        setWorkspaces((list) => list.filter((w) => w.id !== id))
                        if (currentWsId === id) {
                            const next = workspaces.filter((w) => w.id !== id)
                            setCurrentWsId(next[0]?.id ?? "")
                        }
                    }}
                />
            )
            return
        }
        if (view === "myissues") {
            WKApp.routeRight.replaceToRoot(
                <MatterIssuesBoard title="我的回路" tabs={["全部", "已分配", "我创建的", "我的智能体和小队"]} defaultTab={1} />
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
                    <span className="wk-matter-v2-sidebar__mark">{(currentWs?.name ?? "—").slice(0, 1)}</span>
                    <strong>{currentWs?.name ?? "选择工作区"}</strong>
                    <ChevronDown size={14} className="wk-matter-v2-sidebar__chev" />
                </button>
            </header>

            <div className="wk-matter-v2-sidebar__quick">
                <button type="button" onClick={() => setCreateIssueOpen(true)}><Edit3 size={16} />新建回路<kbd>C</kbd></button>
            </div>

            <nav className="wk-matter-v2-sidebar__nav">
                <button type="button" className={activeView === "myissues" ? "is-active" : ""} onClick={() => setView("myissues")}>
                    <CircleUserRound size={16} />
                    我的回路
                </button>
            </nav>

            <div className="wk-matter-v2-sidebar__group">
                <span>工作区</span>
                <button type="button" className={activeView === "issues" ? "is-active" : ""} onClick={() => setView("issues")}>
                    <LoopIcon size={16} />
                    回路
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
                {/* ⑧ 技能节点已迁「我的」(User 层);AI 队友/小队详情内 Loading 全局 Skills */}
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

// P7/P8(Evan R2):零工作区门——用户一个工作区都没进时,先加入/创建一个(替代默认工作区)。
function MatterWorkspaceGate({ onCreate }: { onCreate: () => void }) {
    return (
        <section className="wk-ws-gate" aria-label="尚未加入工作区">
            <div className="wk-ws-gate__inner">
                <span className="wk-ws-gate__icon"><Users size={30} /></span>
                <h1>你还没有加入任何工作区</h1>
                <p>工作区是团队组织回路、AI 队友与协作的地方。先加入一个别人邀请你的工作区,或自己创建一个。</p>
                <div className="wk-ws-gate__actions">
                    <button type="button" className="wk-ws-gate__primary" onClick={onCreate}><Plus size={16} />创建工作区</button>
                    <button type="button" className="wk-ws-gate__ghost"><UserPlus size={16} />用邀请链接加入</button>
                </div>
                <p className="wk-ws-gate__hint">收到邀请卡片或链接后,点开即可加入对应工作区。</p>
            </div>
        </section>
    )
}

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

    function submit() {
        const trimmed = name.trim() || "未命名工作区"
        onCreate({
            id: `ws-${Math.random().toString(36).slice(2, 8)}`,
            name: trimmed,
            desc: desc.trim() || "刚创建的工作区。",
            members: 1,
            updated: "刚刚",
        })
    }

    return (
        <div className="wk-ws-create" role="presentation" onMouseDown={onClose}>
            <div className="wk-ws-create__dialog" role="dialog" aria-modal="true" aria-label="新建工作区" onMouseDown={(e) => e.stopPropagation()}>
                <header className="wk-ws-create__head">
                    <div>
                        <h2>新建工作区</h2>
                        <p>工作区是团队组织回路、成员与协作的地方。</p>
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
                    <div className="wk-ws-create__invitenote">
                        <UserPlus size={15} />
                        <span>创建后,你作为管理员可在「管理工作区」里,用邀请链接或 IM 消息卡片把成员拉进来。</span>
                    </div>
                </main>
                <footer className="wk-ws-create__foot">
                    <div className="wk-ws-create__actions">
                        <button type="button" className="wk-ws-create__cancel" onClick={onClose}>取消</button>
                        <button type="button" className="wk-ws-create__submit" onClick={submit}>创建工作区</button>
                    </div>
                </footer>
            </div>
        </div>
    )
}

// P8(Evan R2):工作区管理 = 左工作区列表 + 右成员管理(去默认工作区;邀请走链接 / IM 卡片)。
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
    const [selectedId, setSelectedId] = useState(currentWsId)
    const [rowMenu, setRowMenu] = useState(false)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [sent, setSent] = useState(false)

    const visible = workspaces.filter((w) => w.name.includes(query.trim()))
    const selectedWs = workspaces.find((w) => w.id === selectedId) ?? workspaces[0]
    const members = selectedWs ? wsMembers(selectedWs) : []
    const inviteLink = selectedWs ? `https://octo.app/join/${selectedWs.id}/${selectedWs.id.slice(-4)}k7q` : ""

    return (
        <section className="wk-wsmg2" aria-label="工作区管理">
            <aside className="wk-wsmg2__side">
                <header className="wk-wsmg2__sidehead">
                    <strong>工作区 <em>{workspaces.length}</em></strong>
                    <button type="button" className="wk-wsmg2__new" onClick={onCreate} aria-label="新建工作区"><Plus size={15} /></button>
                </header>
                <label className="wk-wsmg2__search">
                    <Search size={14} />
                    <input placeholder="搜索工作区..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </label>
                <div className="wk-wsmg2__list">
                    {visible.map((w) => (
                        <button
                            key={w.id}
                            type="button"
                            className={`wk-wsmg2__row${w.id === selectedId ? " is-active" : ""}`}
                            onClick={() => { setSelectedId(w.id); setInviteOpen(false); setSent(false); setRowMenu(false) }}
                        >
                            <span className="wk-wsmg2__mark">{w.name.slice(0, 1)}</span>
                            <span className="wk-wsmg2__rowmain">
                                <strong>{w.name}{w.id === currentWsId && <i>当前</i>}</strong>
                                <span>{w.members} 成员 · 更新于 {w.updated}</span>
                            </span>
                        </button>
                    ))}
                    {visible.length === 0 && <div className="wk-wsmg2__empty">没有匹配的工作区</div>}
                </div>
            </aside>

            <article className="wk-wsmg2__main">
                {selectedWs ? (
                    <>
                        <header className="wk-wsmg2__mainhead">
                            <div>
                                <h1>{selectedWs.name}</h1>
                                <p>{selectedWs.desc}</p>
                            </div>
                            <div className="wk-wsmg2__rowmenu">
                                <button type="button" aria-label="工作区操作" onClick={() => setRowMenu((v) => !v)}><MoreHorizontal size={18} /></button>
                                {rowMenu && (
                                    <div className="wk-wsmg2__menu" role="menu">
                                        <button type="button" role="menuitem" onClick={() => setRowMenu(false)}>重命名...</button>
                                        <button type="button" role="menuitem" onClick={() => setRowMenu(false)}>移交负责人...</button>
                                        <button type="button" role="menuitem" className="is-danger" onClick={() => { setRowMenu(false); onDelete(selectedWs.id) }}>删除工作区</button>
                                    </div>
                                )}
                            </div>
                        </header>

                        <section className="wk-wsmg2__members">
                            <div className="wk-wsmg2__memhead">
                                <strong>成员 <em>{members.length}</em></strong>
                                <button type="button" className="wk-wsmg2__invite" onClick={() => setInviteOpen((v) => !v)}><UserPlus size={14} />邀请成员</button>
                            </div>

                            {inviteOpen && (
                                <div className="wk-wsmg2__invitepanel">
                                    <div className="wk-wsmg2__inviterow">
                                        <span className="wk-wsmg2__invitelabel">邀请链接</span>
                                        <div className="wk-wsmg2__linkbox">
                                            <input readOnly value={inviteLink} />
                                            <button type="button" onClick={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) }}>{copied ? "已复制" : "复制"}</button>
                                        </div>
                                    </div>
                                    <div className="wk-wsmg2__inviterow">
                                        <span className="wk-wsmg2__invitelabel">发到 IM</span>
                                        <div className="wk-wsmg2__imrow">
                                            <select onChange={() => setSent(false)}>
                                                <option># 产品研发部 / general</option>
                                                <option># 产品研发部 / 换皮-thread</option>
                                                <option># 增长实验室 / general</option>
                                            </select>
                                            <button type="button" onClick={() => setSent(true)}>发送邀请卡片</button>
                                        </div>
                                    </div>
                                    {sent && <p className="wk-wsmg2__sent">✓ 已把邀请卡片发到所选频道(原型摆拍)。</p>}
                                </div>
                            )}

                            <div className="wk-wsmg2__memlist">
                                {members.map((m) => (
                                    <div key={m.id} className="wk-wsmg2__mem">
                                        <span className="wk-wsmg2__memav">{m.name.slice(0, 1)}</span>
                                        <span className="wk-wsmg2__memname">{m.name}</span>
                                        <span className={`wk-wsmg2__role${m.role === "admin" ? " is-admin" : ""}`}>{m.role === "admin" ? "管理员" : "成员"}</span>
                                        <span className="wk-wsmg2__joined">{m.joined}</span>
                                        <button type="button" className="wk-wsmg2__memmore" aria-label="成员操作"><MoreHorizontal size={15} /></button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="wk-wsmg2__none">选择左侧一个工作区来管理它的成员。</div>
                )}
            </article>
        </section>
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
            { key: "OCT-7", title: "打磨 OctoLoop 演示脚本：一句话派单全链路", desc: "从建单到回报,把演示脚本走顺。", project: "OctoLoop 产品手册", agent: "OctoLoop 上手小队", agentType: "squad", updated: "更新于 1 小时前", pri: "mid", progress: { done: 3, total: 5 } },
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
        <span className="wk-mv2-ring" title={`子回路 ${done}/${total}`}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <circle cx="7" cy="7" r={r} fill="none" stroke="var(--wk-border-default)" strokeWidth="2" />
                <circle cx="7" cy="7" r={r} fill="none" stroke={frac >= 1 ? "#2f6fed" : "#2ea44f"} strokeWidth="2" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 7 7)" strokeLinecap="round" />
            </svg>
            {done}/{total}
        </span>
    )
}

const CARD_PROPS = ["优先级", "描述", "负责人", "开始日期", "截止日期", "项目", "标签", "子回路进度"]

function MatterIssuesBoard({
    title = "全部回路",
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
        <section className="wk-matter-board" aria-label="MatterV2 回路看板">
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
                        <button type="button" aria-haspopup="menu" aria-expanded={displayOpen} onClick={() => { setDisplayOpen((v) => !v); setFilterOpen(false); setViewOpen(false) }}>显示</button>
                        {displayOpen && (
                            <div className="wk-mv2-panel" role="menu">
                                <div className="wk-mv2-panel__row">
                                    <span>布局</span>
                                    <div className="wk-mv2-seg">
                                        <button type="button" className={view === "board" ? "is-on" : ""} onClick={() => setView("board")}>看板</button>
                                        <button type="button" className={view === "list" ? "is-on" : ""} onClick={() => setView("list")}>列表</button>
                                    </div>
                                </div>
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
                </div>
            </div>

            {view === "list" ? (
                <IssueGroupList rows={ISSUE_ROWS} />
            ) : (
                <div className="mlv-board">
                    {BOARD_COLUMNS.map((column) => {
                        const skey = STATUS_KEY[column.tone] || "open"
                        return (
                            <div key={column.id} className="mlv-col">
                                <div className="mlv-col-head">
                                    <StatusIcon status={skey} size={14} />
                                    <span className="mlv-col-label">{column.label}</span>
                                    <span className="mlv-col-count">{column.cards.length}</span>
                                    <span className="mlv-flex" />
                                    <button type="button" className="mlv-col-add" onClick={() => setCreateIssueOpen(true)} aria-label="新建回路">+</button>
                                </div>
                                <div className="mlv-col-cards">
                                    {column.cards.map((card) => (
                                        <div
                                            key={card.key}
                                            className="mlv-card"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => WKApp.routeRight.replaceToRoot(<MatterIssueDetail issue={card} />)}
                                        >
                                            <div className="mlv-card-top">
                                                {cardProps.includes("优先级") && <span className="mlv-icon-btn"><PriorityIcon pri={card.pri} size={14} /></span>}
                                                <span className="mlv-icon-btn"><StatusIcon status={skey} size={14} /></span>
                                                <span className="mlv-card-id">{card.key}</span>
                                                <span className="mlv-flex" />
                                                {card.updated && <span className="mlv-card-date">{card.updated.replace("更新于 ", "")}</span>}
                                            </div>
                                            <div className="mlv-card-title">{card.title}</div>
                                            <div className="mlv-card-foot">
                                                {cardProps.includes("项目") && <span className="mlv-card-proj">{card.project}</span>}
                                                <span className="mlv-flex" />
                                                {cardProps.includes("子回路进度") && card.progress && <ProgressRing done={card.progress.done} total={card.progress.total} />}
                                                {cardProps.includes("负责人") && card.agentType !== "none" && (
                                                    <span className="mlv-card-leader">
                                                        {card.agentType === "squad" ? <SquadAvatar name={card.agent} size={18} /> : <AgentAvatar name={card.agent} size={18} />}
                                                        <span className="mlv-ai">{card.agentType === "squad" ? "队" : "AI"}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {createIssueOpen && <MatterCreateIssueModal onClose={() => setCreateIssueOpen(false)} />}
        </section>
    )
}

// ① 建单重构(0707 终挑):手动=Stripe 全屏双栏(左分节表单 + 右实时预览,右侧要有排版);
// AI 队友=Linear Ask(居中 composer + Skills 下拉 + 可关闭示例卡)。字段与旧弹窗一致,容器换形态。
const CREATE_ISSUE_AGENT = "Prototyper-Codex-MBOT"
const CREATE_ISSUE_PROJECTS = ["Octo-Runtime", "OctoLoop 产品手册", "接线演练场"]
const CREATE_STATUS = ["待规划", "待办", "进行中", "审核中"]
const CREATE_PRI = ["无优先级", "低", "中", "紧急"] as const
const CREATE_ASSIGNEES = [CREATE_ISSUE_AGENT, "CC-Protoper", "Analyser-CC-MBOT", "王宜林 (我)"]
const CREATE_SKILLS = ["lark-doc", "lark-sheets", "lark-wiki", "browser-use"]
const CREATE_EXAMPLES = [
    { title: "打磨演示脚本", desc: "从建单到回报,把一句话派单全链路走顺。" },
    { title: "整理用户反馈", desc: "把上周反馈归并成 top 10 痛点表格。" },
    { title: "排查收件箱加载慢", desc: "让 Bohan 修一下 Web 项目里收件箱加载慢的问题。" },
]

function MatterCreateIssueModal({ onClose }: { onClose: () => void }) {
    const [mode, setMode] = useState<"manual" | "agent">("manual")
    const [keepCreating, setKeepCreating] = useState(false)
    // 手动模式字段(与旧弹窗字段一致)
    const [title, setTitle] = useState("")
    const [desc, setDesc] = useState("")
    const [status, setStatus] = useState("待办")
    const [pri, setPri] = useState<(typeof CREATE_PRI)[number]>("无优先级")
    const [assignee, setAssignee] = useState(CREATE_ISSUE_AGENT)
    const [project, setProject] = useState(CREATE_ISSUE_PROJECTS[0])
    const [due, setDue] = useState("")
    const [extras, setExtras] = useState<string[]>([])
    const [previewTab, setPreviewTab] = useState<"card" | "detail">("card")
    // AI 队友模式
    const [intent, setIntent] = useState("")
    const [agentProject, setAgentProject] = useState("")
    const [skillsOpen, setSkillsOpen] = useState(false)
    const [projectOpen, setProjectOpen] = useState(false)
    const [examplesShown, setExamplesShown] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onClose()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose])

    function toggleExtra(key: string) {
        setExtras((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]))
    }

    const priIcon: "none" | "mid" | "urgent" = pri === "紧急" ? "urgent" : pri === "无优先级" ? "none" : "mid"
    const isBotAssignee = assignee !== "王宜林 (我)"

    return (
        <div className="wk-loop-create" role="dialog" aria-modal="true" aria-label="新建回路">
            <header className="wk-loop-create__bar">
                <button type="button" className="wk-loop-create__close" aria-label="关闭" onClick={onClose}>✕</button>
                <i className="wk-loop-create__divider" />
                <strong className="wk-loop-create__name">新建回路</strong>
                <div className="wk-loop-create__modes" role="tablist" aria-label="创建方式">
                    <button type="button" role="tab" aria-selected={mode === "manual"} className={mode === "manual" ? "is-active" : ""} onClick={() => setMode("manual")}>手动</button>
                    <button type="button" role="tab" aria-selected={mode === "agent"} className={mode === "agent" ? "is-active" : ""} onClick={() => setMode("agent")}>AI 队友</button>
                </div>
                <div className="wk-loop-create__bar-right">
                    {mode === "manual" && (
                        <div className="wk-loop-create__keep">
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
                    )}
                    <button type="button" className="wk-loop-create__submit" onClick={onClose}>
                        {mode === "manual" ? "创建回路" : "派单 (⌘↵)"}
                    </button>
                </div>
            </header>

            {mode === "manual" ? (
                <div className="wk-loop-create__split">
                    <main className="wk-loop-create__form">
                        <section>
                            <h3>基本信息</h3>
                            <input className="wk-loop-create__title" placeholder="Loop 标题" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
                            <textarea className="wk-loop-create__desc" placeholder="添加描述..." value={desc} onChange={(e) => setDesc(e.target.value)} />
                        </section>
                        <section>
                            <h3>属性</h3>
                            <div className="wk-loop-create__grid">
                                <label>
                                    <span>状态</span>
                                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                        {CREATE_STATUS.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </label>
                                <label>
                                    <span>优先级</span>
                                    <select value={pri} onChange={(e) => setPri(e.target.value as any)}>
                                        {CREATE_PRI.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </label>
                                <label>
                                    <span>负责人</span>
                                    <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                                        {CREATE_ASSIGNEES.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </label>
                                <label>
                                    <span>项目</span>
                                    <select value={project} onChange={(e) => setProject(e.target.value)}>
                                        {CREATE_ISSUE_PROJECTS.map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </label>
                                <label>
                                    <span>截止日期</span>
                                    <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                                </label>
                            </div>
                            {isBotAssignee && (
                                <p className="wk-loop-create__hint">
                                    <AgentAvatar name={assignee} size={16} />
                                    创建后 {assignee} 会立即开始工作。
                                </p>
                            )}
                        </section>
                        <section>
                            <h3>更多选项</h3>
                            <div className="wk-loop-create__extras">
                                {[
                                    { k: "start", label: "开始日期" },
                                    { k: "parent", label: "父回路" },
                                    { k: "sub", label: "子回路" },
                                    { k: "attach", label: "附件" },
                                ].map((opt) => (
                                    <div key={opt.k} className="wk-loop-create__extra">
                                        <label>
                                            <input type="checkbox" checked={extras.includes(opt.k)} onChange={() => toggleExtra(opt.k)} />
                                            <span>{opt.label}</span>
                                        </label>
                                        {extras.includes(opt.k) && (
                                            <div className="wk-loop-create__extra-ctl">
                                                {opt.k === "start" && <input type="date" />}
                                                {opt.k === "parent" && (
                                                    <select defaultValue="">
                                                        <option value="" disabled>选择父回路...</option>
                                                        <option>OCT-7 打磨 OctoLoop 演示脚本</option>
                                                        <option>OCT-4 整理 OctoLoop 上手指南</option>
                                                    </select>
                                                )}
                                                {opt.k === "sub" && <input placeholder="子回路 标题,回车添加" />}
                                                {opt.k === "attach" && (
                                                    <button type="button" className="wk-loop-create__attach">
                                                        <Paperclip size={14} />
                                                        选择文件
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </main>
                    <aside className="wk-loop-create__preview" aria-label="预览">
                        <div className="wk-loop-create__ptabs">
                            <span>预览</span>
                            <div role="tablist">
                                <button type="button" role="tab" aria-selected={previewTab === "card"} className={previewTab === "card" ? "is-active" : ""} onClick={() => setPreviewTab("card")}>看板卡片</button>
                                <button type="button" role="tab" aria-selected={previewTab === "detail"} className={previewTab === "detail" ? "is-active" : ""} onClick={() => setPreviewTab("detail")}>详情页</button>
                            </div>
                        </div>
                        {previewTab === "card" ? (
                            <div className="wk-loop-create__pcanvas">
                                <div className="wk-loop-create__pcol">
                                    <div className="wk-loop-create__pcol-head">
                                        <i />
                                        {status}
                                        <em>+1</em>
                                    </div>
                                    <div className="wk-loop-create__pcard">
                                        <div className="wk-loop-create__pcard-top">
                                            <PriorityIcon pri={priIcon} />
                                            <span>OCT-124</span>
                                        </div>
                                        <strong>{title || "未命名回路"}</strong>
                                        {desc.trim() && <p>{desc}</p>}
                                        <div className="wk-loop-create__pcard-meta">📁 {project}</div>
                                        <div className="wk-loop-create__pcard-foot">
                                            <span><AgentAvatar name={assignee} size={16} />{assignee}</span>
                                            <time>刚刚</time>
                                        </div>
                                    </div>
                                </div>
                                <p className="wk-loop-create__pnote">创建后,这张卡会出现在「{status}」列。</p>
                            </div>
                        ) : (
                            <div className="wk-loop-create__pcanvas">
                                <div className="wk-loop-create__pdetail">
                                    <div className="wk-loop-create__pdetail-crumb">
                                        <span>📁 {project}</span>
                                        <ChevronRight size={12} />
                                        <span>OCT-124</span>
                                    </div>
                                    <h2>{title || "未命名回路"}</h2>
                                    <div className="wk-loop-create__pdetail-chips">
                                        <i><Circle size={11} />{status}</i>
                                        <i>{pri}</i>
                                        <i><AgentAvatar name={assignee} size={14} />{assignee}</i>
                                        {due && <i>📅 {due}</i>}
                                    </div>
                                    <p>{desc.trim() || "添加描述后,这里会显示回路的正文。"}</p>
                                    <dl>
                                        <div><dt>项目</dt><dd>{project}</dd></div>
                                        <div><dt>负责人</dt><dd>{assignee}</dd></div>
                                        <div><dt>状态</dt><dd>{status}</dd></div>
                                        <div><dt>截止日期</dt><dd>{due || "—"}</dd></div>
                                    </dl>
                                </div>
                                <p className="wk-loop-create__pnote">字段沿用 Loop 详情页(基准),创建即长这样。</p>
                            </div>
                        )}
                    </aside>
                </div>
            ) : (
                <div className="wk-loop-create__ask">
                    <div className="wk-loop-create__ask-inner">
                        <h2>把活交给 AI 队友</h2>
                        <p>一句话描述你要的结果,{CREATE_ISSUE_AGENT} 会把它变成一个跑起来的回路。</p>
                        <div className="wk-loop-create__cli">
                            <div className="wk-loop-create__cli-head">
                                <span className="wk-loop-create__cli-dot" />
                                <div>
                                    <strong>你还没装 OctoLoop CLI</strong>
                                    <span>装上后,{CREATE_ISSUE_AGENT} 就能在你的机器上跑这个回路;暂时没装也行——把下面这条信息发给 Bot 即可派单。</span>
                                </div>
                            </div>
                            <div className="wk-loop-create__cli-acts">
                                <button type="button" className="wk-loop-create__cli-install">查看安装指引</button>
                                <button
                                    type="button"
                                    className="wk-loop-create__cli-copy"
                                    onClick={() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600) }}
                                >
                                    {copied ? "已复制到剪贴板" : "一键复制发给 Bot 的信息"}
                                </button>
                            </div>
                        </div>
                        <div className="wk-loop-create__composer">
                            <textarea
                                autoFocus
                                placeholder='例如:"让 Bohan 修一下 Web 项目里收件箱加载慢的问题"'
                                value={intent}
                                onChange={(e) => setIntent(e.target.value)}
                            />
                            <div className="wk-loop-create__composer-bar">
                                <div className="wk-loop-create__composer-left">
                                    <button type="button" aria-haspopup="menu" aria-expanded={skillsOpen} onClick={() => { setSkillsOpen((v) => !v); setProjectOpen(false) }}>
                                        Skills
                                        <ChevronDown size={13} />
                                    </button>
                                    {skillsOpen && (
                                        <div className="wk-loop-create__menu" role="menu">
                                            {CREATE_SKILLS.map((s) => (
                                                <button key={s} type="button" role="menuitem" onClick={() => setSkillsOpen(false)}>{s}</button>
                                            ))}
                                            <footer>来自 我的 Skills</footer>
                                        </div>
                                    )}
                                    <button type="button" aria-haspopup="menu" aria-expanded={projectOpen} onClick={() => { setProjectOpen((v) => !v); setSkillsOpen(false) }}>
                                        <Briefcase size={13} />
                                        {agentProject || "无项目"}
                                    </button>
                                    {projectOpen && (
                                        <div className="wk-loop-create__menu is-project" role="menu">
                                            {CREATE_ISSUE_PROJECTS.map((p) => (
                                                <button key={p} type="button" role="menuitem" onClick={() => { setAgentProject(p); setProjectOpen(false) }}>📁 {p}</button>
                                            ))}
                                        </div>
                                    )}
                                    <button type="button" aria-label="添加附件"><Paperclip size={14} /></button>
                                </div>
                                <div className="wk-loop-create__composer-right">
                                    <span className="wk-loop-create__exec"><AgentAvatar name={CREATE_ISSUE_AGENT} size={16} />{CREATE_ISSUE_AGENT}</span>
                                    <button type="button" className="wk-loop-create__send" onClick={onClose}>派单 ⌘↵</button>
                                </div>
                            </div>
                        </div>
                        {examplesShown && (
                            <div className="wk-loop-create__examples">
                                <div className="wk-loop-create__examples-head">
                                    <span>从一个例子开始</span>
                                    <button type="button" aria-label="关闭示例" onClick={() => setExamplesShown(false)}>✕</button>
                                </div>
                                <div className="wk-loop-create__examples-grid">
                                    {CREATE_EXAMPLES.map((ex) => (
                                        <button key={ex.title} type="button" onClick={() => setIntent(ex.desc)}>
                                            <strong>{ex.title}</strong>
                                            <span>{ex.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// A1 自动化(0707 批改):列表=Obvious 式卡片(标题+说明两行+频率 tag,参照 11-Obvious Daily Briefing);
// 新建=单页表单(全字段一屏,不分步);详情页=feat/loop-react AutomationDetailView 语法(属性/任务说明/运行历史)。
interface AutomationRow {
    id: string
    title: string
    desc: string
    prompt?: string
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
prompt: `你是团队的行业情报助手。每天早上 09:00 触发时,完成以下工作。

# 目标
收集过去 24 小时内与我们团队相关的行业动态,汇总成一份可直接群发的中文晨报。

# 步骤
1. 扫描订阅源(Hacker News、本周 arXiv cs.AI 新论文、竞品公告页),挑出与「AI Agent 工作台 / 多智能体协作 / 回路编排」强相关的 5–8 条。
2. 每条给出:一句话结论 + 为什么和我们有关 + 原文链接。
3. 按「值得马上跟进 / 保持关注 / 仅供了解」三档排序。
4. 开头写 2–3 句今日总览,结尾附一条你的判断。

# 风格
- 先结论后论据,能删则删。
- 不确定的信息标注「待核实」,不要编造数据。
- 全文控制在 600 字以内。`,
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
        desc: "每周五扫描本周完成的回路,生成周报草稿等确认。",
prompt: `你是团队的周报撰写助手。每周五 17:00 触发时,生成本周周报草稿并等待确认。

# 目标
扫描本周状态变为「已完成」的回路,沉淀成一份结构化周报。

# 步骤
1. 拉取本周(周一至周五)完成的所有回路,按项目分组。
2. 每个项目写:本周交付了什么、关键进展、遗留问题。
3. 汇总本周数字:完成回路数、参与的 AI 队友、平均耗时。
4. 末尾列出下周需要人拍板的 2–3 个决策点。

# 风格
- 面向管理者视角,突出结果而非过程。
- 草稿完成后进入「待确认」,不要直接群发。`,
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

// 单页新建(P3=Resend 广播撰写页,0707 终挑):邮件式行字段 + When 自然语言回显(时区注脚)+ 大任务说明输入区
function pad2(n: number) { return String(n).padStart(2, "0") }

// A1(Evan R3):触发时间 = 真日历 date picker(替下拉/联想)。参照设计库 Linear Schedule / Cursor。
function MiniCalendar({ value, onPick }: { value: Date; onPick: (d: Date) => void }) {
    const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1))
    const year = view.getFullYear()
    const month = view.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const days = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    const cells: Array<number | null> = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
    return (
        <div className="wk-dtp" onMouseDown={(e) => e.stopPropagation()}>
            <div className="wk-dtp__head">
                <button type="button" onClick={() => setView(new Date(year, month - 1, 1))} aria-label="上个月"><ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /></button>
                <span>{year} 年 {month + 1} 月</span>
                <button type="button" onClick={() => setView(new Date(year, month + 1, 1))} aria-label="下个月"><ChevronRight size={15} /></button>
            </div>
            <div className="wk-dtp__week">{["日", "一", "二", "三", "四", "五", "六"].map((w) => <span key={w}>{w}</span>)}</div>
            <div className="wk-dtp__grid">
                {cells.map((d, i) => d === null ? <span key={i} /> : (
                    <button
                        key={i}
                        type="button"
                        className={`wk-dtp__day${value.getFullYear() === year && value.getMonth() === month && value.getDate() === d ? " is-sel" : ""}${today.getFullYear() === year && today.getMonth() === month && today.getDate() === d ? " is-today" : ""}`}
                        onClick={() => onPick(new Date(year, month, d))}
                    >{d}</button>
                ))}
            </div>
        </div>
    )
}

const FREQ_LABEL: Record<string, string> = { once: "单次", daily: "每天", weekly: "每周", monthly: "每月" }

function TriggerField() {
    const [freq, setFreq] = useState<"once" | "daily" | "weekly" | "monthly">("daily")
    const [date, setDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d })
    const [weekday, setWeekday] = useState(1)
    const [monthday, setMonthday] = useState(1)
    const [time, setTime] = useState("09:00")
    const [calOpen, setCalOpen] = useState(false)
    const WD = ["日", "一", "二", "三", "四", "五", "六"]
    const dateStr = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    const echo = freq === "once" ? `${dateStr} ${time}`
        : freq === "daily" ? `每天 ${time}`
        : freq === "weekly" ? `每周${WD[weekday]} ${time}`
        : `每月 ${monthday} 日 ${time}`
    return (
        <div className="wk-awz__row is-trigger">
            <span>触发时间</span>
            <div className="wk-awz__triggerbox">
                <div className="wk-mv2-seg wk-awz__freqseg">
                    {(["once", "daily", "weekly", "monthly"] as const).map((f) => (
                        <button key={f} type="button" className={freq === f ? "is-on" : ""} onClick={() => { setFreq(f); setCalOpen(false) }}>{FREQ_LABEL[f]}</button>
                    ))}
                </div>
                <div className="wk-awz__triggerctl">
                    {freq === "once" && (
                        <div className="wk-awz__datewrap">
                            <button type="button" className="wk-awz__datebtn" onClick={() => setCalOpen((o) => !o)}>
                                <Calendar size={14} />{dateStr}
                            </button>
                            {calOpen && <MiniCalendar value={date} onPick={(d) => { setDate(d); setCalOpen(false) }} />}
                        </div>
                    )}
                    {freq === "weekly" && (
                        <div className="wk-awz__wdchips">
                            {WD.map((w, i) => (
                                <button key={w} type="button" className={weekday === i ? "is-on" : ""} onClick={() => setWeekday(i)}>{w}</button>
                            ))}
                        </div>
                    )}
                    {freq === "monthly" && (
                        <select className="wk-awz__monthday" value={monthday} onChange={(e) => setMonthday(Number(e.target.value))} aria-label="每月几号">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d} 日</option>)}
                        </select>
                    )}
                    <input type="time" className="wk-awz__time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="时间" />
                </div>
                <em className="wk-awz__echo">下次运行 · {echo}<small>Asia/Shanghai GMT+8</small></em>
            </div>
        </div>
    )
}

function AutomationCreateModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="wk-awz" role="presentation" onMouseDown={onClose}>
            <section className="wk-awz__dialog" role="dialog" aria-modal="true" aria-label="新建自动化" onMouseDown={(e) => e.stopPropagation()}>
                <header className="wk-awz__head">
                    <strong>新建自动化</strong>
                    <button type="button" aria-label="关闭" onClick={onClose}>×</button>
                </header>

                <main className="wk-awz__body is-rows">
                    <div className="wk-awz__row">
                        <span>名称</span>
                        <input autoFocus placeholder="例如:每日晨报" />
                    </div>
                    <div className="wk-awz__row">
                        <span>执行方</span>
                        <select defaultValue="Prototyper-Codex-MBOT">
                            {COWORKERS.map((c) => <option key={c.id}>{c.name}</option>)}
                            {SQUADS.map((s) => <option key={s.id}>{s.name}(小队)</option>)}
                        </select>
                    </div>
                    <div className="wk-awz__row">
                        <span>发送到</span>
                        <select defaultValue="Octo-Runtime">
                            <optgroup label="项目 · 每次触发建一个新回路">
                                {PROJECTS_ROWS.map((proj) => <option key={proj.name}>{proj.name}</option>)}
                            </optgroup>
                            <optgroup label="频道 · 直接发消息,不建回路">
                                <option>#产品研发部</option>
                                <option>#接线演练场</option>
                            </optgroup>
                            <optgroup label="会话线程 · 直接回复,不建回路">
                                <option>线程 · OctoLoop 演示脚本</option>
                                <option>线程 · 回调闭环验证</option>
                            </optgroup>
                        </select>
                    </div>
                    <TriggerField />
                    <textarea
                        className="wk-awz__instructions"
                        placeholder={"任务说明:触发时交给执行方的指令,AI 队友每次运行时读取。写得越像给人的交代,效果越好。\n\n# 目标\n你希望 AI 队友完成什么?\n\n# 步骤\n1. ...\n2. ..."}
                        spellCheck={false}
                    />
                    <p className="wk-awz__hint">创建后立即启用,按 When 的节奏运行,直到停用。</p>
                </main>

                <footer className="wk-awz__foot">
                    <button type="button" className="wk-awz__text" onClick={onClose}>取消</button>
                    <button type="button" className="wk-awz__primary" onClick={onClose}>创建自动化</button>
                </footer>
            </section>
        </div>
    )
}

const RUN_BADGE = { ok: "成功", skip: "跳过", fail: "失败" } as const

// P4(0707 终挑 Stripe 1bbafee3):状态徽章 + 统计卡行(点击即筛运行历史)
function MatterAutomationDetail({ row, onToggle, onBack }: { row: AutomationRow; onToggle: (id: string) => void; onBack: () => void }) {
    const [runFilter, setRunFilter] = useState<"all" | "ok" | "fail" | "skip">("all")
    const counts = {
        all: row.health.length,
        ok: row.health.filter((h) => h === "ok").length,
        fail: row.health.filter((h) => h === "fail").length,
        skip: row.health.filter((h) => h === "skip").length,
    }
    const visibleRuns = row.runs.filter((r) => runFilter === "all" || r.state === runFilter)

    return (
        <section className="wk-avd" aria-label="自动化详情">
            <header className="wk-avd__top">
                <div className="wk-avd__crumb">
                    <button type="button" className="wk-avd__crumb-back" onClick={onBack}>自动化</button>
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
            </header>

            <div className="wk-avd__main">
                <div className="wk-avd__body">
                    <main className="wk-avd__content">
                        {/* 任务说明 = 主体:prompt 是自动化的大头,给足空间(假设很长) */}
                        <section className="wk-avd__promptsec">
                            <div className="wk-avd__secthead">
                                <h2>任务说明</h2>
                                <span>每次触发时交给执行方的完整指令 —— AI 队友按它执行</span>
                            </div>
                            <pre className="wk-avd__prompt">{row.prompt || row.desc}</pre>
                        </section>

                        {/* 运行历史 */}
                        <section className="wk-avd__runsec">
                            <div className="wk-avd__secthead">
                                <h2>运行历史</h2>
                                <span>{runFilter === "all" ? `近 ${row.runs.length} 次运行` : `筛选:${RUN_BADGE[runFilter]}`}</span>
                            </div>
                            <div className="wk-avd__stats" role="tablist" aria-label="按状态筛选运行历史">
                                {([
                                    { k: "all", label: "全部运行" },
                                    { k: "ok", label: "成功" },
                                    { k: "fail", label: "失败" },
                                    { k: "skip", label: "跳过" },
                                ] as const).map((s) => (
                                    <button
                                        key={s.k}
                                        type="button"
                                        role="tab"
                                        aria-selected={runFilter === s.k}
                                        className={runFilter === s.k ? "is-active" : ""}
                                        onClick={() => setRunFilter(s.k)}
                                    >
                                        <span>{s.label}</span>
                                        <strong>{counts[s.k]}</strong>
                                    </button>
                                ))}
                            </div>
                            <div className="wk-avd__runs">
                                {visibleRuns.map((r, i) => (
                                    <div key={i} className="wk-avd__runrow">
                                        <span className={`wk-avd__badge is-${r.state}`}>
                                            {r.state === "ok" ? "✓" : r.state === "fail" ? "✕" : "⤼"} {RUN_BADGE[r.state]}
                                        </span>
                                        <span className="wk-avd__runmsg">定时触发 · 发送到 {row.target}</span>
                                        <em>{r.dur}</em>
                                        <time>{r.at}</time>
                                    </div>
                                ))}
                                {visibleRuns.length === 0 && <div className="wk-avd__runempty">该状态最近没有运行记录。</div>}
                            </div>
                        </section>
                    </main>

                    <aside className="wk-avd__rail">
                        <section className="wk-avd__inspector">
                            <h3>属性</h3>
                            <dl>
                                <div><dt>状态</dt><dd><span className={`wk-avd__statedot is-${row.enabled ? "on" : "off"}`} />{row.enabled ? "启用中" : "已停用"}</dd></div>
                                <div><dt>执行方</dt><dd><AgentAvatar name={row.executor} size={18} />{row.executor}</dd></div>
                                <div><dt>触发</dt><dd>{row.cronText}</dd></div>
                                <div><dt>发送到</dt><dd className="wk-avd__target"><span>📁 {row.target}</span><small>项目 · 每次触发建一个新回路</small></dd></div>
                                <div><dt>下次运行</dt><dd>{row.enabled && row.next ? row.next : "—"}</dd></div>
                            </dl>
                            <button type="button" className="wk-avd__runbtn">▶ 立即运行</button>
                        </section>
                    </aside>
                </div>
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
                <MatterAutomationDetail row={detail} onToggle={toggle} onBack={() => setDetailId(null)} />
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
                                <span className="wk-av-exec"><AgentAvatar name={r.executor} size={16} />{r.executor}</span>
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

            <div className="mlv-list mlv-list--flush" role="list" aria-label="项目列表">
                {PROJECTS_ROWS.map((p) => (
                    <div key={p.name} className="mlv-row" role="button" tabIndex={0}>
                        <span className="mlv-emoji">{p.icon}</span>
                        <span className="mlv-title">{p.name}</span>
                        <span className="mlv-flex" />
                        <span className="mlv-proj">{p.status}</span>
                        <ProgressRing done={p.done} total={p.total} />
                        {p.owner
                            ? <span className="mlv-leader"><span className="mlv-owner-ava">L</span><span className="mlv-leader-name">{p.owner}</span></span>
                            : <span className="mlv-leader mlv-leader--none">未指定</span>}
                        <span className="mlv-date">{p.created}</span>
                    </div>
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
                    <p>能领取回路、留下评论、推进状态的 AI 队友。</p>
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

            <div className="mlv-list mlv-list--flush" role="list" aria-label="AI 队友列表">
                {COWORKERS.map((coworker) => (
                    <div
                        key={coworker.id}
                        className="mlv-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => WKApp.routeRight.replaceToRoot(<MatterCoWorkerDetail coworker={coworker} />)}
                    >
                        <AgentAvatar name={coworker.name} size={20} dot={coworker.archived ? "idle" : "online"} />
                        <span className="mlv-title">{coworker.name}</span>
                        {coworker.visibility === "personal" && <Lock size={12} className="mlv-lock" aria-label="Personal" />}
                        <span className="mlv-rowsub">{coworker.desc}</span>
                        <span className="mlv-flex" />
                        <span className="mlv-proj">{coworker.runtime}</span>
                        <span className="mlv-leader"><span className="mlv-owner-ava">L</span><span className="mlv-leader-name">{coworker.owner}</span></span>
                        <span className="mlv-date">{coworker.lastActive}</span>
                    </div>
                ))}
            </div>

            {createOpen && <CreateAgentModal onClose={() => setCreateOpen(false)} />}
        </section>
    )
}

// T3:五 tab(动态/Tasks/指令/Skills/Connectors[MCP+CLI]);Properties 先按真身字段,后续换 Agent Card。
const CW_TABS = [
    { key: "activity", label: "动态" },
    { key: "tasks", label: "任务" },
    { key: "instructions", label: "指令" },
    { key: "skills", label: "Skills" },
    { key: "connectors", label: "连接器" },
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
                    <AgentAvatar name={coworker.name} size={52} dot="online" />
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
                            <h4>任务<span>分配给这个 AI 队友的回路</span></h4>
                            <div className="wk-cw-tasks__toolbar">
                                <label className="wk-cw-tasks__search"><Search size={14} /><input placeholder="搜索回路..." /></label>
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
                                defaultValue={`你是 ${coworker.name},负责把杂乱请求整理成清晰的回路、评论和下一步动作。\n\n# 工作风格\n- 回复简洁、行动导向。\n- 只在缺失信息会改变结论时提一个澄清问题。\n\n# 范围\n把 workspace 上下文、回路状态、运行时可用性当作输入。`}
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

            <div className="mlv-list mlv-list--flush" role="list" aria-label="小队列表">
                {SQUADS.map((squad) => (
                    <div
                        key={squad.id}
                        className="mlv-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => WKApp.routeRight.replaceToRoot(<MatterSquadDetail squad={squad} />)}
                    >
                        <SquadAvatar name={squad.name} size={20} />
                        <span className="mlv-title">{squad.name}</span>
                        <span className="mlv-rowsub">{squad.description}</span>
                        <span className="mlv-flex" />
                        <span className="mlv-leader"><AgentAvatar name={squad.leader} size={18} /><span className="mlv-leader-name">{squad.leader}</span></span>
                        <span className="mlv-squadmembers">{squad.members.map((member) => <AgentAvatar key={member} name={member} size={18} className="mlv-stack" />)}</span>
                        <span className="mlv-leader mlv-leader--creator"><span className="mlv-owner-ava">L</span><span className="mlv-leader-name">{squad.creator}</span></span>
                    </div>
                ))}
            </div>

            {createOpen && <MatterCreateSquadModal onClose={() => setCreateOpen(false)} />}
        </section>
    )
}

// P13(Evan R2 重做,去 Multica 克隆):建小队 = 队名/描述 → 从「我的 AI 队友」名册搜索勾选 →
// 每成员一行配 领队/成员(参考 Clockwise 创建面 + Vercel 角色行 + Langdock select-existing)。
function MatterCreateSquadModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState("")
    const [desc, setDesc] = useState("")
    const [leaderId, setLeaderId] = useState<string | null>(null)
    const [memberIds, setMemberIds] = useState<string[]>([])
    const [leaderQuery, setLeaderQuery] = useState("")
    const [leaderPickerOpen, setLeaderPickerOpen] = useState(false)
    const [memberQuery, setMemberQuery] = useState("")
    const [memberPickerOpen, setMemberPickerOpen] = useState(false)

    const roster = COWORKERS.filter((c) => !c.archived)
    const byId = (id: string) => COWORKERS.find((c) => c.id === id)!
    const leaderCandidates = roster.filter(
        (c) => c.id !== leaderId && !memberIds.includes(c.id) && c.name.toLowerCase().includes(leaderQuery.trim().toLowerCase()),
    )
    const memberCandidates = roster.filter(
        (c) => c.id !== leaderId && !memberIds.includes(c.id) && c.name.toLowerCase().includes(memberQuery.trim().toLowerCase()),
    )
    const canCreate = name.trim().length > 0 && !!leaderId

    return (
        <div className="wk-sqc" role="presentation" onMouseDown={onClose}>
            <section
                className="wk-sqc__dialog is-two-pane"
                role="dialog"
                aria-modal="true"
                aria-label="创建小队"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="wk-sqc__head">
                    <div>
                        <h2>创建小队</h2>
                        <p>从你的 AI 队友里排一支队,指定一个领队。</p>
                    </div>
                    <button type="button" className="wk-sqc__close" onClick={onClose} aria-label="关闭"><X size={18} /></button>
                </header>

                <div className="wk-sqc__panes">
                <main className="wk-sqc__body">
                    <div className="wk-sqc__field">
                        <span className="wk-sqc__label">名称</span>
                        <div className="wk-sqc__namerow">
                            <span className="wk-sqc__icon"><Users size={18} /></span>
                            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:回路分诊小队" />
                        </div>
                    </div>

                    <div className="wk-sqc__field">
                        <span className="wk-sqc__label">描述</span>
                        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="这个小队负责什么..." />
                    </div>

                    <div className="wk-sqc__field">
                        <span className="wk-sqc__label">领队<em>有且仅有一个,负责调度整支队</em></span>
                        {leaderId ? (
                            <div className="wk-sqc__leadercard">
                                <AgentAvatar name={byId(leaderId).name} size={28} dot="online" />
                                <span className="wk-sqc__m-main"><strong>{byId(leaderId).name}</strong><small>{byId(leaderId).runtime}</small></span>
                                <span className="wk-sqc__leaderbadge">领队</span>
                                <button type="button" className="wk-sqc__change" onClick={() => { setLeaderId(null); setLeaderPickerOpen(true) }}>更换</button>
                            </div>
                        ) : (
                            <div className="wk-sqc__picker">
                                <label className="wk-sqc__search">
                                    <Search size={15} />
                                    <input
                                        value={leaderQuery}
                                        onFocus={() => setLeaderPickerOpen(true)}
                                        onClick={() => setLeaderPickerOpen(true)}
                                        onChange={(e) => { setLeaderQuery(e.target.value); setLeaderPickerOpen(true) }}
                                        placeholder="搜索并指定一名领队..."
                                    />
                                </label>
                                {leaderPickerOpen && (
                                    <div className="wk-sqc__menu" role="listbox">
                                        {leaderCandidates.length === 0 ? (
                                            <div className="wk-sqc__menu-empty">没有可选的 AI 队友</div>
                                        ) : leaderCandidates.map((c) => (
                                            <button key={c.id} type="button" className="wk-sqc__option" onClick={() => { setLeaderId(c.id); setLeaderPickerOpen(false); setLeaderQuery("") }}>
                                                <AgentAvatar name={c.name} size={24} />
                                                <span className="wk-sqc__opt-main"><strong>{c.name}</strong><small>{c.runtime}</small></span>
                                                <Plus size={15} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="wk-sqc__field">
                        <span className="wk-sqc__label">队员<em>领队之外的其他 AI 队友(可选)</em></span>
                        <div className="wk-sqc__picker">
                            <label className="wk-sqc__search">
                                <Search size={15} />
                                <input
                                    value={memberQuery}
                                    onFocus={() => setMemberPickerOpen(true)}
                                    onClick={() => setMemberPickerOpen(true)}
                                    onChange={(e) => { setMemberQuery(e.target.value); setMemberPickerOpen(true) }}
                                    placeholder="搜索并添加队员..."
                                />
                            </label>
                            {memberPickerOpen && (
                                <div className="wk-sqc__menu" role="listbox">
                                    {memberCandidates.length === 0 ? (
                                        <div className="wk-sqc__menu-empty">没有更多可加的 AI 队友</div>
                                    ) : memberCandidates.map((c) => (
                                        <button key={c.id} type="button" className="wk-sqc__option" onClick={() => { setMemberIds((cur) => [...cur, c.id]); setMemberQuery(""); setMemberPickerOpen(false) }}>
                                            <AgentAvatar name={c.name} size={24} />
                                            <span className="wk-sqc__opt-main"><strong>{c.name}</strong><small>{c.runtime}</small></span>
                                            <Plus size={15} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="wk-sqc__members">
                            {memberIds.length === 0 ? (
                                <div className="wk-sqc__empty">还没有队员 —— 可选;指定领队后即可创建。</div>
                            ) : memberIds.map((id) => {
                                const c = byId(id)
                                return (
                                    <div key={id} className="wk-sqc__member">
                                        <AgentAvatar name={c.name} size={28} dot="online" />
                                        <span className="wk-sqc__m-main"><strong>{c.name}</strong><small>{c.runtime}</small></span>
                                        <button type="button" className="wk-sqc__remove" onClick={() => setMemberIds((cur) => cur.filter((x) => x !== id))} aria-label="移除"><X size={15} /></button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </main>
                <aside className="wk-sqp">
                    <span className="wk-sqp__label">预览</span>
                    <div className="wk-sqp__card">
                        <SquadAvatar name={name.trim() || "新小队"} size={40} />
                        <strong className="wk-sqp__name">{name.trim() || "新小队"}</strong>
                        {desc.trim() && <p className="wk-sqp__desc">{desc}</p>}
                        <div className="wk-sqp__roster">
                            <div className="wk-sqp__rrow">
                                <span className="wk-sqp__rlabel">领队</span>
                                {leaderId
                                    ? <span className="wk-sqp__m"><AgentAvatar name={byId(leaderId).name} size={20} /><span>{byId(leaderId).name}</span></span>
                                    : <span className="wk-sqp__none">未指定</span>}
                            </div>
                            <div className="wk-sqp__rrow">
                                <span className="wk-sqp__rlabel">队员</span>
                                {memberIds.length
                                    ? <span className="wk-sqp__stack">{memberIds.map((id) => <AgentAvatar key={id} name={byId(id).name} size={20} />)}</span>
                                    : <span className="wk-sqp__none">可选</span>}
                            </div>
                        </div>
                    </div>
                    <p className="wk-sqp__foot">创建后出现在 小队 列表,可整体派单给领队。</p>
                </aside>
                </div>

                <footer className="wk-sqc__foot">
                    <span className="wk-sqc__count">
                        {leaderId ? `领队 ${byId(leaderId).name}${memberIds.length ? ` · ${memberIds.length} 名队员` : ""}` : "先指定领队"}
                    </span>
                    <div className="wk-sqc__actions">
                        <button type="button" className="wk-sqc__cancel" onClick={onClose}>取消</button>
                        <button type="button" className="wk-sqc__submit" disabled={!canCreate} onClick={onClose}>创建小队</button>
                    </div>
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
                    <SquadAvatar name={squad.name} size={52} />
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
                            成员
                        </button>
                        <button type="button" className={activeTab === "instructions" ? "is-active" : ""} onClick={() => setActiveTab("instructions")}>
                            <ClipboardList size={15} />
                            指引
                        </button>
                    </nav>

                    {activeTab === "members" ? (
                        <section className="wk-seccard">
                            <h4>成员<span>该小队有 {squad.members.length} 名成员</span></h4>
                            <div className="wk-sqtable">
                                {squad.members.map((member, index) => (
                                    <div key={member} className="wk-sqtable__row">
                                        <AgentAvatar name={member} size={28} dot="online" />
                                        <div className="wk-sqtable__who">
                                            <strong>{member}</strong>
                                            <small>AI 队友 · 最近活动 1 分钟前</small>
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
                            <h4>小队指引</h4>
                            <p className="wk-cw-help">小队指引会在领队处理分配给该小队的回路时注入到它的 prompt 中。可用来给领队提供贯穿全队的指导、协作规范，或每次任务都应遵循的上下文。</p>
                            <textarea className="wk-cw-editor" placeholder="例如:处理任何回路前先与相关方对齐范围;优先小步、可回滚的提交。" />
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
        <section className="wk-matter-issue-detail" aria-label="回路详情">
            <header className="wk-matter-issue-detail__top">
                <div className="wk-matter-issue-detail__crumb">
                    <span>📁 {issue.project}</span>
                    <ChevronRight size={14} />
                    <strong>{issue.key} {issue.title}</strong>
                </div>
                <div className="wk-matter-issue-detail__tools">
                    <button type="button" onClick={() => WKApp.routeRight.replaceToRoot(<MatterIssuesBoard />)}>看板</button>
                </div>
            </header>

            <main className="wk-matter-issue-detail__main">
                <article className="wk-matter-issue-detail__content">
                    <h1 className="wk-matter-issue-detail__h1">{issue.title}</h1>
                    <p className="wk-matter-issue-detail__desc">
                        {isRuntimeQuestion
                            ? "请回答以下关于当前运行环境的问题:workspace 的绝对路径、当前机器名称、以及执行状态是否正常。"
                            : issue.desc || "请继续推进这个回路,补齐必要上下文,并给出可执行的下一步。"}
                    </p>

                    <button type="button" className="wk-matter-issue-detail__attach-card">
                        <span className="wk-matter-issue-detail__attach-icon">📄</span>
                        <span className="wk-matter-issue-detail__attach-main">
                            <strong>需求上下文.pdf</strong>
                            <small>207.11 KB</small>
                        </span>
                    </button>

                    <div className="wk-matter-issue-detail__inline-actions"><span>☺︎</span><Paperclip size={15} /></div>

                    <section className="wk-matter-issue-detail__block">
                        <header className="wk-matter-issue-detail__blockhead">
                            <ChevronDown size={14} />
                            <strong>子回路</strong>
                            <em>0 / 1</em>
                            <div className="wk-matter-issue-detail__blockact"><Plus size={14} /><MoreHorizontal size={14} /></div>
                        </header>
                        <button type="button" className="wk-matter-issue-detail__subrow">
                            <Circle size={14} />
                            <span className="wk-matter-issue-detail__subkey">{issue.key}-1</span>
                            <span className="wk-matter-issue-detail__subtitle">补齐运行环境细节并给出下一步</span>
                            <PriorityIcon pri="mid" />
                        </button>
                    </section>

                    <section className="wk-matter-issue-detail__block">
                        <header className="wk-matter-issue-detail__blockhead">
                            <ChevronDown size={14} />
                            <strong>关联</strong>
                            <div className="wk-matter-issue-detail__blockact"><Plus size={14} /></div>
                        </header>
                        <button type="button" className="wk-matter-issue-detail__linkrow">
                            <span className="wk-matter-issue-detail__linkicon">🔗</span>
                            <strong>Octo-Runtime 接线讨论串</strong>
                            <span className="wk-matter-issue-detail__linkdesc">补上历史决策与联调上下文…</span>
                            <time>32 分钟前</time>
                        </button>
                    </section>

                    <section className="wk-matter-issue-detail__activity">
                        <header>
                            <h2>动态</h2>
                            <span className="wk-matter-issue-detail__unsub">取消订阅 · <AgentAvatar name={issue.agent === "未分配" ? "CC-Protoper" : issue.agent} size={16} />{issue.agent === "未分配" ? "CC-Protoper" : issue.agent}</span>
                        </header>
                        <div className="wk-matter-issue-detail__timeline">
                            <div className="wk-matter-issue-detail__ev">
                                <span className="wk-matter-issue-detail__evdot"><Circle size={12} /></span>
                                <span>lvsijia 创建了这个回路</span>
                                <time>32 分钟前</time>
                            </div>
                            <div className="wk-matter-issue-detail__ev">
                                <span className="wk-matter-issue-detail__evdot"><Briefcase size={12} /></span>
                                <span>加入项目 <b>{issue.project}</b></span>
                                <time>18 分钟前</time>
                            </div>
                            <MessageCard
                                author={issue.agent === "未分配" ? "CC-Protoper" : issue.agent}
                                time={issue.updated || "4 小时前"}
                                body={[
                                    "运行环境询问回答:",
                                    "1. Workspace 绝对路径: /Users/lvsijia/multica_workspaces/bfa7830c-929d/550c0581/workdir",
                                    "2. 机器名称: kaka-mbp(macOS / Darwin 25.5.0,arm64,Apple Silicon)",
                                    "3. 执行状态:正常。CLI 认证有效,可读写回路、评论及状态,环境健康。",
                                ]}
                            />
                            <div className="wk-matter-issue-detail__ev">
                                <span className="wk-matter-issue-detail__evdot"><CheckCircle2 size={12} /></span>
                                <span>状态从 <b>进行中</b> 改为 <b>审核中</b></span>
                                <time>4 小时前</time>
                            </div>
                        </div>
                        <div className="wk-matter-issue-detail__comment">
                            <span>留下评论...</span>
                            <Paperclip size={14} />
                            <button type="button">↑</button>
                        </div>
                    </section>
                </article>

                <aside className="wk-matter-issue-detail__props">
                    <h3>属性⌄</h3>
                    <dl>
                        <dt>状态</dt>
                        <dd><StatusIcon status="review" size={15} />审核中</dd>
                        <dt>优先级</dt>
                        <dd><PriorityIcon pri="mid" size={15} />中</dd>
                        <dt>负责人</dt>
                        <dd><AgentAvatar name={issue.agent === "未分配" ? "CC-Protoper" : issue.agent} size={16} />{issue.agent === "未分配" ? "CC-Protoper" : issue.agent}</dd>
                        <dt>项目</dt>
                        <dd>📁 {issue.project}</dd>
                    </dl>
                    <button type="button">＋ 添加字段</button>

                    <h3>Pull Request⌄</h3>
                    <p>还没有关联的 PR。在 PR 的分支名、标题或正文里引用本回路的 identifier 即可自动关联。</p>

                    <h3>详情⌄</h3>
                    <dl>
                        <dt>创建者</dt>
                        <dd><AgentAvatar name="CC-Protoper" size={16} />CC-Protoper</dd>
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
                    {user ? "L" : avatarInitial(author)}
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
