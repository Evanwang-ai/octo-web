import React, { useEffect, useState } from "react"
import { BookOpen, Bot, Monitor, Plus, Server } from "lucide-react"
import WKApp from "../../App"
import { SKILLS, SkillsListSurface, ImportSkillModal, SkillDetailSurface } from "../SkillsPrototype"
import "../MatterV2Prototype/index.css"
import "./index.css"

// ── 「我的」= User 层个人资产(⑨):Runtime(⑦有数据形态重铸)+ Skills(⑧从 OctoLoop 迁入)。
// 二级导航沿用 OctoLoop sidebar 语法(铁律:未来所有二级导航统一风格);整体气质参考 Grok 侧导航。
// 预留扩展位:我的经验 / 我的文件 / 模型配置(蓝图三分类「我的」的后续)。

type MyView = "runtime" | "skills"

type RuntimeStatus = "online" | "warning"

interface RuntimeRow {
    id: string
    name: string
    builtin: boolean
    status: RuntimeStatus
    agents: number
    cost: string
    cli: string
    icon: string
}

interface Machine {
    id: string
    name: string
    status: RuntimeStatus
    runtimes: RuntimeRow[]
    version: string
    daemon: string
    scope: string
}

// 数据形态收割自 runtimes-v2 原型(T1 误删的那个「有数据的」),皮全换我们的
const MY_MACHINES: Machine[] = [
    {
        id: "kaka-mbp",
        name: "kaka-mbp",
        status: "online",
        version: "0.3.12",
        daemon: "019f1b79",
        scope: "全部空间",
        runtimes: [
            { id: "claude", name: "Claude", builtin: true, status: "online", agents: 2, cost: "$0.00", cli: "2.1.145 (Claude Code)", icon: "✳" },
            { id: "codex", name: "Codex", builtin: true, status: "online", agents: 1, cost: "$0.00", cli: "codex-cli 0.48.0", icon: "◎" },
            { id: "hermes", name: "Hermes", builtin: true, status: "online", agents: 0, cost: "—", cli: "Hermes Agent 1.4", icon: "◉" },
            { id: "openclaw", name: "Openclaw", builtin: true, status: "online", agents: 0, cost: "—", cli: "OpenClaw 2026.6", icon: "🦀" },
            { id: "opencode", name: "Opencode", builtin: true, status: "online", agents: 0, cost: "—", cli: "1.2.26", icon: "■" },
        ],
    },
    {
        id: "build-mini",
        name: "build-mini",
        status: "online",
        version: "0.3.10",
        daemon: "019f2a41",
        scope: "研发空间",
        runtimes: [
            { id: "claude-build", name: "Claude", builtin: true, status: "online", agents: 1, cost: "$0.00", cli: "2.1.140 (Claude Code)", icon: "✳" },
            { id: "codex-build", name: "Codex", builtin: true, status: "online", agents: 2, cost: "$0.00", cli: "codex-cli 0.48.0", icon: "◎" },
        ],
    },
]

export default function MySpacePrototype() {
    const [activeView, setActiveView] = useState<MyView>("runtime")

    function showSurface(view = activeView) {
        if (view === "skills") {
            WKApp.routeRight.replaceToRoot(<MySkillsHost />)
            return
        }
        WKApp.routeRight.replaceToRoot(<MyRuntimeSurface />)
    }

    useEffect(() => {
        showSurface()
    }, [activeView])

    useEffect(() => {
        const handleActivated = (payload: { menuId?: string }) => {
            if (payload?.menuId === "my-space") showSurface()
        }
        WKApp.mittBus.on("wk:nav-menu-activated" as any, handleActivated as any)
        return () => WKApp.mittBus.off("wk:nav-menu-activated" as any, handleActivated as any)
    }, [activeView])

    return (
        <aside className="wk-matter-v2-sidebar" aria-label="我的 sidebar">
            <header className="wk-matter-v2-sidebar__workspace">
                <div className="wk-matter-v2-sidebar__workspace-btn" role="presentation">
                    <span className="wk-matter-v2-sidebar__mark">我</span>
                    <strong>我的</strong>
                </div>
            </header>

            <div className="wk-matter-v2-sidebar__group">
                <span>个人资产</span>
                <button
                    type="button"
                    className={activeView === "runtime" ? "is-active" : ""}
                    onClick={() => setActiveView("runtime")}
                >
                    <Server size={16} />
                    Runtime
                </button>
                <button
                    type="button"
                    className={activeView === "skills" ? "is-active" : ""}
                    onClick={() => setActiveView("skills")}
                >
                    <BookOpen size={16} />
                    Skills
                </button>
            </div>
        </aside>
    )
}

