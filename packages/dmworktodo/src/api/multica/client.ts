/**
 * [INPUT]: ./types 契约类型;./mockInbox 内存数据源。
 * [OUTPUT]: 收件箱域 API 面(listInbox/markInboxRead/archiveInbox/getUnreadInboxCount/
 *           markAllInboxRead/archiveAllInbox/archiveAllReadInbox/archiveCompletedInbox)
 *           + 纯函数 deduplicateInboxItems(客户端去重,镜像 multica core/inbox/queries.ts)。
 * [POS]: dmworktodo/api/multica 的 client 层——【换源点】。函数名/签名/返回形状逐一对齐
 *        multica packages/core/api/client.ts L1470-1511(契约对照表 §1.11),今日实现=mock,
 *        接线日把函数体换成第三套 axios 实例(X-Workspace-ID 头 + Octo 鉴权中间件 token,
 *        见契约表 §5 迁移基础设施备忘),消费方零改动。
 *        未做(接线期再入):getInboxUnreadSummary(跨组队红点,依赖组队切换器)、
 *        notification-preferences 二端点(依赖设置页)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import type { InboxItem } from "./types";
import * as db from "./mockInbox";

// mock 拟真延迟:让骨架屏/乐观路径按真实时序走一遍,接线时删。
const LATENCY = 120;
async function simulated<T>(fn: () => T): Promise<T> {
  await db.seedInbox();
  await new Promise((r) => setTimeout(r, LATENCY));
  return fn();
}

// GET /api/inbox —— 无参数,返回全量原始行(含 archived 与同回路多条),塑形在客户端。
export async function listInbox(): Promise<InboxItem[]> {
  return simulated(() => db.allItems());
}

// POST /api/inbox/{id}/read —— 返回变更后的整条,可直接 patch 本地态。
export async function markInboxRead(id: string): Promise<InboxItem> {
  return simulated(() => db.markRead(id));
}

// POST /api/inbox/{id}/archive
export async function archiveInbox(id: string): Promise<InboxItem> {
  return simulated(() => db.archive(id));
}

// GET /api/inbox/unread-count —— 当前组队未读徽标(NavRail badge 消费)。
export async function getUnreadInboxCount(): Promise<{ count: number }> {
  return simulated(() => ({ count: unreadCountOf(db.allItems()) }));
}

// POST /api/inbox/mark-all-read
export async function markAllInboxRead(): Promise<{ count: number }> {
  return simulated(() => ({ count: db.markAllRead() }));
}

// POST /api/inbox/archive-all
export async function archiveAllInbox(): Promise<{ count: number }> {
  return simulated(() => ({ count: db.archiveAll() }));
}

// POST /api/inbox/archive-all-read
export async function archiveAllReadInbox(): Promise<{ count: number }> {
  return simulated(() => ({ count: db.archiveAllRead() }));
}

// POST /api/inbox/archive-completed —— 按回路已完成/已取消归档(Linear 清理动作)。
export async function archiveCompletedInbox(): Promise<{ count: number }> {
  return simulated(() => ({ count: db.archiveCompleted() }));
}

// ── 纯函数(镜像 multica core/inbox/queries.ts deduplicateInboxItems L76-112)──
// 滤掉 archived → 按 issue_id ?? id 分组取最新 → created_at 倒序。
export function deduplicateInboxItems(items: InboxItem[]): InboxItem[] {
  const groups = new Map<string, InboxItem>();
  for (const it of items) {
    if (it.archived) continue;
    const key = it.issue_id ?? it.id;
    const cur = groups.get(key);
    if (!cur || it.created_at > cur.created_at) groups.set(key, it);
  }
  return [...groups.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// 未读数 = 去重后的未读条数(镜像 multica queries.ts L60-69)。
export function unreadCountOf(items: InboxItem[]): number {
  return deduplicateInboxItems(items).filter((it) => !it.read).length;
}

// ═══ worker(agent)域 —— 契约对照表 §1.7,函数名对齐 multica client.ts L829-1436 ═══
import type {
  Agent,
  AgentTask,
  AgentRunCount,
  AgentActivityBucket,
  AgentEnvResponse,
  AgentPresenceDetail,
  RuntimeSummary,
  UpdateAgentRequest,
} from "./types";
import * as wdb from "./mockWorkers";

// GET /api/agents?workspace_id&include_archived
export async function listAgents(params?: { include_archived?: boolean }): Promise<Agent[]> {
  return simulated(() =>
    params?.include_archived ? wdb.allAgents() : wdb.allAgents().filter((a) => !a.archived_at),
  );
}

// GET /api/agents/{id}
export async function getAgent(id: string): Promise<Agent> {
  return simulated(() => wdb.getAgentById(id));
}

// PUT /api/agents/{id} —— body 带 custom_env 服务端 400,env 走专用端点。
export async function updateAgent(id: string, req: UpdateAgentRequest): Promise<Agent> {
  return simulated(() => wdb.updateAgentIn(id, req));
}

// POST /api/agents/{id}/archive(软删,归档会取消活跃 Run)
export async function archiveAgent(id: string): Promise<Agent> {
  return simulated(() => wdb.archiveAgentIn(id));
}

// POST /api/agents/{id}/restore
export async function restoreAgent(id: string): Promise<Agent> {
  return simulated(() => wdb.restoreAgentIn(id));
}

// GET /api/agents/{id}/env —— owner/admin 限定,每次读记审计行(UI 用 reveal-first 流程)。
export async function getAgentEnv(id: string): Promise<AgentEnvResponse> {
  return simulated(() => wdb.envOf(id));
}

// PUT /api/agents/{id}/env —— 整体替换,漏 key 即删;值="****"=保留原密文。
export async function updateAgentEnv(
  id: string,
  req: { custom_env: Record<string, string> },
): Promise<AgentEnvResponse> {
  return simulated(() => wdb.updateEnvOf(id, req.custom_env));
}

// GET /api/agents/{agentId}/tasks —— 该 worker 全部 Run。
export async function listAgentTasks(agentId: string): Promise<AgentTask[]> {
  return simulated(() => wdb.tasksOf(agentId));
}

// GET /api/agent-task-snapshot —— 活跃 Run + 每 worker 最近终态,全 app 唯一 presence 数据源。
export async function getAgentTaskSnapshot(): Promise<AgentTask[]> {
  return simulated(() => wdb.taskSnapshot());
}

// GET /api/agent-run-counts —— 30 天运行次数(列表 RUNS 列)。
export async function getWorkspaceAgentRunCounts(): Promise<AgentRunCount[]> {
  return simulated(() => wdb.runCounts());
}

// GET /api/agent-activity-30d —— 稀疏日桶(只含有 completion 的天),锚 completed_at。
export async function getWorkspaceAgentActivity30d(): Promise<AgentActivityBucket[]> {
  return simulated(() => wdb.activity30d());
}

// GET /api/runtimes —— 建虾流 runtime 选择器 + presence 派生用。
export async function listRuntimes(): Promise<RuntimeSummary[]> {
  return simulated(() => wdb.allRuntimes());
}

// ── presence 派生(镜像 multica core/agents/derive-presence:双正交维度,archived 短路)──
const ACTIVE_RUN = new Set(["queued", "dispatched", "waiting_local_directory", "running"]);

export function deriveAgentPresence(
  agent: Agent,
  runtime: RuntimeSummary | undefined,
  snapshot: AgentTask[],
): AgentPresenceDetail {
  const mine = snapshot.filter((t) => t.agent_id === agent.id && ACTIVE_RUN.has(t.status));
  const runningCount = mine.filter((t) => t.status === "running").length;
  const queuedCount = mine.length - runningCount;
  const workload = runningCount > 0 ? "working" : queuedCount > 0 ? "queued" : "idle";
  if (agent.archived_at) return { availability: "archived", workload, runningCount, queuedCount };
  let availability: AgentPresenceDetail["availability"] = "offline";
  if (runtime?.status === "online") availability = "online";
  else if (runtime && Date.now() - new Date(runtime.last_seen_at).getTime() < 5 * 60_000)
    availability = "unstable"; // recently_lost:5 分钟内失联,琥珀
  return { availability, workload, runningCount, queuedCount };
}

// ── 30 天桶派生(镜像 multica core/agents/use-agent-activity:定长 30,index 29=今天)──
export interface ActivityDay {
  total: number;
  failed: number;
}

export function deriveActivityBuckets(
  buckets: AgentActivityBucket[],
  agentId: string,
): ActivityDay[] {
  const out: ActivityDay[] = Array.from({ length: 30 }, () => ({ total: 0, failed: 0 }));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const b of buckets) {
    if (b.agent_id !== agentId) continue;
    const d = new Date(b.bucket_at);
    d.setHours(0, 0, 0, 0);
    const daysAgo = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (daysAgo < 0 || daysAgo > 29) continue;
    out[29 - daysAgo] = { total: b.task_count, failed: b.failed_count };
  }
  return out;
}

// 尾窗 rollup(列表用 7 桶,详情用 30 桶——同一入口,数字与柱子不漂)。
export function summarizeActivity(buckets: ActivityDay[], windowDays: number) {
  const win = buckets.slice(-windowDays);
  const total = win.reduce((s, b) => s + b.total, 0);
  const failed = win.reduce((s, b) => s + b.failed, 0);
  return { total, failed, successRate: total > 0 ? (total - failed) / total : null };
}
