/**
 * [INPUT]: 依赖 api/todoApi 的 getMatter/listTimeline/listOutputs/listActivities/addTimelineEntry/
 *          transitionMatter/updateMatter/listProjects/getIterations/getMatterTree/createSubMatter/addFeedback;
 *          @octo/base 的 WKApp/WKAvatar/ContextMenus;./rowMenus 的 priorityMenu、
 *          ./icons 的 StatusIcon/PriorityIcon/STATUS_*;utils/toast。
 * [OUTPUT]: 默认导出 MatterDetailView(原生回路详情:标题/状态/blocker banner/review banner[通过=done·需要修改=feedback打回]/
 *          Brief/计划(mode)/子任务(计划图 PlanGraph[有子任务时]+派子任务)/迭代(iterations 轮次)/
 *          进度(activities)/动态(timeline)/产出/发车 composer/Inspector[状态·优先级·项目 可编辑])。
 * [POS]: dmworktodo/ui/MatterListView 的详情视图,被 MatterRouteHost 以 view="detail" 挂载;
 *        真相源 vanilla feat/loop paintMatter/paintInspector;领队/协作者对齐 vanilla 只读。兄弟:index/rowMenus/icons。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { WKApp, ContextMenus } from "@octo/base";
import type { ContextMenusContext, ContextMenusData } from "@octo/base";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import {
  getMatter,
  listTimeline,
  listOutputs,
  listActivities,
  addTimelineEntry,
  transitionMatter,
  updateMatter,
  listProjects,
  getIterations,
  getMatterTree,
  createSubMatter,
  addFeedback,
} from "../../api/todoApi";
import type { MatterIterations, MatterTreeChild } from "../../api/todoApi";
import type {
  MatterDetail,
  TimelineEntry,
  MatterOutput,
  MatterActivity,
  MatterStatus,
  MatterPriority,
  TimelineReq,
} from "../../bridge/types";
import UserName from "../UserName";
import { Toast } from "../../utils/toast";
import { StatusIcon, PriorityIcon } from "./icons";
import { priorityMenu } from "./rowMenus";
import { STATUS_ORDER, STATUS_LABEL } from "./icons";
import PlanGraph from "./PlanGraph";
import "./detail.css";

// 真实后端字段比 bridge/types 的 MatterDetail 多(stale),本地增广。
type MatterDetailFull = MatterDetail & {
  mode?: string;
  leader_uid?: string;
  project_id?: string;
};

const isBot = (uid?: string) => !!uid && uid.endsWith("_bot");
const PRIORITY_LABEL = ["无", "低", "中", "高", "紧急"];
const MODE_LABEL: Record<string, string> = {
  critic: "评审",
  roundtable: "圆桌",
  swarm: "蜂群",
  single: "单兵",
};
// 迭代轮次结果人话(/iterations outcome + current_outcome)。
const OUTCOME_LABEL: Record<string, string> = {
  pending_review: "待确认",
  accepted: "已通过",
  needs_revision: "需修改",
  rejected: "已否决",
  in_progress: "进行中",
  sent_back: "已打回",
};

// activities 人话(对齐 vanilla actHuman);detail 形状随 action 变。
function actHuman(a: MatterActivity): string {
  const d = (a.detail || {}) as Record<string, unknown>;
  const st = (k: unknown) => STATUS_LABEL[k as string] || String(k ?? "");
  switch (a.action) {
    case "created":
      return "创建了回路";
    case "child_created":
      return "派发子任务";
    case "feedback_added":
      return "圈了一笔";
    case "status_changed":
      return d.from || d.to ? `状态 ${st(d.from)} → ${st(d.to)}` : "更新了状态";
    case "priority_changed":
      return "改了优先级";
    case "project_changed":
      return "改了项目";
    case "leader_changed":
      return "换了领队";
    case "title_changed":
      return "改了标题";
    case "description_changed":
      return "更新了 Brief";
    case "deadline_changed":
      return "改了截止时间";
    case "assignee_added":
      return "加了协作者";
    case "assignee_removed":
      return "移除了协作者";
    case "channel_linked":
      return "关联了频道";
    case "channel_unlinked":
      return "取消关联频道";
    default:
      return a.action;
  }
}

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
  onBack,
}: {
  matterId: string;
  projectName?: string;
  onBack?: () => void;
}) {
  const myUid = WKApp.loginInfo.uid ?? "";
  const [matter, setMatter] = useState<MatterDetailFull | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [outputs, setOutputs] = useState<MatterOutput[]>([]);
  const [activities, setActivities] = useState<MatterActivity[]>([]);
  const [iterations, setIterations] = useState<MatterIterations | null>(null);
  const [children, setChildren] = useState<MatterTreeChild[]>([]);
  const [subOpen, setSubOpen] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const [subBusy, setSubBusy] = useState(false);
  // review 决策:需要修改(圈一笔=feedback,后端自动打回 review→in_progress)
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseNote, setReviseNote] = useState("");
  const [reviseBusy, setReviseBusy] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [menuData, setMenuData] = useState<ContextMenusData[]>([]);
  const ctxRef = useRef<ContextMenusContext | null>(null);
  const mountedRef = useRef(true);
  // 写操作代际:并发写时只让"最新发起"的响应落地,防旧响应覆盖新状态。
  const writeGenRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reloadTimeline = useCallback(() => {
    listTimeline(matterId)
      .then((tl) => {
        if (mountedRef.current) setTimeline(tl.data || []);
      })
      .catch(() => {});
  }, [matterId]);
  const reloadActivities = useCallback(() => {
    listActivities(matterId, { limit: 20 })
      .then((ac) => {
        if (mountedRef.current) setActivities(ac.data || []);
      })
      .catch(() => {});
  }, [matterId]);
  const reloadTree = useCallback(() => {
    getMatterTree(matterId)
      .then((t) => {
        if (mountedRef.current) setChildren(t.children || []);
      })
      .catch(() => {});
  }, [matterId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // getMatter 关键请求:决定加载态与是否"未找到"。
    getMatter(matterId)
      .then((m) => {
        if (alive) setMatter(m as MatterDetailFull);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    // timeline / outputs / activities 非关键:各自兜底,失败不拖垮详情。
    listTimeline(matterId)
      .then((tl) => {
        if (alive) setTimeline(tl.data || []);
      })
      .catch(() => {});
    listOutputs(matterId)
      .then((out) => {
        if (alive) setOutputs(out.data || []);
      })
      .catch(() => {});
    listActivities(matterId, { limit: 20 })
      .then((ac) => {
        if (alive) setActivities(ac.data || []);
      })
      .catch(() => {});
    // 迭代轮次:非关键,失败静默(单兵/无多轮的回路可能返回空或 404)。
    getIterations(matterId)
      .then((it) => {
        if (alive) setIterations(it);
      })
      .catch(() => {});
    // 子任务树:非关键,失败静默。
    getMatterTree(matterId)
      .then((t) => {
        if (alive) setChildren(t.children || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [matterId]);

  // 项目候选(Inspector 改项目 select)。一次拉取,失败静默。
  useEffect(() => {
    let alive = true;
    listProjects()
      .then((ps) => {
        if (alive) setProjects(ps);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await addTimelineEntry(matterId, { content: text } as TimelineReq);
      if (!mountedRef.current) return;
      setDraft("");
      reloadTimeline();
    } catch {
      if (mountedRef.current) Toast.error("发送失败");
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  // 写后落地守护:仍挂载 && 本次是最新代际(旧响应不覆盖新状态)。
  const applyIfLatest = (gen: number, m: MatterDetailFull) => {
    if (!mountedRef.current || gen !== writeGenRef.current) return;
    setMatter(m);
    WKApp.mittBus.emit("wk:matter-updated", { matterId });
    reloadActivities();
  };

  const changeStatus = async (status: string) => {
    const gen = ++writeGenRef.current;
    try {
      const m = await transitionMatter(matterId, status as MatterStatus);
      applyIfLatest(gen, m as MatterDetailFull);
    } catch {
      // 非法流转被后端拒绝(400/409):受控 select 自动回弹到 matter.status,补提示。
      if (mountedRef.current) Toast.error("状态流转被拒绝");
    }
  };

  const changePriority = async (p: number) => {
    const gen = ++writeGenRef.current;
    try {
      const m = await updateMatter(matterId, { priority: p as MatterPriority });
      applyIfLatest(gen, m as MatterDetailFull);
    } catch {
      if (mountedRef.current) Toast.error("优先级修改失败");
    }
  };

  const changeProject = async (pid: string) => {
    const gen = ++writeGenRef.current;
    try {
      const m = await updateMatter(matterId, { project_id: pid || null });
      applyIfLatest(gen, m as MatterDetailFull);
    } catch {
      if (mountedRef.current) Toast.error("项目修改失败");
    }
  };

  // 需要修改(圈一笔):POST /feedback,后端在 review 态自动打回 review→in_progress + 门铃。
  const sendRevision = async () => {
    const content = reviseNote.trim();
    if (!content || reviseBusy) return;
    setReviseBusy(true);
    // Codex#2:纳入 writeGenRef 代际守护 —— 晚到的打回响应不覆盖更新的本地写。
    const gen = ++writeGenRef.current;
    try {
      await addFeedback(matterId, { content });
      if (!mountedRef.current) return;
      setReviseNote("");
      setReviseOpen(false);
      const m = await getMatter(matterId); // 拉新状态(后端已自动打回)
      applyIfLatest(gen, m as MatterDetailFull); // 仅最新代际落地(内含 setMatter+emit+reloadActivities)
    } catch {
      if (mountedRef.current) Toast.error("打回失败");
    } finally {
      if (mountedRef.current) setReviseBusy(false);
    }
  };

  // 派子任务:标题 + parent_matter_id(+ 继承父项目);step 自动。树即权限由后端守卫。
  const createSub = async () => {
    const title = subTitle.trim();
    if (!title || subBusy) return;
    setSubBusy(true);
    const n = children.length + 1;
    try {
      await createSubMatter({
        title,
        parent_matter_id: matterId,
        step_id: `step-${n}`,
        step_order: n,
        ...(matter?.project_id ? { project_id: matter.project_id } : {}),
      });
      if (!mountedRef.current) return;
      setSubTitle("");
      setSubOpen(false);
      reloadTree();
      reloadActivities();
      WKApp.mittBus.emit("wk:matter-updated", { matterId });
    } catch {
      if (mountedRef.current) Toast.error("派子任务失败");
    } finally {
      if (mountedRef.current) setSubBusy(false);
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

        {/* 状态 banner:受阻(可解除)/ 待确认("轮到你了")—— 对齐 vanilla blocker/review banner。
            status 字面量七态,MatterStatus 共享类型仍三态(兼容旧 UI),故 as string 比较。 */}
        {(matter.status as string) === "blocked" && (
          <div className="mdv-banner is-block">
            <div className="mdv-banner-row">
              <span className="mdv-banner-txt">当前卡点 · 需要处理</span>
              <button
                type="button"
                className="mdv-banner-btn"
                onClick={() => changeStatus("in_progress")}
              >
                解除阻塞
              </button>
            </div>
          </div>
        )}
        {(matter.status as string) === "review" && (
          <div className="mdv-banner is-review">
            <div className="mdv-banner-row">
              <span className="mdv-banner-txt">
                {matter.creator_id === myUid ? "轮到你了 · 有结果待确认" : "等待确认中"}
              </span>
              {matter.creator_id === myUid && (
                <div className="mdv-banner-acts">
                  <button
                    type="button"
                    className="mdv-banner-btn is-ghost"
                    onClick={() => setReviseOpen((v) => !v)}
                  >
                    需要修改
                  </button>
                  <button
                    type="button"
                    className="mdv-banner-btn is-ok"
                    onClick={() => changeStatus("done")}
                  >
                    通过
                  </button>
                </div>
              )}
            </div>
            {reviseOpen && matter.creator_id === myUid && (
              <div className="mdv-revise">
                <textarea
                  className="mdv-revise-input"
                  rows={2}
                  aria-label="修改意见"
                  placeholder="要改哪里?发出去 = 打回给领队重做(会记一笔 feedback)"
                  value={reviseNote}
                  onChange={(e) => setReviseNote(e.target.value)}
                />
                <button
                  type="button"
                  className="mdv-revise-go"
                  onClick={sendRevision}
                  disabled={reviseBusy || !reviseNote.trim()}
                >
                  {reviseBusy ? "打回中…" : "打回"}
                </button>
              </div>
            )}
          </div>
        )}

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

        {/* 子任务(派活):children 来自 /tree;派子任务=createSubMatter(parent_matter_id)。
            树即权限由后端守卫(仅 leader/creator/人类协作者可派)。 */}
        <div className="mdv-section">
          <div className="mdv-section-head">
            子任务<span className="mdv-section-count">{children.length}</span>
            <button
              type="button"
              className="mdv-sub-add"
              onClick={() => setSubOpen((v) => !v)}
            >
              + 派一个子任务
            </button>
          </div>
          {subOpen && (
            <div className="mdv-sub-form">
              <input
                className="mdv-sub-input"
                autoFocus
                maxLength={200}
                aria-label="子任务名称"
                placeholder="这个子任务要办成什么"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    createSub();
                  } else if (e.key === "Escape") {
                    setSubOpen(false);
                    setSubTitle("");
                  }
                }}
              />
              <button
                type="button"
                className="mdv-sub-go"
                onClick={createSub}
                disabled={subBusy || !subTitle.trim()}
              >
                {subBusy ? "派出中…" : "派出去"}
              </button>
            </div>
          )}
          {children.length > 0 ? (
            <PlanGraph
              leaderUid={matter.leader_uid}
              mode={matter.mode}
              status={matter.status}
              nodes={children}
            />
          ) : (
            !subOpen && <div className="mdv-empty">暂无子任务</div>
          )}
        </div>

        {/* 迭代轮次(/iterations):领队多轮提交/反馈周期。current_outcome=当前态。 */}
        {iterations && iterations.rounds.length > 0 && (
          <div className="mdv-section">
            <div className="mdv-section-head">
              迭代<span className="mdv-section-count">{iterations.total_rounds} 轮</span>
              {iterations.current_outcome && (
                <span
                  className="mdv-iter-outcome"
                  data-outcome={iterations.current_outcome}
                >
                  {OUTCOME_LABEL[iterations.current_outcome] || iterations.current_outcome}
                </span>
              )}
            </div>
            <div className="mdv-iters" role="list">
              {iterations.rounds.map((r) => (
                <div key={r.round} className="mdv-iter" role="listitem">
                  <span className="mdv-iter-round">第 {r.round} 轮</span>
                  <span className="mdv-iter-badge" data-outcome={r.outcome || ""}>
                    {OUTCOME_LABEL[r.outcome || ""] || r.outcome || "—"}
                  </span>
                  {r.submitted_by && (
                    <span className="mdv-iter-by">
                      <UserName uid={r.submitted_by} />
                    </span>
                  )}
                  <span className="mdv-iter-time">
                    {relTime(r.submitted_at || r.started_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 进度 = activities 审计轨迹(对齐 vanilla:进度取 /activities) */}
        {activities.length > 0 && (
          <div className="mdv-section">
            <div className="mdv-section-head">
              进度<span className="mdv-section-count">{activities.length} 条</span>
            </div>
            <div className="mdv-acts" role="list">
              {activities.map((a) => (
                <div key={a.id} className="mdv-act" role="listitem">
                  <span className="mdv-act-dot" />
                  <span className="mdv-act-actor">
                    <UserName uid={a.actor_id} />
                  </span>
                  <span className="mdv-act-text">{actHuman(a)}</span>
                  <span className="mdv-act-time">{relTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 动态 = timeline(发车 composer 写入的进展/讨论) */}
        <div className="mdv-section">
          <div className="mdv-section-head">
            动态<span className="mdv-section-count">{timeline.length} 条</span>
          </div>
          <div className="mdv-timeline" role="list">
            {timeline.length === 0 && <div className="mdv-empty">还没有动态</div>}
            {timeline.map((e) => (
              <div key={e.id} className="mdv-tl-row" role="listitem">
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
            aria-label="添加进展"
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
            aria-label="状态"
            value={matter.status}
            onChange={(e) => changeStatus(e.target.value)}
          >
            {/* 兜底:matter.status 不在七态清单(如历史 archived)时,补一个当前项,避免 select 失配。 */}
            {!(STATUS_ORDER as readonly string[]).includes(matter.status) && (
              <option value={matter.status}>{STATUS_LABEL[matter.status] || matter.status}</option>
            )}
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
          {/* 优先级:可编辑(点开 ContextMenus 菜单;补 vanilla detail 未接线的按钮) */}
          <div className="mdv-prop">
            <span className="mdv-prop-label">优先级</span>
            <button
              type="button"
              className="mdv-prop-val mdv-prop-edit"
              onClick={(e) => {
                setMenuData(priorityMenu(matter.priority, changePriority));
                ctxRef.current?.show(e);
              }}
            >
              <PriorityIcon level={matter.priority ?? 0} size={14} />
              {PRIORITY_LABEL[matter.priority ?? 0]}
            </button>
          </div>
          <PropAvatar label="发起人" uid={matter.creator_id} />
          {matter.leader_uid && <PropAvatar label="领队" uid={matter.leader_uid} />}
          {(matter.assignees || []).map((a) => (
            <PropAvatar key={a.id} label="协作者" uid={a.user_id} />
          ))}
          {/* 项目:可编辑 select */}
          <div className="mdv-prop">
            <span className="mdv-prop-label">项目</span>
            <select
              className="mdv-prop-sel"
              aria-label="项目"
              value={matter.project_id || ""}
              onChange={(e) => changeProject(e.target.value)}
            >
              <option value="">未指定</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* 优先级快改菜单(单实例,数据驱动) */}
      <ContextMenus onContext={(c) => { ctxRef.current = c; }} menus={menuData} />
    </div>
  );
}
