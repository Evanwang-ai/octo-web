/**
 * [INPUT]: api/multica 的 listSquads/createSquad/listAgents;./WorkersView 的 WorkerAvatar;
 *          ../UserName;@octo/base WKAvatar。
 * [OUTPUT]: 对外默认导出 SquadsView —— 小队列表 + 新建弹窗(⭐Wave A-5)。
 * [POS]: dmworktodo/ui/MatterListView 的小队列表,MatterRouteHost view="squads" 挂载。
 *        结构镜像 multica squads-page(ListGrid:名+描述/领队/成员头像堆/创建)+
 *        create-squad 弹窗(名/描述/leader 必选;成员到详情页加,multica 创建弹窗的
 *        多选成员器记欠账)。词表:squad→小队,leader→领队。数据走 api/multica mock。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { listSquads, createSquad, listAgents } from "../../api/multica/client";
import type { Agent, Squad } from "../../api/multica/types";
import UserName from "../UserName";
import { WorkerAvatar } from "./WorkersView";
import WorkerHoverArea from "./WorkerHoverCard";
import "./squads.css";

function fmtDays(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const days = Math.floor(d / 86_400_000);
  if (days <= 0) return "今天";
  return `${days} 天前`;
}

export default function SquadsView({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const [squads, setSquads] = useState<Squad[] | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => listSquads().then(setSquads);

  useEffect(() => {
    reload();
    listAgents().then(setAgents);
  }, []);

  const agentName = useMemo(() => new Map(agents.map((a) => [a.id, a.name])), [agents]);
  const canSubmit = name.trim() && leaderId && !busy;

  // 关闭即清表单(取消/遮罩关闭也不残留上次输入,codex 双审 finding)。
  const closeCreate = () => {
    setCreateOpen(false);
    setName("");
    setDesc("");
    setLeaderId("");
  };

  return (
    <div className="sqd-root">
      <div className="sqd-head">
        <span className="sqd-title">小队</span>
        <span className="sqd-head-spacer" />
        <button type="button" className="sqd-new-btn" onClick={() => setCreateOpen(true)}>
          + 新建小队
        </button>
      </div>
      <div className="sqd-list">
        {squads === null ? (
          <div className="sqd-empty">加载中…</div>
        ) : squads.length === 0 ? (
          <div className="sqd-empty">还没有小队 —— 新建一个,让领队 worker 带队干活。</div>
        ) : (
          /* 行=Listview 语法:40px 单行、无列头,描述内联吃剩余宽,领队/成员堆/时间右缘聚集。 */
          squads.map((s) => (
            <button key={s.id} type="button" className="sqd-row" onClick={() => onOpenDetail(s.id)}>
              <WorkerAvatar name={s.name} size={20} />
              <span className="sqd-name">{s.name}</span>
              {s.description && <span className="sqd-desc">{s.description}</span>}
              <span className="sqd-leader">
                <WorkerHoverArea agentId={s.leader_id} className="sqd-leader-hover">
                  <WorkerAvatar name={agentName.get(s.leader_id) || "?"} size={18} />
                  {agentName.get(s.leader_id) || s.leader_id.slice(0, 8)}
                </WorkerHoverArea>
              </span>
              <span className="sqd-members">
                {(s.member_preview || []).length === 0 && !s.member_count ? (
                  <span className="sqd-none">—</span>
                ) : (
                  <>
                    <span className="sqd-stack">
                      {(s.member_preview || []).map((m) =>
                        m.member_type === "agent" ? (
                          <WorkerAvatar key={m.member_id} name={agentName.get(m.member_id) || "?"} size={18} />
                        ) : (
                          <WKAvatar
                            key={m.member_id}
                            channel={new Channel(m.member_id, ChannelTypePerson)}
                            style={{ width: 18, height: 18, borderRadius: "50%" }}
                          />
                        ),
                      )}
                    </span>
                    {(s.member_count || 0) > (s.member_preview || []).length && (
                      <span className="sqd-more-n">+{(s.member_count || 0) - (s.member_preview || []).length}</span>
                    )}
                  </>
                )}
              </span>
              <span className="sqd-created">{fmtDays(s.created_at)}</span>
            </button>
          ))
        )}
      </div>

      {createOpen && (
        <div className="sqd-overlay" onMouseDown={closeCreate}>
          <div className="sqd-modal" role="dialog" aria-label="创建小队" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sqd-modal-title">创建小队</div>
            <p className="sqd-modal-hint">领队 worker 接收分配给此小队的所有任务并协调团队。</p>
            <label className="sqd-field">
              <span>名称</span>
              <input
                className="sqd-input"
                placeholder="例如 数据分析小队"
                value={name}
                onChange={(e) => setName(e.target.value)}
                // 弹窗首字段自动聚焦
                autoFocus
              />
            </label>
            <label className="sqd-field">
              <span>描述</span>
              <input
                className="sqd-input"
                placeholder="这个小队负责什么…"
                value={desc}
                maxLength={255}
                onChange={(e) => setDesc(e.target.value)}
              />
            </label>
            <label className="sqd-field">
              <span>领队</span>
              <select className="sqd-input" value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
                <option value="">选择一个领队 worker</option>
                {agents
                  .filter((a) => !a.archived_at)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <p className="sqd-modal-note">成员可在创建后进小队详情添加(worker 或组队成员)。</p>
            <div className="sqd-modal-foot">
              <button type="button" className="sqd-btn-ghost" onClick={closeCreate}>
                取消
              </button>
              <button
                type="button"
                className="sqd-btn-primary"
                disabled={!canSubmit}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const s = await createSquad({ name: name.trim(), description: desc.trim(), leader_id: leaderId });
                    closeCreate();
                    await reload();
                    onOpenDetail(s.id);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                创建小队
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
