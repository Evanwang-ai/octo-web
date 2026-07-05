/**
 * [INPUT]: ./types 的 Agent/AgentTask/统计/Runtime 类型。
 * [OUTPUT]: worker 域内存 mock 数据库:agents/runtimes/tasks/30天桶/runs + 变更函数,供 ./client 消费。
 * [POS]: dmworktodo/api/multica 的 worker 域 mock 数据源(Wave A-2,UI 先行)。
 *        纯静态 fixtures(worker 是 multica 实体,octo 侧无对应物可水合);
 *        30 天桶用 index 基伪随机(确定性,reload 图形不跳);变更(改配置/归档/env)落内存,
 *        返回形状对齐契约。Run 摘要/instructions/transcript 按 worker 职责分池
 *        (数据/审计/文档/巡检/评审,agent+index 确定性取样)。接线时整文件废弃。
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
// 职责分类:Run 摘要池、instructions 措辞、transcript 剧本三处共用(确定性)。
type Role = "data" | "audit" | "docs" | "ops" | "review";

interface Seed {
  name: string;
  description: string;
  role: Role;
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
    role: "data",
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
    role: "audit",
    runtime: "rt-2",
    model: "gpt-5.5",
    concurrent: 1,
    envCount: 1,
    createdDays: 37,
  },
  {
    name: "取数师",
    description: "数据管道专职:连接内部数仓,按需取数、清洗、出报表。",
    role: "data",
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
    role: "docs",
    runtime: "rt-1",
    model: "claude-sonnet-5",
    thinking: "medium",
    skills: [{ id: "sk-3", name: "纪要模板", description: "会议纪要的结构化模板" }],
    createdDays: 21,
  },
  {
    name: "巡检兵",
    description: "定时巡检各服务健康度,异常自动建回路上报。",
    role: "ops",
    runtime: "rt-3",
    model: "",
    createdDays: 14,
  },
  {
    name: "评审官",
    description: "代码评审专职:按团队规约给出分级 findings。",
    role: "review",
    runtime: "rt-1",
    model: "claude-opus-4-8",
    thinking: "max",
    mcp: true,
    createdDays: 9,
  },
  {
    name: "老兵",
    description: "早期试验配置,已归档。",
    role: "data",
    runtime: "rt-3",
    model: "",
    createdDays: 60,
    archived: true,
  },
];

// 按职责分池的 Run 摘要(每类 3 条共 15 条;按 agent+index 确定性取样,治全员两值轮换的复读)。
const TRIGGER_POOLS: Record<Role, string[]> = {
  data: ["导出季度经营指标", "清洗 CRM 客户名单", "刷新留存分析看板"],
  audit: ["复核 Q2 报表口径", "抽查上月对账差异", "核对发布清单与实际改动"],
  docs: ["整理发布纪要", "起草新人入职手册", "沉淀本周评审会结论"],
  ops: ["巡检各服务健康度", "核查证书到期情况", "排查夜间告警噪声"],
  review: ["复审支付模块 PR", "评审数据管道重构方案", "检查新接口边界处理"],
};

// instructions 工作方式段:每类职责一段不同措辞(轻度差异化,治同模板套名字)。
const INSTRUCTION_STYLE: Record<Role, string> = {
  data: "- 一切数字可溯源:取数语句随产出一并贴出\n- 口径与上期不一致时先停下核对,再继续",
  audit: "- 先对口径,再查边界与遗漏,最后复算一遍量级\n- 不通过就写明依据打回,不代改",
  docs: "- 结论先行:任何纪要先给三行结论,再放待办与过程\n- 输出统一 markdown,标题层级不超过三级",
  ops: "- 按巡检清单逐项过,异常立即建回路上报并 @值班人\n- 全部正常保持安静,不刷动态",
  review: "- findings 按 严重/建议/可忽略 分级,每条带 文件:行号 与理由\n- 只评审不改码",
};

// 由 agent id 反查职责(seed 内置 worker 按 SEEDS 序;运行期新建兜底 data)。
const roleOfAgent = (agentId: string): Role => SEEDS[seedOf(agentId) - 1]?.role ?? "data";

// transcript 剧本三分类:数据类=psql/csv、评审类=读码给意见、文档类=写 markdown。
type ScriptClass = "data" | "review" | "docs";
const scriptClassOf = (role: Role): ScriptClass =>
  role === "review" ? "review" : role === "docs" ? "docs" : "data";

// failed Run 的错误文案按剧本类给(数据等数据源、评审等检出、文档等素材)。
const FAIL_ERRORS: Record<ScriptClass, string> = {
  data: "执行超时:等待数据源响应超过 10 分钟",
  review: "执行中断:仓库检出失败,工作区不可用",
  docs: "执行超时:素材读取长时间无响应",
};

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
      `# 角色\n\n你是「${s.name}」,${s.description}\n\n## 工作方式\n\n- 接单后先在回路里回一句认领\n${INSTRUCTION_STYLE[s.role]}\n- 产出物统一挂回路附件,并在动态里给一句话摘要\n\n## 边界\n\n- 不碰生产库的写操作\n- 超出职责范围的请求,建议转给合适的 worker`,
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
      error: status === "failed" ? FAIL_ERRORS[scriptClassOf(roleOfAgent(agentId))] : null,
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
      const pool = TRIGGER_POOLS[roleOfAgent(a.id)];
      for (let k = 0; k < n; k++) {
        pushTask(
          a.id,
          termStatus[Math.floor(prand(ai, k + 2) * termStatus.length)],
          (4 + k * 20 + prand(ai, k + 9) * 10) * HOUR,
          2 + Math.floor(prand(ai, k + 20) * 6),
          // 摘要按职责池 agent+index 确定性取样(reload 不跳)。
          { kind: k % 2 ? "autopilot" : "comment", trigger_summary: pool[(ai + k) % pool.length] },
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

// 稳定 seed:取 agent id 数字部分,归档/恢复不改变其它 worker 的伪随机历史(codex 双审 finding)。
const seedOf = (agentId: string) => Number(agentId.replace(/\D/g, "")) || 1;

// 30 天运行数(与 30 天桶同一伪随机源,数字与柱子一致)。
export function runCounts(): AgentRunCount[] {
  seed();
  return agents
    .filter((a) => !a.archived_at)
    .map((a) => ({
      agent_id: a.id,
      run_count: activityOf(a.id, seedOf(a.id)).reduce((s, b) => s + b.task_count, 0),
    }));
}

function activityOf(agentId: string, ai: number): AgentActivityBucket[] {
  const out: AgentActivityBucket[] = [];
  // 伪随机历史只属于 seed 内置 worker;运行期新建(id 带 -t)从零开始(边态自查 finding)。
  if (agentId.includes("-t")) return out;
  const createdAt = new Date(agents.find((a) => a.id === agentId)?.created_at || 0).getTime();
  for (let d = 0; d < 30; d++) {
    if (Date.now() - d * DAY < createdAt) continue;
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
  return agents.filter((a) => !a.archived_at).flatMap((a) => activityOf(a.id, seedOf(a.id)));
}

// ── 变更 ──
// 模板建虾(市集 createAgentFromTemplate 落点):新 agent 入库,presence 立即可派生。
export function createAgentIn(req: {
  name: string;
  description: string;
  instructions: string;
  runtime_id: string;
  model: string;
  skills: Array<{ id: string; name: string; description: string }>;
}): Agent {
  seed();
  const me = WKApp.loginInfo.uid || "";
  const a: Agent = {
    id: `ag-${agents.length + 1}-t`,
    workspace_id: WKApp.shared.currentSpaceId || "",
    runtime_id: req.runtime_id,
    name: req.name,
    description: req.description,
    instructions: req.instructions,
    avatar_url: null,
    runtime_mode: "local",
    custom_args: [],
    has_custom_env: false,
    custom_env_key_count: 0,
    mcp_config: null,
    mcp_config_redacted: false,
    visibility: "workspace",
    status: "idle",
    max_concurrent_tasks: 1,
    model: req.model,
    thinking_level: "",
    owner_id: me,
    skills: req.skills,
    created_at: iso(0),
    updated_at: iso(0),
    archived_at: null,
    archived_by: null,
  };
  agents.push(a);
  return { ...a };
}

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

// ── transcript(Run 消息流)合成:按 task 的 kind/status 确定性生成,tool-call 级真实感 ──
import type { TaskMessagePayload } from "./types";

export function messagesOf(taskId: string): TaskMessagePayload[] {
  seed();
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return [];
  const base = t.created_at;
  const at = (offsetSec: number) =>
    new Date(new Date(base).getTime() + offsetSec * 1000).toISOString();
  let seq = 0;
  const msg = (
    partial: Pick<TaskMessagePayload, "type"> & Partial<TaskMessagePayload>,
    offsetSec: number,
  ): TaskMessagePayload => ({
    task_id: t.id,
    issue_id: t.issue_id,
    seq: ++seq,
    created_at: at(offsetSec),
    ...partial,
  });

  const topic = t.trigger_summary || "本次任务";

  // 三套按职责的剧本(数据类=psql/csv、评审类=读码给意见、文档类=写 markdown),按 agent 确定性分配。
  type MsgSeed = Pick<TaskMessagePayload, "type"> & Partial<TaskMessagePayload>;
  interface RunScript {
    claim: string;
    thinking: string;
    calls: [MsgSeed, MsgSeed, MsgSeed, MsgSeed];
    done: string;
    failCall: MsgSeed;
    runningCall: MsgSeed;
  }
  const cls = scriptClassOf(roleOfAgent(t.agent_id));
  const script: RunScript =
    cls === "review"
      ? {
          claim: `已认领:${topic}。先圈定改动范围,再逐文件过边界与规约。`,
          thinking: `改动集中在回调与重试两条链路,先读主实现,再查调用点确认影响面,最后按分级整理意见。`,
          calls: [
            { type: "tool_use", tool: "Read", input: { file_path: "src/payment/callback.ts", limit: 200 } },
            {
              type: "tool_result",
              tool: "Read",
              output: "export async function handleCallback(evt: PayEvent) {\n  const order = await findOrder(evt.order_id);\n  …\n}\n(共 214 行)",
            },
            { type: "tool_use", tool: "Grep", input: { pattern: "handleCallback", path: "src" } },
            { type: "tool_result", tool: "Grep", output: "src/payment/router.ts:41\nsrc/jobs/retry.ts:88\n(2 处调用)" },
          ],
          done: `评审完成:严重 1 条(回调未校验签名)、建议 2 条(重试无上限、日志缺关键字段),均附 文件:行号 与理由。清单已挂回路附件:${topic} 已完成。`,
          failCall: { type: "tool_use", tool: "Read", input: { file_path: "src/payment/legacy/adapter.ts", limit: 200 } },
          runningCall: { type: "tool_use", tool: "Grep", input: { pattern: "retryPayment", path: "src" } },
        }
      : cls === "docs"
        ? {
            claim: `已认领:${topic}。先归拢要点,再按模板成稿。`,
            thinking: `素材散在回路动态和会议转录里,先提炼决议点排出结构;结论先行,过程与待办附后。`,
            calls: [
              { type: "tool_use", tool: "Read", input: { file_path: "notes/2026-Q2-会议转录.md", limit: 80 } },
              { type: "tool_result", tool: "Read", output: "…(转录共 1204 行,提炼出 6 个决议点、4 项待办)" },
              {
                type: "tool_use",
                tool: "Write",
                input: { file_path: "docs/纪要-草稿.md", content: "# 纪要\n\n## 结论\n1. …\n\n## 待办\n- …" },
              },
              { type: "tool_result", tool: "Write", output: "已写入 docs/纪要-草稿.md(共 86 行)" },
            ],
            done: `成稿完成:三行结论先行,待办与过程附后,全文 markdown。文档已挂回路附件:${topic} 已完成。`,
            failCall: { type: "tool_use", tool: "Read", input: { file_path: "notes/历史归档/2025-纪要索引.md", limit: 80 } },
            runningCall: {
              type: "tool_use",
              tool: "Write",
              input: { file_path: "docs/纪要-草稿.md", content: "# 纪要(更新中)\n\n## 结论\n1. …" },
            },
          }
        : {
            claim: `已认领:${topic}。先取数,再校验口径,最后出汇总。`,
            thinking: `任务涉及多张表,先确认数据源可达,再决定取数顺序。优先跑轻查询探量级,避免全表扫描。`,
            calls: [
              {
                type: "tool_use",
                tool: "Bash",
                input: { command: "psql -h warehouse.internal -c \"SELECT count(*) FROM ods.orders WHERE dt >= date_trunc('quarter', now())\"" },
              },
              { type: "tool_result", tool: "Bash", output: " count\n-------\n 12840\n(1 row)\n\n耗时 340ms" },
              { type: "tool_use", tool: "Read", input: { file_path: "/data/exports/quarterly-metrics.csv", limit: 50 } },
              {
                type: "tool_result",
                tool: "Read",
                output: "metric,q_value,yoy\ngmv,4.82亿,+12.4%\norders,12840,+8.1%\narpu,3753,+4.0%\n…(共 12 项指标)",
              },
            ],
            done: `12 项指标全部取数完成,口径与上季度一致(两处小数位差异已修正)。产出已挂回路附件,给出一句话摘要:${topic} 已完成。`,
            failCall: {
              type: "tool_use",
              tool: "Bash",
              input: { command: "psql -h warehouse.internal -c \"SELECT * FROM ods.user_profile_wide LIMIT 10\"" },
            },
            runningCall: {
              type: "tool_use",
              tool: "Bash",
              input: { command: "python analyze.py --quarter 2026Q2 --out /data/exports/dashboard.json" },
            },
          };

  const out: TaskMessagePayload[] = [
    msg({ type: "text", content: script.claim }, 2),
    msg({ type: "thinking", content: script.thinking }, 6),
    msg(script.calls[0], 10),
    msg(script.calls[1], 14),
    msg(script.calls[2], 20),
    msg(script.calls[3], 24),
  ];

  if (t.status === "completed") {
    out.push(msg({ type: "text", content: script.done }, 30));
  } else if (t.status === "failed") {
    out.push(
      msg(script.failCall, 28),
      msg(
        { type: "error", content: t.error || "执行失败" },
        // error 时刻对齐 Run 的 completed_at(codex 双审:固定偏移会晚于行内时长)
        t.completed_at
          ? Math.max(30, Math.round((new Date(t.completed_at).getTime() - new Date(base).getTime()) / 1000))
          : 30,
      ),
    );
  } else if (t.status === "cancelled") {
    out.push(msg({ type: "text", content: "收到取消指令,已停止后续步骤并清理临时文件。" }, 40));
  } else if (t.status === "running") {
    out.push(msg(script.runningCall, 30));
  } else {
    // queued 等:尚未开跑,无消息
    return [];
  }
  return out;
}
