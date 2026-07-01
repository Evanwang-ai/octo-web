/**
 * [INPUT]: 依赖 hooks/useTodoList 的 useMatterList、api/todoApi 的 listProjects/transitionMatter/deleteMatter;
 *          @octo/base 的 WKApp/WKAvatar/ContextMenus;./useMatterActions、./rowMenus、./icons;utils/toast。
 * [OUTPUT]: 默认导出 MatterListView(原生回路列表:list/board 双布局、状态分组、Tab、领队 chip、项目 chip、
 *          新建/多选批量/优先级·状态快改/行右键菜单/实时刷新;看板卡拖拽换列 + 协作者"等 N 人")。
 * [POS]: dmworktodo/ui/MatterListView 的主视图,被 MatterRouteHost 以 view="matters" 挂载;
 *        兄弟:MatterDetailView(详情)、MatterSubNav(左导航)、icons/rowMenus/useMatterActions(原子层)。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WKApp, ContextMenus } from "@octo/base";
import type { ContextMenusContext, ContextMenusData } from "@octo/base";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { useMatterList } from "../../hooks/useTodoList";
import { listProjects, transitionMatter, deleteMatter } from "../../api/todoApi";
import type { Matter, MatterStatus } from "../../bridge/types";
import { Toast } from "../../utils/toast";
import UserName from "../UserName";
import { PriorityIcon, StatusIcon, STATUS_ORDER, STATUS_LABEL } from "./icons";
import { useMatterActions } from "./useMatterActions";
import { priorityMenu, statusMenu, rowContextMenu } from "./rowMenus";
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

// 行/卡片共用的交互回调集合(由 MatterListView 注入)。
interface RowHandlers {
  open: (id: string) => void;
  toggleSelect: (id: string) => void;
  priorityMenu: (e: React.MouseEvent, m: MatterRow) => void;
  statusMenu: (e: React.MouseEvent, m: MatterRow) => void;
  context: (e: React.MouseEvent, m: MatterRow) => void;
  dragEnd: () => void; // 看板拖拽结束清高亮(列表不用)
}

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

// ─────────────────────────── 列表行 ───────────────────────────
function MatterRowItem({
  m,
  project,
  selected,
  on,
}: {
  m: MatterRow;
  project?: string;
  selected: boolean;
  on: RowHandlers;
}) {
  const leader = m.leader_uid;
  return (
    <div
      className={`mlv-row${selected ? " is-selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => on.open(m.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          on.open(m.id);
        }
      }}
      onContextMenu={(e) => on.context(e, m)}
    >
      <label className="mlv-check" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => on.toggleSelect(m.id)}
          aria-label="选择回路"
        />
      </label>
      <button
        type="button"
        className="mlv-cell mlv-icon-btn mlv-pri"
        title="改优先级"
        aria-label="优先级"
        onClick={(e) => on.priorityMenu(e, m)}
      >
        <PriorityIcon level={m.priority ?? 0} size={16} />
      </button>
      <button
        type="button"
        className="mlv-cell mlv-icon-btn mlv-status"
        title="改状态"
        aria-label="状态"
        onClick={(e) => on.statusMenu(e, m)}
      >
        <StatusIcon status={m.status} size={16} />
      </button>
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

// ─────────────────────────── 看板卡片 ───────────────────────────
function BoardCard({
  m,
  project,
  on,
}: {
  m: MatterRow;
  project?: string;
  on: RowHandlers;
}) {
  // 看板显示人对齐 vanilla:领队优先,无则退 assignees[0];others>0 时缀"等 N 人"。
  const displayed = m.leader_uid || m.assignees?.[0]?.user_id;
  const others = displayed
    ? (m.assignees || []).filter((a) => a.user_id !== displayed).length
    : 0;
  return (
    <div
      className="mlv-card"
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/matter-id", m.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={on.dragEnd}
      onClick={() => on.open(m.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          on.open(m.id);
        }
      }}
      onContextMenu={(e) => on.context(e, m)}
    >
      <div className="mlv-card-top">
        <button
          type="button"
          className="mlv-icon-btn"
          title="改优先级"
          aria-label="优先级"
          onClick={(e) => on.priorityMenu(e, m)}
        >
          <PriorityIcon level={m.priority ?? 0} size={14} />
        </button>
        <span className="mlv-card-id">M-{m.seq_no}</span>
        <span className="mlv-flex" />
        <span className="mlv-card-date">{relTime(m.last_activity_at || m.updated_at)}</span>
      </div>
      <div className="mlv-card-title">{m.title || "无标题"}</div>
      <div className="mlv-card-foot">
        {project && <span className="mlv-card-proj">{project}</span>}
        <span className="mlv-flex" />
        {displayed && (
          <span className="mlv-card-leader">
            <WKAvatar
              channel={new Channel(displayed, ChannelTypePerson)}
              style={{ width: 18, height: 18, borderRadius: "50%" }}
            />
            {isBot(displayed) && <span className="mlv-ai">AI</span>}
            {others > 0 && <span className="mlv-card-more">等 {others + 1} 人</span>}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── 主视图 ───────────────────────────
export default function MatterListView({
  onOpenDetail,
}: { onOpenDetail?: (id: string) => void } = {}) {
  const myUid = WKApp.loginInfo.uid ?? "";
  const [tab, setTab] = useState<Tab>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<ContextMenusData[]>([]);
  const ctxRef = useRef<ContextMenusContext | null>(null);
  // 卸载哨兵:守护写操作异步回调里的 setState 触达(批量/单条),防 setState-after-unmount。
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
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

  const { matters, loading, hasMore, loadMore, reload, optimisticUpdate, removeOptimistic } =
    useMatterList({ initialFilters, pageSize: 50 });

  // 单条写操作(优先级/状态/删除)—— 乐观 + 广播 + 回滚,列表与看板复用。
  const actions = useMatterActions({ optimisticUpdate, removeOptimistic, reload }, mountedRef);

  // 实时刷新:任何回路变更/删除/创建 → 静默重载(vanilla 靠手动重导,React 自驱)。
  useEffect(() => {
    const onChange = () => reload();
    WKApp.mittBus.on("wk:matter-updated", onChange);
    WKApp.mittBus.on("wk:matter-deleted", onChange);
    WKApp.mittBus.on("wk:matter-created-from-input", onChange);
    return () => {
      WKApp.mittBus.off("wk:matter-updated", onChange);
      WKApp.mittBus.off("wk:matter-deleted", onChange);
      WKApp.mittBus.off("wk:matter-created-from-input", onChange);
    };
  }, [reload]);

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

  // ── 交互:新建 / 多选 / 快改菜单 / 右键 ──
  const openCreate = () =>
    WKApp.mittBus.emit("wk:open-create-matter-modal", { channelId: "", channelType: 0 });

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ContextMenus 单实例、数据驱动:先喂 menuData,再 show(event)。
  // setMenuData 的 re-render 会在 show 的 rAF 量尺寸前 flush,时序安全。
  const rowHandlers = useMemo<RowHandlers>(
    () => ({
      open: (id) => onOpenDetail?.(id),
      toggleSelect,
      priorityMenu: (e, m) => {
        e.stopPropagation();
        setMenuData(priorityMenu(m.priority, (p) => actions.setPriority(m.id, p)));
        ctxRef.current?.show(e);
      },
      statusMenu: (e, m) => {
        e.stopPropagation();
        setMenuData(statusMenu(m.status, (s) => actions.setStatus(m.id, s)));
        ctxRef.current?.show(e);
      },
      context: (e, m) => {
        setMenuData(
          rowContextMenu(m, {
            onOpen: () => onOpenDetail?.(m.id),
            onPriority: (p) => actions.setPriority(m.id, p),
            onStatus: (s) => actions.setStatus(m.id, s),
            onRemove: () => actions.remove(m.id, m.title),
          }),
        );
        ctxRef.current?.show(e);
      },
      dragEnd: () => setDragOverStatus(null),
    }),
    [actions, toggleSelect, onOpenDetail],
  );

  // 看板拖放:卡片落到某列 → 若状态变了则流转(乐观移动 + 落库,非法 409 由 actions 回滚)。
  const handleCardDrop = (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStatus(null);
    const id = e.dataTransfer.getData("text/matter-id");
    if (!id) return;
    const cur = (matters as MatterRow[]).find((x) => x.id === id);
    if (cur && cur.status !== targetStatus) actions.setStatus(id, targetStatus);
  };

  // ── 批量(无批量端点 → 并发单调,每项自兜底为 true/false,汇总计数) ──
  const batchStatus = (status: string) => {
    const ids = [...selected];
    Promise.all(
      ids.map((id) =>
        transitionMatter(id, status as MatterStatus)
          .then(() => {
            if (mountedRef.current) optimisticUpdate(id, { status: status as MatterStatus });
            return true;
          })
          .catch(() => false),
      ),
    ).then((oks) => {
      if (!mountedRef.current) return;
      const ok = oks.filter(Boolean).length;
      const fail = ids.length - ok;
      setSelected(new Set());
      reload();
      if (fail) Toast.error(`${ok} 项已改,${fail} 项失败`);
      else Toast.success(`${ok} 项已改状态`);
    });
  };
  const batchDelete = () => {
    const ids = [...selected];
    if (!window.confirm(`删除选中的 ${ids.length} 个回路?此操作不可撤销。`)) return;
    Promise.all(
      ids.map((id) =>
        deleteMatter(id)
          .then(() => {
            if (mountedRef.current) removeOptimistic(id);
            return true;
          })
          .catch(() => false),
      ),
    ).then((oks) => {
      if (!mountedRef.current) return;
      const ok = oks.filter(Boolean).length;
      const fail = ids.length - ok;
      setSelected(new Set());
      reload();
      if (fail) Toast.error(`${ok} 项已删,${fail} 项失败`);
      else Toast.success(`已删除 ${ok} 项`);
    });
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all", label: "全部" },
    { id: "created", label: "我发起的" },
    { id: "assigned", label: "我参与的" },
  ];

  return (
    <div className="mlv">
      <div className="mlv-head">
        <h1 className="mlv-h1">全部回路</h1>
        <button className="mlv-new" type="button" onClick={openCreate}>
          <span className="mlv-new-plus">+</span>新建回路
        </button>
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
          <button className="mlv-tbtn" disabled title="M3 Display">
            筛选
          </button>
          <button className="mlv-tbtn" disabled title="M3 Display">
            显示
          </button>
        </div>
      </div>

      {/* 批量条:选中即现,主操作品牌黑。 */}
      {selected.size > 0 && (
        <div className="mlv-batchbar">
          <span className="mlv-batch-count">{selected.size} 项已选</span>
          <select
            className="mlv-batch-sel"
            value=""
            aria-label="批量改状态"
            onChange={(e) => {
              if (e.target.value) batchStatus(e.target.value);
            }}
          >
            <option value="">批量改状态…</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button className="mlv-batch-del" type="button" onClick={batchDelete}>
            删除
          </button>
          <button className="mlv-batch-clear" type="button" onClick={() => setSelected(new Set())}>
            取消选择
          </button>
        </div>
      )}

      {loading && <div className="mlv-state">加载中…</div>}
      {!loading && groups.length === 0 && <div className="mlv-state">暂无回路</div>}

      {!loading && layout === "list" && (
        <div className={`mlv-list${selected.size > 0 ? " has-selection" : ""}`}>
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
                    selected={selected.has(m.id)}
                    on={rowHandlers}
                  />
                ))}
            </div>
          ))}
        </div>
      )}

      {!loading && layout === "board" && (
        <div className="mlv-board">
          {groups.map((g) => (
            <div
              key={g.status}
              className={`mlv-col${dragOverStatus === g.status ? " is-dragover" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverStatus !== g.status) setDragOverStatus(g.status);
              }}
              onDrop={(e) => handleCardDrop(g.status, e)}
            >
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
                    on={rowHandlers}
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

      {/* 单实例右键/快改菜单,数据由 menuData 驱动。 */}
      <ContextMenus onContext={(c) => { ctxRef.current = c; }} menus={menuData} />
    </div>
  );
}

export { MatterListView };
