/**
 * [INPUT]: 依赖 api/todoApi 的 listProjects/createProject/updateProject/ProjectItem;
 *          @octo/base 的 WKAvatar、wukongimjssdk 的 Channel;../UserName;utils/toast。
 * [OUTPUT]: 默认导出 ProjectsView(原生项目列表:名称/领队/范围/创建 + 新建项目 modal + 归档切换 + 点击进详情)。
 * [POS]: dmworktodo/ui/MatterListView 的项目(projects)列表,被 MatterRouteHost 以 view="projects" 挂载(替 iframe 列表);
 *        项目详情(内嵌看板/成员/上下文)暂走 iframe(onOpenDetail);真相源 vanilla renderProjects。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { listProjects, createProject, updateProject, listMatters } from "../../api/todoApi";
import type { ProjectItem } from "../../api/todoApi";
import { Toast } from "../../utils/toast";
import UserName from "../UserName";
import "./projects.css";

const isBot = (uid?: string) => !!uid && uid.endsWith("_bot");
const isArchived = (p: ProjectItem) => p.archived === 1 || p.archived === true;

function scopeLabel(scope?: string): string {
  if (scope === "private") return "私有";
  if (scope === "default") return "系统";
  return "共享";
}
function shortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!d.getTime()) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function ProjectsView({
  onOpenDetail,
}: {
  onOpenDetail?: (id: string) => void;
}) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState("space");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = () => {
    listProjects(true)
      .then((ps) => {
        if (mountedRef.current) setProjects(ps);
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  };
  useEffect(() => {
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(
    () => (showArchived ? projects : projects.filter((p) => !isArchived(p))),
    [projects, showArchived],
  );
  const archivedCount = useMemo(() => projects.filter(isArchived).length, [projects]);
  // S6 卡⑨:进度环数据——一次 listMatters 前端按 project_id 分桶(近似,首页规模;接线换 multica issue_count/done_count)。
  const [progress, setProgress] = useState<Record<string, { total: number; done: number }>>({});
  useEffect(() => {
    let alive = true;
    listMatters()
      .then((resp) => {
        if (!alive) return;
        const map: Record<string, { total: number; done: number }> = {};
        for (const m of resp.data || []) {
          const pid = (m as { project_id?: string }).project_id;
          if (!pid) continue;
          const e = (map[pid] = map[pid] || { total: 0, done: 0 });
          e.total++;
          if ((m.status as string) === "done") e.done++;
        }
        setProgress(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const markPending = (id: string, on: boolean) =>
    setPending((p) => {
      const n = new Set(p);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const toggleArchive = (p: ProjectItem) => {
    if (pending.has(p.id)) return;
    const next = !isArchived(p);
    markPending(p.id, true);
    setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, archived: next } : x)));
    updateProject(p.id, { archived: next })
      .catch(() => {
        if (mountedRef.current) {
          setProjects((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, archived: p.archived } : x)),
          );
          Toast.error("归档失败");
        }
      })
      .finally(() => {
        if (mountedRef.current) markPending(p.id, false);
      });
  };

  const submitNew = () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    createProject({ name, scope: newScope })
      .then(() => {
        if (!mountedRef.current) return;
        setModalOpen(false);
        setNewName("");
        setNewScope("space");
        Toast.success("已创建");
        reload();
      })
      .catch(() => {
        if (mountedRef.current) Toast.error("创建失败");
      })
      .finally(() => {
        if (mountedRef.current) setSaving(false);
      });
  };

  return (
    <div className="pv">
      <div className="pv-head">
        <h1 className="pv-h1">项目</h1>
        <button className="pv-new" type="button" onClick={() => setModalOpen(true)}>
          <span className="pv-new-plus">+</span>新建项目
        </button>
      </div>

      {archivedCount > 0 && (
        <div className="pv-sub">
          <button className="pv-arch-toggle" type="button" onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "收起已归档" : `显示已归档 ${archivedCount}`}
          </button>
        </div>
      )}

      {loading && <div className="pv-state">加载中…</div>}
      {!loading && shown.length === 0 && (
        <div className="pv-state">暂无项目</div>
      )}

      {!loading && shown.length > 0 && (
        <div className="pv-grid">
          {shown.map((p) => {
            const prog = progress[p.id];
            const pct = prog && prog.total > 0 ? prog.done / prog.total : null;
            const R = 15;
            const C = 2 * Math.PI * R;
            return (
              <div
                key={p.id}
                className={`pv-card${isArchived(p) ? " is-archived" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onOpenDetail?.(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenDetail?.(p.id);
                  }
                }}
              >
                <div className="pv-card-top">
                  <span className="pv-folder" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M1.5 4.5A1.5 1.5 0 0 1 3 3h3l1.2 1.4H13A1.5 1.5 0 0 1 14.5 6v5.5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </span>
                  <span className="pv-card-name">{p.name}</span>
                  {isArchived(p) && <span className="pv-arch-tag">已归档</span>}
                  <button
                    type="button"
                    className="pv-arch-btn pv-card-arch"
                    disabled={pending.has(p.id)}
                    title={isArchived(p) ? "取消归档" : "归档"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleArchive(p);
                    }}
                  >
                    {isArchived(p) ? "取消归档" : "归档"}
                  </button>
                </div>
                <div className="pv-card-mid">
                  {/* 进度环(GitHub 语义:done/total) */}
                  <span className="pv-ring" title={prog ? `${prog.done}/${prog.total} 已完成` : "暂无回路"}>
                    <svg width="38" height="38" viewBox="0 0 38 38">
                      <circle cx="19" cy="19" r={R} fill="none" style={{ stroke: "var(--wk-bg-hover)" }} strokeWidth="4" />
                      {pct !== null && (
                        <circle
                          cx="19"
                          cy="19"
                          r={R}
                          fill="none"
                          style={{ stroke: "var(--wk-color-success)" }}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${C * pct} ${C}`}
                          transform="rotate(-90 19 19)"
                        />
                      )}
                    </svg>
                    <span className="pv-ring-n">{prog ? `${prog.done}/${prog.total}` : "—"}</span>
                  </span>
                  <div className="pv-card-lines">
                    <span className="pv-muted">{scopeLabel(p.scope)} · 创建于 {shortDate(p.created_at)}</span>
                    {p.default_leader_uid ? (
                      <span className="pv-leader">
                        <WKAvatar
                          channel={new Channel(p.default_leader_uid, ChannelTypePerson)}
                          style={{ width: 16, height: 16, borderRadius: "50%" }}
                        />
                        <span className="pv-leader-name">
                          <UserName uid={p.default_leader_uid} />
                        </span>
                        {isBot(p.default_leader_uid) && <span className="pv-ai">AI</span>}
                      </span>
                    ) : (
                      <span className="pv-muted">领队未定</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新建项目 modal */}
      {modalOpen && (
        <div className="pv-modal-mask" onClick={() => !saving && setModalOpen(false)}>
          <div className="pv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pv-modal-title">新建项目</div>
            <input
              className="pv-modal-input"
              placeholder="项目名称"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNew();
              }}
            />
            <div className="pv-modal-row">
              <span className="pv-modal-label">范围</span>
              <select
                className="pv-modal-sel"
                value={newScope}
                onChange={(e) => setNewScope(e.target.value)}
              >
                <option value="space">共享(空间内可见)</option>
                <option value="private">私有(仅自己)</option>
              </select>
            </div>
            <div className="pv-modal-actions">
              <button className="pv-modal-cancel" type="button" onClick={() => setModalOpen(false)}>
                取消
              </button>
              <button
                className="pv-modal-save"
                type="button"
                onClick={submitNew}
                disabled={saving || !newName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ProjectsView };
