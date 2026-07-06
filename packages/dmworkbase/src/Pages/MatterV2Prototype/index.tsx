import React, { useEffect, useState } from "react"
import {
    Archive,
    BookOpen,
    Bot,
    Briefcase,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Circle,
    ClipboardList,
    Edit3,
    Expand,
    MoreHorizontal,
    Paperclip,
    Pin,
    Search,
    Sparkles,
    Trash2,
    UserPlus,
    Users,
} from "lucide-react"
import WKApp from "../../App"
import { SKILLS, SkillsListSurface, ImportSkillModal, SkillDetailSurface } from "../SkillsPrototype"
import "./index.css"

// T1 换皮(蓝图 §1.2):单模块 sidebar——砍 搜索/收件箱/用量/设置/workspace 下拉,
// 并入 技能 节点;CoWorker 中文定名「AI 队友」。收件箱砍除后 review 入口=我的 issue(T5 补四 tabs)。
type MatterView = "issues" | "myissues" | "coworkers" | "squads" | "skills"

const SQUADS = [
    {
        id: "squad-1111",
        name: "1111",
        leader: "Prototyper",
        members: ["Prototyper", "CC-Protoper", "的方法"],
        creator: "lvsijia",
        created: "2 小时前",
        updated: "2 小时前",
        description: "添加描述",
    },
]

const COWORKERS = [
    { id: "cw-prototyper", name: "Prototyper-Codex-MBOT", runtime: "Codex (kaka-mbp)", owner: "lvsijia", lastActive: "今天", runs: 5, archived: false },
    { id: "cw-analyser", name: "Analyser-CC-MBOT", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "3 天前", runs: 5, archived: false },
    { id: "cw-documenter", name: "Documenter-Worker", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "3 天前", runs: 5, archived: false },
    { id: "cw-triager", name: "Triager-Worker", runtime: "Claude (kaka-mbp)", owner: "lvsijia", lastActive: "30 天内无活动", runs: 0, archived: true },
]

export default function MatterV2Prototype() {
    const [activeView, setActiveView] = useState<MatterView>("issues")
    const [createIssueOpen, setCreateIssueOpen] = useState(false)

    function setView(nextView: MatterView) {
        setActiveView(nextView)
    }

    function showSurface(view = activeView) {
        if (view === "myissues") {
            WKApp.routeRight.replaceToRoot(<MatterIssuesBoard title="我的 issue" />)
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
    }, [activeView])

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
            {/* 空间名只读(切换/创建等 D2 拍板) */}
            <header className="wk-matter-v2-sidebar__workspace">
                <div className="wk-matter-v2-sidebar__workspace-btn" role="presentation">
                    <span className="wk-matter-v2-sidebar__mark">O</span>
                    <strong>OctoLoop</strong>
                </div>
            </header>

            <div className="wk-matter-v2-sidebar__quick">
                <button type="button" onClick={() => setCreateIssueOpen(true)}><Edit3 size={16} />新建 issue<kbd>C</kbd></button>
            </div>

            <nav className="wk-matter-v2-sidebar__nav">
                <button type="button" className={activeView === "myissues" ? "is-active" : ""} onClick={() => setView("myissues")}>
                    <Circle size={16} />
                    我的 issue
                </button>
            </nav>

            <div className="wk-matter-v2-sidebar__group">
                <span>工作区</span>
                <button type="button" className={activeView === "issues" ? "is-active" : ""} onClick={() => setView("issues")}>
                    <ClipboardList size={16} />
                    Issues
                </button>
                <button type="button"><Briefcase size={16} />项目</button>
                <button type="button"><Sparkles size={16} />自动化</button>
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
        </>
    )
}

export { MatterV2Prototype }

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

