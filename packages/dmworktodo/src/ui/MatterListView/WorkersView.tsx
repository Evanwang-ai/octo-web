/**
 * [INPUT]: api/multica 的 client(listAgents/listRuntimes/getAgentTaskSnapshot/
 *          getWorkspaceAgentRunCounts/getWorkspaceAgentActivity30d + presence/activity 派生);
 *          ../UserName;@octo/base 的 WKApp/WKAvatar。
 * [OUTPUT]: 对外默认导出 WorkersView —— worker 列表(loop 板块内,⭐Wave A-2)。
 * [POS]: dmworktodo/ui/MatterListView 的 worker 列表视图,MatterRouteHost view="workers" 挂载。
 *        结构镜像 multica views/agents/agents-page(scope 三档/双行 64px 行/presence 双维/
 *        RUNS 列/最近活跃派生);统计三端点一次拉取 + 前端 Map 派生,无 N+1。
 *        新建入口待建虾流(runtime/模型轮询)接线后开放,V1 按钮禁用诚实标注。
 *        词表:agent→worker(产品词)、runtime→设备。数据走 mock(api/multica 换源点)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import { WKApp } from "@octo/base";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import {
  listAgents,
  listRuntimes,
  getAgentTaskSnapshot,
  getWorkspaceAgentRunCounts,
  getWorkspaceAgentActivity30d,
  deriveAgentPresence,
  deriveActivityBuckets,
} from "../../api/multica/client";
import type {
  Agent,
  AgentActivityBucket,
  AgentPresenceDetail,
  AgentTask,
  RuntimeSummary,
} from "../../api/multica/types";
import UserName from "../UserName";
import WorkerHoverArea from "./WorkerHoverCard";
import "./workers.css";

type Scope = "mine" | "all" | "archived";

// availability → 点色/文案(镜像 multica views/agents/presence.ts,色映射 --wk-*)。
const AVAIL_CONF: Record<AgentPresenceDetail["availability"], { label: string; cls: string }> = {
  online: { label: "在线", cls: "is-online" },
  unstable: { label: "不稳定", cls: "is-unstable" },
  offline: { label: "离线", cls: "is-offline" },
  archived: { label: "已归档", cls: "is-archived" },
};

// worker 合成头像:首字圆,色相由名字 hash(worker 是 multica 实体,octo 侧无真实 uid)。
export function WorkerAvatar({ name, size, dot }: { name: string; size: number; dot?: string }) {
  const hue = useMemo(() => {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  }, [name]);
  return (
    <span className="wkr-avatar" style={{ width: size, height: size }}>
      <span
        className="wkr-avatar-face"
        style={{ background: `hsl(${hue} 45% 88%)`, color: `hsl(${hue} 55% 32%)`, fontSize: size * 0.42 }}
      >
        {name.slice(0, 1)}
      </span>
      {dot && <span className={`wkr-avatar-dot ${dot}`} />}
    </span>
  );
}

// 最近活跃天数:30 桶里最近的非零桶;null=30 天内无活动。
function lastActiveDays(buckets: { total: number }[]): number | null {
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].total > 0) return buckets.length - 1 - i;
  }
  return null;
}

function lastActiveLabel(days: number | null): string {
  if (days === null) return "30 天内无活动";
  if (days === 0) return "今天";
  return `${days} 天前`;
}

interface Row {
  agent: Agent;
  presence: AgentPresenceDetail;
  runtime?: RuntimeSummary;
  runCount: number;
  lastActive: number | null;
}

export default function WorkersView({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [runtimes, setRuntimes] = useState<RuntimeSummary[]>([]);
  const [snapshot, setSnapshot] = useState<AgentTask[]>([]);
  const [runCounts, setRunCounts] = useState<Map<string, number>>(new Map());
  const [activity, setActivity] = useState<AgentActivityBucket[]>([]);
  const [scope, setScope] = useState<Scope>("mine");
  const myUid = WKApp.loginInfo.uid ?? "";

  useEffect(() => {
    let alive = true;
    Promise.all([
      listAgents({ include_archived: true }),
      listRuntimes(),
      getAgentTaskSnapshot(),
      getWorkspaceAgentRunCounts(),
      getWorkspaceAgentActivity30d(),
    ]).then(([ags, rts, snap, counts, act]) => {
      if (!alive) return;
      setAgents(ags);
      setRuntimes(rts);
      setSnapshot(snap);
      setRunCounts(new Map(counts.map((c) => [c.agent_id, c.run_count])));
      setActivity(act);
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows: Row[] = useMemo(() => {
    if (!agents) return [];
    return agents.map((agent) => {
      const runtime = runtimes.find((r) => r.id === agent.runtime_id);
      return {
        agent,
        runtime,
        presence: deriveAgentPresence(agent, runtime, snapshot),
        runCount: runCounts.get(agent.id) ?? 0,
        lastActive: lastActiveDays(deriveActivityBuckets(activity, agent.id)),
      };
    });
  }, [agents, runtimes, snapshot, runCounts, activity]);

  const scoped = useMemo(() => {
    const live = rows.filter((r) => !r.agent.archived_at);
    const pool =
      scope === "archived"
        ? rows.filter((r) => !!r.agent.archived_at)
        : scope === "mine"
          ? live.filter((r) => r.agent.owner_id === myUid)
          : live;
    // 默认排序=最近活跃(multica 默认),无活动的沉底,再按名字稳序。
    return [...pool].sort((a, b) => {
      const av = a.lastActive === null ? 99 : a.lastActive;
      const bv = b.lastActive === null ? 99 : b.lastActive;
      if (av !== bv) return av - bv;
      return a.agent.name.localeCompare(b.agent.name, "zh");
    });
  }, [rows, scope, myUid]);

  const counts = useMemo(() => {
    const live = rows.filter((r) => !r.agent.archived_at);
    return {
      mine: live.filter((r) => r.agent.owner_id === myUid).length,
      all: live.length,
      archived: rows.length - live.length,
    };
  }, [rows, myUid]);

  const SCOPES: Array<{ key: Scope; label: string; count: number }> = [
    { key: "mine", label: "我的", count: counts.mine },
    { key: "all", label: "全部", count: counts.all },
    { key: "archived", label: "已归档", count: counts.archived },
  ];

  return (
    <div className="wkr-root">
      <div className="wkr-head">
        <span className="wkr-title">worker</span>
        {agents && <span className="wkr-count">{counts.all}</span>}
        <span className="wkr-head-hint">能领取回路、留下评论、推进状态的 AI 队友</span>
        <span className="wkr-head-spacer" />
        <button
          type="button"
          className="wkr-new-btn"
          disabled
          title="建虾流随设备/模型选择器接线后开放(D1)"
        >
          + 新建 worker
        </button>
      </div>
      <div className="wkr-toolbar">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`wkr-scope${scope === s.key ? " is-active" : ""}`}
            onClick={() => setScope(s.key)}
          >
            {s.label}
            <span className="wkr-scope-n">{s.count}</span>
          </button>
        ))}
      </div>
      <div className="wkr-table-head">
        <span>worker</span>
        <span>状态</span>
        <span>所有者</span>
        <span>设备</span>
        <span>最近活跃</span>
        <span className="wkr-th-runs">运行次数</span>
      </div>
      <div className="wkr-list">
        {agents === null ? (
          <div className="wkr-skel" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="wkr-skel-row">
                <span className="wkr-skel-avatar" />
                <span className="wkr-skel-bar" style={{ width: `${60 - i * 5}%` }} />
              </div>
            ))}
          </div>
        ) : scoped.length === 0 ? (
          <div className="wkr-empty">
            <WorkerAvatar name="虾" size={36} />
            <span>{scope === "archived" ? "没有已归档的 worker" : "还没有 worker"}</span>
          </div>
        ) : (
          scoped.map((r) => {
            const conf = AVAIL_CONF[r.presence.availability];
            const busy = r.presence.runningCount + r.presence.queuedCount;
            return (
              <button
                key={r.agent.id}
                type="button"
                className="wkr-row"
                onClick={() => onOpenDetail(r.agent.id)}
              >
                <span className="wkr-cell-name">
                  <WorkerHoverArea agentId={r.agent.id}>
                    <WorkerAvatar name={r.agent.name} size={32} dot={conf.cls} />
                  </WorkerHoverArea>
                  <span className="wkr-name-lines">
                    <span className="wkr-name-top">
                      <span className="wkr-name">{r.agent.name}</span>
                      {r.agent.visibility === "private" && (
                        <svg className="wkr-lock" width="11" height="11" viewBox="0 0 16 16" fill="none" aria-label="私有">
                          <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                      )}
                    </span>
                    {r.agent.description && <span className="wkr-desc">{r.agent.description}</span>}
                  </span>
                </span>
                <span className="wkr-cell-status">
                  <span className={`wkr-dot ${conf.cls}`} />
                  {conf.label}
                  {busy > 0 && <span className="wkr-busy"> · {busy} 个任务</span>}
                </span>
                <span className="wkr-cell-owner">
                  {r.agent.owner_id && (
                    <>
                      <WKAvatar
                        channel={new Channel(r.agent.owner_id, ChannelTypePerson)}
                        style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0 }}
                      />
                      <UserName uid={r.agent.owner_id} />
                    </>
                  )}
                </span>
                <span className="wkr-cell-runtime">{r.runtime?.name || "—"}</span>
                <span className="wkr-cell-active">{lastActiveLabel(r.lastActive)}</span>
                <span className="wkr-cell-runs">{r.runCount.toLocaleString()}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
