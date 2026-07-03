/**
 * [INPUT]: api/multica 的 client(listInbox/markInboxRead/archiveInbox/批量四件)+ types.InboxItem;
 *          ./icons 的 StatusIcon/STATUS_LABEL/PriorityIcon;./rowMenus 的 PRIORITY_OPTIONS;
 *          ../UserName;./MatterDetailView(阅读窗内嵌);@octo/base 的 WKApp/ContextMenus/
 *          WKAvatar/MarkdownContent。
 * [OUTPUT]: 对外默认导出 InboxView —— 原生收件箱(split-pane:列表列 + 阅读窗),
 *           替掉全站最后一个 iframe 表面。
 * [POS]: dmworktodo/ui/MatterListView 的收件箱视图,MatterRouteHost view="inbox" 挂载。
 *        结构参照 multica views/inbox(inbox-page/inbox-list-item/inbox-detail-label),
 *        视觉参照 Linear INBOX(Bus/Linear/INBOX 截图 + Linear-2 figma 实测:列表列 380px、
 *        行内缩 8px 圆角 8px、13px 标题/12px 摘要与时间);颜色一律 --wk-*。
 *        数据走 mock(api/multica/client 换源点),变更后 emit wk:inbox-changed 供 NavRail badge 刷新。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { WKApp, ContextMenus } from "@octo/base";
import type { ContextMenusContext, ContextMenusData } from "@octo/base";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import MarkdownContent from "@octo/base/src/Messages/Text/MarkdownContent";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import {
  listInbox,
  markInboxRead,
  archiveInbox,
  markAllInboxRead,
  archiveAllInbox,
  archiveAllReadInbox,
  archiveCompletedInbox,
  deduplicateInboxItems,
} from "../../api/multica/client";
import type { InboxItem } from "../../api/multica/types";
import { StatusIcon, PriorityIcon, STATUS_LABEL } from "./icons";
import { PRIORITY_OPTIONS } from "./rowMenus";
import UserName from "../UserName";
import MatterDetailView from "./MatterDetailView";
import "./inbox.css";

// ── 词表文案(multica InboxItemType → 中文;词表:issue→回路,agent→worker,task→执行)──
const TYPE_LABEL: Record<string, string> = {
  issue_assigned: "指派给你",
  issue_subscribed: "订阅的回路有更新",
  unassigned: "移除了执行人",
  assignee_changed: "更换了执行人",
  status_changed: "更新了状态",
  priority_changed: "调整了优先级",
  start_date_changed: "调整了开始日期",
  due_date_changed: "调整了截止日期",
  new_comment: "发表了评论",
  mentioned: "提到了你",
  review_requested: "请你确认结果",
  task_completed: "执行已完成",
  task_failed: "执行失败",
  agent_blocked: "worker 需要协助",
  agent_completed: "worker 已完成工作",
  reaction_added: "添加了回应",
  quick_create_done: "快速建单已完成",
  quick_create_failed: "快速建单失败",
  system_welcome: "系统消息",
};

// 相对时间(行右侧紧凑型,对齐 Linear "8w" 密度)。
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const d = Date.now() - t;
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  if (d < MIN) return "刚刚";
  if (d < HOUR) return `${Math.floor(d / MIN)}分钟`;
  if (d < DAY) return `${Math.floor(d / HOUR)}小时`;
  if (d < 7 * DAY) return `${Math.floor(d / DAY)}天`;
  const dt = new Date(t);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

function shortDate(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

// 展示标题(镜像 multica inbox-display.ts getInboxDisplayTitle):
// quick-create 剥 "Created XXX-1:" 前缀,失败态回退原始 prompt。
function displayTitle(item: InboxItem): string {
  const details = item.details ?? {};
  const single = (v?: string | null) => (v ?? "").replace(/\s+/g, " ").trim();
  if (item.type === "quick_create_done") {
    const cleaned = single(item.title).replace(/^Created\s+[A-Z][A-Z0-9]*-\d+:\s*/i, "");
    if (cleaned) return cleaned;
    const prompt = single(details.original_prompt);
    if (prompt) return prompt;
  }
  if (item.type === "quick_create_failed") {
    const prompt = single(details.original_prompt);
    if (prompt) return prompt;
  }
  return item.title;
}

