/**
 * [INPUT]: 依赖 react 的 useLayoutEffect/useRef/useState;../UserName;api/todoApi 的 MatterTreeChild 类型。
 * [OUTPUT]: 默认导出 PlanGraph(几何即语义计划图:领队 root → 子任务节点列 → 汇总 join,
 *          SVG 贝塞尔连线,mode-aware 线性[critic/pipeline]/扇形[split/swarm/roundtable]布局);
 *          导出 RoleNode 类型 + roleNodesFromConfig(欠账 §9-⑧,vanilla L7125-7146 直译:
 *          无子任务时从 mode_config 派生角色预告图,spoke=timeline 有该 uid 发言)。
 * [POS]: MatterListView 详情的计划图(P1 子件④),数据来自 getMatterTree nodes + matter mode/leader/status;
 *        roles 变体(role 拓扑)数据=tree.mode_config+timeline。真相源 vanilla planGraphHTML/
 *        drawPlanEdges/roleNodesFromConfig/roleGraphHTML。兄弟:MatterDetailView。
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
  critic: (n) => `生成-验证 · ${n} 步`,
  pipeline: (n) => `流水线 · ${n} 步`,
  split: (n) => `分头干 · ${n} 个子任务`,
  swarm: (n) => `撒网 · ${n} 路`,
  roundtable: (n) => `圆桌 · ${n} 方`,
};

const ROOT_ID = "__pg_root";
const JOIN_ID = "__pg_join";

// ── role 拓扑(欠账 §9-⑧,vanilla roleNodesFromConfig L7125-7146 直译)──
export interface RoleNode {
  id: string;
  role: string; // 位置 tag:生成方/验证方/参与者/步骤名
  uid?: string;
  spoke: boolean; // timeline 里该 uid 是否发过言
}

/** 无子任务时从 mode_config(JSON 字符串)派生角色预告节点;解析失败或空配置返 null。 */
export function roleNodesFromConfig(
  mode: string | undefined,
  configStr: string | undefined,
  timelineUids: string[],
): RoleNode[] | null {
  if (!mode || !configStr) return null;
  let cfg: Record<string, unknown>;
  try {
    cfg = JSON.parse(configStr) as Record<string, unknown>;
  } catch {
    return null;
  }
  const spoken = (uid?: string) => !!uid && timelineUids.includes(uid);
  const nodes: RoleNode[] = [];
  if (mode === "critic") {
    const g = (cfg.generator as string) || "";
    const v = (cfg.verifier as string) || "";
    nodes.push({ id: "gen", role: "生成方", uid: g || undefined, spoke: spoken(g) });
    nodes.push({ id: "ver", role: "验证方", uid: v || undefined, spoke: spoken(v) });
  } else if (mode === "roundtable") {
    ((cfg.participants as string[]) || []).forEach((uid, i) => {
      nodes.push({ id: `p${i}`, role: "参与者", uid, spoke: spoken(uid) });
    });
  } else if (mode === "pipeline") {
    ((cfg.steps as Array<{ id?: string; title?: string; assignee?: string }>) || []).forEach(
      (step, i) => {
        const uid = step.assignee || "";
        nodes.push({
          id: step.id || `s${i}`,
          role: step.title || `步骤 ${i + 1}`,
          uid: uid || undefined,
          spoke: spoken(uid),
        });
      },
    );
  }
  return nodes.length ? nodes : null;
}

export default function PlanGraph({
  leaderUid,
  mode,
  status,
  nodes,
  roles,
}: {
  leaderUid?: string;
  mode?: string;
  status: string;
  nodes: MatterTreeChild[];
  roles?: RoleNode[]; // 提供时渲染 role 预告图(vanilla roleGraphHTML),忽略 nodes
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<string[]>([]);
  const isLinear = mode === "pipeline" || mode === "critic";
  // roles 变体与 children 变体共用布局/连线,只换节点语义。
  const itemIds = roles ? roles.map((r) => r.id) : nodes.map((c) => c.id);

  // 依赖:线性=链(root→c0→c1→…→join);扇形=root→每 child、每 child→join。
  const childDeps = (i: number): string[] =>
    isLinear ? [i ? itemIds[i - 1] : ROOT_ID] : [ROOT_ID];
  const joinDeps: string[] = isLinear
    ? [itemIds.length ? itemIds[itemIds.length - 1] : ROOT_ID]
    : itemIds;

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
    itemIds.forEach((id, i) => childDeps(i).forEach((d) => link(d, id)));
    joinDeps.forEach((d) => link(d, JOIN_ID));
    setEdges(paths);
    // 依赖 nodes/roles 引用 + mode + status(状态变→环色变→无需重画线,但布局可能变)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, roles, mode, status]);

  const node = (
    id: string,
    roleTag: string,
    title: React.ReactNode,
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
      <div className="pg-title" title={typeof title === "string" ? title : undefined}>
        {title}
      </div>
      <div className="pg-asg">
        {uid ? <UserName uid={uid} /> : <span className="pg-noone">待认领</span>}
      </div>
      <div className={`pg-state ${ring}`}>{stateText}</div>
    </div>
  );

  // join/root/子节点语义按变体分派(roles=vanilla roleGraphHTML;children=planGraphHTML)。
  let jring: string;
  let jtext: string;
  let rootTitle: React.ReactNode;
  let rootState: string;
  let childNodes: React.ReactNode[];
  if (roles) {
    const spokeN = roles.filter((r) => r.spoke).length;
    const allSpoke = roles.length > 0 && spokeN === roles.length;
    jring = status === "done" ? "done" : allSpoke ? "review" : "todo";
    jtext = jring === "done" ? "已完成" : jring === "review" ? "可汇总" : "等待中";
    rootTitle = `编排 ${roles.length} 个角色`;
    rootState = "主持中";
    childNodes = roles.map((r) => {
      const ring = status === "done" ? "done" : r.spoke ? "review" : "todo";
      return node(
        r.id,
        r.role,
        r.uid ? <UserName uid={r.uid} /> : "待分配",
        r.uid,
        ring,
        ring === "done" ? "完成" : ring === "review" ? "已发言" : "待发言",
        "pg-child",
      );
    });
  } else {
    const doneN = nodes.filter((c) => c.status === "done").length;
    const allDone = nodes.length > 0 && doneN === nodes.length;
    jring = status === "done" ? "done" : allDone ? "review" : "todo";
    jtext = jring === "done" ? "已完成" : jring === "review" ? "子回路已齐" : "等待中";
    rootTitle = (ROOT_TITLE[mode || ""] || ((n: number) => `拆分 · ${n} 个子任务`))(nodes.length);
    rootState = `已派 ${nodes.length} 个子任务`;
    childNodes = nodes.map((c) =>
      node(
        c.id,
        c.step_id || "子任务",
        c.title,
        // Codex#5:assignee 两种形态,user_id 缺则回落 id,避免误显"待认领"。
        c.assignees?.[0]?.user_id ?? c.assignees?.[0]?.id,
        RING[c.status] || "todo",
        STATE_TEXT[c.status] || c.status,
        "pg-child",
      ),
    );
  }

  return (
    <div className="plan-graph" ref={wrapRef}>
      <svg className="pg-edges" aria-hidden="true">
        {edges.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      <div className="pg-cols">
        <div className="pg-col">
          {node(ROOT_ID, "领队", rootTitle, leaderUid, "done", rootState, "pg-root")}
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
