/**
 * [INPUT]: 依赖 hooks/useTodoList 的 useMatterList、api/todoApi 的 listProjects/transitionMatter/deleteMatter;
 *          @octo/base 的 WKApp/WKAvatar/ContextMenus;./useMatterActions、./rowMenus、./icons;
 *          ./viewSpec(单一视图规格 + 筛选/排序/分组)、./DisplayPanel、./FilterMenu;utils/toast。
 * [OUTPUT]: 默认导出 MatterListView(原生回路列表:ViewSpec 驱动 list/board、分组/排序/筛选/显示属性、Tab、
 *          新建/多选批量/优先级·状态快改/行右键菜单/实时刷新;看板卡拖拽换列(按分组分派)+ 协作者"等 N 人")。
 * [POS]: dmworktodo/ui/MatterListView 的主视图,被 MatterRouteHost 以 view="matters" 挂载;
 *        兄弟:MatterDetailView(详情)、MatterSubNav(左导航)、viewSpec/DisplayPanel/FilterMenu/icons/rowMenus/useMatterActions。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WKApp, ContextMenus } from "@octo/base";
import type { ContextMenusContext, ContextMenusData } from "@octo/base";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { useMatterList } from "../../hooks/useTodoList";
import { listProjects, transitionMatter, deleteMatter } from "../../api/todoApi";
import type { MatterStatus } from "../../bridge/types";
import { Toast } from "../../utils/toast";
import UserName from "../UserName";
import { PriorityIcon, StatusIcon, STATUS_ORDER, STATUS_LABEL } from "./icons";
import { useMatterActions } from "./useMatterActions";
import { priorityMenu, statusMenu, rowContextMenu } from "./rowMenus";
import {
  loadViewSpec,
  saveViewSpec,
  filterMatters,
  sortMatters,
  groupMatters,
  groupStaticLabel,
  activeFilterCount,
} from "./viewSpec";
import type { ViewSpec, GroupBy, MatterRow, DisplayPropKey } from "./viewSpec";
import DisplayPanel from "./DisplayPanel";
import FilterMenu from "./FilterMenu";
import "./index.css";

type Tab = "all" | "created" | "assigned";
type DisplayProps = Record<DisplayPropKey, boolean>;

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

// 分组头内容:按 groupBy 决定图标/标签(status→状态图标、priority→优先级图标、project/leader→名字)。
function GroupHeader({
  groupBy,
  gkey,
  projectMap,
}: {
  groupBy: GroupBy;
  gkey: string;
  projectMap: Record<string, string>;
}) {
  if (groupBy === "status") {
    return (
      <>
        <StatusIcon status={gkey} size={14} />
        <span className="mlv-group-label">{STATUS_LABEL[gkey] || gkey}</span>
      </>
    );
  }
  if (groupBy === "priority") {
    return (
      <>
        <PriorityIcon level={Number(gkey)} size={14} />
        <span className="mlv-group-label">{groupStaticLabel(gkey, "priority")}</span>
      </>
    );
  }
  if (groupBy === "project_id") {
    return (
      <span className="mlv-group-label">
        {gkey === "_none" ? "未指定项目" : projectMap[gkey] || gkey}
      </span>
    );
  }
  if (groupBy === "leader_uid") {
    return (
      <span className="mlv-group-label">
        {gkey === "_none" ? "未指定负责人" : <UserName uid={gkey} />}
      </span>
    );
  }
  return <span className="mlv-group-label">{groupStaticLabel(gkey, groupBy)}</span>;
}

// ─────────────────────────── 列表行 ───────────────────────────
function MatterRowItem({
  m,
  project,
  selected,
  props,
  on,
}: {
  m: MatterRow;
  project?: string;
  selected: boolean;
  props: DisplayProps;
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
      {props.priority !== false && (
        <button
          type="button"
          className="mlv-cell mlv-icon-btn mlv-pri"
          title="改优先级"
          aria-label="优先级"
          onClick={(e) => on.priorityMenu(e, m)}
        >
          <PriorityIcon level={m.priority ?? 0} size={16} />
        </button>
      )}
      {props.status !== false && (
        <button
          type="button"
          className="mlv-cell mlv-icon-btn mlv-status"
          title="改状态"
          aria-label="状态"
          onClick={(e) => on.statusMenu(e, m)}
        >
          <StatusIcon status={m.status} size={16} />
        </button>
      )}
      <span className="mlv-title">{m.title || "无标题"}</span>
      {m.has_children && <span className="mlv-subicon" title="含子任务">⋯</span>}
      <span className="mlv-flex" />
      {props.source !== false && m.source_name && (
        <span className="mlv-src">{m.source_name}</span>
      )}
      {props.project !== false && project && <span className="mlv-proj">{project}</span>}
      {props.id !== false && <span className="mlv-id">M-{m.seq_no}</span>}
      {props.assignee !== false && leader && (
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
      {props.startDate !== false && (
        <span className="mlv-date">{relTime(m.last_activity_at || m.updated_at)}</span>
      )}
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
  // 去重 user_id(防 API 偶发重复 assignee 导致计数虚高)。
  const displayed = m.leader_uid || m.assignees?.[0]?.user_id;
  const others = displayed
    ? new Set(
        (m.assignees || []).filter((a) => a.user_id !== displayed).map((a) => a.user_id),
      ).size
    : 0;
  // 拖拽结束时间戳:守护 Safari/FF 可能在 dragend 后仍触发 onClick(误开详情)。
  const lastDragEndRef = useRef(0);
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
      onDragEnd={() => {
        lastDragEndRef.current = Date.now();
        on.dragEnd();
      }}
      onClick={() => {
        if (Date.now() - lastDragEndRef.current < 200) return; // 刚拖完的点击,忽略
        on.open(m.id);
      }}
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
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<ContextMenusData[]>([]);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const ctxRef = useRef<ContextMenusContext | null>(null);
  // 单一视图规格:分组/排序/筛选/显示属性/看板选项,sessionStorage 持久化。
  const [viewSpec, setViewSpec] = useState<ViewSpec>(loadViewSpec);
  const patchSpec = useCallback((patch: Partial<ViewSpec>) => {
    setViewSpec((s) => {
      const next = { ...s, ...patch };
      saveViewSpec(next);
      return next;
    });
  }, []);
  // 卸载哨兵:守护写操作异步回调里的 setState 触达(批量/单条),防 setState-after-unmount。
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 项目 id→名 映射(行内项目 chip + 筛选候选)。一次拉取,失败静默。
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
  const projectList = useMemo(
    () => Object.entries(projectMap).map(([id, name]) => ({ id, name })),
    [projectMap],
  );

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

  // 拖放读最新 matters(handleCardDrop 若闭包捕获 render 时快照,拖拽中列表刷新会读 stale)。
  const mattersRef = useRef(matters);
  useEffect(() => {
    mattersRef.current = matters;
  }, [matters]);

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

  // ViewSpec 驱动:筛选 → 排序 → 分组(全 client-side,对齐 vanilla)。
  const view = useMemo(
    () =>
      groupMatters(
        sortMatters(
          filterMatters(matters as MatterRow[], viewSpec.filters),
          viewSpec.orderBy,
          viewSpec.orderDir,
        ),
        viewSpec.groupBy,
      ),
    [matters, viewSpec.filters, viewSpec.orderBy, viewSpec.orderDir, viewSpec.groupBy],
  );
  const shownCount = useMemo(() => view.reduce((n, g) => n + g.items.length, 0), [view]);

  // 看板列:按状态分组时补齐全 7 态空列(除非隐藏空列);其它分组仅 present 组。
  const boardColumns = useMemo(() => {
    if (viewSpec.groupBy !== "status") return view;
    const byKey: Record<string, MatterRow[]> = {};
    view.forEach((g) => (byKey[g.key] = g.items));
    const known = STATUS_ORDER.map((s) => ({ key: s as string, items: byKey[s] || [] }));
    const extra = view.filter((g) => !(STATUS_ORDER as readonly string[]).includes(g.key));
    const cols = [...known, ...extra];
    return viewSpec.board.hideEmpty ? cols.filter((c) => c.items.length > 0) : cols;
  }, [view, viewSpec.groupBy, viewSpec.board.hideEmpty]);

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
      dragEnd: () => setDragOverKey(null),
    }),
    [actions, toggleSelect, onOpenDetail],
  );

  // 看板拖放:落到某列 → 按当前分组分派(status→改状态、priority→改优先级;项目/负责人无简单 API 故不动)。
  const handleCardDrop = (targetKey: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverKey(null);
    const id = e.dataTransfer.getData("text/matter-id");
    if (!id) return;
    const cur = (mattersRef.current as MatterRow[]).find((x) => x.id === id);
    if (!cur) return;
    const gb = viewSpec.groupBy;
    if (gb === "status" && cur.status !== targetKey) actions.setStatus(id, targetKey);
    else if (gb === "priority" && String(cur.priority ?? 0) !== targetKey)
      actions.setPriority(id, Number(targetKey));
  };
  const canDrag = viewSpec.groupBy === "status" || viewSpec.groupBy === "priority";

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
  const isBoard = viewSpec.layout === "board";
  const filterCount = activeFilterCount(viewSpec.filters);

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
              className={`mlv-seg-btn${!isBoard ? " is-active" : ""}`}
              onClick={() => patchSpec({ layout: "list" })}
              title="列表"
              aria-label="列表视图"
              aria-pressed={!isBoard}
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
              className={`mlv-seg-btn${isBoard ? " is-active" : ""}`}
              onClick={() => patchSpec({ layout: "board" })}
              title="看板"
              aria-label="看板视图"
              aria-pressed={isBoard}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="2" y="3" width="3.4" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="6.3" y="3" width="3.4" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="10.6" y="3" width="3.4" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
          </div>
          <span className="mlv-count">{shownCount} 个回路</span>
          <span className="mlv-pop-anchor">
            <button
              type="button"
              className={`mlv-tbtn${filterCount > 0 ? " is-active" : ""}`}
              onClick={() => {
                setFilterOpen((o) => !o);
                setDisplayOpen(false);
              }}
            >
              筛选
              {filterCount > 0 && <span className="mlv-tbtn-badge">{filterCount}</span>}
            </button>
            {filterOpen && (
              <FilterMenu
                filters={viewSpec.filters}
                matters={matters as MatterRow[]}
                projects={projectList}
                onChange={(f) => patchSpec({ filters: f })}
                onClose={() => setFilterOpen(false)}
              />
            )}
          </span>
          <span className="mlv-pop-anchor">
            <button
              type="button"
              className="mlv-tbtn"
              onClick={() => {
                setDisplayOpen((o) => !o);
                setFilterOpen(false);
              }}
            >
              显示
            </button>
            {displayOpen && (
              <DisplayPanel
                spec={viewSpec}
                onChange={patchSpec}
                onClose={() => setDisplayOpen(false)}
              />
            )}
          </span>
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
      {!loading && shownCount === 0 && <div className="mlv-state">暂无回路</div>}

      {!loading && !isBoard && shownCount > 0 && (
        <div className={`mlv-list${selected.size > 0 ? " has-selection" : ""}`}>
          {view.map((g) => (
            <div key={g.key} className="mlv-group">
              {viewSpec.groupBy !== "none" && (
                <button
                  className="mlv-group-head"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
                >
                  <span className={`mlv-chev${collapsed[g.key] ? "" : " is-open"}`}>›</span>
                  <GroupHeader groupBy={viewSpec.groupBy} gkey={g.key} projectMap={projectMap} />
                  <span className="mlv-group-count">{g.items.length}</span>
                </button>
              )}
              {!collapsed[g.key] &&
                g.items.map((m) => (
                  <MatterRowItem
                    key={m.id}
                    m={m}
                    project={m.project_id ? projectMap[m.project_id] : undefined}
                    selected={selected.has(m.id)}
                    props={viewSpec.displayProps}
                    on={rowHandlers}
                  />
                ))}
            </div>
          ))}
        </div>
      )}

      {!loading && isBoard && shownCount > 0 && (
        <div className={`mlv-board${viewSpec.board.density === "compact" ? " is-compact" : ""}`}>
          {boardColumns.map((g) => (
            <div
              key={g.key}
              className={`mlv-col${dragOverKey === g.key ? " is-dragover" : ""}`}
              onDragOver={(e) => {
                if (!canDrag) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverKey !== g.key) setDragOverKey(g.key);
              }}
              onDrop={(e) => handleCardDrop(g.key, e)}
            >
              <div className="mlv-col-head">
                <GroupHeader groupBy={viewSpec.groupBy} gkey={g.key} projectMap={projectMap} />
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
