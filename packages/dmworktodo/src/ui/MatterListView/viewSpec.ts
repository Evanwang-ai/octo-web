/**
 * [INPUT]: 依赖 bridge/types 的 Matter;./icons 的 STATUS_ORDER/STATUS_LABEL;./rowMenus 的 PRIORITY_OPTIONS。
 * [OUTPUT]: 对外提供 ViewSpec 类型 + VIEW_SPEC_DEFAULTS、字段注册表(GROUPABLE/ORDERABLE/DISPLAY_PROPS)、
 *          load/saveViewSpec、纯变换 filterMatters/sortMatters/groupMatters + groupStaticLabel、MatterRow 增广类型。
 * [POS]: dmworktodo/ui/MatterListView 的视图规格单一真相,驱动 list/board 的分组·排序·列显·筛选;
 *        被 index.tsx / DisplayPanel / FilterMenu 消费;纯逻辑无 React/DOM。对齐 vanilla feat/loop VIEW_SPEC_DEFAULTS,
 *        剔除 Matter 不存在的幻影字段(deadline/dueDate/labels/milestone)。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Matter } from "../../bridge/types";
import { STATUS_ORDER, STATUS_LABEL } from "./icons";
import { PRIORITY_OPTIONS } from "./rowMenus";

// 真实后端字段比 bridge/types 多(stale),本地增广(单一真相,list/board 共用)。
export type MatterRow = Matter & {
  leader_uid?: string;
  project_id?: string;
  has_children?: boolean;
  last_activity_at?: string;
  mode?: string;
};

export type Layout = "list" | "board";
export type GroupBy = "none" | "status" | "priority" | "project_id" | "leader_uid";
export type OrderBy = "manual" | "created_at" | "updated_at" | "priority" | "title" | "seq_no";
export type OrderDir = "asc" | "desc";
export type DisplayPropKey =
  | "id"
  | "status"
  | "assignee"
  | "priority"
  | "project"
  | "startDate"
  | "source";

export interface MatterFilters {
  statuses: string[]; // 多选状态
  creator: string; // 单选发起人 uid
  project: string; // 单选项目 id
}

export interface ViewSpec {
  layout: Layout;
  groupBy: GroupBy;
  orderBy: OrderBy;
  orderDir: OrderDir;
  displayProps: Record<DisplayPropKey, boolean>;
  board: { density: "comfortable" | "compact"; hideEmpty: boolean };
  filters: MatterFilters;
}

// ── 字段注册表(仅 Matter 真实字段;deadline/labels/milestone 幻影已剔) ──
export const GROUPABLE_FIELDS: { k: GroupBy; label: string }[] = [
  { k: "none", label: "不分组" },
  { k: "status", label: "状态" },
  { k: "priority", label: "优先级" },
  { k: "project_id", label: "项目" },
  { k: "leader_uid", label: "负责人" },
];
export const ORDERABLE_FIELDS: { k: OrderBy; label: string }[] = [
  { k: "manual", label: "手动" },
  { k: "created_at", label: "创建时间" },
  { k: "updated_at", label: "更新时间" },
  { k: "priority", label: "优先级" },
  { k: "title", label: "标题" },
  { k: "seq_no", label: "编号" },
];
export const DISPLAY_PROPS: { k: DisplayPropKey; label: string }[] = [
  { k: "id", label: "编号" },
  { k: "status", label: "状态" },
  { k: "assignee", label: "负责人" },
  { k: "priority", label: "优先级" },
  { k: "project", label: "项目" },
  { k: "startDate", label: "日期" },
  { k: "source", label: "来源" },
];

// 默认规格(对齐 vanilla VIEW_SPEC_DEFAULTS)。
export const VIEW_SPEC_DEFAULTS: ViewSpec = {
  layout: "list",
  groupBy: "status",
  orderBy: "created_at",
  orderDir: "desc",
  displayProps: {
    id: true,
    status: true,
    assignee: true,
    priority: true,
    project: true,
    startDate: true,
    source: false,
  },
  board: { density: "comfortable", hideEmpty: false },
  filters: { statuses: [], creator: "", project: "" },
};

// 独立 sessionStorage key —— 与 vanilla iframe 的 octo-view-v2:* 隔离(同源共享 storage,避免结构互踩)。
const SS_KEY = "mlv.viewspec";

// 校验 filters 类型:损坏/旧 JSON 里 statuses 若非数组,后续 .includes() 会崩 —— 归一化兜底。
function normalizeFilters(f: unknown): MatterFilters {
  const o = (f || {}) as Record<string, unknown>;
  return {
    statuses: Array.isArray(o.statuses)
      ? (o.statuses as unknown[]).filter((s): s is string => typeof s === "string")
      : [],
    creator: typeof o.creator === "string" ? o.creator : "",
    project: typeof o.project === "string" ? o.project : "",
  };
}

export function loadViewSpec(key: string = SS_KEY): ViewSpec {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { ...VIEW_SPEC_DEFAULTS };
    const p = JSON.parse(raw);
    // 深合并默认 + 类型归一化,容忍旧结构/缺字段/损坏值。
    return {
      ...VIEW_SPEC_DEFAULTS,
      ...p,
      displayProps: { ...VIEW_SPEC_DEFAULTS.displayProps, ...(p.displayProps || {}) },
      board: { ...VIEW_SPEC_DEFAULTS.board, ...(p.board || {}) },
      filters: normalizeFilters(p.filters),
    };
  } catch {
    return { ...VIEW_SPEC_DEFAULTS };
  }
}

export function saveViewSpec(spec: ViewSpec, key: string = SS_KEY): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(spec));
  } catch {
    /* storage unavailable */
  }
}

