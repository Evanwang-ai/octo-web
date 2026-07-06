import React, { useEffect, useMemo, useState } from "react"
import {
    ArrowDown,
    ArrowLeft,
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
    const [importOpen, setImportOpen] = useState(false)

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
                onOpenImport={() => setImportOpen(true)}
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
                <button type="button" onClick={() => setImportOpen(true)} aria-label="新建 skill">
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

            {importOpen && <ImportSkillModal onClose={() => setImportOpen(false)} />}
        </section>
    )
}

export { SkillsPrototype }
// T1 换皮:OctoLoop 单模块并入技能节点,复用本页 surfaces(蓝图 §1.2)
export { SKILLS, SkillsListSurface, ImportSkillModal, SkillDetailSurface }

function SkillsListSurface({
    skills,
    query,
    onQueryChange,
    onOpenImport,
    onOpenSkill,
}: {
    skills: SkillFile[]
    query: string
    onQueryChange: (query: string) => void
    onOpenImport: () => void
    onOpenSkill: (skill: SkillFile) => void
}) {
    return (
        <section className="wk-skills-list" aria-label="Skills list">
            <header className="wk-skills-list__header">
                <div className="wk-skills-list__title">
                    <BookOpen size={17} />
                    <strong>Skills</strong>
                    <span>{SKILLS.length}</span>
                    <p>工作区里任何智能体都能使用的指令。</p>
                    <a href="#learn-more">了解更多 →</a>
                </div>
                <button type="button" className="wk-skills-list__create" onClick={onOpenImport}>
                    <Plus size={15} />
                    新建 skill
                </button>
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
                            {skill.agents === 0 ? "— 未使用" : `${skill.agents} 个智能体`}
                        </div>
                        <div role="cell" className="wk-skills-list__owner"><i>LV</i> lvsijia</div>
                        <div role="cell" className="wk-skills-list__muted">{skill.updated}</div>
                    </button>
                ))}
            </div>
        </section>
    )
}

function ImportSkillModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="wk-skill-import-modal" role="presentation" onMouseDown={onClose}>
            <section
                className="wk-skill-import-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-label="从 URL 导入 skill"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="wk-skill-import-modal__head">
                    <button type="button" aria-label="返回" onClick={onClose}><ArrowLeft size={17} /></button>
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
            </section>
        </div>
    )
}

function SkillDetailSurface({ skill }: { skill: SkillFile }) {
    return (
        <section className="wk-skill-detail" aria-label="Skill detail">
            <header className="wk-skill-detail__top">
                <div className="wk-skill-detail__crumb">
                    <span>Skills</span>
                    <ChevronRight size={13} />
                    <strong>{skill.title}</strong>
                </div>
            </header>

            <div className="wk-skill-detail__layout">
                <main className="wk-skill-detail__main">
                    <section className="wk-skill-detail__hero">
                        <h2>{skill.title}</h2>
                        <label>
                            <span><BookOpen size={14} />描述</span>
                            <textarea value={skill.description} readOnly />
                        </label>
                        <div className="wk-skill-detail__import-line">
                            <span><ExternalLink size={14} />导入自 · Skills.sh</span>
                            <span>·</span>
                            <span>{skill.updated}更新</span>
                            <span>·</span>
                            <span>由 lvsijia</span>
                        </div>
                    </section>

                    <section className="wk-skill-detail__document">
                        <header>
                            <span>{skill.name}</span>
                            <button type="button" aria-label="编辑 skill 文件"><BookOpen size={16} /></button>
                        </header>
                        <article>
                            <div className="wk-skill-detail__yaml">
                                <div><span>name</span><strong>{skill.title}</strong></div>
                                <div><span>description</span><strong>{skill.description}</strong></div>
                                <div><span>disable-model-invocation</span><strong>true</strong></div>
                            </div>
                            <p>Run a <code>{skill.command}</code> session.</p>
                        </article>
                    </section>
                </main>

                <aside className="wk-skill-detail__meta">
                    <section>
                        <h3>元数据</h3>
                        <dl>
                            <div><dt>创建于</dt><dd>3 小时前</dd></div>
                            <div><dt>更新于</dt><dd>{skill.updated}</dd></div>
                            <div><dt>创建者</dt><dd>lvsijia</dd></div>
                            <div><dt>文件</dt><dd>1</dd></div>
                            <div><dt>ID</dt><dd>0ab0a72d...</dd></div>
                        </dl>
                    </section>

                    <section>
                        <h3>来源</h3>
                        <div className="wk-skill-detail__source">
                            <ExternalLink size={15} />
                            <div>
                                <strong>从 Skills.sh 导入</strong>
                                <span>{skill.source}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3>被 {skill.agents} 个智能体使用</h3>
                        <div className="wk-skill-detail__empty">
                            <Bot size={18} />
                            <span>{skill.agents === 0 ? "还未分配给任何智能体。打开 Skills 标签页进行分配。" : "Prototyper、CC-Protoper 正在使用。"}</span>
                        </div>
                    </section>

                    <section>
                        <h3>权限</h3>
                        <div className="wk-skill-detail__permission">
                            <Lock size={15} />
                            <span>你可以编辑和删除这个 skill。修改后仅在当前工作区生效。</span>
                        </div>
                        <div className="wk-skill-detail__permission">
                            <Users size={15} />
                            <span>Workspace members can assign this skill to agents.</span>
                        </div>
                        <div className="wk-skill-detail__permission">
                            <Code2 size={15} />
                            <span>Prototype only, no package install or remote sync.</span>
                        </div>
                    </section>
                </aside>
            </div>
        </section>
    )
}
