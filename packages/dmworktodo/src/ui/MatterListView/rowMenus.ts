/**
 * [INPUT]: 依赖 @octo/base 的 ContextMenusData(类型);./icons 的 STATUS_ORDER/STATUS_LABEL。
 * [OUTPUT]: 对外提供 PRIORITY_OPTIONS / priorityMenu / statusMenu / rowContextMenu —— ContextMenus 菜单数据构建器。
 * [POS]: dmworktodo/ui/MatterListView 的行菜单数据层,被 index.tsx 的优先级·状态快改与行右键消费;
 *        纯数据构建(无 DOM/副作用),落库由调用方注入的 onPick/on* 闭包完成。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ContextMenusData } from "@octo/base";
import { STATUS_ORDER, STATUS_LABEL } from "./icons";

// ── 优先级选项(值→名),后端编码 0无/1紧急/2高/3中/4低(matter.go),序同 vanilla:无/紧急/高/中/低 ──
export const PRIORITY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "无优先级" },
  { value: 1, label: "紧急" },
  { value: 2, label: "高" },
  { value: 3, label: "中" },
  { value: 4, label: "低" },
];

// 优先级快改(点优先级图标):顶层即 5 选项,✓ 标当前。
export function priorityMenu(
  current: number | undefined,
  onPick: (p: number) => void,
): ContextMenusData[] {
  return PRIORITY_OPTIONS.map((o) => ({
    title: o.label,
    checked: (current ?? 0) === o.value,
    onClick: () => onPick(o.value),
  }));
}

// 状态快改(点状态图标):顶层即七态,✓ 标当前。
export function statusMenu(
  current: string,
  onPick: (s: string) => void,
): ContextMenusData[] {
  return STATUS_ORDER.map((s) => ({
    title: STATUS_LABEL[s] || s,
    checked: current === s,
    onClick: () => onPick(s),
  }));
}

// 行右键上下文菜单:打开 / 优先级› / 状态› / — / 删除。绑定由调用方注入。
export function rowContextMenu(
  row: { priority?: number; status: string },
  h: {
    onOpen: () => void;
    onPriority: (p: number) => void;
    onStatus: (s: string) => void;
    onRemove: () => void;
  },
): ContextMenusData[] {
  return [
    { title: "打开", onClick: h.onOpen },
    { title: "优先级", children: priorityMenu(row.priority, h.onPriority) },
    { title: "状态", children: statusMenu(row.status, h.onStatus) },
    { title: "", separator: true },
    { title: "删除回路", danger: true, onClick: h.onRemove },
  ];
}