const BOARD_COLUMNS = [
    { id: "backlog", label: "待规划", count: 0, tone: "neutral", cards: [] },
    {
        id: "todo",
        label: "待办",
        count: 1,
        tone: "neutral",
        cards: [
            {
                key: "OCT-1",
                title: "test",
                desc: "",
                project: "Octo-Runtime",
                agent: "未分配",
                updated: "",
            },
        ],
    },
    { id: "doing", label: "进行中", count: 0, tone: "warm", cards: [] },
    {
        id: "review",
        label: "审核中",
        count: 2,
        tone: "green",
        cards: [
            {
                key: "OCT-3",
                title: "回答运行环境询问：workspace 绝对路径、机器名称、执行状态",
                desc: "User request 请回答以下关于当前运行环...",
                project: "Octo-Runtime",
                agent: "CC-Protoper",
                updated: "更新于 4 小时前",
            },
            {
                key: "OCT-2",
                title: "询问当前 agent 身份和模型",
                desc: "User request 你是什么agents 什么模型",
                project: "Octo-Runtime",
                agent: "Prototyper",
                updated: "更新于 4 小时前",
            },
        ],
    },
    { id: "done", label: "已完成", count: 0, tone: "blue", cards: [] },
] as const

function MatterIssuesBoard({ title = "Issues" }: { title?: string }) {
    const [createIssueOpen, setCreateIssueOpen] = useState(false)

    return (
        <section className="wk-matter-board" aria-label="MatterV2 Issues kanban">
            <header className="wk-matter-board__head">
                <div className="wk-matter-board__title">
                    <ClipboardList size={17} />
                    <strong>{title}</strong>
                </div>
            </header>

            <div className="wk-matter-board__toolbar">
                <div className="wk-matter-board__tabs">
                    <button type="button" className="is-active">全部</button>
                    <button type="button">成员</button>
                    <button type="button">智能体</button>
                </div>
                <div className="wk-matter-board__actions">
                    <button type="button">0 工作中</button>
                    <button type="button">筛选</button>
                    <button type="button">手动</button>
                    <button type="button">看板</button>
                </div>
            </div>

            <div className="wk-matter-board__columns">
                {BOARD_COLUMNS.map((column) => (
                    <section key={column.id} className={`wk-matter-board__column wk-matter-board__column--${column.tone}`}>
                        <header>
                            <span className="wk-matter-board__status-dot" />
                            <strong>{column.label}</strong>
                            <small>{column.count}</small>
                            <MoreHorizontal size={15} />
                            <button type="button" onClick={() => setCreateIssueOpen(true)}>+</button>
                        </header>

                        {column.cards.length === 0 ? (
                            <div className="wk-matter-board__empty">无 issue</div>
                        ) : (
                            <div className="wk-matter-board__cards">
                                {column.cards.map((card) => (
                                    <button
                                        key={card.key}
                                        type="button"
                                        className="wk-matter-board__card"
                                        onClick={() => WKApp.routeRight.replaceToRoot(<MatterIssueDetail issue={card} />)}
                                    >
                                        <div className="wk-matter-board__card-key">— {card.key}</div>
                                        <h3>{card.title}</h3>
                                        {card.desc && <p>{card.desc}</p>}
                                        <span className="wk-matter-board__project">📁 {card.project}</span>
                                        <footer>
                                            <span>{card.agent}</span>
                                            {card.updated && <time>{card.updated}</time>}
                                        </footer>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                ))}
            </div>

            {createIssueOpen && <MatterCreateIssueModal onClose={() => setCreateIssueOpen(false)} />}
        </section>
    )
}

// T2 建单双模式(照 Multica 真身 0701 实拍):手动 ⇄ AI 队友互切;
// 手动=标题/描述+提示行+chips(⋯菜单:开始日期/父issue/子issue);AI 队友=创建者行+意图框+项目下拉+⌘↵。
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
                aria-label="新建 issue"
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
                            <input className="wk-matter-create-issue__title" placeholder="issue 标题" autoFocus />
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
                                    <button type="button" role="menuitem" onClick={() => setMoreOpen(false)}>↑ 设置父 issue...</button>
                                    <button type="button" role="menuitem" onClick={() => setMoreOpen(false)}>↓ 添加子 issue...</button>
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
                            {mode === "manual" ? "创建 issue" : "创建 (⌘↵)"}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    )
}

function MatterCoWorkersList() {
    return (
        <section className="wk-matter-coworkers" aria-label="AI 队友列表">
            <header className="wk-matter-coworkers__head">
                <div className="wk-matter-coworkers__title">
                    <Bot size={17} />
                    <strong>AI 队友</strong>
                    <span>{COWORKERS.length}</span>
                    <p>能领取 issue、留下评论、推进状态的 AI 队友。</p>
                    <a href="#coworker-learn">了解更多 →</a>
                </div>
                <button type="button" className="wk-matter-coworkers__create"><PlusIcon />新建 AI 队友</button>
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
                            <strong>{coworker.name}</strong>
                            <em>你</em>
                        </div>
                        <div className="wk-matter-coworkers__status" role="cell"><i />在线</div>
                        <div className="wk-matter-coworkers__owner" role="cell"><span>L</span>{coworker.owner}</div>
                        <div className="wk-matter-coworkers__muted" role="cell">{coworker.runtime}</div>
                        <div className={coworker.archived ? "wk-matter-coworkers__quiet" : "wk-matter-coworkers__muted"} role="cell">{coworker.lastActive}</div>
                        <div className="wk-matter-coworkers__runs" role="cell">{coworker.runs}</div>
                    </button>
                ))}
            </div>
        </section>
    )
}

