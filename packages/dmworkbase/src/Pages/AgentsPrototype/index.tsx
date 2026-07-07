import React, { useEffect, useMemo, useState } from "react"
import {
    Bot,
    Briefcase,
    ChevronDown,
    ClipboardList,
    Cpu,
    Filter,
    Globe2,
    ImagePlus,
    Lock,
    Plus,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react"
import WKApp from "../../App"
import "./index.css"

interface AgentItem {
    id: string
    name: string
    owner: string
    runtime: string
    lastActive: string
    runs: number
    mine: boolean
}

const AGENTS: AgentItem[] = [
    { id: "prototyper", name: "Prototyper", owner: "lvsijia", runtime: "Codex (kaka-mbp)", lastActive: "今天", runs: 9, mine: true },
    { id: "cc-protoper", name: "CC-Protoper", owner: "lvsijia", runtime: "Claude (kaka-mbp)", lastActive: "今天", runs: 3, mine: true },
    { id: "method", name: "的方法", owner: "lvsijia", runtime: "Claude (kaka-mbp)", lastActive: "30 天内无活动", runs: 0, mine: true },
]

type TabId = "mine" | "all" | "archived"

const TABS: Array<{ id: TabId; label: string }> = [
    { id: "mine", label: "我的" },
    { id: "all", label: "全部" },
    { id: "archived", label: "已归档" },
]

export default function AgentsPrototype() {
    const [query, setQuery] = useState("")
    const [activeTab, setActiveTab] = useState<TabId>("mine")
    const [createOpen, setCreateOpen] = useState(false)

    const visibleAgents = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()
        return AGENTS.filter((agent) => {
            if (activeTab === "archived") return false
            if (activeTab === "mine" && !agent.mine) return false
            return !normalizedQuery || agent.name.toLowerCase().includes(normalizedQuery)
        })
    }, [activeTab, query])

    function showList() {
        WKApp.routeRight.replaceToRoot(
            <AgentsListSurface
                agents={visibleAgents}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onCreate={() => setCreateOpen(true)}
                onOpenAgent={(agent) => WKApp.routeRight.replaceToRoot(<AgentDetailSurface agent={agent} />)}
            />
        )
    }

    useEffect(() => {
        showList()
    }, [visibleAgents, activeTab])

    useEffect(() => {
        const handleActivated = (payload: { menuId?: string }) => {
            if (payload?.menuId === "agents-prototype") {
                showList()
            }
        }
        WKApp.mittBus.on("wk:nav-menu-activated" as any, handleActivated as any)
        return () => WKApp.mittBus.off("wk:nav-menu-activated" as any, handleActivated as any)
    }, [visibleAgents, activeTab])

    return (
        <div className="wk-agents-proto">
            <div className="wk-agents-proto__side-head">
                <div className="wk-agents-proto__side-title">
                    <Bot size={17} />
                    <span>Bot</span>
                    <strong>{AGENTS.length}</strong>
                </div>
                <button type="button" onClick={() => setCreateOpen(true)} aria-label="新建 Bot">
                    <Plus size={15} />
                </button>
            </div>

            <label className="wk-agents-proto__search">
                <Search size={15} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Bot..." />
            </label>

            <div className="wk-agents-proto__side-list">
                {AGENTS.map((agent) => (
                    <button
                        key={agent.id}
                        type="button"
                        className="wk-agents-proto__side-item"
                        onClick={() => WKApp.routeRight.replaceToRoot(<AgentDetailSurface agent={agent} />)}
                    >
                        <span className="wk-agents-proto__avatar">
                            <Bot size={15} />
                            <i />
                        </span>
                        <span>
                            <strong>{agent.name}</strong>
                            <small>{agent.runtime}</small>
                        </span>
                    </button>
                ))}
            </div>

            {createOpen && <CreateAgentModal onClose={() => setCreateOpen(false)} />}
        </div>
    )
}

export { AgentsPrototype }
// T3:创建弹窗(可见性双卡)被 OctoLoop 的 AI 队友节点复用
export { CreateAgentModal }

