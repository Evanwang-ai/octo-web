// L3 | MatterListView — 原生 React 回路列表(目标① S1 还原)。
// 数据复用 useMatterList + todoApi;UI 用 dmworkbase 原子 + --wk-* 砌 S1 设计。
// 增量1:状态分组 + 密集行(优先级/状态/标题/M-id/领队/日期)+ Tab。
// 待续(增量2+):项目名 chip、详情导航、Display/筛选面板、批量、看板。
import React, { useEffect, useMemo, useState } from "react";
import { WKApp } from "@octo/base";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { useMatterList } from "../../hooks/useTodoList";
import { listProjects } from "../../api/todoApi";
import type { Matter } from "../../bridge/types";
import UserName from "../UserName";
import { PriorityIcon, StatusIcon, STATUS_ORDER, STATUS_LABEL } from "./icons";
import "./index.css";

// 真实后端字段比 bridge/types 多(stale),本地增广。
type MatterRow = Matter & {
  leader_uid?: string;
  project_id?: string;
  has_children?: boolean;
  last_activity_at?: string;
  mode?: string;
};

type Tab = "all" | "created" | "assigned";

function relTime(iso?: string): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (!ts) return "";
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

const isBot = (uid?: string) => !!uid && uid.endsWith("_bot");

function MatterRowItem({
  m,
  project,
  onOpen,
}: {
  m: MatterRow;
  project?: string;
  onOpen?: (id: string) => void;
}) {
  const leader = m.leader_uid;
  return (
    <div
      className="mlv-row"
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(m.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(m.id);
        }
      }}
    >
      <span className="mlv-cell mlv-pri">
        <PriorityIcon level={m.priority ?? 0} size={16} />
      </span>
      <span className="mlv-cell mlv-status">
        <StatusIcon status={m.status} size={16} />
      </span>
      <span className="mlv-title">{m.title || "无标题"}</span>
      {m.has_children && <span className="mlv-subicon" title="含子任务">⋯</span>}
      <span className="mlv-flex" />
      {project && <span className="mlv-proj">{project}</span>}
      <span className="mlv-id">M-{m.seq_no}</span>
      {leader && (
        <span className="mlv-leader">
          <WKAvatar
            channel={new Channel(leader, ChannelTypePerson)}
            style={{ width: 18, height: 18, borderRadius: "50%" }}
          />
          <span className="mlv-leader-name">
            <UserName uid={leader} />
          </span>
          {isBot(leader) && <span className="mlv-ai">AI</span>}
        </span>
      )}
      <span className="mlv-date">{relTime(m.last_activity_at || m.updated_at)}</span>
    </div>
  );
}

