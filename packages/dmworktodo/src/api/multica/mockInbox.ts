/**
 * [INPUT]: ./types 的 InboxItem;../todoApi 的 listMatters(水合数据源)。
 * [OUTPUT]: seedInbox / 内存态收件箱 mock 数据库(读 + 变更函数,供 ./client 消费)。
 * [POS]: dmworktodo/api/multica 的 mock 数据源(UI 先行拍板 2026-07-02)。
 *        水合策略:从本地 matter 后端取真实回路,按回路状态合成语义一致的收件箱事件
 *        (review→请你确认、blocked→worker 需协助、done→执行完成…),issue_id=真 matter id,
 *        阅读窗因此能直接嵌原生 MatterDetailView;后端不可用时降级为纯静态 fixtures。
 *        另恒注入一条 actor=system 的欢迎系统信(契约表 §2.3-⑫:V1 前端本地注入,不依赖后端)。
 *        接线时整文件废弃,client.ts 换真实 fetch,组件零改动。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import { WKApp } from "@octo/base";
import { listMatters } from "../todoApi";
import type { Matter } from "../../bridge/types";
import type { InboxItem } from "./types";

// ── 内存态 ──
let items: InboxItem[] = [];
let seededFor: string | null = null; // spaceId,切 Space 重新水合
let seeding: Promise<void> | null = null;

const isBot = (uid?: string) => !!uid && uid.endsWith("_bot");

function iso(msAgo: number): string {
  return new Date(Date.now() - msAgo).toISOString();
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// 欢迎系统信(仿 Linear "Welcome to Linear" 收件箱首信;type 走 lenient 通道)。
function welcomeItem(spaceId: string): InboxItem {
  return {
    id: "sys-welcome",
    workspace_id: spaceId,
    recipient_type: "member",
    recipient_id: WKApp.loginInfo.uid || "",
    actor_type: "system",
    actor_id: null,
    type: "system_welcome",
    severity: "info",
    issue_id: null,
    title: "欢迎使用收件箱",
    body: [
      "回路的一切动向都会汇集到这里:指派、状态流转、评论与 @提及、worker 的执行结果与求助。",
      "",
      "- **未读**:标题加粗、蓝点标记;点开即读",
      "- **归档**:行内悬停出现归档按钮;右上 ⋯ 菜单支持批量操作",
      "- **系统信**:平台通知(如本条)也会出现在这里",
      "",
      "选中一条与回路相关的通知,右侧会直接展开该回路的完整详情。",
    ].join("\n"),
    issue_status: null,
    read: false,
    archived: false,
    created_at: iso(3 * DAY),
    details: null,
  };
}

// 后端不可用时的静态兜底(无 issue_id,阅读窗走轻量卡)。
function staticFixtures(spaceId: string, me: string): InboxItem[] {
  const base = {
    workspace_id: spaceId,
    recipient_type: "member" as const,
    recipient_id: me,
    issue_id: null,
    issue_status: null,
    archived: false,
    details: null,
  };
  return [
    {
      ...base,
      id: "fx-1",
      actor_type: "agent",
      actor_id: "demo_bot",
      type: "agent_completed",
      severity: "info",
      title: "整理季度数据看板",
      body: "已完成 12 项指标的取数与校验,产出已挂到回路。",
      read: false,
      created_at: iso(25 * MIN),
    },
    {
      ...base,
      id: "fx-2",
      actor_type: "agent",
      actor_id: "demo_bot",
      type: "agent_blocked",
      severity: "action_required",
      title: "同步 CRM 客户口径",
      body: null,
      read: false,
      created_at: iso(2 * HOUR),
      details: { error: "缺少数据源访问凭证,需要你补充授权" },
    },
    {
      ...base,
      id: "fx-3",
      actor_type: "member",
      actor_id: me,
      type: "status_changed",
      severity: "info",
      title: "梳理新人入职手册",
      body: null,
      read: true,
      created_at: iso(1 * DAY),
      details: { to: "in_progress" },
    },
    welcomeItem(spaceId),
  ];
}

// 合成事件的正文池(按回路 index 轮取,避免同屏多条同句复读;确定性)。
const PROGRESS_BODIES = [
  "进展同步:主链路已跑通,剩余边界情况正在收尾。",
  "数据核对完成,正在整理结论与图表。",
  "初稿已出,等一轮内部核对后提交。",
  "接口联调通过,还差两个用例待补。",
  "阶段目标完成,下一步开始整合产出。",
];
const BLOCKED_REASONS = [
  "缺少数据源访问凭证,需要你补充授权",
  "需求描述有歧义,需要你确认口径后继续",
  "外部接口连续超时,需要人工确认后重试",
];

// 从真实回路合成事件:按状态派发语义一致的通知型,actor 取创建者/执行人真 uid(头像可解析)。
function synthesize(matters: Matter[], spaceId: string, me: string): InboxItem[] {
  const out: InboxItem[] = [];
  let n = 0;
  const push = (
    m: Matter,
    partial: Pick<InboxItem, "type" | "severity" | "actor_type" | "actor_id"> &
      Partial<Pick<InboxItem, "body" | "details" | "read">>,
    msAgo: number,
  ) => {
    out.push({
      id: `mock-${++n}`,
      workspace_id: spaceId,
      recipient_type: "member",
      recipient_id: me,
      actor_type: partial.actor_type,
      actor_id: partial.actor_id,
      type: partial.type,
      severity: partial.severity,
      issue_id: m.id,
      title: m.title,
      body: partial.body ?? null,
      issue_status: m.status,
      read: partial.read ?? false,
      archived: false,
      created_at: iso(msAgo),
      details: partial.details ?? null,
    });
  };

  const memberOf = (m: Matter) =>
    m.assignees?.map((a) => a.user_id).find((u) => !isBot(u)) || m.creator_id;
  const botOf = (m: Matter) => m.assignees?.map((a) => a.user_id).find(isBot);

  matters.forEach((m, i) => {
    // 时间散布:越靠前的回路事件越新,读态随时间衰减(近期未读、久远已读)。
    const age = 8 * MIN + i * 100 * MIN;
    const read = age > 12 * HOUR;
    const bot = botOf(m);
    // bridge/types 的 MatterStatus 枚举陈旧(不含 feat/loop 七态),按 string 分派。
    switch (m.status as string) {
      case "review":
        push(m, {
          type: "review_requested",
          severity: "action_required",
          actor_type: bot ? "agent" : "member",
          actor_id: bot || memberOf(m),
          read: false,
        }, age);
        break;
      case "blocked":
        push(m, {
          type: "agent_blocked",
          severity: "action_required",
          actor_type: "agent",
          actor_id: bot || memberOf(m),
          details: { error: BLOCKED_REASONS[i % BLOCKED_REASONS.length] },
          read: false,
        }, age);
        break;
      case "done":
        push(m, {
          type: bot ? "agent_completed" : "task_completed",
          severity: "info",
          actor_type: bot ? "agent" : "member",
          actor_id: bot || memberOf(m),
          read,
        }, age);
        break;
      case "in_progress":
        // 同一回路两条(评论较新 + 状态较旧)——验证按回路去重只显最新。
        push(m, {
          type: "new_comment",
          severity: "attention",
          actor_type: "member",
          actor_id: memberOf(m),
          body: PROGRESS_BODIES[i % PROGRESS_BODIES.length],
          read,
        }, age);
        push(m, {
          type: "status_changed",
          severity: "info",
          actor_type: "member",
          actor_id: memberOf(m),
          details: { to: "in_progress" },
          read: true,
        }, age + 5 * HOUR);
        break;
      case "open":
        push(m, {
          type: "issue_assigned",
          severity: "attention",
          actor_type: "member",
          actor_id: m.creator_id,
          details: bot
            ? { new_assignee_id: bot, new_assignee_type: "agent" }
            : { new_assignee_id: memberOf(m), new_assignee_type: "member" },
          read,
        }, age);
        break;
      case "cancelled":
        push(m, {
          type: "status_changed",
          severity: "info",
          actor_type: "member",
          actor_id: m.creator_id,
          details: { to: "cancelled" },
          read: true,
        }, age);
        break;
      default: // backlog 等
        push(m, {
          type: "mentioned",
          severity: "attention",
          actor_type: "member",
          actor_id: m.creator_id,
          body: "这条思路你看下,要发送吗?",
          read,
        }, age);
    }
  });
  return out;
}

// 幂等水合:同 Space 只做一次;并发调用共享同一次 seeding;切 Space 后按新 spaceId 重来。
export async function seedInbox(): Promise<void> {
  const spaceId = WKApp.shared.currentSpaceId || "";
  if (seededFor === spaceId) return;
  if (seeding) {
    await seeding;
    // seeding 期间 Space 可能又变了,递归再核一次。
    return seedInbox();
  }
  seeding = (async () => {
    const me = WKApp.loginInfo.uid || "";
    try {
      const resp = await listMatters();
      const matters = (resp.data || []).slice(0, 12);
      items = matters.length
        ? [...synthesize(matters, spaceId, me), welcomeItem(spaceId)]
        : staticFixtures(spaceId, me);
      seededFor = spaceId;
    } catch {
      // 降级种子不缓存(启动早期 token/space 未就绪会 401):本次先给静态兜底,
      // 下次调用重试水合,成功后整体替换 —— badge/列表自愈。
      items = staticFixtures(spaceId, me);
      seededFor = null;
    }
    seeding = null;
  })();
  return seeding;
}

// ── 读 ──
export function allItems(): InboxItem[] {
  return items.map((it) => ({ ...it }));
}

// ── 变更(返回值形状对齐 multica 契约:单条返 InboxItem,批量返 {count})──
function mutate(id: string, patch: Partial<InboxItem>): InboxItem {
  const idx = items.findIndex((it) => it.id === id);
  if (idx < 0) throw new Error("inbox item not found");
  items[idx] = { ...items[idx], ...patch };
  return { ...items[idx] };
}

export function markRead(id: string): InboxItem {
  return mutate(id, { read: true });
}

export function archive(id: string): InboxItem {
  return mutate(id, { archived: true });
}

function batch(pred: (it: InboxItem) => boolean, patch: Partial<InboxItem>): number {
  let count = 0;
  items = items.map((it) => {
    if (!pred(it)) return it;
    count++;
    return { ...it, ...patch };
  });
  return count;
}

export function markAllRead(): number {
  return batch((it) => !it.read && !it.archived, { read: true });
}

export function archiveAll(): number {
  return batch((it) => !it.archived, { archived: true });
}

export function archiveAllRead(): number {
  return batch((it) => it.read && !it.archived, { archived: true });
}

export function archiveCompleted(): number {
  return batch(
    (it) => !it.archived && (it.issue_status === "done" || it.issue_status === "cancelled"),
    { archived: true },
  );
}
