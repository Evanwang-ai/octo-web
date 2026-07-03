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
import { listMatters, listProjects } from "../../api/todoApi";
import type { ProjectItem } from "../../api/todoApi";
import type { Matter } from "../../bridge/types";
import { StatusIcon } from "./icons";
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
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时拉一次数据源(mock 期:一页回路+全部项目,前端过滤;接线后换 search 端点)。
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    let alive = true;
    Promise.all([listMatters(), listProjects()]).then(([m, p]) => {
      if (!alive) return;
      setMatters(m.data || []);
      setProjects(p || []);
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

  if (!open) return null;

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
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.max(0, Math.min(c + 1, items.length - 1)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter" && items[cursor]) {
              e.preventDefault();
              pick(items[cursor]);
            }
          }}
        />
        <div className="cmdk-results">
          {items.length === 0 ? (
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