// 内嵌(项目详情)用独立 key,避免主列表 viewSpec(尤其 project filter)泄入(Codex#1)。
export const EMBED_SPEC_KEY = "mlv.viewspec.embed";

// 活跃筛选计数(工具条徽标)。
export function activeFilterCount(f: MatterFilters): number {
  return f.statuses.length + (f.creator ? 1 : 0) + (f.project ? 1 : 0);
}

// ── 纯变换:筛选 → 排序 → 分组(全 client-side,对齐 vanilla) ──

export function filterMatters(matters: MatterRow[], f: MatterFilters): MatterRow[] {
  const statusSet = f.statuses.length ? new Set(f.statuses) : null;
  return matters.filter((m) => {
    if (statusSet && !statusSet.has(m.status)) return false;
    if (f.creator && m.creator_id !== f.creator) return false;
    if (f.project && m.project_id !== f.project) return false;
    return true;
  });
}

const prio = (p?: number) => p ?? 0; // 0..4
const timeOf = (iso?: string) => (iso ? new Date(iso).getTime() || 0 : 0);

export function sortMatters(matters: MatterRow[], orderBy: OrderBy, dir: OrderDir): MatterRow[] {
  if (orderBy === "manual") return matters; // 手动:保持后端/插入序
  const sign = dir === "asc" ? 1 : -1;
  const cmp = (a: MatterRow, b: MatterRow): number => {
    switch (orderBy) {
      case "priority":
        return (prio(a.priority) - prio(b.priority)) * sign;
      case "title":
        return (a.title || "").localeCompare(b.title || "") * sign;
      case "seq_no":
        return ((a.seq_no || 0) - (b.seq_no || 0)) * sign;
      case "updated_at":
        return (timeOf(a.updated_at) - timeOf(b.updated_at)) * sign;
      case "created_at":
      default:
        return (timeOf(a.created_at) - timeOf(b.created_at)) * sign;
    }
  };
  return [...matters].sort(cmp);
}

export interface MatterGroup {
  key: string;
  items: MatterRow[];
}

// 分组键(对齐 vanilla groupKeyForMatter)。
function groupKey(m: MatterRow, field: GroupBy): string {
  switch (field) {
    case "status":
      return m.status || "backlog";
    case "project_id":
      return m.project_id || "_none";
    case "leader_uid":
      return m.leader_uid || "_none";
    case "priority":
      return String(m.priority ?? 0);
    default:
      return "_all";
  }
}

// 分组序:status/priority 有钉死序,未知键追加末尾(绝不静默丢),其余按插入序。
function groupOrder(field: GroupBy, keys: string[]): string[] {
  let fixed: string[] | null = null;
  if (field === "status") fixed = STATUS_ORDER as unknown as string[];
  else if (field === "priority") fixed = ["4", "3", "2", "1", "0"]; // 紧急→无
  if (!fixed) return keys;
  const known = fixed.filter((k) => keys.includes(k));
  const extra = keys.filter((k) => !fixed!.includes(k));
  return [...known, ...extra];
}

export function groupMatters(matters: MatterRow[], field: GroupBy): MatterGroup[] {
  if (field === "none") return [{ key: "_all", items: matters }];
  const bucket: Record<string, MatterRow[]> = {};
  matters.forEach((m) => {
    (bucket[groupKey(m, field)] ||= []).push(m);
  });
  return groupOrder(field, Object.keys(bucket)).map((key) => ({ key, items: bucket[key] }));
}

// 静态分组标签(status/priority);project/leader 的键需调用方用 projectMap/UserName 解析。
const PRIORITY_LABEL: Record<string, string> = Object.fromEntries(
  PRIORITY_OPTIONS.map((o) => [String(o.value), o.label]),
);
export function groupStaticLabel(key: string, field: GroupBy): string {
  if (field === "status") return STATUS_LABEL[key] || key;
  if (field === "priority") return PRIORITY_LABEL[key] || key;
  if (key === "_none") return "未指定";
  if (key === "_all") return "全部";
  return key; // project_id / leader_uid 由调用方替换
}
