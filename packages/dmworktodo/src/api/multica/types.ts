/**
 * [INPUT]: 无(纯类型,零依赖)。
 * [OUTPUT]: multica 契约类型——收件箱域(InboxSeverity/InboxItemType/InboxItem/InboxWorkspaceUnread)。
 * [POS]: dmworktodo/api/multica 的契约层。字段名/枚举逐字照抄 multica packages/core/types/inbox.ts
 *        (契约对照表 §1.11:9 收件箱端点 + 2 通知偏好全绿)。mock 与未来真实 client 共用同一形状,
 *        接线=换数据源不改组件。multica 原词(issue/workspace)只许出现在本代码层,
 *        UI 外显一律过词表:issue→回路(Loop)、workspace→组队、agent→worker、task→Run。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */

export type InboxSeverity = "action_required" | "attention" | "info";

// 18 种事件型,照抄 multica core/types/inbox.ts L5-23。
export type InboxItemType =
  | "issue_assigned"
  | "issue_subscribed"
  | "unassigned"
  | "assignee_changed"
  | "status_changed"
  | "priority_changed"
  | "start_date_changed"
  | "due_date_changed"
  | "new_comment"
  | "mentioned"
  | "review_requested"
  | "task_completed"
  | "task_failed"
  | "agent_blocked"
  | "agent_completed"
  | "reaction_added"
  | "quick_create_done"
  | "quick_create_failed";

export interface InboxItem {
  id: string;
  workspace_id: string;
  recipient_type: "member" | "agent";
  recipient_id: string;
  // system = 平台触发(系统信位,契约表 §2.3-⑫);null = 无主事件。
  actor_type: "member" | "agent" | "system" | null;
  actor_id: string | null;
  // lenient:未知值走默认文案分支(对齐 multica mobile zod 的 z.string() 口径),
  // 前端本地注入的系统信(system_welcome)即走此通道。
  type: InboxItemType | (string & {});
  severity: InboxSeverity;
  // = 回路 id。mock 期指向本地 matter id(阅读窗直接嵌原生详情);null = 纯系统信。
  issue_id: string | null;
  title: string;
  body: string | null;
  // mock 期 = matter 七态(backlog/open/in_progress/review/done/cancelled/blocked);
  // 接线时按契约对照表 §5 建 multica IssueStatus 映射表(优先级编码反转的教训)。
  issue_status: string | null;
  read: boolean;
  archived: boolean;
  created_at: string;
  // 自由 string→string map。已知键:comment_id/identifier/original_prompt/agent_id/
  // error/to/emoji/new_assignee_id/new_assignee_type(multica inbox-detail-label 消费面)。
  details: Record<string, string> | null;
}

// GET /api/inbox/unread-summary 元素(跨组队未读,全契约唯一跨 workspace 聚合先例)。
export interface InboxWorkspaceUnread {
  workspace_id: string;
  count: number;
}

// ═══ worker(agent)域 —— 契约对照表 §1.7,字段照抄 multica core/types/agent.ts ═══

// 服务端原始 status(展示基本不用;UI 在线态用前端派生的 presence,见 client.ts)。
export type AgentStatus = "idle" | "working" | "blocked" | "error" | "offline";
export type AgentVisibility = "workspace" | "private";

// Agent 内嵌技能摘要(list 批量 join,仅三列;全量走 skills 域)。
export interface AgentSkillSummary {
  id: string;
  name: string;
  description: string;
}

export interface Agent {
  id: string;
  workspace_id: string;
  runtime_id: string;
  name: string;
  description: string;
  // Instructions 一等字段(契约表⑰:与 Evan 拍板命名天然一致,纯 string 存 markdown)。
  instructions: string;
  avatar_url: string | null;
  runtime_mode: "local" | "cloud";
  custom_args: string[];
  // env 真实值绝不随 Agent 载荷下发:只给粗粒度标志+数量,读写走专用 /env 端点(审计)。
  has_custom_env?: boolean;
  custom_env_key_count?: number;
  mcp_config?: unknown | null;
  mcp_config_redacted?: boolean;
  visibility: AgentVisibility;
  status: AgentStatus;
  max_concurrent_tasks: number;
  model: string; // runtime-native 模型 id,空串=CLI 默认
  thinking_level?: string; // runtime-native,空串=无 override,不跨 provider 归一
  owner_id: string | null;
  skills: AgentSkillSummary[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
}

// PUT /api/agents/{id}:custom_env 故意不在此(带上服务端 400),env 走专用端点。
export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  instructions?: string;
  runtime_id?: string;
  custom_args?: string[];
  mcp_config?: unknown | null; // tri-state:省略=不变/null=清空/对象=替换
  visibility?: AgentVisibility;
  max_concurrent_tasks?: number;
  model?: string;
  thinking_level?: string;
}

// GET/PUT /api/agents/{id}/env:owner/admin 限定,每次读写记审计;值="****"=保留原密文。
export interface AgentEnvResponse {
  agent_id: string;
  custom_env: Record<string, string>;
}

// ── Run(AgentTask)──
export type AgentTaskStatus =
  | "queued"
  | "dispatched"
  | "waiting_local_directory" // 同路径锁 park 态,归类 queued
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentTask {
  id: string;
  agent_id: string;
  runtime_id: string;
  issue_id: string; // 无关联回路时为空串
  status: AgentTaskStatus;
  priority: number;
  dispatched_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  result: unknown;
  error: string | null;
  failure_reason?: string;
  created_at: string;
  kind?: "comment" | "autopilot" | "chat" | "quick_create" | "direct";
  trigger_summary?: string;
  handoff_note?: string;
  attempt?: number;
  relative_work_dir?: string; // 隐私安全展示形式,UI 优先用它
}

// ── 统计三端点(均无参数,workspace 由 header 解析,返回扁平数组)──
export interface AgentRunCount {
  agent_id: string;
  run_count: number; // 30 天总运行数,列表 RUNS 列
}

export interface AgentActivityBucket {
  agent_id: string;
  bucket_at: string; // UTC 午夜 ISO;服务端只返回有 completion 的天
  task_count: number;
  failed_count: number;
}

// ── 前端派生 presence(镜像 multica core/agents/derive-presence,双正交维度)──
export type AgentAvailability = "online" | "unstable" | "offline" | "archived";
export type AgentWorkload = "working" | "queued" | "idle";
export interface AgentPresenceDetail {
  availability: AgentAvailability;
  workload: AgentWorkload;
  runningCount: number;
  queuedCount: number;
}

// ── Runtime(mock 期最小形状;接线时照 multica core/types/runtime.ts 对齐)──
export interface RuntimeSummary {
  id: string;
  name: string;
  provider: string; // claude/codex/openclaw…
  status: "online" | "offline";
  last_seen_at: string;
}