function MatterCoWorkerDetail({
    coworker,
}: {
    coworker: typeof COWORKERS[number]
}) {
    const tabs = ["动态", "Tasks", "指令", "Skills", "环境变量", "自定义参数", "MCP"]

    return (
        <section className="wk-matter-coworker-detail" aria-label="AI 队友详情">
            <header className="wk-matter-coworker-detail__top">
                <div className="wk-matter-coworker-detail__crumb">
                    <span>AI 队友</span>
                    <ChevronRight size={13} />
                    <strong>{coworker.name}</strong>
                    <em><i />在线</em>
                </div>
                <MoreHorizontal size={17} />
            </header>

            <div className="wk-matter-coworker-detail__layout">
                <aside className="wk-matter-coworker-detail__profile">
                    <div className="wk-matter-coworker-detail__identity">
                        <span><Bot size={28} /></span>
                        <h2>{coworker.name}</h2>
                        <p>暂无描述</p>
                        <em><i />在线</em>
                    </div>
                    <dl>
                        <dt>属性</dt>
                        <div><span>运行时</span><strong>{coworker.runtime}<i /></strong></div>
                        <div><span>模型</span><strong>gpt-5.5</strong></div>
                        <div><span>可见性</span><strong>Workspace</strong></div>
                        <div><span>并发</span><strong>6</strong></div>
                    </dl>
                    <dl>
                        <dt>详情</dt>
                        <div><span>所有者</span><strong><b>L</b>{coworker.owner}</strong></div>
                        <div><span>创建时间</span><strong>3 天前</strong></div>
                        <div><span>更新时间</span><strong>1 小时前</strong></div>
                    </dl>
                    <div className="wk-matter-coworker-detail__skills">
                        <strong>SKILLS <span>9</span></strong>
                        <p>{["lark-base", "lark-doc", "lark-drive", "lark-event", "lark-markdown", "lark-openapi-explorer", "lark-sheets", "lark-skill-maker", "lark-wiki"].map((skill) => <em key={skill}>{skill}</em>)}<button type="button">+ 附加</button></p>
                    </div>
                </aside>

                <main className="wk-matter-coworker-detail__main">
                    <nav className="wk-matter-coworker-detail__tabs">
                        {tabs.map((tab, index) => (
                            <button key={tab} type="button" className={index === 0 ? "is-active" : ""}>{tab}</button>
                        ))}
                    </nav>
                    <div className="wk-matter-coworker-detail__cards">
                        <section>
                            <strong>当前 <span>无进行中的工作</span></strong>
                            <p>这个 AI 队友当前没有在跑任何 task。</p>
                        </section>
                        <section className="wk-matter-coworker-detail__metric">
                            <span>近 30 天　表现</span>
                            <strong>{coworker.runs}</strong>
                            <p>100% 成功 · 平均 12s</p>
                            <i />
                        </section>
                        <section>
                            <strong>最近工作 <span>还没有完成的 task</span></strong>
                            <p>这个 AI 队友还没有完成过任何 task。</p>
                        </section>
                    </div>
                </main>
            </div>
        </section>
    )
}