// 摘要行(镜像 multica InboxDetailLabel 的 18 型 switch,文案过词表)。
function SummaryLine({ item }: { item: InboxItem }) {
  const details = item.details ?? {};
  const fallback = <span>{TYPE_LABEL[item.type] ?? item.type}</span>;
  switch (item.type) {
    case "status_changed": {
      if (!details.to) return fallback;
      return (
        <span className="ibx-summary-inline">
          将状态改为
          <StatusIcon status={details.to} size={12} />
          {STATUS_LABEL[details.to] || details.to}
        </span>
      );
    }
    case "priority_changed": {
      if (!details.to) return fallback;
      const p = Number(details.to);
      const label = PRIORITY_OPTIONS.find((o) => o.value === p)?.label || details.to;
      return (
        <span className="ibx-summary-inline">
          将优先级改为
          <PriorityIcon level={p} size={12} />
          {label}
        </span>
      );
    }
    case "issue_assigned":
    case "assignee_changed": {
      if (details.new_assignee_id) {
        return (
          <span>
            指派给 <UserName uid={details.new_assignee_id} />
          </span>
        );
      }
      return fallback;
    }
    case "start_date_changed":
      return <span>{details.to ? `将开始日期设为 ${shortDate(details.to)}` : "移除了开始日期"}</span>;
    case "due_date_changed":
      return <span>{details.to ? `将截止日期设为 ${shortDate(details.to)}` : "移除了截止日期"}</span>;
    case "new_comment":
    case "mentioned":
      return item.body ? <span>{item.body}</span> : fallback;
    case "reaction_added":
      return details.emoji ? <span>以 {details.emoji} 回应了评论</span> : fallback;
    case "quick_create_done":
      return details.identifier ? <span>已创建 {details.identifier}</span> : fallback;
    case "quick_create_failed": {
      const detail = (details.error || item.body || "").replace(/\s+/g, " ").trim();
      return detail ? <span>失败:{detail}</span> : fallback;
    }
    case "agent_blocked": {
      const err = (details.error || "").trim();
      return err ? <span>{`${TYPE_LABEL[item.type]}:${err}`}</span> : fallback;
    }
    default:
      return fallback;
  }
}

// 事件主体头像:member/agent 走 WKAvatar(真 uid 可解析);system 走 Octo 字标圆。
function ActorAvatar({ item, size }: { item: InboxItem; size: number }) {
  if (item.actor_type === "system" || !item.actor_id) {
    return (
      <span className="ibx-avatar-sys" style={{ width: size, height: size, fontSize: size * 0.46 }}>
        O
      </span>
    );
  }
  return (
    <WKAvatar
      channel={new Channel(item.actor_id, ChannelTypePerson)}
      style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0 }}
    />
  );
}

