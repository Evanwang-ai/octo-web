/**
 * [INPUT]: api/multica 的 getSquad/updateSquad/deleteSquad/listSquadMembers/addSquadMember/
 *          removeSquadMember/getSquadMemberStatus/listAgents;./WorkersView 的 WorkerAvatar;
 *          ../UserName;../MemberPicker 不用(双态简化 select,欠账换正式 picker)。
 * [OUTPUT]: 对外默认导出 SquadDetailView —— 小队详情(⭐Wave A-5)。
 * [POS]: dmworktodo/ui/MatterListView 的小队详情,MatterRouteHost view="squadDetail" 挂载。
 *        结构镜像 multica squad-detail-page:左 Inspector(身份/领队/成员数/创建者)+
 *        右双 tab(成员=5态灯+role+活跃回路+移除+添加 / Instructions=编辑保存,
 *        Squad Instructions 建后 PUT 补的契约坑由此闭环)。删除=两击确认(对齐 ScheduleModal 惯例)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { WKApp } from "@octo/base";
import {
  getSquad,
  updateSquad,
  deleteSquad,
  listSquadMembers,
  addSquadMember,
  removeSquadMember,
  getSquadMemberStatus,
  listAgents,
} from "../../api/multica/client";
import type {
  Agent,
  Squad,
  SquadMember,
  SquadMemberStatus,
  SquadMemberType,
} from "../../api/multica/types";
import UserName from "../UserName";
import { WorkerAvatar } from "./WorkersView";
import WorkerHoverArea from "./WorkerHoverCard";
import "./squads.css";

const STATUS_CONF: Record<string, { label: string; cls: string }> = {
  working: { label: "工作中", cls: "is-online" },
  idle: { label: "空闲", cls: "is-idle" },
  unstable: { label: "不稳定", cls: "is-unstable" },
  offline: { label: "离线", cls: "is-offline" },
  archived: { label: "已归档", cls: "is-offline" },
};

export default function SquadDetailView({
  squadId,
  onBack,
}: {
  squadId: string;
  onBack: () => void;
}) {
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [statuses, setStatuses] = useState<SquadMemberStatus[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tab, setTab] = useState<"members" | "instructions">("members");
  // S6 卡③(FM 战术规划器):阵容板(默认)/分配表 双视图。
  const [memberView, setMemberView] = useState<"board" | "table">("board");
  const [busy, setBusy] = useState(false);
  const [delArmed, setDelArmed] = useState(false);
  // Instructions 编辑
  const [insDraft, setInsDraft] = useState("");
  const [insDirty, setInsDirty] = useState(false);
  // 添加成员(简化双态:类型 select + 对象 select + role 输入;欠账=正式双态 picker)
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<SquadMemberType>("agent");
  const [addId, setAddId] = useState("");
  const [addRole, setAddRole] = useState("");

  const reload = async () => {
    const [s, m, st] = await Promise.all([
      getSquad(squadId),
      listSquadMembers(squadId),
      getSquadMemberStatus(squadId),
    ]);
    setSquad(s);
    setMembers(m);
    setStatuses(st.members);
    // 未保存的 Instructions 草稿不被成员增删触发的 reload 覆盖(codex 双审 finding)。
    setInsDraft((prev) => (insDirty ? prev : s.instructions));
  };

  useEffect(() => {
    reload();
    listAgents().then(setAgents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadId]);

  const agentName = useMemo(() => new Map(agents.map((a) => [a.id, a.name])), [agents]);
  const statusOf = (t: SquadMemberType, id: string) =>
    statuses.find((s) => s.member_type === t && s.member_id === id);

  if (!squad) {
    return (
      <div className="sqd-root">
        <div className="sqd-empty">加载中…</div>
      </div>
    );
  }

  // 成员行 = 领队(恒第一,徽章)+ members 表行。
  const rows: Array<{ member_type: SquadMemberType; member_id: string; role: string; isLeader: boolean }> = [
    { member_type: "agent", member_id: squad.leader_id, role: "领队", isLeader: true },
    ...members.map((m) => ({ member_type: m.member_type, member_id: m.member_id, role: m.role, isLeader: false })),
  ];

  return (
    <div className="sqd-root">
      <div className="sqd-crumb">
        <button className="sqd-back" type="button" onClick={onBack}>
          小队
        </button>
        <span className="sqd-crumb-sep">›</span>
        <span className="sqd-crumb-name">{squad.name}</span>
        <span className="sqd-head-spacer" />
        <button
          type="button"
          className={`sqd-del-btn${delArmed ? " is-armed" : ""}`}
          disabled={busy}
          onClick={async () => {
            if (!delArmed) {
              setDelArmed(true);
              return;
            }
            setBusy(true);
            try {
              await deleteSquad(squadId);
              onBack();
            } finally {
              setBusy(false);
            }
          }}
          onBlur={() => setDelArmed(false)}
        >
          {delArmed ? "再点一次确认删除" : "删除小队"}
        </button>
      </div>

      <div className="sqd-body">
        <aside className="sqd-inspector">
          <div className="sqd-id-card">
            <WorkerAvatar name={squad.name} size={56} />
            <div className="sqd-id-name">{squad.name}</div>
            {squad.description && <div className="sqd-id-desc">{squad.description}</div>}
          </div>
          <div className="sqd-group">
            <div className="sqd-group-title">属性</div>
            <div className="sqd-prop">
              <span className="sqd-prop-k">领队</span>
              <span className="sqd-prop-v">
                <WorkerAvatar name={agentName.get(squad.leader_id) || "?"} size={16} />
                {agentName.get(squad.leader_id) || squad.leader_id.slice(0, 8)}
              </span>
            </div>
            <div className="sqd-prop">
              <span className="sqd-prop-k">成员</span>
              <span className="sqd-prop-v">{rows.length} 人</span>
            </div>
            <div className="sqd-prop">
              <span className="sqd-prop-k">创建者</span>
              <span className="sqd-prop-v">
                <WKAvatar
                  channel={new Channel(squad.creator_id, ChannelTypePerson)}
                  style={{ width: 16, height: 16, borderRadius: "50%" }}
                />
                <UserName uid={squad.creator_id} />
              </span>
            </div>
          </div>
        </aside>

        <main className="sqd-main">
          <div className="sqd-tabs" role="tablist">
            {(
              [
                { key: "members", label: "成员" },
                { key: "instructions", label: "Instructions" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`sqd-tab${tab === t.key ? " is-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="sqd-tab-body">
            {tab === "members" && (
              <section className="sqd-card">
                <div className="sqd-card-title-row">
                  <span className="sqd-card-title">
                    成员 <span className="sqd-count">{rows.length}</span>
                  </span>
                  <span className="sqd-view-toggle">
                    <button
                      type="button"
                      className={`sqd-vt${memberView === "board" ? " is-active" : ""}`}
                      onClick={() => setMemberView("board")}
                    >
                      阵容板
                    </button>
                    <button
                      type="button"
                      className={`sqd-vt${memberView === "table" ? " is-active" : ""}`}
                      onClick={() => setMemberView("table")}
                    >
                      分配表
                    </button>
                  </span>
                  <button type="button" className="sqd-btn-ghost" onClick={() => setAddOpen((v) => !v)}>
                    + 添加成员
                  </button>
                </div>
                {addOpen && (
                  <div className="sqd-add-row">
                    <select
                      className="sqd-input"
                      value={addType}
                      onChange={(e) => {
                        setAddType(e.target.value as SquadMemberType);
                        setAddId("");
                      }}
                    >
                      <option value="agent">worker</option>
                      <option value="member">组队成员</option>
                    </select>
                    {addType === "agent" ? (
                      <select className="sqd-input" value={addId} onChange={(e) => setAddId(e.target.value)}>
                        <option value="">选择 worker</option>
                        {agents
                          .filter((a) => !a.archived_at && a.id !== squad.leader_id)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        className="sqd-input"
                        placeholder="成员 uid(欠账:换正式选人器)"
                        value={addId}
                        onChange={(e) => setAddId(e.target.value)}
                      />
                    )}
                    <input
                      className="sqd-input"
                      placeholder="角色(可选)"
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value)}
                    />
                    <button
                      type="button"
                      className="sqd-btn-primary"
                      disabled={!addId || busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await addSquadMember(squadId, {
                            member_type: addType,
                            member_id: addType === "member" && !addId ? WKApp.loginInfo.uid || "" : addId,
                            role: addRole.trim() || undefined,
                          });
                          setAddOpen(false);
                          setAddId("");
                          setAddRole("");
                          await reload();
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      添加
                    </button>
                  </div>
                )}
                {memberView === "board" && (
                  <div className="sqd-board">
                    {(() => {
                      const leader = rows[0];
                      const lst = statusOf(leader.member_type, leader.member_id);
                      const lconf = lst?.status ? STATUS_CONF[lst.status] : null;
                      const lprimary = lst?.active_issues?.[0];
                      return (
                        <div className="sqd-board-leader">
                          <div className="sqd-pcard is-leader">
                            <WorkerHoverArea agentId={leader.member_id}>
                              <WorkerAvatar
                                name={agentName.get(leader.member_id) || "?"}
                                size={44}
                                dot={lconf?.cls}
                              />
                            </WorkerHoverArea>
                            <div className="sqd-pcard-name">
                              {agentName.get(leader.member_id) || leader.member_id.slice(0, 8)}
                            </div>
                            <div className="sqd-pcard-role is-leader">领队</div>
                            <div className="sqd-pcard-sub">
                              {lprimary ? `正在处理 ${lprimary.identifier}` : lconf?.label || ""}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="sqd-board-line" aria-hidden />
                    <div className="sqd-board-members">
                      {rows.slice(1).map((r) => {
                        const st = r.member_type === "agent" ? statusOf(r.member_type, r.member_id) : null;
                        const conf = st?.status ? STATUS_CONF[st.status] : null;
                        const primary = st?.active_issues?.[0];
                        return (
                          <div key={`b-${r.member_type}-${r.member_id}`} className="sqd-pcard">
                            {r.member_type === "agent" ? (
                              <WorkerHoverArea agentId={r.member_id}>
                                <WorkerAvatar
                                  name={agentName.get(r.member_id) || "?"}
                                  size={40}
                                  dot={conf?.cls}
                                />
                              </WorkerHoverArea>
                            ) : (
                              <WKAvatar
                                channel={new Channel(r.member_id, ChannelTypePerson)}
                                style={{ width: 40, height: 40, borderRadius: "50%" }}
                              />
                            )}
                            <div className="sqd-pcard-name">
                              {r.member_type === "agent" ? (
                                agentName.get(r.member_id) || r.member_id.slice(0, 8)
                              ) : (
                                <UserName uid={r.member_id} />
                              )}
                            </div>
                            <div className="sqd-pcard-role">{r.role || (r.member_type === "member" ? "人类成员" : "成员")}</div>
                            <div className="sqd-pcard-sub">
                              {primary ? `正在处理 ${primary.identifier}` : conf?.label || (r.member_type === "member" ? "" : "")}
                            </div>
                          </div>
                        );
                      })}
                      <button type="button" className="sqd-pcard is-ghost" onClick={() => setAddOpen(true)}>
                        <span className="sqd-pcard-plus">+</span>
                        <div className="sqd-pcard-role">添加成员</div>
                      </button>
                    </div>
                  </div>
                )}
                {memberView === "table" && rows.map((r) => {
                  const st = r.member_type === "agent" ? statusOf(r.member_type, r.member_id) : null;
                  const conf = st?.status ? STATUS_CONF[st.status] : null;
                  const primary = st?.active_issues?.[0];
                  return (
                    <div key={`${r.member_type}-${r.member_id}`} className="sqd-member-row">
                      {r.member_type === "agent" ? (
                        <WorkerHoverArea agentId={r.member_id}>
                          <WorkerAvatar
                            name={agentName.get(r.member_id) || "?"}
                            size={28}
                            dot={conf?.cls}
                          />
                        </WorkerHoverArea>
                      ) : (
                        <WKAvatar
                          channel={new Channel(r.member_id, ChannelTypePerson)}
                          style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }}
                        />
                      )}
                      <span className="sqd-member-main">
                        <span className="sqd-member-name">
                          {r.member_type === "agent" ? (
                            agentName.get(r.member_id) || r.member_id.slice(0, 8)
                          ) : (
                            <UserName uid={r.member_id} />
                          )}
                          {r.isLeader && <span className="sqd-leader-chip">领队</span>}
                          {r.role && !r.isLeader && <span className="sqd-role">{r.role}</span>}
                        </span>
                        <span className="sqd-member-sub">
                          {conf ? conf.label : r.member_type === "member" ? "人类成员" : ""}
                          {primary && ` · 正在处理 ${primary.identifier} ${primary.title}`}
                        </span>
                      </span>
                      {!r.isLeader && (
                        <button
                          type="button"
                          className="sqd-remove"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await removeSquadMember(squadId, {
                                member_type: r.member_type,
                                member_id: r.member_id,
                              });
                              await reload();
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            {tab === "instructions" && (
              <section className="sqd-card">
                <div className="sqd-card-title-row">
                  <span className="sqd-card-title">Squad Instructions</span>
                  <button
                    type="button"
                    className="sqd-btn-primary"
                    disabled={!insDirty || busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const next = await updateSquad(squadId, { instructions: insDraft });
                        setSquad(next);
                        setInsDraft(next.instructions);
                        setInsDirty(false);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    保存
                  </button>
                </div>
                <p className="sqd-hint">给整个小队的协作规约:分工、交接、纪律。领队接单时注入上下文。</p>
                <textarea
                  className="sqd-textarea"
                  rows={14}
                  placeholder={"例如:先写失败用例再动手;一切数字可溯源…"}
                  value={insDraft}
                  onChange={(e) => {
                    setInsDraft(e.target.value);
                    setInsDirty(e.target.value !== squad.instructions);
                  }}
                />
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
