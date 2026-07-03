/**
 * [INPUT]: api/multica 的 client(getAgent/updateAgent/archiveAgent/restoreAgent/getAgentEnv/
 *          updateAgentEnv/listAgentTasks/getWorkspaceAgentActivity30d/listRuntimes +
 *          presence/activity 派生);./WorkersView 的 WorkerAvatar;../UserName。
 * [OUTPUT]: 对外默认导出 WorkerDetailView —— worker 详情多 tab(⭐Wave A-2)。
 * [POS]: dmworktodo/ui/MatterListView 的 worker 详情,MatterRouteHost view="workerDetail" 挂载。
 *        结构镜像 multica agent-detail-page:左 Inspector 320px(身份/属性/详情/技能)+
 *        右 tabs(动态=当前+近30天卡+sparkline+最近工作 / Runs / Instructions 编辑 /
 *        技能 / 环境变量 reveal-first / 自定义参数 / MCP JSON)。
 *        V1 可写面:Instructions/env/自定义参数/MCP + 归档/恢复;Inspector 属性只读
 *        (设备/模型选择器依赖轮询接线,欠账)。词表:agent→worker、task→Run、runtime→设备。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import {
  getAgent,
  updateAgent,
  archiveAgent,
  restoreAgent,
  getAgentEnv,
  updateAgentEnv,
  listAgentTasks,
  getWorkspaceAgentActivity30d,
  listRuntimes,
  deriveAgentPresence,
  deriveActivityBuckets,
  summarizeActivity,
} from "../../api/multica/client";
import type { ActivityDay } from "../../api/multica/client";
import type { Agent, AgentTask, RuntimeSummary } from "../../api/multica/types";
import UserName from "../UserName";
import { WorkerAvatar } from "./WorkersView";
import "./workers.css";
import "./workerDetail.css";

type Tab = "activity" | "runs" | "instructions" | "skills" | "env" | "args" | "mcp";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "activity", label: "动态" },
  { key: "runs", label: "Runs" },
  { key: "instructions", label: "Instructions" },
  { key: "skills", label: "技能" },
  { key: "env", label: "环境变量" },
  { key: "args", label: "自定义参数" },
  { key: "mcp", label: "MCP" },
];

const RUN_STATUS: Record<string, { label: string; cls: string }> = {
  queued: { label: "排队中", cls: "is-muted" },
  dispatched: { label: "已派发", cls: "is-info" },
  waiting_local_directory: { label: "等待目录", cls: "is-muted" },
  running: { label: "运行中", cls: "is-brand" },
  completed: { label: "已完成", cls: "is-success" },
  failed: { label: "失败", cls: "is-error" },
  cancelled: { label: "已取消", cls: "is-muted" },
};

const KIND_LABEL: Record<string, string> = {
  comment: "评论触发",
  autopilot: "自动化运行",
  chat: "对话",
  quick_create: "快速建单",
  direct: "直接派发",
};

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = Date.now() - new Date(iso).getTime();
  const MIN = 60_000;
  if (d < MIN) return "刚刚";
  if (d < 60 * MIN) return `${Math.floor(d / MIN)} 分钟前`;
  if (d < 24 * 60 * MIN) return `${Math.floor(d / 60 / MIN)} 小时前`;
  return `${Math.floor(d / 86_400_000)} 天前`;
};

const fmtDur = (t: AgentTask) => {
  if (!t.started_at || !t.completed_at) return "";
  const s = Math.max(1, Math.round((new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

// 30 天堆叠柱 sparkline(成功=brand 底、失败=error 顶,per-component 缩放,镜像 multica sparkline)。
function Sparkline({ days, width, height }: { days: ActivityDay[]; width: number; height: number }) {
  const max = Math.max(1, ...days.map((d) => d.total));
  const bw = width / days.length;
  return (
    <svg width={width} height={height} className="wkd-spark" aria-hidden>
      {days.map((d, i) => {
        if (d.total === 0) return null;
        const h = Math.max(2, (d.total / max) * height);
        const fh = d.failed > 0 ? Math.max(2, (d.failed / d.total) * h) : 0;
        return (
          <g key={i}>
            <rect
              x={i * bw + bw * 0.2}
              y={height - h}
              width={bw * 0.6}
              height={h - fh}
              rx="1"
              style={{ fill: "var(--wk-color-info)" }}
            />
            {fh > 0 && (
              <rect
                x={i * bw + bw * 0.2}
                y={height - fh}
                width={bw * 0.6}
                height={fh}
                rx="1"
                style={{ fill: "var(--wk-color-error)" }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function RunRow({ t }: { t: AgentTask }) {
  const st = RUN_STATUS[t.status] || { label: t.status, cls: "is-muted" };
  return (
    <div className="wkd-run">
      <span className={`wkd-run-dot ${st.cls}`} />
      <span className="wkd-run-main">
        <span className="wkd-run-title">{t.trigger_summary || KIND_LABEL[t.kind || "direct"] || "Run"}</span>
        <span className="wkd-run-sub">
          {st.label}
          {t.kind && ` · ${KIND_LABEL[t.kind] || t.kind}`}
          {t.error && <span className="wkd-run-err"> · {t.error}</span>}
        </span>
      </span>
      <span className="wkd-run-meta">
        {fmtTime(t.completed_at || t.created_at)}
        {fmtDur(t) && ` · ${fmtDur(t)}`}
      </span>
    </div>
  );
}

export default function WorkerDetailView({
  agentId,
  onBack,
}: {
  agentId: string;
  onBack: () => void;
}) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [days, setDays] = useState<ActivityDay[]>([]);
  const [runtimes, setRuntimes] = useState<RuntimeSummary[]>([]);
  const [tab, setTab] = useState<Tab>("activity");
  const [recentShown, setRecentShown] = useState(5);
  const [busy, setBusy] = useState(false);

  // Instructions 编辑
  const [insDraft, setInsDraft] = useState("");
  const [insDirty, setInsDirty] = useState(false);
  // env reveal-first
  const [envRows, setEnvRows] = useState<Array<{ k: string; v: string; show: boolean }> | null>(null);
  const [envDirty, setEnvDirty] = useState(false);
  // args / mcp
  const [argsDraft, setArgsDraft] = useState<string[]>([]);
  const [argsDirty, setArgsDirty] = useState(false);
  const [mcpDraft, setMcpDraft] = useState("");
  const [mcpDirty, setMcpDirty] = useState(false);
  const [mcpErr, setMcpErr] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([getAgent(agentId), listAgentTasks(agentId), getWorkspaceAgentActivity30d(), listRuntimes()]).then(
      ([a, ts, act, rts]) => {
        if (!alive) return;
        setAgent(a);
        setTasks(ts);
        setDays(deriveActivityBuckets(act, agentId));
        setRuntimes(rts);
        setInsDraft(a.instructions);
        setArgsDraft(a.custom_args);
        setMcpDraft(a.mcp_config ? JSON.stringify(a.mcp_config, null, 2) : "");
      },
    );
    return () => {
      alive = false;
    };
  }, [agentId]);

  const runtime = useMemo(() => runtimes.find((r) => r.id === agent?.runtime_id), [runtimes, agent]);
  const presence = useMemo(
    () => (agent ? deriveAgentPresence(agent, runtime, tasks) : null),
    [agent, runtime, tasks],
  );
  const active = useMemo(
    () => tasks.filter((t) => ["queued", "dispatched", "waiting_local_directory", "running"].includes(t.status)),
    [tasks],
  );
  const terminal = useMemo(
    () => tasks.filter((t) => ["completed", "failed", "cancelled"].includes(t.status)),
    [tasks],
  );
  const sum30 = useMemo(() => summarizeActivity(days, 30), [days]);
  const avgDur = useMemo(() => {
    const durs = terminal
      .filter((t) => t.status === "completed" && t.started_at && t.completed_at)
      .map((t) => new Date(t.completed_at!).getTime() - new Date(t.started_at!).getTime());
    if (!durs.length) return "";
    const s = Math.round(durs.reduce((a, b) => a + b, 0) / durs.length / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  }, [terminal]);

  const patchAgent = async (req: Parameters<typeof updateAgent>[1]) => {
    setBusy(true);
    try {
      const next = await updateAgent(agentId, req);
      setAgent(next);
    } finally {
      setBusy(false);
    }
  };

  if (!agent || !presence) {
    return (
      <div className="wkd-root">
        <div className="wkd-loading">加载中…</div>
      </div>
    );
  }

  const AVAIL: Record<string, { label: string; cls: string }> = {
    online: { label: "在线", cls: "is-online" },
    unstable: { label: "不稳定", cls: "is-unstable" },
    offline: { label: "离线", cls: "is-offline" },
    archived: { label: "已归档", cls: "is-archived" },
  };
  const av = AVAIL[presence.availability];

  return (
    <div className="wkd-root">
      <div className="wkd-crumb">
        <button className="wkd-back" type="button" onClick={onBack}>
          worker
        </button>
        <span className="wkd-crumb-sep">›</span>
        <span className="wkd-crumb-name">{agent.name}</span>
        <span className={`wkd-presence ${av.cls}`}>
          <span className={`wkr-dot ${av.cls}`} />
          {av.label}
          {presence.workload !== "idle" &&
            ` · ${presence.runningCount + presence.queuedCount} 个任务`}
        </span>
        <span className="wkd-crumb-spacer" />
        <button
          type="button"
          className="wkd-archive-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const next = agent.archived_at ? await restoreAgent(agentId) : await archiveAgent(agentId);
              setAgent(next);
            } finally {
              setBusy(false);
            }
          }}
        >
          {agent.archived_at ? "恢复" : "归档"}
        </button>
      </div>

      <div className="wkd-body">
        {/* ── 左 Inspector(镜像 multica agent-detail-inspector,V1 只读)── */}
        <aside className="wkd-inspector">
          <div className="wkd-id-card">
            <WorkerAvatar name={agent.name} size={56} dot={av.cls} />
            <div className="wkd-id-name">{agent.name}</div>
            {agent.description && <div className="wkd-id-desc">{agent.description}</div>}
          </div>

          <div className="wkd-group">
            <div className="wkd-group-title">属性</div>
            <div className="wkd-prop">
              <span className="wkd-prop-k">设备</span>
              <span className="wkd-prop-v">
                {runtime ? (
                  <>
                    {runtime.name}
                    <span className={`wkr-dot ${runtime.status === "online" ? "is-online" : "is-offline"}`} style={{ marginLeft: 6, marginRight: 0 }} />
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="wkd-prop">
              <span className="wkd-prop-k">模型</span>
              <span className="wkd-prop-v wkd-mono">{agent.model || "CLI 默认"}</span>
            </div>
            {agent.thinking_level ? (
              <div className="wkd-prop">
                <span className="wkd-prop-k">思考力度</span>
                <span className="wkd-prop-v wkd-mono">{agent.thinking_level}</span>
              </div>
            ) : null}
            <div className="wkd-prop">
              <span className="wkd-prop-k">可见性</span>
              <span className="wkd-prop-v">{agent.visibility === "private" ? "仅自己" : "组队可见"}</span>
            </div>
            <div className="wkd-prop">
              <span className="wkd-prop-k">并发</span>
              <span className="wkd-prop-v">{agent.max_concurrent_tasks}</span>
            </div>
          </div>

          <div className="wkd-group">
            <div className="wkd-group-title">详情</div>
            <div className="wkd-prop">
              <span className="wkd-prop-k">所有者</span>
              <span className="wkd-prop-v wkd-owner">
                {agent.owner_id ? (
                  <>
                    <WKAvatar
                      channel={new Channel(agent.owner_id, ChannelTypePerson)}
                      style={{ width: 16, height: 16, borderRadius: "50%" }}
                    />
                    <UserName uid={agent.owner_id} />
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="wkd-prop">
              <span className="wkd-prop-k">创建时间</span>
              <span className="wkd-prop-v">{fmtTime(agent.created_at)}</span>
            </div>
            <div className="wkd-prop">
              <span className="wkd-prop-k">更新时间</span>
              <span className="wkd-prop-v">{fmtTime(agent.updated_at)}</span>
            </div>
          </div>

          <div className="wkd-group">
            <div className="wkd-group-title">
              技能 <span className="wkd-group-n">{agent.skills.length}</span>
            </div>
            {agent.skills.length === 0 ? (
              <div className="wkd-none">暂无</div>
            ) : (
              <div className="wkd-skill-chips">
                {agent.skills.map((s) => (
                  <span key={s.id} className="wkd-skill-chip" title={s.description}>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── 右 tabs ── */}
        <main className="wkd-main">
          <div className="wkd-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`wkd-tab${tab === t.key ? " is-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="wkd-tab-body">
            {tab === "activity" && (
              <>
                <section className="wkd-card">
                  <div className="wkd-card-title">当前</div>
                  {active.length === 0 ? (
                    <div className="wkd-none">无进行中的工作 —— 这个 worker 当前没有在跑任何 Run。</div>
                  ) : (
                    active.map((t) => <RunRow key={t.id} t={t} />)
                  )}
                </section>
                <section className="wkd-card">
                  <div className="wkd-card-title">近 30 天表现</div>
                  <div className="wkd-30d">
                    <div className="wkd-30d-nums">
                      <span className="wkd-30d-big">{sum30.total}</span>
                      <span className="wkd-30d-unit">次运行</span>
                      <div className="wkd-30d-sub">
                        {sum30.successRate !== null
                          ? `${Math.round(sum30.successRate * 100)}% 成功`
                          : "尚无运行"}
                        {avgDur && ` · 平均 ${avgDur}`}
                      </div>
                    </div>
                    <Sparkline days={days} width={220} height={44} />
                  </div>
                </section>
                <section className="wkd-card">
                  <div className="wkd-card-title">
                    最近工作 <span className="wkd-group-n">{Math.min(recentShown, terminal.length)} / {terminal.length}</span>
                  </div>
                  {terminal.length === 0 ? (
                    <div className="wkd-none">还没有完成过 Run。</div>
                  ) : (
                    <>
                      {terminal.slice(0, recentShown).map((t) => (
                        <RunRow key={t.id} t={t} />
                      ))}
                      {terminal.length > recentShown && (
                        <button type="button" className="wkd-more" onClick={() => setRecentShown((n) => n + 20)}>
                          查看更多 →
                        </button>
                      )}
                    </>
                  )}
                </section>
              </>
            )}

            {tab === "runs" && (
              <section className="wkd-card">
                <div className="wkd-card-title">
                  全部 Run <span className="wkd-group-n">{tasks.length}</span>
                </div>
                {tasks.length === 0 ? (
                  <div className="wkd-none">暂无 Run。</div>
                ) : (
                  tasks.map((t) => <RunRow key={t.id} t={t} />)
                )}
              </section>
            )}

            {tab === "instructions" && (
              <section className="wkd-card">
                <div className="wkd-card-title-row">
                  <span className="wkd-card-title">Instructions</span>
                  <button
                    type="button"
                    className="wkd-save-btn"
                    disabled={!insDirty || busy}
                    onClick={async () => {
                      await patchAgent({ instructions: insDraft });
                      setInsDirty(false);
                    }}
                  >
                    保存
                  </button>
                </div>
                <p className="wkd-hint">worker 的系统提示词:它是谁、怎么干活、边界在哪。markdown 直接生效。</p>
                <textarea
                  className="wkd-textarea"
                  rows={16}
                  value={insDraft}
                  onChange={(e) => {
                    setInsDraft(e.target.value);
                    setInsDirty(e.target.value !== agent.instructions);
                  }}
                />
              </section>
            )}

            {tab === "skills" && (
              <section className="wkd-card">
                <div className="wkd-card-title">
                  已挂载技能 <span className="wkd-group-n">{agent.skills.length}</span>
                </div>
                {agent.skills.length === 0 ? (
                  <div className="wkd-none">暂无技能 —— 技能库上线后可在此挂载。</div>
                ) : (
                  agent.skills.map((s) => (
                    <div key={s.id} className="wkd-skill-row">
                      <span className="wkd-skill-name">{s.name}</span>
                      <span className="wkd-skill-desc">{s.description}</span>
                    </div>
                  ))
                )}
              </section>
            )}

            {tab === "env" && (
              <section className="wkd-card">
                <div className="wkd-card-title-row">
                  <span className="wkd-card-title">环境变量</span>
                  {envRows && (
                    <button
                      type="button"
                      className="wkd-save-btn"
                      disabled={!envDirty || busy}
                      onClick={async () => {
                        const map: Record<string, string> = {};
                        for (const r of envRows) {
                          const k = r.k.trim();
                          if (k) map[k] = r.v;
                        }
                        setBusy(true);
                        try {
                          const res = await updateAgentEnv(agentId, { custom_env: map });
                          setEnvRows(Object.entries(res.custom_env).map(([k, v]) => ({ k, v, show: false })));
                          setEnvDirty(false);
                          setAgent(await getAgent(agentId));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      保存
                    </button>
                  )}
                </div>
                {envRows === null ? (
                  <div className="wkd-env-locked">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    <span>
                      {agent.custom_env_key_count
                        ? `${agent.custom_env_key_count} 个变量(值已加密存储,查看将记录审计日志)`
                        : "尚未配置环境变量"}
                    </span>
                    <button
                      type="button"
                      className="wkd-reveal-btn"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await getAgentEnv(agentId);
                          setEnvRows(Object.entries(res.custom_env).map(([k, v]) => ({ k, v, show: false })));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      显示并编辑
                    </button>
                  </div>
                ) : (
                  <>
                    {envRows.map((r, i) => (
                      <div key={i} className="wkd-env-row">
                        <input
                          className="wkd-input wkd-mono"
                          placeholder="KEY"
                          value={r.k}
                          onChange={(e) => {
                            setEnvRows(envRows.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)));
                            setEnvDirty(true);
                          }}
                        />
                        <input
                          className="wkd-input wkd-mono"
                          placeholder="value"
                          type={r.show ? "text" : "password"}
                          value={r.v}
                          onChange={(e) => {
                            setEnvRows(envRows.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)));
                            setEnvDirty(true);
                          }}
                        />
                        <button
                          type="button"
                          className="wkd-icon-btn"
                          aria-label={r.show ? "隐藏值" : "显示值"}
                          onClick={() => setEnvRows(envRows.map((x, j) => (j === i ? { ...x, show: !x.show } : x)))}
                        >
                          {r.show ? "隐藏" : "显示"}
                        </button>
                        <button
                          type="button"
                          className="wkd-icon-btn is-danger"
                          aria-label="删除变量"
                          onClick={() => {
                            setEnvRows(envRows.filter((_, j) => j !== i));
                            setEnvDirty(true);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="wkd-more"
                      onClick={() => {
                        setEnvRows([...envRows, { k: "", v: "", show: true }]);
                        setEnvDirty(true);
                      }}
                    >
                      + 添加变量
                    </button>
                  </>
                )}
              </section>
            )}

            {tab === "args" && (
              <section className="wkd-card">
                <div className="wkd-card-title-row">
                  <span className="wkd-card-title">自定义参数</span>
                  <button
                    type="button"
                    className="wkd-save-btn"
                    disabled={!argsDirty || busy}
                    onClick={async () => {
                      await patchAgent({ custom_args: argsDraft.map((a) => a.trim()).filter(Boolean) });
                      setArgsDirty(false);
                    }}
                  >
                    保存
                  </button>
                </div>
                <p className="wkd-hint">附加给 CLI 的启动参数,每行一个 token。</p>
                {argsDraft.map((a, i) => (
                  <div key={i} className="wkd-env-row">
                    <input
                      className="wkd-input wkd-mono"
                      value={a}
                      onChange={(e) => {
                        setArgsDraft(argsDraft.map((x, j) => (j === i ? e.target.value : x)));
                        setArgsDirty(true);
                      }}
                    />
                    <button
                      type="button"
                      className="wkd-icon-btn is-danger"
                      aria-label="删除参数"
                      onClick={() => {
                        setArgsDraft(argsDraft.filter((_, j) => j !== i));
                        setArgsDirty(true);
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="wkd-more"
                  onClick={() => {
                    setArgsDraft([...argsDraft, ""]);
                    setArgsDirty(true);
                  }}
                >
                  + 添加参数
                </button>
              </section>
            )}

            {tab === "mcp" && (
              <section className="wkd-card">
                <div className="wkd-card-title-row">
                  <span className="wkd-card-title">MCP 配置</span>
                  <button
                    type="button"
                    className="wkd-save-btn"
                    disabled={!mcpDirty || busy || !!agent.mcp_config_redacted}
                    onClick={async () => {
                      const text = mcpDraft.trim();
                      if (!text) {
                        await patchAgent({ mcp_config: null });
                        setMcpDirty(false);
                        setMcpErr("");
                        return;
                      }
                      try {
                        const parsed = JSON.parse(text);
                        if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
                          setMcpErr("必须是 JSON 对象(非数组)");
                          return;
                        }
                        await patchAgent({ mcp_config: parsed });
                        setMcpDirty(false);
                        setMcpErr("");
                      } catch {
                        setMcpErr("JSON 解析失败,请检查语法");
                      }
                    }}
                  >
                    保存
                  </button>
                </div>
                {agent.mcp_config_redacted ? (
                  <div className="wkd-env-locked">
                    <span>已配置,但你没有查看权限。</span>
                  </div>
                ) : (
                  <>
                    <p className="wkd-hint">MCP 服务器列表(JSON)。留空并保存 = 清除配置。</p>
                    <textarea
                      className="wkd-textarea wkd-mono"
                      rows={12}
                      placeholder='{"mcpServers": {}}'
                      value={mcpDraft}
                      onChange={(e) => {
                        setMcpDraft(e.target.value);
                        setMcpDirty(true);
                        setMcpErr("");
                      }}
                    />
                    {mcpErr && <div className="wkd-err">{mcpErr}</div>}
                  </>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
