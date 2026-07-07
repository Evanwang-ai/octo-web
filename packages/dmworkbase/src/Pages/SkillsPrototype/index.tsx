import React, { useEffect, useMemo, useState } from "react"
import {
    ArrowDown,
    Bot,
    Check,
    BookOpen,
    ChevronRight,
    Code2,
    Download,
    ExternalLink,
    FileText,
    Filter,
    Folder,
    Lock,
    Plus,
    Search,
    Trash2,
    Users,
    X,
} from "lucide-react"
import WKApp from "../../App"
import MarkdownContent from "../../Messages/Text/MarkdownContent"
import "./index.css"

interface SkillTreeNode {
    id: string
    name: string
    kind: "folder" | "file"
    lang?: "md" | "code"
    size?: string
    content?: string
    children?: SkillTreeNode[]
}

interface SkillUser {
    id: string
    name: string
    type: "worker" | "squad"
}

interface SkillFile {
    id: string
    name: string
    title: string
    description: string
    command: string
    source: string
    updated: string
    agents: number
    tree?: SkillTreeNode[]
    usedBy?: SkillUser[]
}

const SKILL_MD = `---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

# grill-me

运行一次 \`/grilling\` 会话。面向一份计划或设计稿，连续追问，直到把没想清楚的地方问穿。

## 什么时候用

- 计划 / 设计稿写完、交付前想先自证伪
- 拿不准哪里是最薄弱的假设

## 流程

1. **找目标** — 让对方贴出计划原文，确认要打磨的范围。
2. **连环追问** — 每轮只问一个最要害的问题，不给台阶。
3. **输出清单** — 把暴露出的假设与漏洞，整理成一份修订清单收尾。

细节见 SPEC.md 与 reference/ 下的题库与评分标准。
`

const SPEC_MD = `# 规格:grilling 会话协议

## 输入

一份计划或设计文档(markdown / 纯文本)。

## 单轮结构

| 阶段 | 动作 |
| --- | --- |
| 提问 | 只抛一个最要害的问题 |
| 收敛 | 逼对方给出可证伪的回答 |
| 记账 | 把新暴露的假设登记进清单 |

## 退出条件

连续两轮问不出新漏洞,输出《修订清单》并结束。
`

const QUESTIONS_MD = `# 题库

- 这个方案最先崩的地方是哪一处?为什么是它?
- 如果只能砍掉一半范围,你砍哪一半?
- 你在假设谁的行为?他凭什么这么做?
- 成功长什么样?用一个能被测量的句子说清。
`

const RUBRIC_MD = `# 评分标准

一次合格的 grilling:

- [ ] 至少击穿一个"想当然"的假设
- [ ] 每个问题都可被证伪,不是发散
- [ ] 收尾清单里每条都带下一步动作
`

const SKILLS: SkillFile[] = [
    {
        id: "grill-me",
        name: "SKILL.md",
        title: "grill-me",
        description: "A relentless interview to sharpen a plan or design.",
        command: "/grilling",
        source: "https://www.skills.sh/skills/grill-me",
        updated: "3 小时前",
        agents: 2,
        tree: [
            { id: "SKILL.md", name: "SKILL.md", kind: "file", lang: "md", size: "1.4 KB", content: SKILL_MD },
            { id: "SPEC.md", name: "SPEC.md", kind: "file", lang: "md", size: "0.7 KB", content: SPEC_MD },
            {
                id: "reference",
                name: "reference",
                kind: "folder",
                children: [
                    { id: "reference/questions.md", name: "questions.md", kind: "file", lang: "md", size: "0.4 KB", content: QUESTIONS_MD },
                    { id: "reference/rubric.md", name: "rubric.md", kind: "file", lang: "md", size: "0.3 KB", content: RUBRIC_MD },
                ],
            },
        ],
        usedBy: [
            { id: "w-proto", name: "Prototyper-Codex-MBOT", type: "worker" },
            { id: "w-analyser", name: "Analyser-CC-MBOT", type: "worker" },
        ],
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

            {importStep && <ImportSkillModal initialStep={importStep} onClose={() => setImportStep(null)} />}
        </section>
    )
}

export { SkillsPrototype }
// T1 换皮:OctoLoop 单模块并入技能节点,复用本页 surfaces(蓝图 §1.2)
export { SKILLS, SkillsListSurface, ImportSkillModal, SkillDetailSurface }

type CreateSkillStep = "manual" | "url" | "runtime"

