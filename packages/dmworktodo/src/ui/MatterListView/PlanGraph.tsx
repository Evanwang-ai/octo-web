/**
 * [INPUT]: 依赖 react 的 useLayoutEffect/useRef/useState;../UserName;api/todoApi 的 MatterTreeChild 类型。
 * [OUTPUT]: 默认导出 PlanGraph(几何即语义计划图:领队 root → 子任务节点列 → 汇总 join,
 *          SVG 贝塞尔连线,mode-aware 线性[critic/pipeline]/扇形[split/swarm/roundtable]布局)。
 * [POS]: MatterListView 详情的计划图(P1 子件④),数据来自 getMatterTree nodes + matter mode/leader/status;
 *        真相源 vanilla planGraphHTML/drawPlanEdges。兄弟:MatterDetailView。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import UserName from "../UserName";
import type { MatterTreeChild } from "../../api/todoApi";

// 状态 → 环色语义(对齐 vanilla PG_RING/PG_STATE_TEXT)。
const RING: Record<string, string> = {
  backlog: "todo",
  open: "todo",
  in_progress: "doing",
  review: "review",
  done: "done",
  blocked: "block",
  cancelled: "cancel",
};
const STATE_TEXT: Record<string, string> = {
  backlog: "草稿",
  open: "待开始",
  in_progress: "进行中",
  review: "待确认",
  done: "已完成",
  blocked: "需协助",
  cancelled: "已取消",
};
const ROOT_TITLE: Record<string, (n: number) => string> = {
  critic: (n) => `生成→验证 ${n} 步`,
  pipeline: (n) => `流水线 ${n} 步`,
  split: (n) => `分成 ${n} 块`,
  swarm: (n) => `竞选 ${n} 路`,
  roundtable: (n) => `圆桌 ${n} 方`,
};

const ROOT_ID = "__pg_root";
const JOIN_ID = "__pg_join";

export default function PlanGraph({
  leaderUid,
  mode,
  status,
  nodes,
}: {
  leaderUid?: string;
  mode?: string;
  status: string;
  nodes: MatterTreeChild[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<string[]>([]);
  const isLinear = mode === "pipeline" || mode === "critic";

  // 依赖:线性=链(root→c0→c1→…→join);扇形=root→每 child、每 child→join。
  const childDeps = (i: number): string[] =>
    isLinear ? [i ? nodes[i - 1].id : ROOT_ID] : [ROOT_ID];
  const joinDeps: string[] = isLinear
    ? [nodes.length ? nodes[nodes.length - 1].id : ROOT_ID]
    : nodes.map((c) => c.id);

  // 布局后测量节点位置 → 画贝塞尔连线(几何即语义)。
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const box = wrap.getBoundingClientRect();
    const rectOf = (id: string) => {
      const el = wrap.querySelector<HTMLElement>(`[data-pgid="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
    };
    const paths: string[] = [];
    const link = (from: string, to: string) => {
      const a = rectOf(from);
      const b = rectOf(to);
      if (!a || !b) return;
      const x1 = a.x + a.w;
      const y1 = a.y + a.h / 2;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const mx = (x1 + x2) / 2;
      paths.push(`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
    };
    nodes.forEach((c, i) => childDeps(i).forEach((d) => link(d, c.id)));
    joinDeps.forEach((d) => link(d, JOIN_ID));
    setEdges(paths);
    // 依赖 nodes 引用 + mode + status(状态变→环色变→无需重画线,但布局可能变)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, mode, status]);

  const node = (
    id: string,
    roleTag: string,
    title: string,
    uid: string | undefined,
    ring: string,
    stateText: string,
    extra: string,
  ) => (
    <div className={`pg-node st-${ring} ${extra}`} data-pgid={id}>
      <div className="pg-top">
        <span className={`pg-dot ${ring}`} />
        <span className="pg-role-tag">{roleTag}</span>
      </div>
      <div className="pg-title" title={title}>
        {title}
      </div>
      <div className="pg-asg">
        {uid ? <UserName uid={uid} /> : <span className="pg-noone">没人接</span>}
      </div>
      <div className={`pg-state ${ring}`}>{stateText}</div>
    </div>
  );

  const doneN = nodes.filter((c) => c.status === "done").length;
  const allDone = nodes.length > 0 && doneN === nodes.length;
  const jring = status === "done" ? "done" : allDone ? "review" : "todo";
  const jtext = jring === "done" ? "已完成" : jring === "review" ? "子回路已齐" : "等待中";
  const rootTitle = (ROOT_TITLE[mode || ""] || ((n: number) => `拆成 ${n} 份`))(
    nodes.length,
  );

  const childNodes = nodes.map((c) =>
    node(
      c.id,
      c.step_id || "子任务",
      c.title,
      // Codex#5:assignee 两种形态,user_id 缺则回落 id,避免误显"没人接"。
      c.assignees?.[0]?.user_id ?? c.assignees?.[0]?.id,
      RING[c.status] || "todo",
      STATE_TEXT[c.status] || c.status,
      "pg-child",
    ),
  );

  return (
    <div className="plan-graph" ref={wrapRef}>
      <svg className="pg-edges" aria-hidden="true">
        {edges.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      <div className="pg-cols">
        <div className="pg-col">
          {node(ROOT_ID, "领队", rootTitle, leaderUid, "done", `已 @ ${nodes.length} 路`, "pg-root")}
        </div>
        {isLinear ? (
          childNodes.map((n, i) => (
            <div key={i} className="pg-col">
              {n}
            </div>
          ))
        ) : (
          <div className="pg-col pg-col-fan">{childNodes}</div>
        )}
        <div className="pg-col">
          {node(JOIN_ID, "汇总", "领队汇总", leaderUid, jring, jtext, "pg-join")}
        </div>
      </div>
    </div>
  );
}