export { MySpacePrototype }

// ── 我的·Runtime(⑦):机器卡 + 卡内运行时表(WorkOS 卡内表格语法,无外部参考图,纯我们语言)──
function MyRuntimeSurface() {
    const [newOpen, setNewOpen] = useState(false)
    const total = MY_MACHINES.reduce((n, m) => n + m.runtimes.length, 0)

    return (
        <section className="wk-myrt" aria-label="我的 Runtime">
            <header className="wk-myrt__head">
                <div>
                    <h1>
                        Runtime <em>{total}</em>
                    </h1>
                    <p>你名下的机器与运行时。工作区里的 AI 队友,都跑在这里。</p>
                </div>
                <div className="wk-myrt__tools">
                    <button type="button" className="wk-myrt__new" onClick={() => setNewOpen((v) => !v)}>
                        <Plus size={15} />
                        添加运行时
                    </button>
                    {newOpen && (
                        <div className="wk-myrt__newmenu" role="menu">
                            <button type="button" role="menuitem" onClick={() => setNewOpen(false)}>
                                <strong>内置运行时</strong>
                                <span>Claude / Codex / Hermes 等本机能力</span>
                            </button>
                            <button type="button" role="menuitem" onClick={() => setNewOpen(false)}>
                                <strong>远程运行时</strong>
                                <span>连接另一台机器上的 daemon</span>
                            </button>
                            <button type="button" role="menuitem" onClick={() => setNewOpen(false)}>
                                <strong>自定义 Runtime</strong>
                                <span>预留给第三方运行时插件</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {MY_MACHINES.map((machine) => (
                <section key={machine.id} className="wk-myrt__machine">
                    <header className="wk-myrt__mhead">
                        <span className="wk-myrt__micon">
                            <Monitor size={16} />
                        </span>
                        <strong>{machine.name}</strong>
                        <span className="wk-myrt__pill">
                            <i />
                            在线
                        </span>
                        <span className="wk-myrt__chips">
                            <code>v{machine.version}</code>
                            <code>daemon {machine.daemon}</code>
                            <span>{machine.scope}</span>
                            <span>{machine.runtimes.length} 个运行时</span>
                        </span>
                    </header>
                    <div className="wk-myrt__rows">
                        {machine.runtimes.map((rt) => (
                            <div key={rt.id} className="wk-myrt__row">
                                <span className="wk-myrt__rticon" aria-hidden>
                                    {rt.icon}
                                </span>
                                <span className="wk-myrt__rtname">
                                    <strong>{rt.name}</strong>
                                    {rt.builtin && <i>内置</i>}
                                </span>
                                <span className="wk-myrt__health">
                                    <i />
                                    在线
                                </span>
                                <span className="wk-myrt__agents">
                                    {rt.agents > 0 ? (
                                        <>
                                            <Bot size={13} />
                                            服务 {rt.agents} 个 AI 队友
                                        </>
                                    ) : (
                                        "—"
                                    )}
                                </span>
                                <span className="wk-myrt__cost">{rt.cost}</span>
                                <code className="wk-myrt__cli">{rt.cli}</code>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </section>
    )
}

// ── 我的·Skills(⑧):从 OctoLoop 迁入,User 层技能库;workspace 里的 AI 队友/小队引用这里 ──
function MySkillsHost() {
    const [query, setQuery] = useState("")
    const [importStep, setImportStep] = useState<"manual" | "url" | "runtime" | null>(null)

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
                onPickCreate={(step) => setImportStep(step)}
                onOpenSkill={(skill) => WKApp.routeRight.replaceToRoot(<SkillDetailSurface skill={skill} />)}
            />
            {importStep && <ImportSkillModal step={importStep} onClose={() => setImportStep(null)} />}
        </>
    )
}