function AgentsListSurface({
    agents,
    activeTab,
    onTabChange,
    onCreate,
    onOpenAgent,
}: {
    agents: AgentItem[]
    activeTab: TabId
    onTabChange: (tab: TabId) => void
    onCreate: () => void
    onOpenAgent: (agent: AgentItem) => void
}) {
    return (
        <section className="wk-agents-list" aria-label="Bot 列表">
            <header className="wk-agents-list__header">
                <div className="wk-agents-list__title">
                    <Bot size={16} />
                    <strong>Bot</strong>
                    <span>{AGENTS.length}</span>
                    <p>能领取 Loop、留下评论、推进状态的 AI 队友。</p>
                    <a href="#learn-more">了解更多 →</a>
                </div>
                <button type="button" className="wk-agents-list__create" onClick={onCreate}>
                    <Plus size={15} />
                    新建 Bot
                </button>
            </header>

            <div className="wk-agents-list__toolbar">
                <div className="wk-agents-list__tabs">
                    {TABS.map((tab) => {
                        const count = tab.id === "archived" ? 0 : AGENTS.filter((agent) => tab.id === "all" || agent.mine).length
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                className={activeTab === tab.id ? "is-active" : ""}
                                onClick={() => onTabChange(tab.id)}
                            >
                                {tab.label} <span>{count}</span>
                            </button>
                        )
                    })}
                </div>
                <div className="wk-agents-list__actions">
                    <button type="button"><Filter size={14} />筛选</button>
                    <button type="button"><ChevronDown size={14} />最近活跃</button>
                </div>
            </div>

            <div className="wk-agents-list__table" role="table" aria-label="Bot 原型列表">
                <div className="wk-agents-list__row wk-agents-list__head" role="row">
                    <div role="columnheader">Bot</div>
                    <div role="columnheader">状态</div>
                    <div role="columnheader">Owner</div>
                    <div role="columnheader">运行时</div>
                    <div role="columnheader">最近活跃 ↓</div>
                    <div role="columnheader">运行次数</div>
                </div>

                {agents.map((agent) => (
                    <button
                        key={agent.id}
                        type="button"
                        className="wk-agents-list__row wk-agents-list__item"
                        role="row"
                        onClick={() => onOpenAgent(agent)}
                    >
                        <div className="wk-agents-list__agent" role="cell">
                            <span className="wk-agents-proto__avatar">
                                <Bot size={16} />
                                <i />
                            </span>
                            <strong>{agent.name}</strong>
                            {agent.mine && <span className="wk-agents-list__tag">你</span>}
                        </div>
                        <div className="wk-agents-list__status" role="cell"><span />在线</div>
                        <div className="wk-agents-list__owner" role="cell"><i>L</i>{agent.owner}</div>
                        <div className="wk-agents-list__muted" role="cell">{agent.runtime}</div>
                        <div className={agent.runs === 0 ? "wk-agents-list__quiet" : "wk-agents-list__muted"} role="cell">{agent.lastActive}</div>
                        <div className="wk-agents-list__runs" role="cell">{agent.runs}</div>
                    </button>
                ))}
            </div>
        </section>
    )
}

function AgentDetailSurface({ agent }: { agent: AgentItem }) {
    const properties = [
        { label: "Runtime", value: agent.runtime, live: true },
        { label: "Model", value: "gpt-5.5" },
        { label: "Visibility", value: "Workspace" },
        { label: "Concurrency", value: "6" },
        { label: "Owner", value: agent.owner },
        { label: "Created", value: "Jun 28, 2026" },
        { label: "Updated", value: agent.lastActive },
    ]
    const tabs = ["动态", "Tasks", "指令", "Skills", "环境变量", "自定义参数", "MCP"]

    return (
        <section className="wk-agent-detail" aria-label="Bot 详情">
            <header className="wk-agent-detail__top">
                <div className="wk-agent-detail__crumb">
                    <span>Bot</span>
                    <ChevronDown size={14} />
                    <strong>{agent.name}</strong>
                    <em><i />在线</em>
                </div>
                <div className="wk-agent-detail__actions">
                    <button type="button">Archive</button>
                    <button type="button">Edit</button>
                </div>
            </header>

            <div className="wk-agent-detail__layout">
                <aside className="wk-agent-detail__profile">
                    <div className="wk-agent-detail__identity">
                        <span className="wk-agent-detail__avatar">
                            <Bot size={26} />
                            <i />
                        </span>
                        <div>
                            <h2>{agent.name}</h2>
                            <p>Prototype agent for Loop triage and workspace tasks.</p>
                        </div>
                    </div>

                    <div className="wk-agent-detail__section">
                        <h3>Properties</h3>
                        {properties.map((item) => (
                            <div key={item.label} className="wk-agent-detail__property">
                                <span>{item.label}</span>
                                <strong>
                                    {item.live && <i />}
                                    {item.value}
                                </strong>
                            </div>
                        ))}
                    </div>

                    <div className="wk-agent-detail__section">
                        <div className="wk-agent-detail__section-title">
                            <h3>Skills</h3>
                            <button type="button" aria-label="添加 skill"><Plus size={14} /></button>
                        </div>
                        <p className="wk-agent-detail__empty">0 skills configured</p>
                    </div>

                    <div className="wk-agent-detail__integration">
                        <Globe2 size={16} />
                        <div>
                            <strong>External Integrations</strong>
                            <span>Connect docs, ticket tools, or custom MCP later.</span>
                        </div>
                    </div>
                </aside>

                <main className="wk-agent-detail__main">
                    <nav className="wk-agent-detail__tabs" aria-label="Bot 详情 tabs">
                        {tabs.map((tab) => (
                            <button key={tab} type="button" className={tab === "指令" ? "is-active" : ""}>
                                {tab}
                            </button>
                        ))}
                    </nav>

                    <article className="wk-agent-detail__instructions">
                        <header>
                            <ClipboardList size={17} />
                            <strong>Instructions</strong>
                        </header>
                        <div className="wk-agent-detail__editor">
                            <p># Role</p>
                            <p>You are {agent.name}, a workspace agent that helps convert messy requests into clear Loops, comments, and next actions.</p>
                            <p># Operating style</p>
                            <p>- Keep replies concise and action-oriented.</p>
                            <p>- Ask one clarifying question only when the missing detail changes the outcome.</p>
                            <p>- Prefer prototype-safe suggestions and avoid touching production data.</p>
                            <p># Scope</p>
                            <p>Use workspace context, Loop status, runtime availability, and assigned tasks as mock prototype inputs.</p>
                        </div>
                    </article>
                </main>
            </div>
        </section>
    )
}

