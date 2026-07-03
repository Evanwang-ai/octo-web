/**
 * [INPUT]: api/multica 的 getSkill/updateSkill/deleteSkill/listAgents;MarkdownContent(预览);
 *          ./WorkersView 的 WorkerAvatar。
 * [OUTPUT]: 对外默认导出 SkillDetailView —— 技能详情(⭐Wave A-5 part2)。
 * [POS]: dmworktodo/ui/MatterListView 的技能详情,MatterRouteHost view="skillDetail" 挂载。
 *        结构参照 multica skill-detail-page 的三栏,收敛为双栏:左=文件列表(SKILL.md 置顶,
 *        路径按 "/" 前端派生层级缩进)+新增/删除文件+挂载 worker;右=编辑器(textarea mono
 *        ↔ markdown 预览切换,.md 双模)。保存=updateSkill 全量(files 整树替换契约)。
 *        删除=两击确认,提示已挂载 worker 数。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import MarkdownContent from "@octo/base/src/Messages/Text/MarkdownContent";
import { getSkill, updateSkill, deleteSkill, listAgents } from "../../api/multica/client";
import type { Agent, Skill } from "../../api/multica/types";
import { WorkerAvatar } from "./WorkersView";
import "./skills.css";

const SKILL_MD = "SKILL.md";

export default function SkillDetailView({
  skillId,
  onBack,
}: {
  skillId: string;
  onBack: () => void;
}) {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  // 编辑草稿:path → content(SKILL.md 的 path 用哨兵常量)。
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>(SKILL_MD);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [delArmed, setDelArmed] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setSkill(null);
    setDirty(false);
    setSelected(SKILL_MD);
    setPreview(false);
    getSkill(skillId).then((s) => {
      setSkill(s);
      setDrafts({
        [SKILL_MD]: s.content,
        ...Object.fromEntries(s.files.map((f) => [f.path, f.content])),
      });
    });
    listAgents().then(setAgents);
  }, [skillId]);

  const holders = useMemo(
    () => agents.filter((a) => a.skills.some((s) => s.id === skillId)),
    [agents, skillId],
  );

  if (!skill) {
    return (
      <div className="skl-root">
        <div className="skl-empty">加载中…</div>
      </div>
    );
  }

  const paths = [SKILL_MD, ...Object.keys(drafts).filter((p) => p !== SKILL_MD).sort()];
  const isMd = selected.toLowerCase().endsWith(".md");
  const current = drafts[selected] ?? "";

  const save = async () => {
    setBusy(true);
    try {
      const next = await updateSkill(skillId, {
        content: drafts[SKILL_MD],
        files: Object.entries(drafts)
          .filter(([p]) => p !== SKILL_MD && p.trim())
          .map(([path, content]) => ({ path, content })),
      });
      setSkill(next);
      setDrafts({
        [SKILL_MD]: next.content,
        ...Object.fromEntries(next.files.map((f) => [f.path, f.content])),
      });
      setDirty(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="skl-root">
      <div className="skl-crumb">
        <button className="skl-back" type="button" onClick={onBack}>
          技能
        </button>
        <span className="skl-crumb-sep">›</span>
        <span className="skl-crumb-name">{skill.name}</span>
        {skill.description && <span className="skl-crumb-desc">{skill.description}</span>}
        <span className="skl-head-spacer" />
        <button type="button" className="skl-btn-primary" disabled={!dirty || busy} onClick={save}>
          保存
        </button>
        <button
          type="button"
          className={`skl-del-btn${delArmed ? " is-armed" : ""}`}
          disabled={busy}
          onBlur={() => setDelArmed(false)}
          onClick={async () => {
            if (!delArmed) {
              setDelArmed(true);
              return;
            }
            setBusy(true);
            try {
              await deleteSkill(skillId);
              onBack();
            } finally {
              setBusy(false);
            }
          }}
        >
          {delArmed
            ? holders.length
              ? `已挂 ${holders.length} 个 worker,再点确认删除`
              : "再点一次确认删除"
            : "删除"}
        </button>
      </div>

      <div className="skl-body">
        <aside className="skl-sidebar">
          <div className="skl-group-title">
            文件 <span className="skl-count">{paths.length}</span>
          </div>
          {paths.map((p) => {
            const depth = p === SKILL_MD ? 0 : p.split("/").length - 1;
            return (
              <button
                key={p}
                type="button"
                className={`skl-file${selected === p ? " is-active" : ""}`}
                style={{ paddingLeft: 10 + depth * 14 }}
                onClick={() => {
                  setSelected(p);
                  setPreview(false);
                }}
              >
                {p === SKILL_MD ? SKILL_MD : p.split("/").pop()}
                {p !== SKILL_MD && p.includes("/") && (
                  <span className="skl-file-dir">{p.split("/").slice(0, -1).join("/")}</span>
                )}
              </button>
            );
          })}
          {adding ? (
            <div className="skl-add-file">
              <input
                className="skl-input"
                placeholder="路径,如 模板/xx.md"
                value={newPath}
                autoFocus
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPath.trim() && !drafts[newPath.trim()]) {
                    setDrafts({ ...drafts, [newPath.trim()]: "" });
                    setSelected(newPath.trim());
                    setDirty(true);
                    setNewPath("");
                    setAdding(false);
                  } else if (e.key === "Escape") {
                    setAdding(false);
                    setNewPath("");
                  }
                }}
              />
            </div>
          ) : (
            <button type="button" className="skl-add-btn" onClick={() => setAdding(true)}>
              + 新增文件
            </button>
          )}
          {selected !== SKILL_MD && (
            <button
              type="button"
              className="skl-del-file"
              onClick={() => {
                const next = { ...drafts };
                delete next[selected];
                setDrafts(next);
                setSelected(SKILL_MD);
                setDirty(true);
              }}
            >
              删除当前文件
            </button>
          )}
          <div className="skl-group-title" style={{ marginTop: 18 }}>
            挂载 <span className="skl-count">{holders.length}</span>
          </div>
          {holders.length === 0 ? (
            <div className="skl-none" style={{ padding: "2px 10px" }}>
              还没有 worker 挂载此技能
            </div>
          ) : (
            holders.map((a) => (
              <div key={a.id} className="skl-holder">
                <WorkerAvatar name={a.name} size={20} />
                {a.name}
              </div>
            ))
          )}
        </aside>

        <main className="skl-editor">
          <div className="skl-editor-bar">
            <span className="skl-editor-path">{selected}</span>
            {isMd && (
              <button type="button" className="skl-btn-ghost" onClick={() => setPreview((v) => !v)}>
                {preview ? "编辑" : "预览"}
              </button>
            )}
          </div>
          {preview && isMd ? (
            <div className="skl-preview">
              <MarkdownContent content={current} />
            </div>
          ) : (
            <textarea
              className="skl-textarea"
              value={current}
              onChange={(e) => {
                setDrafts({ ...drafts, [selected]: e.target.value });
                setDirty(true);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