function MatterSquadsList() {
    const [createOpen, setCreateOpen] = useState(false)

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
                    <button type="button" className="is-active">我的 <span>1</span></button>
                    <button type="button">全部 <span>1</span></button>
                </div>
                <div className="wk-matter-squads__actions">
                    <button type="button">筛选</button>
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
                            <strong>{squad.name}</strong>
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
                        <label>
                            <Search size={15} />
                            <input placeholder="搜索 Agent 或成员..." />
                        </label>
                        <div className="wk-matter-squad-modal__agents">
                            <strong>我的 AGENT</strong>
                            {["Prototyper", "CC-Protoper", "的方法"].map((agent) => (
                                <button key={agent} type="button">
                                    <Bot size={15} />
                                    {agent}
                                </button>
                            ))}
                        </div>
                    </section>
                </main>
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

            <div className="wk-matter-squad-detail__layout">
                <aside className="wk-matter-squad-detail__profile">
                    <div className="wk-matter-squad-detail__identity">
                        <span><Users size={30} /></span>
                        <h2>{squad.name}</h2>
                        <p>{squad.description}</p>
                    </div>
                    <dl>
                        <dt>详情</dt>
                        <div><span>Leader</span><strong><Bot size={13} />{squad.leader}</strong></div>
                        <div><span>Members</span><strong>{squad.members.length}</strong></div>
                        <div><span>Created by</span><strong><i>L</i>{squad.creator}</strong></div>
                        <div><span>Created</span><strong>{squad.created}</strong></div>
                        <div><span>Updated</span><strong>{squad.updated}</strong></div>
                    </dl>
                </aside>

                <main className="wk-matter-squad-detail__main">
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
                        <section className="wk-matter-squad-detail__members">
                            <header>
                                <div>
                                    <h3>成员</h3>
                                    <p>该小队有 {squad.members.length} 名成员</p>
                                </div>
                                <div>
                                    <button type="button"><PlusIcon />创建 AI 队友</button>
                                    <button type="button"><PlusIcon />添加成员</button>
                                </div>
                            </header>
                            <div className="wk-matter-squad-detail__member-list">
                                {squad.members.map((member, index) => (
                                    <article key={member}>
                                        <span><Bot size={17} /><i /></span>
                                        <div>
                                            <strong>{member}</strong>
                                            <small>Agent {index === 0 ? " · 负责人 · 空闲" : " · 空闲"}</small>
                                            <p>{index === 0 ? "leader" : "添加角色..."}</p>
                                            <time>最近活动 1 分钟前</time>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ) : (
                        <section className="wk-matter-squad-detail__instructions">
                            <p>小队指引会在 Leader 智能体处理分配给该小队的 issue 时注入到它的 prompt 中。可用来给 Leader 提供贯穿全队的指导、协作规范，或每次任务都应遵循的上下文。</p>
                            <textarea placeholder="e.g. Always start by writing a failing test. Prefer small, atomic commits." />
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
        <section className="wk-matter-issue-detail" aria-label="Issue detail prototype">
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
                                <p>{issue.desc || "请继续推进这个 issue，并补充下一步处理建议。"}</p>
                                <ol>
                                    <li>确认当前任务目标。</li>
                                    <li>补齐必要上下文。</li>
                                    <li>给出可执行的下一步。</li>
                                </ol>
                            </>
                        )}
                        <div className="wk-matter-issue-detail__inline-actions">☺︎　📎</div>
                        <button type="button" className="wk-matter-issue-detail__add">＋ 添加子 issue</button>
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
                                "3. 执行状态：正常。CLI 认证有效，可以正常读写 issue、评论及状态，环境健康无异常。",
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
                    <p>还没有关联的 PR。在 PR 的分支名、标题或正文里引用本 issue 的 identifier 即可自动关联。</p>

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
