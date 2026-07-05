/**
 * [INPUT]: api/multica 的 listSkills/createSkill/importSkill/listAgents;./WorkersView 的 WorkerAvatar。
 * [OUTPUT]: 对外默认导出 SkillsView —— 技能列表 + 新建/导入弹窗(⭐Wave A-5 part2)。
 * [POS]: dmworktodo/ui/MatterListView 的技能列表,MatterRouteHost view="skills" 挂载。
 *        结构镜像 multica skills-page(表格:名/挂载/创建者列简化为 名+描述/挂载 worker/更新)
 *        + create-skill-dialog 三模式 chooser(手动/URL 导入="从市集安装"入口/本机扫描=禁用
 *        等设备接线)。挂载列从 agent.skills 内嵌摘要反查(跨域同 id)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import { listSkills, createSkill, importSkill, listAgents } from "../../api/multica/client";
import type { Agent, SkillSummary } from "../../api/multica/types";
import { WorkerAvatar } from "./WorkersView";
import "./skills.css";

function fmtDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "今天" : `${days} 天前`;
}

type Method = "chooser" | "manual" | "url";

export default function SkillsView({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("chooser");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  // S6 卡④:密表(ChatGPT 商店)↔ 卡片(Notion 市集)两视图。
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const reload = () => listSkills().then(setSkills);
  useEffect(() => {
    reload();
    listAgents().then(setAgents);
  }, []);

  // 挂载反查:skill id → 挂它的 worker 列表(agent.skills 内嵌摘要)。
  const usedBy = useMemo(() => {
    const m = new Map<string, Agent[]>();
    for (const a of agents) {
      for (const s of a.skills) {
        const arr = m.get(s.id) || [];
        arr.push(a);
        m.set(s.id, arr);
      }
    }
    return m;
  }, [agents]);

  const close = () => {
    setOpen(false);
    setMethod("chooser");
    setName("");
    setDesc("");
    setUrl("");
  };

  return (
    <div className="skl-root">
      <div className="skl-head">
        <span className="skl-title">技能</span>
        <span className="skl-head-spacer" />
        <button type="button" className="skl-btn-primary" onClick={() => setOpen(true)}>
          + 新建技能
        </button>
      </div>
      <div className="skl-toolbar">
        <span className="skl-head-spacer" />
        <span className="skl-vt-group">
          <button
            type="button"
            className={`skl-vt${viewMode === "table" ? " is-active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            列表
          </button>
          <button
            type="button"
            className={`skl-vt${viewMode === "cards" ? " is-active" : ""}`}
            onClick={() => setViewMode("cards")}
          >
            卡片
          </button>
        </span>
      </div>
      <div className="skl-list">
        {skills === null ? (
          <div className="skl-empty">加载中…</div>
        ) : skills.length === 0 ? (
          <div className="skl-empty">暂无技能</div>
        ) : viewMode === "cards" ? (
          <div className="skl-cards">
            {skills.map((s) => {
              const holders = usedBy.get(s.id) || [];
              return (
                <button key={s.id} type="button" className="skl-card" onClick={() => onOpenDetail(s.id)}>
                  <div className="skl-card-top">
                    <span className="skl-file-ic">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M8 1.8l1.7 3.6 3.9.5-2.9 2.7.75 3.9L8 10.6l-3.45 1.9L5.3 8.6 2.4 5.9l3.9-.5L8 1.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="skl-name">{s.name}</span>
                  </div>
                  <div className="skl-card-desc">{s.description || "(无描述)"}</div>
                  <div className="skl-card-meta">
                    {holders.length === 0 ? (
                      <span className="skl-none">未挂载</span>
                    ) : (
                      <span className="skl-stack">
                        {holders.slice(0, 3).map((a) => (
                          <WorkerAvatar key={a.id} name={a.name} size={18} />
                        ))}
                      </span>
                    )}
                    <span className="skl-card-time">{fmtDays(s.updated_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* 行=Listview 语法:40px 单行、无列头,描述内联,挂载堆/时间右缘聚集。 */
          skills.map((s) => {
            const holders = usedBy.get(s.id) || [];
            return (
              <button key={s.id} type="button" className="skl-row" onClick={() => onOpenDetail(s.id)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="skl-file-ic">
                  <path d="M4 2.5h5L12.5 6v7.5A1 1 0 0 1 11.5 14h-7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M9 2.5V6h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                <span className="skl-name">{s.name}</span>
                {s.description && <span className="skl-desc">{s.description}</span>}
                <span className="skl-used">
                  {holders.length === 0 ? (
                    <span className="skl-none">未挂载</span>
                  ) : (
                    <>
                      <span className="skl-stack">
                        {holders.slice(0, 3).map((a) => (
                          <WorkerAvatar key={a.id} name={a.name} size={18} />
                        ))}
                      </span>
                      {holders.length > 3 && <span className="skl-more-n">+{holders.length - 3}</span>}
                    </>
                  )}
                </span>
                <span className="skl-updated">{fmtDays(s.updated_at)}</span>
              </button>
            );
          })
        )}
      </div>

      {open && (
        <div className="skl-overlay" onMouseDown={close}>
          <div className="skl-modal" role="dialog" aria-label="新建技能" onMouseDown={(e) => e.stopPropagation()}>
            <div className="skl-modal-title">
              {method !== "chooser" && (
                <button type="button" className="skl-back-btn" onClick={() => setMethod("chooser")}>
                  ←
                </button>
              )}
              新建技能
            </div>
            {method === "chooser" && (
              <div className="skl-methods">
                <button type="button" className="skl-method" onClick={() => setMethod("manual")}>
                  <span className="skl-method-name">手动创建</span>
                  <span className="skl-method-desc">从空白 SKILL.md 开始写</span>
                </button>
                <button type="button" className="skl-method" onClick={() => setMethod("url")}>
                  <span className="skl-method-name">从市集安装</span>
                  <span className="skl-method-desc">粘贴 ClawHub / GitHub 链接导入</span>
                </button>
                <button type="button" className="skl-method" disabled title="设备接入上线后开放">
                  <span className="skl-method-name">扫描本机</span>
                  <span className="skl-method-desc">从设备的技能目录批量导入 · 即将开放</span>
                </button>
              </div>
            )}
            {method === "manual" && (
              <>
                <label className="skl-field">
                  <span>名称</span>
                  <input className="skl-input" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="skl-field">
                  <span>描述</span>
                  <input className="skl-input" value={desc} onChange={(e) => setDesc(e.target.value)} />
                </label>
                <div className="skl-modal-foot">
                  <button type="button" className="skl-btn-ghost" onClick={close}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="skl-btn-primary"
                    disabled={!name.trim() || busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const s = await createSkill({ name: name.trim(), description: desc.trim() });
                        close();
                        await reload();
                        onOpenDetail(s.id);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    创建
                  </button>
                </div>
              </>
            )}
            {method === "url" && (
              <>
                <label className="skl-field">
                  <span>链接</span>
                  <input
                    className="skl-input"
                    placeholder="https://clawhub.ai/owner/skill"
                    value={url}
                    autoFocus
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </label>
                <div className="skl-modal-foot">
                  <button type="button" className="skl-btn-ghost" onClick={close}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="skl-btn-primary"
                    disabled={!/^https?:\/\/.+/.test(url.trim()) || busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const s = await importSkill({ url: url.trim() });
                        close();
                        await reload();
                        onOpenDetail(s.id);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    导入
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