// 空态收件托盘图标(Linear Inbox 范式)。
function InboxGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 13.5 5.2 5.8A2 2 0 0 1 7.1 4.4h9.8a2 2 0 0 1 1.9 1.4L21 13.5V17a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 17v-3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3.4 13.5H8l1 2.2h6l1-2.2h4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function InboxView() {
  const [raw, setRaw] = useState<InboxItem[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<ContextMenusData[]>([]);
  const ctxRef = useRef<ContextMenusContext | null>(null);

  const items = useMemo(() => (raw ? deduplicateInboxItems(raw) : []), [raw]);
  const unread = useMemo(() => items.filter((it) => !it.read).length, [items]);
  const selected = useMemo(
    () => items.find((it) => (it.issue_id ?? it.id) === selectedKey) || null,
    [items, selectedKey],
  );

  const reload = async () => {
    const list = await listInbox();
    setRaw(list);
  };

  useEffect(() => {
    // 首载后广播一次:module 启动时 badge 可能在 space 就绪前拉到兜底数据,此处校正。
    reload().then(() => WKApp.mittBus.emit("wk:inbox-changed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (updated: InboxItem) =>
    setRaw((prev) => (prev ? prev.map((it) => (it.id === updated.id ? updated : it)) : prev));

  const notifyChanged = () => WKApp.mittBus.emit("wk:inbox-changed");

  // 选中即读(镜像 multica inbox-page 自动已读 effect)。
  const select = (item: InboxItem) => {
    setSelectedKey(item.issue_id ?? item.id);
    if (!item.read) {
      markInboxRead(item.id).then((updated) => {
        patch(updated);
        notifyChanged();
      });
    }
  };

  const archiveOne = (item: InboxItem) => {
    archiveInbox(item.id).then((updated) => {
      patch(updated);
      notifyChanged();
    });
    if ((item.issue_id ?? item.id) === selectedKey) setSelectedKey(null);
  };

  // 批量菜单(⋯):四个清理动作,做完全量重拉。
  const openBatchMenu = (e: React.MouseEvent) => {
    const run = (fn: () => Promise<{ count: number }>) => () => {
      fn().then(() => {
        reload();
        notifyChanged();
      });
    };
    setMenuData([
      { title: "全部标为已读", onClick: run(markAllInboxRead) },
      { title: "", separator: true },
      { title: "归档已读", onClick: run(archiveAllReadInbox) },
      { title: "归档已完成回路", onClick: run(archiveCompletedInbox) },
      { title: "归档全部", danger: true, onClick: run(archiveAllInbox) },
    ]);
    ctxRef.current?.show(e);
  };

  const listBody =
    raw === null ? (
      <div className="ibx-skel" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="ibx-skel-row">
            <span className="ibx-skel-avatar" />
            <span className="ibx-skel-lines">
              <span className="ibx-skel-bar" style={{ width: `${72 - i * 6}%` }} />
              <span className="ibx-skel-bar is-dim" style={{ width: `${48 + (i % 3) * 10}%` }} />
            </span>
          </div>
        ))}
      </div>
    ) : items.length === 0 ? (
      <div className="ibx-empty">
        <InboxGlyph size={30} />
        <span>收件箱空空如也</span>
      </div>
    ) : (
      <div className="ibx-rows" role="list">
        {items.map((item) => {
          const key = item.issue_id ?? item.id;
          return (
            <button
              key={key}
              type="button"
              role="listitem"
              className={`ibx-row${key === selectedKey ? " is-selected" : ""}${item.read ? " is-read" : ""}`}
              onClick={() => select(item)}
            >
              <ActorAvatar item={item} size={28} />
              <span className="ibx-row-main">
                <span className="ibx-row-top">
                  {!item.read && <span className="ibx-dot" aria-label="未读" />}
                  <span className="ibx-row-title">{displayTitle(item)}</span>
                  <span
                    className="ibx-row-archive"
                    role="button"
                    aria-label="归档"
                    title="归档"
                    onClick={(e) => {
                      e.stopPropagation();
                      archiveOne(item);
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <rect x="1.6" y="2.6" width="12.8" height="3.4" rx="1" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M3 6v6.2A1.8 1.8 0 0 0 4.8 14h6.4A1.8 1.8 0 0 0 13 12.2V6" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M6.4 8.8h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </span>
                  {item.issue_status && <StatusIcon status={item.issue_status} size={14} />}
                </span>
                <span className="ibx-row-bottom">
                  <span className="ibx-row-summary">
                    <SummaryLine item={item} />
                  </span>
                  <span className="ibx-row-time">{timeAgo(item.created_at)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );

  // 阅读窗:关联回路 → 内嵌原生详情;纯系统信 → 轻量卡;未选中 → 空态。
  const detailPane = selected ? (
    selected.issue_id ? (
      <div className="ibx-detail-host">
        <MatterDetailView
          key={selected.issue_id}
          matterId={selected.issue_id}
          onBack={() => setSelectedKey(null)}
          backLabel="收件箱"
        />
      </div>
    ) : (
      <div className="ibx-card-wrap">
        <div className="ibx-card">
          <ActorAvatar item={selected} size={40} />
          <h2 className="ibx-card-title">{displayTitle(selected)}</h2>
          <div className="ibx-card-meta">
            {TYPE_LABEL[selected.type] ?? selected.type} · {timeAgo(selected.created_at)}
          </div>
          {selected.body && (
            <div className="ibx-card-body">
              <MarkdownContent content={selected.body} />
            </div>
          )}
          <button type="button" className="ibx-card-archive" onClick={() => archiveOne(selected)}>
            归档
          </button>
        </div>
      </div>
    )
  ) : (
    <div className="ibx-empty is-detail">
      <InboxGlyph size={40} />
      <span>{items.length === 0 ? "所有通知都处理完了" : "选中左侧通知查看详情"}</span>
    </div>
  );

  return (
    <div className="ibx-root">
      <div className="ibx-list">
        <div className="ibx-list-head">
          <span className="ibx-title">收件箱</span>
          {unread > 0 && <span className="ibx-count">{unread}</span>}
          <span className="ibx-head-spacer" />
          <button
            type="button"
            className="ibx-icon-btn"
            aria-label="批量操作"
            title="批量操作"
            onClick={openBatchMenu}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <circle cx="3.2" cy="8" r="1.4" />
              <circle cx="8" cy="8" r="1.4" />
              <circle cx="12.8" cy="8" r="1.4" />
            </svg>
          </button>
        </div>
        <div className="ibx-list-scroll">{listBody}</div>
      </div>
      <div className="ibx-pane">{detailPane}</div>
      <ContextMenus onContext={(c) => { ctxRef.current = c; }} menus={menuData} />
    </div>
  );
}