function BoardCard({
  m,
  project,
  onOpen,
}: {
  m: MatterRow;
  project?: string;
  onOpen?: (id: string) => void;
}) {
  const leader = m.leader_uid;
  return (
    <div
      className="mlv-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(m.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(m.id);
        }
      }}
    >
      <div className="mlv-card-top">
        <PriorityIcon level={m.priority ?? 0} size={14} />
        <span className="mlv-card-id">M-{m.seq_no}</span>
        <span className="mlv-flex" />
        <span className="mlv-card-date">{relTime(m.last_activity_at || m.updated_at)}</span>
      </div>
      <div className="mlv-card-title">{m.title || "无标题"}</div>
      <div className="mlv-card-foot">
        {project && <span className="mlv-card-proj">{project}</span>}
        <span className="mlv-flex" />
        {leader && (
          <span className="mlv-card-leader">
            <WKAvatar
              channel={new Channel(leader, ChannelTypePerson)}
              style={{ width: 18, height: 18, borderRadius: "50%" }}
            />
            {isBot(leader) && <span className="mlv-ai">AI</span>}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MatterListView({
  onOpenDetail,
}: { onOpenDetail?: (id: string) => void } = {}) {
  const myUid = WKApp.loginInfo.uid ?? "";
  const [tab, setTab] = useState<Tab>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [layout, setLayout] = useState<"list" | "board">(() => {
    try {
      return sessionStorage.getItem("mlv.layout") === "board" ? "board" : "list";
    } catch {
      return "list";
    }
  });

  // 项目 id→名 映射(行内项目 chip)。一次拉取,失败静默。
  useEffect(() => {
    let alive = true;
    listProjects()
      .then((ps) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        ps.forEach((p) => (map[p.id] = p.name));
        setProjectMap(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 持久化 list/board 偏好(切走再回保留)。
  useEffect(() => {
    try {
      sessionStorage.setItem("mlv.layout", layout);
    } catch {
      /* storage unavailable */
    }
  }, [layout]);

  const initialFilters = useMemo(
    () =>
      tab === "created"
        ? { creator_id: myUid }
        : tab === "assigned"
          ? { assignee_id: myUid }
          : {},
    [tab, myUid],
  );

  const { matters, loading, hasMore, loadMore } = useMatterList({
    initialFilters,
    pageSize: 50,
  });

  const groups = useMemo(() => {
    const bucket: Record<string, MatterRow[]> = {};
    (matters as MatterRow[]).forEach((m) => {
      (bucket[m.status] ||= []).push(m);
    });
    const order = STATUS_ORDER as readonly string[];
    const known = order
      .filter((s) => bucket[s]?.length)
      .map((s) => ({ status: s, label: STATUS_LABEL[s] || s, items: bucket[s] }));
    // 兜底:任何不在 STATUS_ORDER 的状态(stale 的 archived / 后端新增)追加末尾,绝不静默丢弃。
    const extra = Object.keys(bucket)
      .filter((s) => !order.includes(s))
      .map((s) => ({ status: s, label: STATUS_LABEL[s] || s, items: bucket[s] }));
    return [...known, ...extra];
  }, [matters]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all", label: "全部" },
    { id: "created", label: "我发起的" },
    { id: "assigned", label: "我参与的" },
  ];

  return (
    <div className="mlv">
      <div className="mlv-head">
        <h1 className="mlv-h1">全部回路</h1>
      </div>

      <div className="mlv-toolbar">
        <div className="mlv-tabs">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              className={`mlv-tab${tab === tb.id ? " is-active" : ""}`}
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <div className="mlv-tools">
          <div className="mlv-seg" role="group" aria-label="视图切换">
            <button
              type="button"
              className={`mlv-seg-btn${layout === "list" ? " is-active" : ""}`}
              onClick={() => setLayout("list")}
              title="列表"
              aria-label="列表视图"
              aria-pressed={layout === "list"}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M5.5 4h7M5.5 8h7M5.5 12h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="3" cy="4" r="1" fill="currentColor" />
                <circle cx="3" cy="8" r="1" fill="currentColor" />
                <circle cx="3" cy="12" r="1" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              className={`mlv-seg-btn${layout === "board" ? " is-active" : ""}`}
              onClick={() => setLayout("board")}
              title="看板"
              aria-label="看板视图"
              aria-pressed={layout === "board"}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="2" y="3" width="3.4" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="6.3" y="3" width="3.4" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="10.6" y="3" width="3.4" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
          </div>
          <span className="mlv-count">{matters.length} 个回路</span>
          <button className="mlv-tbtn" disabled title="增量2 接入">
            筛选
          </button>
          <button className="mlv-tbtn" disabled title="S3 Display">
            显示
          </button>
        </div>
      </div>

      {loading && <div className="mlv-state">加载中…</div>}
      {!loading && groups.length === 0 && <div className="mlv-state">暂无回路</div>}

      {!loading && layout === "list" && (
        <div className="mlv-list">
          {groups.map((g) => (
            <div key={g.status} className="mlv-group">
              <button
                className="mlv-group-head"
                onClick={() => setCollapsed((c) => ({ ...c, [g.status]: !c[g.status] }))}
              >
                <span className={`mlv-chev${collapsed[g.status] ? "" : " is-open"}`}>›</span>
                <StatusIcon status={g.status} size={14} />
                <span className="mlv-group-label">{g.label}</span>
                <span className="mlv-group-count">{g.items.length}</span>
              </button>
              {!collapsed[g.status] &&
                g.items.map((m) => (
                  <MatterRowItem
                    key={m.id}
                    m={m}
                    project={m.project_id ? projectMap[m.project_id] : undefined}
                    onOpen={onOpenDetail}
                  />
                ))}
            </div>
          ))}
        </div>
      )}

      {!loading && layout === "board" && (
        <div className="mlv-board">
          {groups.map((g) => (
            <div key={g.status} className="mlv-col">
              <div className="mlv-col-head">
                <StatusIcon status={g.status} size={14} />
                <span className="mlv-col-label">{g.label}</span>
                <span className="mlv-col-count">{g.items.length}</span>
              </div>
              <div className="mlv-col-cards">
                {g.items.map((m) => (
                  <BoardCard
                    key={m.id}
                    m={m}
                    project={m.project_id ? projectMap[m.project_id] : undefined}
                    onOpen={onOpenDetail}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="mlv-footer">
          <button className="mlv-more" onClick={loadMore}>
            加载更多
          </button>
        </div>
      )}
    </div>
  );
}

export { MatterListView };
