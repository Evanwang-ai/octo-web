// L3 | Matter 列表原子图标 — Linear 几何 + 品牌色(--wk-*)。
// 着色用 style={{fill/stroke:var(--wk-*)}}(SVG 属性不解析 CSS var)。
// 端口自 feat/loop vanilla 的 priIconSVG / statusIconSVG(已验证设计),React 化。
import React from "react";

/** 优先级(后端编码 0无/1紧急/2高/3中/4低):1=紧急(琥珀方块+白叹号);高/中/低/无=三柱,亮柱数 on=3/2/1/0(对齐 vanilla priIconSVG)。 */
export function PriorityIcon({ level = 0, size = 16 }: { level?: number; size?: number }) {
  if (level === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="紧急">
        <rect x="1" y="1" width="14" height="14" rx="3.5" style={{ fill: "var(--wk-color-warning)" }} />
        <rect x="7" y="3.6" width="2" height="5.4" rx="1" fill="#fff" />
        <rect x="7" y="10.6" width="2" height="2" rx="1" fill="#fff" />
      </svg>
    );
  }
  // 亮柱数:高(2)→3 / 中(3)→2 / 低(4)→1 / 无(0)→0,前 on 根深、其余浅。
  const on = level === 2 ? 3 : level === 3 ? 2 : level === 4 ? 1 : 0;
  const bars = [
    { x: 1.5, y: 9, h: 5 },
    { x: 6.5, y: 6, h: 8 },
    { x: 11.5, y: 3, h: 11 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label={`优先级 ${level}`}>
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width="3"
          height={b.h}
          rx="1"
          style={{ fill: i < on ? "var(--wk-text-primary)" : "var(--wk-text-disabled)" }}
        />
      ))}
    </svg>
  );
}

/** 状态:Linear 圆形几何 + Matter 7 态 + 品牌色。 */
export function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  const sw = 1.6;
  const ring = (color: string, dash?: string) => (
    <circle cx="8" cy="8" r="6" fill="none" style={{ stroke: `var(${color})` }} strokeWidth={sw} strokeDasharray={dash} />
  );
  switch (status) {
    case "backlog": // 草稿:虚线圈
      return <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="草稿">{ring("--wk-text-tertiary", "2.4 2.2")}</svg>;
    case "open": // 待开始:空心圈
      return <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="待开始">{ring("--wk-text-tertiary")}</svg>;
    case "in_progress": // 进行中:蓝圈 + 半扇形
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="进行中">
          {ring("--wk-color-info")}
          <path d="M8 8 L8 3 A5 5 0 0 1 13 8 Z" style={{ fill: "var(--wk-color-info)" }} />
        </svg>
      );
    case "review": // 待确认:琥珀圈 + 3/4 扇形
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="待确认">
          {ring("--wk-color-warning")}
          <path d="M8 8 L8 3 A5 5 0 1 1 4.46 11.54 Z" style={{ fill: "var(--wk-color-warning)" }} />
        </svg>
      );
    case "done": // 完成:绿实心 + 白勾
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="已完成">
          <circle cx="8" cy="8" r="7" style={{ fill: "var(--wk-color-success)" }} />
          <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "cancelled": // 已取消:灰实心 + 白叉
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="已取消">
          <circle cx="8" cy="8" r="7" style={{ fill: "var(--wk-text-tertiary)" }} />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "blocked": // 受阻:红实心 + 白叹号
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon" aria-label="需要协助">
          <circle cx="8" cy="8" r="7" style={{ fill: "var(--wk-color-error)" }} />
          <rect x="7" y="4" width="2" height="5" rx="1" fill="#fff" />
          <rect x="7" y="10.5" width="2" height="2" rx="1" fill="#fff" />
        </svg>
      );
    default:
      return <svg width={size} height={size} viewBox="0 0 16 16" className="mlv-icon">{ring("--wk-text-tertiary")}</svg>;
  }
}

export const STATUS_ORDER = ["backlog", "open", "in_progress", "review", "done", "cancelled", "blocked"] as const;
// 词表对齐 vanilla ST(index.html L3059-3067):done=已完成、blocked=需要协助(2026-07-03 修词漂)。
export const STATUS_LABEL: Record<string, string> = {
  backlog: "草稿",
  open: "待开始",
  in_progress: "进行中",
  review: "待确认",
  done: "已完成",
  cancelled: "已取消",
  blocked: "需要协助",
};
