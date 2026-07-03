/**
 * [INPUT]: ./types 的 Agent/AgentTask/统计/Runtime 类型。
 * [OUTPUT]: worker 域内存 mock 数据库:agents/runtimes/tasks/30天桶/runs + 变更函数,供 ./client 消费。
 * [POS]: dmworktodo/api/multica 的 worker 域 mock 数据源(Wave A-2,UI 先行)。
 *        纯静态 fixtures(worker 是 multica 实体,octo 侧无对应物可水合);
 *        30 天桶用 index 基伪随机(确定性,reload 图形不跳);变更(改配置/归档/env)落内存,
 *        返回形状对齐契约。接线时整文件废弃。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import { WKApp } from "@octo/base";
import type {
  Agent,
  AgentTask,
  AgentTaskStatus,
  AgentRunCount,
  AgentActivityBucket,
  AgentEnvResponse,
  RuntimeSummary,
  UpdateAgentRequest,
} from "./types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
// UTC 午夜锚(对齐契约:bucket_at anchored on completed_at 的日界)。
const dayBucket = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

// ── runtimes ──
const runtimes: RuntimeSummary[] = [
  { id: "rt-1", name: "Claude (Evan.local)", provider: "claude", status: "online", last_seen_at: iso(20_000) },
  { id: "rt-2", name: "Codex (Evan.local)", provider: "codex", status: "online", last_seen_at: iso(40_000) },
  { id: "rt-3", name: "OpenClaw (办公室工作站)", provider: "openclaw", status: "offline", last_seen_at: iso(3 * DAY) },
];

// ── agents ──
interface Seed {
  name: string;
  description: string;
  runtime: string;
  model: string;
  thinking?: string;
  visibility?: "workspace" | "private";
  concurrent?: number;
  envCount?: number;
  args?: string[];
  mcp?: boolean;
  skills?: { id: string; name: string; description: string }[];
  createdDays: number;
  archived?: boolean;
}

const SEEDS: Seed[] = [
  {
    name: "执剑人",
    description: "回路执行主力:接单、拆解、汇报进度,产出直接挂回路。",
    runtime: "rt-1",
    model: "claude-sonnet-5",
    thinking: "high",
    concurrent: 2,
    envCount: 2,
    args: ["--permission-mode", "acceptEdits"],
    mcp: true,
    skills: [
      { id: "sk-1", name: "周报整理", description: "把一周回路动态收敛成周报" },
      { id: "sk-2", name: "数据校验", description: "取数后做口径与量级双重校验" },
    ],
    createdDays: 43,
  },
  {
    name: "审计员",
    description: "对产出做二遍质检:口径、边界、遗漏,不通过就打回。",
    runtime: "rt-2",
    model: "gpt-5.5",
    concurrent: 1,
    envCount: 1,
    createdDays: 37,
  },
  {
    name: "取数师",
    description: "数据管道专职:连接内部数仓,按需取数、清洗、出报表。",
    runtime: "rt-2",
    model: "gpt-5.5-codex",
    visibility: "private",
    envCount: 3,
    args: ["--sandbox", "workspace-write"],
    createdDays: 30,
  },
  {
    name: "文档官",
    description: "会议纪要、PRD 草稿、知识库沉淀,输出统一走 markdown。",
    runtime: "rt-1",
    model: "claude-sonnet-5",
    thinking: "medium",
    skills: [{ id: "sk-3", name: "纪要模板", description: "会议纪要的结构化模板" }],
    createdDays: 21,
  },
  {
    name: "巡检兵",
    description: "定时巡检各服务健康度,异常自动建回路上报。",
    runtime: "rt-3",
    model: "",
    createdDays: 14,
  },
  {
    name: "评审官",
    description: "代码评审专职:按团队规约给出分级 findings。",
    runtime: "rt-1",
    model: "claude-opus-4-8",
    thinking: "max",
    mcp: true,
    createdDays: 9,
  },
  {
    name: "老兵",
    description: "早期试验用 worker,已退役。",
    runtime: "rt-3",
    model: "",
    createdDays: 60,
    archived: true,
  },
];

let agents: Agent[] = [];
let tasks: AgentTask[] = [];
let envs: Record<string, Record<string, string>> = {};
let seeded = false;

// index 基伪随机(确定性:同 index 恒同值,reload 不跳)。
const prand = (i: number, j: number) => {
  const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function seed() {
  if (seeded) return;
  seeded = true;
  const me = WKApp.loginInfo.uid || "";
  agents = SEEDS.map((s, i) => ({
    id: `ag-${i + 1}`,
    workspace_id: WKApp.shared.currentSpaceId || "",
    runtime_id: s.runtime,
    name: s.name,
    description: s.description,
    instructions:
      `# 角色\n\n你是「${s.name}」,${s.description}\n\n## 工作方式\n\n- 接单后先在回路里回一句认领\n- 大改动先出计划贴到动态,确认后再动手\n- 产出物统一挂回路附件,并在动态里给一句话摘要\n\n## 边界\n\n- 不碰生产库的写操作\n- 超出职责范围的请求,建议转给合适的 worker`,
    avatar_url: null,
    runtime_mode: "local",
    custom_args: s.args || [],
    has_custom_env: (s.envCount || 0) > 0,
    custom_env_key_count: s.envCount || 0,
    mcp_config: s.mcp ? { mcpServers: { figma: { url: "http://127.0.0.1:3845/mcp" } } } : null,
    mcp_config_redacted: false,
    visibility: s.visibility || "workspace",
    status: "idle",
    max_concurrent_tasks: s.concurrent ?? 1,
    model: s.model,
    thinking_level: s.thinking || "",
    owner_id: me,
    skills: s.skills || [],
    created_at: iso(s.createdDays * DAY),
    updated_at: iso(prand(i, 0) * 2 * DAY),
    archived_at: s.archived ? iso(7 * DAY) : null,
    archived_by: s.archived ? me : null,
  }));

  envs = {
    "ag-1": { ANTHROPIC_API_KEY: "sk-ant-mock-9f2e", ANTHROPIC_BASE_URL: "https://relay.internal" },
    "ag-2": { OPENAI_API_KEY: "sk-mock-77aa" },
    "ag-3": { DW_TOKEN: "dw-mock-3c1", DW_HOST: "warehouse.internal", DW_SCHEMA: "ods" },
  };

  // tasks:执剑人 1 条 running + 1 条 queued(喂 presence workload);各 agent 若干终态 Run。
  let t = 0;
  const pushTask = (agentId: string, status: AgentTaskStatus, msAgo: number, durMin: number, extra?: Partial<AgentTask>) => {
    const created = msAgo;
    tasks.push({
      id: `run-${++t}`,
      agent_id: agentId,
      runtime_id: agents.find((a) => a.id === agentId)?.runtime_id || "rt-1",
      issue_id: "",
      status,
      priority: 0,
      dispatched_at: iso(created - 5_000),
      started_at: status === "queued" ? null : iso(created - 10_000),
      completed_at:
        status === "completed" || status === "failed" || status === "cancelled"
          ? iso(created - durMin * MIN)
          : null,
      result: null,
      error: status === "failed" ? "执行超时:等待数据源响应超过 10 分钟" : null,
      failure_reason: status === "failed" ? "timeout" : undefined,
      created_at: iso(created),
      kind: "direct",
      ...extra,
    });
  };
  pushTask("ag-1", "running", 18 * MIN, 0, { kind: "comment", trigger_summary: "整理季度数据看板" });
  pushTask("ag-1", "queued", 6 * MIN, 0, { kind: "quick_create", trigger_summary: "汇总本周回路动态" });
  const termStatus: AgentTaskStatus[] = ["completed", "completed", "completed", "failed", "completed", "cancelled"];
  agents
    .filter((a) => !a.archived_at)
    .forEach((a, ai) => {
      const n = 3 + Math.floor(prand(ai, 1) * 4);
      for (let k = 0; k < n; k++) {
        pushTask(
          a.id,
          termStatus[Math.floor(prand(ai, k + 2) * termStatus.length)],
          (4 + k * 20 + prand(ai, k + 9) * 10) * HOUR,
          2 + Math.floor(prand(ai, k + 20) * 6),
          { kind: k % 2 ? "autopilot" : "comment", trigger_summary: k % 2 ? "自动化运行" : "回路评论触发" },
        );
      }
    });
}

// ── 读 ──
export function allAgents(): Agent[] {
  seed();
  return agents.map((a) => ({ ...a }));
}

export function getAgentById(id: string): Agent {
  seed();
  const a = agents.find((x) => x.id === id);
  if (!a) throw new Error("agent not found");
  return { ...a };
}

export function allRuntimes(): RuntimeSummary[] {
  seed();
  return runtimes.map((r) => ({ ...r }));
}

// snapshot = 全部活跃 task + 每 agent 最近一条终态(契约:全 app 唯一 presence 数据源)。
export function taskSnapshot(): AgentTask[] {
  seed();
  const active = tasks.filter((x) => ["queued", "dispatched", "waiting_local_directory", "running"].includes(x.status));
  const lastTerm = new Map<string, AgentTask>();
  for (const x of tasks) {
    if (!["completed", "failed", "cancelled"].includes(x.status)) continue;
    const cur = lastTerm.get(x.agent_id);
    if (!cur || (x.completed_at || "") > (cur.completed_at || "")) lastTerm.set(x.agent_id, x);
  }
  return [...active, ...lastTerm.values()].map((x) => ({ ...x }));
}

export function tasksOf(agentId: string): AgentTask[] {
  seed();
  return tasks
    .filter((x) => x.agent_id === agentId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((x) => ({ ...x }));
}

// 30 天运行数(与 30 天桶同一伪随机源,数字与柱子一致)。
export function runCounts(): AgentRunCount[] {
  seed();
  return agents
    .filter((a) => !a.archived_at)
    .map((a, ai) => ({
      agent_id: a.id,
      run_count: activityOf(a.id, ai).reduce((s, b) => s + b.task_count, 0),
    }));
}

function activityOf(agentId: string, ai: number): AgentActivityBucket[] {
  const out: AgentActivityBucket[] = [];
  for (let d = 0; d < 30; d++) {
    const r = prand(ai + 1, d + 40);
    if (r < 0.45) continue; // 稀疏:只返回有 completion 的天(契约行为)
    const cnt = 1 + Math.floor(r * 4);
    out.push({
      agent_id: agentId,
      bucket_at: dayBucket(d),
      task_count: cnt,
      failed_count: r > 0.92 ? 1 : 0,
    });
  }
  return out;
}

export function activity30d(): AgentActivityBucket[] {
  seed();
  return agents.filter((a) => !a.archived_at).flatMap((a, ai) => activityOf(a.id, ai));
}

// ── 变更 ──
export function updateAgentIn(id: string, req: UpdateAgentRequest): Agent {
  seed();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("agent not found");
  const cur = agents[idx];
  agents[idx] = {
    ...cur,
    ...Object.fromEntries(Object.entries(req).filter(([, v]) => v !== undefined)),
    // tri-state:显式传 null 才清空
    mcp_config: "mcp_config" in req ? req.mcp_config ?? null : cur.mcp_config,
    updated_at: iso(0),
  } as Agent;
  return { ...agents[idx] };
}

export function archiveAgentIn(id: string): Agent {
  seed();
  return setArchived(id, true);
}

export function restoreAgentIn(id: string): Agent {
  seed();
  return setArchived(id, false);
}

function setArchived(id: string, archived: boolean): Agent {
  const idx = agents.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("agent not found");
  agents[idx] = {
    ...agents[idx],
    archived_at: archived ? iso(0) : null,
    archived_by: archived ? WKApp.loginInfo.uid || "" : null,
    updated_at: iso(0),
  };
  return { ...agents[idx] };
}

export function envOf(id: string): AgentEnvResponse {
  seed();
  return { agent_id: id, custom_env: { ...(envs[id] || {}) } };
}

// 整体替换语义(漏 key 即删);值="****"=保留原密文(契约 defense-in-depth guard)。
export function updateEnvOf(id: string, custom_env: Record<string, string>): AgentEnvResponse {
  seed();
  const prev = envs[id] || {};
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(custom_env)) {
    next[k] = v === "****" && prev[k] !== undefined ? prev[k] : v;
  }
  envs[id] = next;
  const idx = agents.findIndex((a) => a.id === id);
  if (idx >= 0) {
    const cnt = Object.keys(next).length;
    agents[idx] = { ...agents[idx], has_custom_env: cnt > 0, custom_env_key_count: cnt, updated_at: iso(0) };
  }
  return envOf(id);
}