// P12(Evan R2 重做,去 Multica 表单克隆):建 AI 队友 = 从「我的 Runtime」挑一个已注册运行时接入 →
// 配置命名/可见性/skills(母页参考 Vercel import 逐行 Import,收口参考 StackAI 三段壳)。
const RUNTIME_ROSTER = [
    { id: "r-claude-kaka", name: "Claude", machine: "kaka-mbp", icon: "✳", cli: "2.1.145 (Claude Code)" },
    { id: "r-codex-kaka", name: "Codex", machine: "kaka-mbp", icon: "◎", cli: "codex-cli 0.48.0" },
    { id: "r-hermes-kaka", name: "Hermes", machine: "kaka-mbp", icon: "◉", cli: "Hermes Agent 1.4" },
    { id: "r-openclaw-kaka", name: "Openclaw", machine: "kaka-mbp", icon: "🦀", cli: "OpenClaw 2026.6" },
    { id: "r-opencode-kaka", name: "Opencode", machine: "kaka-mbp", icon: "■", cli: "1.2.26" },
    { id: "r-claude-build", name: "Claude", machine: "build-mini", icon: "✳", cli: "2.1.140 (Claude Code)" },
    { id: "r-codex-build", name: "Codex", machine: "build-mini", icon: "◎", cli: "codex-cli 0.48.0" },
]

const MODEL_OPTIONS: Record<string, string[]> = {
    Claude: ["claude-opus-4.8", "claude-sonnet-5", "claude-haiku-4.5"],
    Codex: ["gpt-5.5-codex", "gpt-5.5", "o4-mini"],
    Hermes: ["hermes-4-405b", "hermes-4-70b"],
    Openclaw: ["claude-opus-4.8", "gpt-5.5"],
    Opencode: ["gpt-5.5", "claude-sonnet-5"],
    _default: ["gpt-5.5", "claude-opus-4.8"],
}

