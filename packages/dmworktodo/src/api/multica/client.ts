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
