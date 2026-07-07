import React, { useEffect, useMemo, useState } from "react"
import {
    ArrowDown,
    Bot,
    BookOpen,
    ChevronRight,
    Code2,
    Download,
    ExternalLink,
    Filter,
    Lock,
    Plus,
    Search,
    Trash2,
    Users,
    X,
} from "lucide-react"
import WKApp from "../../App"
import "./index.css"

interface SkillFile {
    id: string
    name: string
    title: string
    description: string
    command: string
    source: string
    updated: string
    agents: number
}

const SKILLS: SkillFile[] = [
    {
        id: "grill-me",
        name: "SKILL.md",
        title: "grill-me",
        description: "A relentless interview to sharpen a plan or design.",
        command: "/grilling",
        source: "https://www.skills.sh/skills/grill-me",
        updated: "3 小时前",
        agents: 0,
    },
]

export default function SkillsPrototype() {
    const [query, setQuery] = useState("")
    const [importStep, setImportStep] = useState<CreateSkillStep | null>(null)

    const visibleSkills = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()
        return SKILLS.filter((skill) => {
            return !normalizedQuery
                || skill.title.toLowerCase().includes(normalizedQuery)
                || skill.description.toLowerCase().includes(normalizedQuery)
        })
    }, [query])

    function showList() {
        WKApp.routeRight.replaceToRoot(
            <SkillsListSurface
                skills={visibleSkills}
                query={query}
                onQueryChange={setQuery}
                onPickCreate={(step) => setImportStep(step)}
                onOpenSkill={(skill) => WKApp.routeRight.replaceToRoot(<SkillDetailSurface skill={skill} />)}
            />
        )
    }

    useEffect(() => {
        showList()
    }, [visibleSkills, query])

    useEffect(() => {
        const handleActivated = (payload: { menuId?: string }) => {
            if (payload?.menuId === "skills-prototype") showList()
        }
        WKApp.mittBus.on("wk:nav-menu-activated" as any, handleActivated as any)
        return () => WKApp.mittBus.off("wk:nav-menu-activated" as any, handleActivated as any)
    }, [visibleSkills, query])

    return (
        <section className="wk-skills-proto" aria-label="Skills prototype">
            <header className="wk-skills-proto__head">
                <div className="wk-skills-proto__title">
                    <BookOpen size={17} />
                    <span>Skills</span>
                    <strong>{SKILLS.length}</strong>
                </div>
                <button type="button" onClick={() => setImportStep("manual")} aria-label="新建 skill">
                    <Plus size={15} />
                </button>
            </header>

            <label className="wk-skills-proto__search">
                <Search size={15} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 skill..." />
            </label>

            <nav className="wk-skills-proto__nav">
                <button type="button" className="is-active" onClick={showList}>
                    <BookOpen size={16} />
                    全部 Skills
                    <span>{visibleSkills.length}</span>
                </button>
            </nav>

            {importStep && <ImportSkillModal step={importStep} onClose={() => setImportStep(null)} />}
        </section>
    )
}

export { SkillsPrototype }
// T1 换皮:OctoLoop 单模块并入技能节点,复用本页 surfaces(蓝图 §1.2)
export { SKILLS, SkillsListSurface, ImportSkillModal, SkillDetailSurface }

type CreateSkillStep = "manual" | "url" | "runtime"

// P14(0707 终挑 GitBook +New):三路创建从「三卡 chooser 弹窗」降级为按钮下拉菜单,最克制的 chooser
const CREATE_SKILL_OPTIONS: Array<{ step: CreateSkillStep; title: string; desc: string }> = [
    { step: "manual", title: "手动创建", desc: "从空白 SKILL.md 开始,自己写指令。" },
    { step: "url", title: "从 URL 导入", desc: "从 ClawHub、Skills.sh 或 GitHub 拉取。" },
    { step: "runtime", title: "从运行时复制", desc: "把本地运行时里装好的 skill 提升过来。" },
]

