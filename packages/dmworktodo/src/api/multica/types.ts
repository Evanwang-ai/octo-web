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
