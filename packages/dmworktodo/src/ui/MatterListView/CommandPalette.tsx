/**
 * [INPUT]: ../../api/todoApi 的 listMatters/listProjects(真实数据);./icons 的 StatusIcon。
 * [OUTPUT]: 对外默认导出 CommandPalette —— loop 板块 ⌘K 命令面板(Wave A-4 之一)。
 * [POS]: dmworktodo/ui/MatterListView 的命令面板,MatterRouteHost 挂载(active 时 ⌘K/Ctrl+K 唤起)。
 *        视觉参照 Linear ⌘K(Figma Linear-2 welcome 面,居中面板/输入行/分组结果);
 *        契约对齐 multica §1.3(searchIssues/searchProjects)——mock 期用 listMatters/listProjects
 *        前端过滤(真数据),接线后换 multica search 端点(带 AbortSignal),组件不动。
 *        键盘:↑↓ 选择 / Enter 打开 / Esc 关;结果分组:回路 / 项目。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { WKApp } from "@octo/base";
import { listMatters, listProjects, createMatter } from "../../api/todoApi";
import type { ProjectItem } from "../../api/todoApi";
import type { Matter } from "../../bridge/types";
import { listAgents } from "../../api/multica/client";
import type { Agent } from "../../api/multica/types";
import { StatusIcon } from "./icons";
import { WorkerAvatar } from "./WorkersView";
import "./cmdk.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenMatter: (id: string) => void;
  onOpenProject: (id: string) => void;
}

type Item =
  | { kind: "matter"; matter: Matter }
  | { kind: "project"; project: ProjectItem };

export default function CommandPalette({ open, onClose, onOpenMatter, onOpenProject }: Props) {
  const [query, setQuery] = useState("");
  const [matters, setMatters] = useState<Matter[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cursor, setCursor] = useState(0);
  // 快速创建第二段:选执行 worker(契约 §1.4 quick-create=创建即派 Run;三件套之 preview-trigger 在此预告)。
  const [dispatching, setDispatching] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时拉一次数据源(mock 期:一页回路+全部项目,前端过滤;接线后换 search 端点)。
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    setDispatching(false);
    let alive = true;
    Promise.all([listMatters(), listProjects(), listAgents()]).then(([m, p, a]) => {
      if (!alive) return;
      setMatters(m.data || []);
      setProjects(p || []);
      setAgents(a);
    });
    // 弹开即聚焦
    window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      alive = false;
    };
  }, [open]);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hitM = (m: Matter) =>
      !q || m.title.toLowerCase().includes(q) || `m-${m.seq_no}`.includes(q);
    const hitP = (p: ProjectItem) => !q || p.name.toLowerCase().includes(q);
    return [
      ...matters.filter(hitM).slice(0, 6).map((matter) => ({ kind: "matter", matter }) as Item),
      ...projects.filter(hitP).slice(0, 4).map((project) => ({ kind: "project", project }) as Item),
    ];
  }, [query, matters, projects]);

  // query 变化归零;数据源返回后 items 变短也把 cursor 收回界内(空结果=0,防 -1/越界)。
  useEffect(() => setCursor(0), [query]);
  useEffect(() => {
    setCursor((c) => Math.max(0, Math.min(c, items.length - 1)));
  }, [items.length]);

  const pick = (it: Item) => {
    onClose();
    if (it.kind === "matter") onOpenMatter(it.matter.id);
    else onOpenProject(it.project.id);
  };

  const activeAgents = useMemo(() => agents.filter((a) => !a.archived_at), [agents]);

  // 快速创建:worker=null 先存草稿(backlog);选 worker 则发送(open)+ 派发预告(mock 期指派接线后生效)。
  const quickCreate = async (worker: Agent | null) => {
    const title = query.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const detail = await createMatter({ title, status: worker ? "open" : "backlog" });
      // 列表实时刷新走既有 wk:matter-updated 通道(列表 onChange 监听的就是它)。
      WKApp.mittBus.emit("wk:matter-updated", { matterId: detail.id });
      onClose();
      onOpenMatter(detail.id);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const canQuick = !!query.trim();
  const firstProjectIdx = items.findIndex((it) => it.kind === "project");

  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div
        className="cmdk-panel"
        role="dialog"
        aria-label="命令面板"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="搜索回路或项目…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // 派单段:↑↓/Enter 作用于派单选项(0=草稿,1..N=worker);Esc 先退回搜索段。
            const max = dispatching ? activeAgents.length : items.length - 1;
            if (e.key === "Escape") {
              e.preventDefault();
              if (dispatching) setDispatching(false);
              else onClose();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.max(0, Math.min(c + 1, max)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (dispatching) {
                if (cursor === 0) quickCreate(null);
                else if (activeAgents[cursor - 1]) quickCreate(activeAgents[cursor - 1]);
              } else if (items[cursor]) {
                pick(items[cursor]);
              } else if (canQuick) {
                setDispatching(true);
                setCursor(0);
              }
            }
          }}
        />
        <div className="cmdk-results">
          {dispatching ? (
            <>
              <div className="cmdk-group">指派给谁?</div>
              <button
                type="button"
                className={`cmdk-item${cursor === 0 ? " is-active" : ""}`}
                disabled={busy}
                onMouseEnter={() => setCursor(0)}
                onClick={() => quickCreate(null)}
              >
                <StatusIcon status="backlog" size={14} />
                <span className="cmdk-item-title">保存为草稿</span>
                <span className="cmdk-item-meta">草稿 · 发送后开始执行</span>
              </button>
              {activeAgents.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  className={`cmdk-item${cursor === i + 1 ? " is-active" : ""}`}
                  disabled={busy}
                  onMouseEnter={() => setCursor(i + 1)}
                  onClick={() => quickCreate(a)}
                >
                  <WorkerAvatar name={a.name} size={18} />
                  <span className="cmdk-item-title">{a.name}</span>
                  <span className="cmdk-item-meta">发送并开始执行</span>
                </button>
              ))}
            </>
          ) : items.length === 0 && !canQuick ? (
            <div className="cmdk-empty">没有匹配的结果</div>
          ) : (
            items.map((it, i) => (
              <React.Fragment key={it.kind === "matter" ? `m-${it.matter.id}` : `p-${it.project.id}`}>
                {i === 0 && it.kind === "matter" && <div className="cmdk-group">回路</div>}
                {i === firstProjectIdx && <div className="cmdk-group">项目</div>}
                <button
                  type="button"
                  className={`cmdk-item${i === cursor ? " is-active" : ""}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => pick(it)}
                >
                  {it.kind === "matter" ? (
                    <>
                      <StatusIcon status={it.matter.status as string} size={14} />
                      <span className="cmdk-item-title">{it.matter.title}</span>
                      <span className="cmdk-item-meta">M-{it.matter.seq_no}</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path
                          d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.1c.4 0 .77.16 1.06.44L7.5 4.5h5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                      <span className="cmdk-item-title">{it.project.name}</span>
                      <span className="cmdk-item-meta">项目</span>
                    </>
                  )}
                </button>
              </React.Fragment>
            ))
          )}
          {!dispatching && canQuick && (
            <>
              <div className="cmdk-group">动作</div>
              <button
                type="button"
                className="cmdk-item is-action"
                onClick={() => {
                  setDispatching(true);
                  setCursor(0);
                }}
              >
                <span className="cmdk-plus">+</span>
                <span className="cmdk-item-title">快速创建:「{query.trim()}」</span>
                <span className="cmdk-item-meta">选择执行 worker →</span>
              </button>
            </>
          )}
        </div>
        <div className="cmdk-foot">
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