function CreateAgentModal({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState<"pick" | "config">("pick")
    const [picked, setPicked] = useState<(typeof RUNTIME_ROSTER)[number] | null>(null)
    const [query, setQuery] = useState("")
    const [name, setName] = useState("")
    const [visibility, setVisibility] = useState<"workspace" | "personal">("workspace")
    const [model, setModel] = useState("gpt-5.5-codex")

    const candidates = RUNTIME_ROSTER.filter((r) =>
        `${r.name} ${r.machine}`.toLowerCase().includes(query.trim().toLowerCase()),
    )

    function pick(r: (typeof RUNTIME_ROSTER)[number]) {
        setPicked(r)
        setName(`${r.name}-新队友`)
        setModel((MODEL_OPTIONS[r.name] ?? MODEL_OPTIONS._default)[0])
        setStep("config")
    }

    return (
        <div className="wk-agent-modal" role="presentation" onMouseDown={onClose}>
            <section
                className="wk-agent-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-label="接入 AI 队友"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="wk-agent-modal__head">
                    <div>
                        <h2>{step === "pick" ? "接入 AI 队友" : "配置 AI 队友"}</h2>
                        <p>
                            {step === "pick"
                                ? "从你的 Runtime 里挑一个已注册的运行时,接入成一个 AI 队友。"
                                : `基于 ${picked?.name}(${picked?.machine})接入,给它起个名、定可见性。`}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="关闭">
                        <X size={18} />
                    </button>
                </header>

                {step === "pick" ? (
                    <div className="wk-agent-modal__body">
                        <label className="wk-agent-modal__rtsearch">
                            <Search size={15} />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索运行时(Claude / Codex / 机器名)..." autoFocus />
                        </label>
                        <div className="wk-agent-modal__rtlist">
                            {candidates.length === 0 ? (
                                <div className="wk-agent-modal__rtempty">没有匹配的运行时。</div>
                            ) : candidates.map((r) => (
                                <div key={r.id} className="wk-agent-modal__rtrow">
                                    <span className="wk-agent-modal__rticon">{r.icon}</span>
                                    <span className="wk-agent-modal__rtmain">
                                        <strong>{r.name} <em>{r.machine}</em></strong>
                                        <small>{r.cli}</small>
                                    </span>
                                    <span className="wk-agent-modal__rtstatus"><i />在线</span>
                                    <button type="button" className="wk-agent-modal__rtpick" onClick={() => pick(r)}>接入</button>
                                </div>
                            ))}
                        </div>
                        <p className="wk-agent-modal__rtnote">找不到想要的?去「我的 · Runtime」装一个新的运行时,它就会出现在这里。</p>
                    </div>
                ) : (
                    <div className="wk-agent-modal__body">
                        <div className="wk-agent-modal__picked">
                            <span className="wk-agent-modal__rticon">{picked?.icon}</span>
                            <span className="wk-agent-modal__rtmain">
                                <strong>{picked?.name} <em>{picked?.machine}</em></strong>
                                <small>{picked?.cli}</small>
                            </span>
                            <button type="button" className="wk-agent-modal__change" onClick={() => setStep("pick")}>更换</button>
                        </div>

                        <div className="wk-agent-modal__form">
                            <label>
                                <span>名称</span>
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:深度研究搭档" autoFocus />
                            </label>
                        </div>

                        <div className="wk-agent-modal__field wk-agent-modal__wide">
                            <span>可见性</span>
                            <div className="wk-agent-modal__visibility">
                                <button
                                    type="button"
                                    className={visibility === "workspace" ? "is-active" : ""}
                                    onClick={() => setVisibility("workspace")}
                                >
                                    <Globe2 size={17} />
                                    <strong>工作区</strong>
                                    <small>全员可派单</small>
                                </button>
                                <button
                                    type="button"
                                    className={visibility === "personal" ? "is-active" : ""}
                                    onClick={() => setVisibility("personal")}
                                >
                                    <Lock size={17} />
                                    <strong>个人</strong>
                                    <small>仅你和工作区管理员可派单</small>
                                </button>
                            </div>
                        </div>

                        <div className="wk-agent-modal__field wk-agent-modal__wide">
                            <span>模型</span>
                            <div className="wk-agent-modal__modelrow">
                                <Cpu size={16} />
                                <select className="wk-agent-modal__modelsel" value={model} onChange={(e) => setModel(e.target.value)} aria-label="模型">
                                    {(MODEL_OPTIONS[picked?.name ?? "_default"] ?? MODEL_OPTIONS._default).map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <PrototypeSelect label="指令" icon={<ClipboardList size={17} />} title="点击撰写指令..." muted />
                        <PrototypeSelect label="Skills" icon={<Plus size={17} />} title="从工作区添加 skill" muted />
                    </div>
                )}

                <footer className="wk-agent-modal__foot">
                    {step === "pick" ? (
                        <button type="button" onClick={onClose}>取消</button>
                    ) : (
                        <>
                            <button type="button" className="wk-agent-modal__back" onClick={() => setStep("pick")}>‹ 返回</button>
                            <button type="button" className="wk-agent-modal__submit" onClick={onClose}>创建</button>
                        </>
                    )}
                </footer>
            </section>
        </div>
    )
}

function PrototypeSelect({
    label,
    icon,
    title,
    desc,
    muted,
}: {
    label: string
    icon: React.ReactNode
    title: string
    desc?: string
    muted?: boolean
}) {
    return (
        <div className="wk-agent-modal__field wk-agent-modal__wide">
            <span>{label}</span>
            <button type="button" className={`wk-agent-modal__select${muted ? " is-muted" : ""}`}>
                <i>{icon}</i>
                <strong>{title}</strong>
                {desc && <small>{desc}</small>}
                <ChevronDown size={16} />
            </button>
        </div>
    )
}
