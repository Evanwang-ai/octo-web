// L3 | MatterDetailView — 原生 React 回路详情(目标① 替 iframe 详情)。
// 数据复用 getMatter/listTimeline/listOutputs/addTimelineEntry/transitionMatter。
// 区块对齐 feat/loop:标题 + 状态 + Brief + 计划(mode) + 进度 timeline + 产出 + 发车 composer + Inspector(状态流转/编号/优先级/发起人/领队/协作者/项目)。
import React, { useCallback, useEffect, useState } from "react";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import {
  getMatter,
  listTimeline,
  listOutputs,
  addTimelineEntry,
  transitionMatter,
} from "../../api/todoApi";
import type {
  MatterDetail,
  TimelineEntry,
  MatterOutput,
  MatterStatus,
  TimelineReq,
} from "../../bridge/types";
import UserName from "../UserName";
import { StatusIcon, PriorityIcon, STATUS_ORDER, STATUS_LABEL } from "./icons";
import "./detail.css";

const isBot = (uid?: string) => !!uid && uid.endsWith("_bot");
const PRIORITY_LABEL = ["无", "低", "中", "高", "紧急"];
const MODE_LABEL: Record<string, string> = {
  critic: "评审",
  roundtable: "圆桌",
  swarm: "蜂群",
  single: "单兵",
};

function relTime(iso?: string): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (!ts) return "";
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function PropAvatar({ label, uid }: { label: string; uid: string }) {
  return (
    <div className="mdv-prop">
      <span className="mdv-prop-label">{label}</span>
      <span className="mdv-prop-val">
        <WKAvatar
          channel={new Channel(uid, ChannelTypePerson)}
          style={{ width: 18, height: 18, borderRadius: "50%" }}
        />
        <span className="mdv-prop-name">
          <UserName uid={uid} />
        </span>
        {isBot(uid) && <span className="mdv-ai">AI</span>}
      </span>
    </div>
  );
}

export default function MatterDetailView({
  matterId,
  projectName,
  onBack,
}: {
  matterId: string;
  projectName?: string;
  onBack?: () => void;
}) {
  const [matter, setMatter] = useState<MatterDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [outputs, setOutputs] = useState<MatterOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const reloadTimeline = useCallback(() => {
    listTimeline(matterId)
      .then((tl) => setTimeline(tl.data || []))
      .catch(() => {});
  }, [matterId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([getMatter(matterId), listTimeline(matterId), listOutputs(matterId)])
      .then(([m, tl, out]) => {
        if (!alive) return;
        setMatter(m);
        setTimeline(tl.data || []);
        setOutputs(out.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [matterId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await addTimelineEntry(matterId, { content: text } as TimelineReq);
      setDraft("");
      reloadTimeline();
    } catch {
      /* surfaced by toast layer elsewhere */
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: MatterStatus) => {
    try {
      const m = await transitionMatter(matterId, status);
      setMatter(m);
    } catch {
      /* invalid transition rejected by backend */
    }
  };

  if (loading && !matter) {
    return (
      <div className="mdv">
        <div className="mdv-loading">加载中…</div>
      </div>
    );
  }
  if (!matter) {
    return (
      <div className="mdv">
        <div className="mdv-loading">未找到回路</div>
      </div>
    );
  }

  return (
    <div className="mdv">
      <div className="mdv-main">
        <div className="mdv-crumb">
          {onBack && (
            <button className="mdv-back" type="button" onClick={onBack}>
              全部回路
            </button>
          )}
          <span className="mdv-crumb-sep">›</span>
          <span className="mdv-crumb-id">M-{matter.seq_no}</span>
        </div>

        <h1 className="mdv-title">{matter.title}</h1>
        <div className="mdv-statusline">
          <StatusIcon status={matter.status} size={16} />
          <span>{STATUS_LABEL[matter.status] || matter.status}</span>
        </div>

        {matter.description && (
          <div className="mdv-brief">
            <div className="mdv-brief-label">Brief</div>
            <div className="mdv-brief-body">{matter.description}</div>
          </div>
        )}

        {matter.mode && (
          <div className="mdv-plan">
            <span className="mdv-plan-label">计划</span>
            <span className="mdv-plan-mode">{MODE_LABEL[matter.mode] || matter.mode}</span>
          </div>
        )}

        <div className="mdv-section">
          <div className="mdv-section-head">
            进度<span className="mdv-section-count">{timeline.length} 条</span>
          </div>
          <div className="mdv-timeline">
            {timeline.length === 0 && <div className="mdv-empty">还没有动态</div>}
            {timeline.map((e) => (
              <div key={e.id} className="mdv-tl-row">
                <span className="mdv-tl-av">
                  <WKAvatar
                    channel={new Channel(e.user_id, ChannelTypePerson)}
                    style={{ width: 22, height: 22, borderRadius: "50%" }}
                  />
                </span>
                <div className="mdv-tl-body">
                  <div className="mdv-tl-meta">
                    <span className="mdv-tl-name">
                      <UserName uid={e.user_id} />
                    </span>
                    {isBot(e.user_id) && <span className="mdv-ai">AI</span>}
                    <span className="mdv-tl-time">{relTime(e.created_at)}</span>
                  </div>
                  {e.content && <div className="mdv-tl-content">{e.content}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {outputs.length > 0 && (
          <div className="mdv-section">
            <div className="mdv-section-head">
              产出<span className="mdv-section-count">{outputs.length} 条</span>
            </div>
            <div className="mdv-outputs">
              {outputs.map((o) => (
                <a
                  key={o.id}
                  className="mdv-output"
                  href={o.file_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {o.file_name || o.file_url}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mdv-composer">
          <input
            className="mdv-input"
            placeholder="说一句 — 会记进这单的动态"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            className="mdv-send"
            type="button"
            onClick={send}
            disabled={sending || !draft.trim()}
          >
            发送
          </button>
        </div>
      </div>

      <aside className="mdv-insp">
        <div className="mdv-insp-status">
          <select
            className="mdv-status-sel"
            value={matter.status}
            onChange={(e) => changeStatus(e.target.value as MatterStatus)}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] || s}
              </option>
            ))}
          </select>
        </div>
        <div className="mdv-props">
          <div className="mdv-prop">
            <span className="mdv-prop-label">编号</span>
            <span className="mdv-prop-val mdv-mono">M-{matter.seq_no}</span>
          </div>
          <div className="mdv-prop">
            <span className="mdv-prop-label">优先级</span>
            <span className="mdv-prop-val">
              <PriorityIcon level={matter.priority ?? 0} size={14} />
              {PRIORITY_LABEL[matter.priority ?? 0]}
            </span>
          </div>
          <PropAvatar label="发起人" uid={matter.creator_id} />
          {matter.leader_uid && <PropAvatar label="领队" uid={matter.leader_uid} />}
          {(matter.assignees || []).map((a) => (
            <PropAvatar key={a.id} label="协作者" uid={a.user_id} />
          ))}
          {projectName && (
            <div className="mdv-prop">
              <span className="mdv-prop-label">项目</span>
              <span className="mdv-prop-val">{projectName}</span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
