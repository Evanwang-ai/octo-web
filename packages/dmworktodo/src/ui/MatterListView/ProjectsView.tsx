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
import { listProjects, createProject, updateProject } from "../../api/todoApi";
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
        <div className="pv-state">还没有项目 · 建一个文件夹,新回路就能归进去</div>
      )}

      {!loading && shown.length > 0 && (
        <div className="pv-list">
          <div className="pv-thead">
            <span className="pv-col-name">名称</span>
            <span className="pv-col-leader">领队</span>
            <span className="pv-col-scope">范围</span>
            <span className="pv-col-date">创建</span>
          </div>
          {shown.map((p) => (
            <div
              key={p.id}
              className={`pv-row${isArchived(p) ? " is-archived" : ""}`}
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
              <span className="pv-col-name pv-name">
                <span className="pv-folder" aria-hidden>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M1.5 4.5A1.5 1.5 0 0 1 3 3h3l1.2 1.4H13A1.5 1.5 0 0 1 14.5 6v5.5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>
                </span>
                <span className="pv-name-text">{p.name}</span>
                {isArchived(p) && <span className="pv-arch-tag">已归档</span>}
              </span>
              <span className="pv-col-leader">
                {p.default_leader_uid ? (
                  <span className="pv-leader">
                    <WKAvatar
                      channel={new Channel(p.default_leader_uid, ChannelTypePerson)}
                      style={{ width: 18, height: 18, borderRadius: "50%" }}
                    />
                    <span className="pv-leader-name">
                      <UserName uid={p.default_leader_uid} />
                    </span>
                    {isBot(p.default_leader_uid) && <span className="pv-ai">AI</span>}
                  </span>
                ) : (
                  <span className="pv-muted">未定</span>
                )}
              </span>
              <span className="pv-col-scope pv-muted">{scopeLabel(p.scope)}</span>
              <span className="pv-col-date pv-muted">{shortDate(p.created_at)}</span>
              <button
                type="button"
                className="pv-arch-btn"
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
          ))}
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