// P14(Evan R2):三路创建聚合进一个「新建 Skill」页(VEED 式方式卡),不再是下拉菜单
const CREATE_SKILL_OPTIONS: Array<{ step: CreateSkillStep; title: string; desc: string; icon: React.ReactNode }> = [
    { step: "manual", title: "空白起草", desc: "从空白 SKILL.md 开始,自己写指令。", icon: <FileText size={18} /> },
    { step: "url", title: "从 URL 导入", desc: "从 ClawHub、Skills.sh 或 GitHub 链接拉取。", icon: <ExternalLink size={18} /> },
    { step: "runtime", title: "从运行时复制", desc: "把本地运行时里装好的 skill 提升过来。", icon: <Bot size={18} /> },
]

function SkillCreateChooser({ onClose, onPick }: { onClose: () => void; onPick: (step: CreateSkillStep) => void }) {
    return (
        <div className="wk-skc" role="presentation" onMouseDown={onClose}>
            <section className="wk-skc__dialog" role="dialog" aria-modal="true" aria-label="新建 Skill" onMouseDown={(e) => e.stopPropagation()}>
                <header className="wk-skc__head">
                    <div>
                        <h2>新建 Skill</h2>
                        <p>挑一种方式创建 skill —— 都在这一页。</p>
                    </div>
                    <button type="button" className="wk-skc__close" onClick={onClose} aria-label="关闭"><X size={18} /></button>
                </header>
                <div className="wk-skc__grid">
                    {CREATE_SKILL_OPTIONS.map((opt) => (
                        <button key={opt.step} type="button" className="wk-skc__card" onClick={() => onPick(opt.step)}>
                            <span className="wk-skc__icon">{opt.icon}</span>
                            <strong>{opt.title}</strong>
                            <span className="wk-skc__desc">{opt.desc}</span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    )
}

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
                <button type="button" className="wk-skills-list__create" onClick={() => onPickCreate("manual")}>
                    <Plus size={15} />
                    新建 Skill
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
const RUNTIME_SKILLS = [
    { name: "pdf-extract", path: "~/.claude/skills/pdf-extract", meta: "3 个文件 · 12 KB" },
    { name: "web-research", path: "~/.claude/skills/web-research", meta: "5 个文件 · 41 KB" },
    { name: "code-review", path: "~/.claude/skills/code-review", meta: "2 个文件 · 8 KB" },
    { name: "sql-explain", path: "~/.claude/skills/sql-explain", meta: "4 个文件 · 19 KB" },
]

// R4-3(Evan R4):两栏 = 左表单 + 右 skill 卡实时预览(拉开 Multica 三段壳克隆)。
function ImportSkillModal({ initialStep = "manual", onClose }: { initialStep?: CreateSkillStep; onClose: () => void }) {
    const [method, setMethod] = useState<CreateSkillStep>(initialStep)
    const [name, setName] = useState("")
    const [desc, setDesc] = useState("")
    const [url, setUrl] = useState("")
    const [picked, setPicked] = useState<string | null>(null)

    const META = {
        manual: { title: "手动创建", sub: "从空白 SKILL.md 开始写。", badge: "手动", action: "创建 skill" },
        url: { title: "从 URL 导入", sub: "通过 URL 拉取已发布的 skill,文件由服务端拉取。", badge: "URL 导入", action: "导入" },
        runtime: { title: "从运行时复制", sub: "扫描本地运行时,把它磁盘上的 skill 提升到工作区。", badge: "运行时", action: "导入到工作区" },
    }[method]

    const pickedSkill = RUNTIME_SKILLS.find((s) => s.name === picked)
    const urlName = url.trim().replace(/\/+$/, "").split("/").pop() || ""
    const previewName = method === "manual" ? (name.trim() || "新 skill")
        : method === "url" ? (urlName || "从 URL 导入")
        : (picked || "选择一个 skill")
    const previewDesc = method === "manual" ? (desc.trim() || "描述:什么时候把这个 skill 分配给 AI 队友。")
        : method === "url" ? (url.trim() || "https://clawhub.ai/owner/skill")
        : (pickedSkill ? pickedSkill.path : "从上方运行时里挑一个 skill 提升过来。")
    const canSubmit = method === "manual" ? name.trim().length > 0
        : method === "url" ? url.trim().length > 0
        : !!picked

    return (
        <div className="wk-skill-import-modal" role="presentation" onMouseDown={onClose}>
            <section
                className="wk-skill-import-modal__dialog is-two-pane"
                role="dialog"
                aria-modal="true"
                aria-label="新建 skill"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="wk-skill-import-modal__head">
                    <div>
                        <h2>新建 Skill</h2>
                        <p>选一种方式创建,右侧实时预览。</p>
                    </div>
                    <button type="button" aria-label="关闭" onClick={onClose}><X size={16} /></button>
                </header>

                <div className="wk-skill-import-modal__methods">
                    {CREATE_SKILL_OPTIONS.map((opt) => (
                        <button
                            key={opt.step}
                            type="button"
                            className={`wk-skill-import-modal__method${method === opt.step ? " is-on" : ""}`}
                            onClick={() => setMethod(opt.step)}
                        >
                            {opt.icon}
                            <span>{opt.title}</span>
                        </button>
                    ))}
                </div>

                <div className="wk-skill-import-modal__panes">
                    <div className="wk-skill-import-modal__body">
                        {method === "manual" && (
                            <>
                                <label>
                                    <span>名称</span>
                                    <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:review-helper" />
                                    <small className="wk-skill-import-modal__help">工作区内必须唯一。</small>
                                </label>
                                <label>
                                    <span>描述</span>
                                    <textarea className="wk-skill-import-modal__desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="用一句话说什么时候应该把这个 skill 分配给 AI 队友。" />
                                </label>
                            </>
                        )}
                        {method === "url" && (
                            <>
                                <label>
                                    <span>Skill URL</span>
                                    <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://clawhub.ai/owner/skill" />
                                </label>
                                <div className="wk-skill-import-modal__sources">
                                    <span>支持的来源</span>
                                    <div>
                                        {[
                                            ["ClawHub", "clawhub.ai/owner/skill"],
                                            ["Skills.sh", "skills.sh/owner/skill"],
                                            ["GitHub", "github.com/owner/repo"],
                                        ].map(([title, u]) => (
                                            <button key={title} type="button" onClick={() => setUrl(`https://${u}`)}>
                                                <strong>{title}</strong>
                                                <small>{u}</small>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        {method === "runtime" && (
                            <>
                                <label>
                                    <span>运行时</span>
                                    <button type="button" className="wk-skill-import-modal__runtime">
                                        Codex (kaka-mbp) (codex)
                                        <em>online</em>
                                    </button>
                                </label>
                                <div className="wk-skill-import-modal__rtlist" role="listbox" aria-label="运行时里的 skill">
                                    {RUNTIME_SKILLS.map((s) => (
                                        <button
                                            key={s.name}
                                            type="button"
                                            role="option"
                                            aria-selected={picked === s.name}
                                            className={`wk-skill-import-modal__rtskill${picked === s.name ? " is-picked" : ""}`}
                                            onClick={() => setPicked(s.name)}
                                        >
                                            <span className="wk-skill-import-modal__rtskill-check">{picked === s.name ? <Check size={14} /> : <Folder size={14} />}</span>
                                            <span className="wk-skill-import-modal__rtskill-main">
                                                <strong>{s.name}</strong>
                                                <small>{s.path}</small>
                                            </span>
                                            <span className="wk-skill-import-modal__rtskill-meta">{s.meta}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="wk-skill-import-modal__note">导入时会忽略软链、不可读文件、超大文件以及超大目录。</p>
                            </>
                        )}
                    </div>

                    <aside className="wk-skp">
                        <span className="wk-skp__label">预览</span>
                        <div className="wk-skp__card">
                            <div className="wk-skp__top">
                                <span className="wk-skp__icon"><FileText size={18} /></span>
                                <span className="wk-skp__badge">{META.badge}</span>
                            </div>
                            <strong className="wk-skp__name">{previewName}</strong>
                            <p className="wk-skp__desc">{previewDesc}</p>
                            <div className="wk-skp__files">
                                <span><FileText size={12} /> SKILL.md</span>
                                {method === "runtime" && pickedSkill && <em>{pickedSkill.meta}</em>}
                            </div>
                        </div>
                        <p className="wk-skp__foot">创建后出现在工作区 Skills,可分配给任意 AI 队友。</p>
                    </aside>
                </div>

                <footer className="wk-skill-import-modal__foot">
                    <button type="button" onClick={onClose}>取消</button>
                    <button type="button" className="wk-skill-import-modal__submit" disabled={!canSubmit} onClick={canSubmit ? onClose : undefined}>
                        {method !== "manual" && <Download size={15} />}
                        {META.action}
                    </button>
                </footer>
            </section>
        </div>
    )
}

// P5(Evan R2):技能详情 = GitBook 双栏。左 = 身份 + 文件树 + 被谁使用,右 = 选中文件内容,
// md 复用 Octo Web 的 MarkdownContent 渲染(pdf/html 同理走文件预览);技能可为文件夹结构。
function findFirstFile(nodes: SkillTreeNode[]): SkillTreeNode | null {
    for (const n of nodes) {
        if (n.kind === "file") return n
        if (n.children) {
            const f = findFirstFile(n.children)
            if (f) return f
        }
    }
    return null
}

function SkillTreeItem({ node, depth, selectedId, onSelect }: {
    node: SkillTreeNode
    depth: number
    selectedId?: string
    onSelect: (n: SkillTreeNode) => void
}) {
    const [open, setOpen] = useState(true)
    if (node.kind === "folder") {
        return (
            <>
                <button
                    type="button"
                    className="wk-skdoc2__row is-folder"
                    style={{ paddingLeft: 8 + depth * 14 }}
                    onClick={() => setOpen((o) => !o)}
                >
                    <ChevronRight size={13} className={`wk-skdoc2__chev${open ? " is-open" : ""}`} />
                    <Folder size={14} />
                    <span>{node.name}</span>
                </button>
                {open && node.children?.map((c) => (
                    <SkillTreeItem key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
                ))}
            </>
        )
    }
    return (
        <button
            type="button"
            className={`wk-skdoc2__row is-file${selectedId === node.id ? " is-active" : ""}`}
            style={{ paddingLeft: 8 + depth * 14 + 18 }}
            onClick={() => onSelect(node)}
        >
            <FileText size={14} />
            <span>{node.name}</span>
        </button>
    )
}

function SkillDetailSurface({ skill }: { skill: SkillFile }) {
    const tree: SkillTreeNode[] = skill.tree && skill.tree.length > 0
        ? skill.tree
        : [{ id: skill.name, name: skill.name, kind: "file", lang: "md", size: "2.1 KB", content: `# ${skill.title}\n\n${skill.description}` }]
    const usedBy = skill.usedBy ?? []
    const firstFile = useMemo(() => findFirstFile(tree), [tree])
    const [selectedId, setSelectedId] = useState<string | undefined>(firstFile?.id)

    const selected = useMemo(() => {
        const find = (nodes: SkillTreeNode[]): SkillTreeNode | null => {
            for (const n of nodes) {
                if (n.id === selectedId && n.kind === "file") return n
                if (n.children) {
                    const f = find(n.children)
                    if (f) return f
                }
            }
            return null
        }
        return find(tree) ?? firstFile
    }, [selectedId, tree, firstFile])

    return (
        <section className="wk-skill-detail" aria-label="Skill detail">
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

            <div className="wk-skdoc2">
                <aside className="wk-skdoc2__side">
                    <div className="wk-skdoc2__ident">
                        <span className="wk-skdoc2__icon"><BookOpen size={18} /></span>
                        <div>
                            <strong>{skill.title}</strong>
                            <p>{skill.description}</p>
                        </div>
                    </div>
                    <div className="wk-skdoc2__metarow">
                        <i title={skill.source}><ExternalLink size={11} />导入自 Skills.sh</i>
                        <i>更新于 {skill.updated}</i>
                    </div>

                    <div className="wk-skdoc2__sectitle">文件</div>
                    <div className="wk-skdoc2__tree">
                        {tree.map((n) => (
                            <SkillTreeItem key={n.id} node={n} depth={0} selectedId={selected?.id} onSelect={(f) => setSelectedId(f.id)} />
                        ))}
                    </div>

                    <div className="wk-skdoc2__sectitle"><Bot size={12} />被 {usedBy.length} 个 AI 队友使用</div>
                    <div className="wk-skdoc2__usedby">
                        {usedBy.length === 0 ? (
                            <p className="wk-skdoc2__usedempty">还没有 AI 队友使用这个 skill。</p>
                        ) : usedBy.map((u) => (
                            <div key={u.id} className="wk-skdoc2__user">
                                <span className="wk-skdoc2__uav">{u.name.charAt(0)}</span>
                                <span className="wk-skdoc2__uname">{u.name}</span>
                                <span className="wk-skdoc2__ukind">{u.type === "squad" ? "小队" : "AI 队友"}</span>
                            </div>
                        ))}
                    </div>

                    <footer className="wk-skdoc2__perms">
                        <div><Lock size={12} /><span>可编辑删除，改动在下次运行时生效。</span></div>
                        <div><Users size={12} /><span>工作区成员可把它分配给 AI 队友。</span></div>
                        <div><Code2 size={12} /><span>原型摆拍:不装包、不同步远端。</span></div>
                    </footer>
                </aside>

                <article className="wk-skdoc2__main">
                    {selected ? (
                        <>
                            <div className="wk-skdoc2__filebar">
                                <FileText size={14} />
                                <strong>{selected.name}</strong>
                                {selected.size && <em>{selected.size}</em>}
                            </div>
                            <div className="wk-skdoc2__content">
                                {selected.lang === "md" ? (
                                    <MarkdownContent content={selected.content ?? ""} />
                                ) : (
                                    <pre className="wk-skdoc2__code"><code>{selected.content}</code></pre>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="wk-skdoc2__empty">选择左侧一个文件查看内容。</div>
                    )}
                </article>
            </div>
        </section>
    )
}