function SkillsListSurface({
    skills,
    query,
    onQueryChange,
    onPickCreate,
    onOpenSkill,
}: {
    skills: SkillFile[]
    query: string
    onQueryChange: (query: string) => void
    onPickCreate: (step: CreateSkillStep) => void
    onOpenSkill: (skill: SkillFile) => void
}) {
    const [newOpen, setNewOpen] = useState(false)
    return (
        <section className="wk-skills-list" aria-label="Skills list">
            <header className="wk-skills-list__header">
                <div className="wk-skills-list__title">
                    <BookOpen size={17} />
                    <strong>Skills</strong>
                    <span>{SKILLS.length}</span>
                    <p>工作区里任何 AI 队友都能使用的指令。</p>
                    <a href="#learn-more">了解更多 →</a>
                </div>
                <div className="wk-skills-list__newwrap">
                    <button type="button" className="wk-skills-list__create" aria-haspopup="menu" aria-expanded={newOpen} onClick={() => setNewOpen((v) => !v)}>
                        <Plus size={15} />
                        新建 skill
                    </button>
                    {newOpen && (
                        <div className="wk-skills-list__newmenu" role="menu">
                            {CREATE_SKILL_OPTIONS.map((opt) => (
                                <button
                                    key={opt.step}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setNewOpen(false)
                                        onPickCreate(opt.step)
                                    }}
                                >
                                    <strong>{opt.title}</strong>
                                    <span>{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <div className="wk-skills-list__toolbar">
                <label className="wk-skills-list__search">
                    <Search size={15} />
                    <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索 skill..." />
                </label>
                <div className="wk-skills-list__actions">
                    <button type="button"><Filter size={14} />筛选</button>
                    <button type="button"><ArrowDown size={14} />更新时间</button>
                </div>
            </div>

            <div className="wk-skills-list__table" role="table" aria-label="Skills prototype list">
                <div className="wk-skills-list__row wk-skills-list__head" role="row">
                    <div role="columnheader">名称</div>
                    <div role="columnheader">被谁使用</div>
                    <div role="columnheader">添加者</div>
                    <div role="columnheader">更新时间 ↓</div>
                </div>
                {skills.map((skill) => (
                    <button
                        key={skill.id}
                        type="button"
                        className="wk-skills-list__row wk-skills-list__item"
                        role="row"
                        onClick={() => onOpenSkill(skill)}
                    >
                        <div role="cell" className="wk-skills-list__name">
                            <strong>{skill.title}</strong>
                            <span>{skill.description}</span>
                        </div>
                        <div role="cell" className="wk-skills-list__muted">
                            {skill.agents === 0 ? "— 未使用" : `${skill.agents} 个 AI 队友`}
                        </div>
                        <div role="cell" className="wk-skills-list__owner"><i>LV</i> lvsijia</div>
                        <div role="cell" className="wk-skills-list__muted">{skill.updated}</div>
                    </button>
                ))}
            </div>
        </section>
    )
}

// T7 三路创建 → P14 后:方式选择由 +New 菜单承担,本弹窗只承载各路的二级步骤。
function ImportSkillModal({ step, onClose }: { step: CreateSkillStep; onClose: () => void }) {
    return (
        <div className="wk-skill-import-modal" role="presentation" onMouseDown={onClose}>
            <section
                className="wk-skill-import-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-label="新建 skill"
                onMouseDown={(event) => event.stopPropagation()}
            >
                {step === "manual" && (
                    <>
                        <header className="wk-skill-import-modal__head">
                            <div>
                                <h2>手动创建</h2>
                                <p>从空白 SKILL.md 开始写。</p>
                            </div>
                            <button type="button" aria-label="关闭" onClick={onClose}><X size={16} /></button>
                        </header>
                        <div className="wk-skill-import-modal__body">
                            <label>
                                <span>名称</span>
                                <input autoFocus placeholder="例如：review-helper" />
                                <small className="wk-skill-import-modal__help">工作区内必须唯一。</small>
                            </label>
                            <label>
                                <span>描述</span>
                                <textarea className="wk-skill-import-modal__desc" placeholder="用一句话说什么时候应该把这个 skill 分配给 AI 队友。" />
                            </label>
                        </div>
                        <footer className="wk-skill-import-modal__foot">
                            <button type="button" onClick={onClose}>取消</button>
                            <button type="button" className="wk-skill-import-modal__submit" disabled>创建 skill</button>
                        </footer>
                    </>
                )}

                {step === "url" && (
                    <>
                        <header className="wk-skill-import-modal__head">
                            <div>
                                <h2>从 URL 导入</h2>
                                <p>通过 URL 拉取已发布的 skill，文件由服务端拉取。</p>
                            </div>
                            <button type="button" aria-label="关闭" onClick={onClose}><X size={16} /></button>
                        </header>
                        <div className="wk-skill-import-modal__body">
                            <label>
                                <span>Skill URL</span>
                                <input autoFocus defaultValue="https://clawhub.ai/owner/skill" />
                            </label>
                            <div className="wk-skill-import-modal__sources">
                                <span>支持的来源</span>
                                <div>
                                    {[
                                        ["ClawHub", "clawhub.ai/owner/skill"],
                                        ["Skills.sh", "skills.sh/owner/skill"],
                                        ["GitHub", "github.com/owner/repo"],
                                    ].map(([title, url]) => (
                                        <button key={title} type="button">
                                            <strong>{title}</strong>
                                            <small>{url}</small>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <footer className="wk-skill-import-modal__foot">
                            <button type="button" onClick={onClose}>取消</button>
                            <button type="button" className="wk-skill-import-modal__submit" onClick={onClose}>
                                <Download size={15} />
                                导入
                            </button>
                        </footer>
                    </>
                )}

                {step === "runtime" && (
                    <>
                        <header className="wk-skill-import-modal__head">
                            <div>
                                <h2>从运行时复制</h2>
                                <p>扫描本地运行时,把它磁盘上的 skill 提升到工作区。</p>
                            </div>
                            <button type="button" aria-label="关闭" onClick={onClose}><X size={16} /></button>
                        </header>
                        <div className="wk-skill-import-modal__body">
                            <label>
                                <span>运行时</span>
                                <button type="button" className="wk-skill-import-modal__runtime">
                                    Codex (kaka-mbp) (codex)
                                    <em>online</em>
                                </button>
                            </label>
                            <div className="wk-skill-import-modal__skeleton" aria-label="扫描中">
                                <i /><i /><i />
                            </div>
                            <p className="wk-skill-import-modal__note">导入时会忽略软链、不可读文件、超大文件以及超大目录。</p>
                        </div>
                        <footer className="wk-skill-import-modal__foot">
                            <span className="wk-skill-import-modal__hint">请选择一个 skill 继续。</span>
                            <button type="button" className="wk-skill-import-modal__submit" disabled>
                                <Download size={15} />
                                导入到工作区
                            </button>
                        </footer>
                    </>
                )}
            </section>
        </div>
    )
}

// P5(0707 终挑 GitBook 文档):单栏大排版正文;文件树窄栏与右 Inspector 砍除,
// 元数据压成标题下 chips,权限降为文末小字。常驻 AI 面板 Evan 拍砍。
function SkillDetailSurface({ skill }: { skill: SkillFile }) {
    return (
        <section className="wk-skill-detail is-doc" aria-label="Skill detail">
            <header className="wk-skill-detail__top">
                <div className="wk-skill-detail__crumb">
                    <span>Skills</span>
                    <ChevronRight size={13} />
                    <strong>{skill.title}</strong>
                </div>
                <div className="wk-skill-detail__tools">
                    <button type="button" className="wk-skill-detail__edit">编辑</button>
                    <button type="button" className="wk-skill-detail__delete" aria-label="删除 skill"><Trash2 size={15} /></button>
                </div>
            </header>

            <main className="wk-skdoc">
                <article className="wk-skdoc__page">
                    <span className="wk-skdoc__icon"><BookOpen size={22} /></span>
                    <h1>{skill.title}</h1>
                    <p className="wk-skdoc__lead">{skill.description}</p>
                    <div className="wk-skdoc__meta">
                        <i title={skill.source}><ExternalLink size={12} />导入自 Skills.sh</i>
                        <i>更新于 {skill.updated}</i>
                        <i>由 lvsijia</i>
                        <i><Bot size={12} />被 {skill.agents} 个 AI 队友使用</i>
                        <i className="is-mono">0ab0a72d</i>
                    </div>

                    <hr />

                    <h2>frontmatter</h2>
                    <div className="wk-skill-detail__yaml">
                        <div><span>name</span><strong>{skill.title}</strong></div>
                        <div><span>description</span><strong>{skill.description}</strong></div>
                        <div><span>disable-model-invocation</span><strong>true</strong></div>
                    </div>

                    <h2>使用方式</h2>
                    <p>
                        运行一次 <code>{skill.command}</code> 会话。面向一份计划或设计稿,连续追问,直到把没想清楚的地方问穿。
                    </p>
                    <ul>
                        <li><strong>找目标</strong>:让对方贴出计划原文,确认要打磨的范围。</li>
                        <li><strong>连环追问</strong>:每轮只问一个最要害的问题,不给台阶。</li>
                        <li><strong>输出清单</strong>:把暴露出的假设与漏洞,整理成一份修订清单收尾。</li>
                    </ul>

                    <h2>文件 · 1</h2>
                    <div className="wk-skdoc__files">
                        <button type="button">
                            <BookOpen size={14} />
                            {skill.name}
                            <em>2.1 KB</em>
                        </button>
                    </div>

                    <footer className="wk-skdoc__perms">
                        <div><Lock size={13} /><span>你可以编辑和删除这个 skill,修改在 AI 队友下次运行时生效。</span></div>
                        <div><Users size={13} /><span>工作区成员可以把这个 skill 分配给 AI 队友。</span></div>
                        <div><Code2 size={13} /><span>原型摆拍:不做包安装,也不做远端同步。</span></div>
                    </footer>
                </article>
            </main>
        </section>
    )
}
