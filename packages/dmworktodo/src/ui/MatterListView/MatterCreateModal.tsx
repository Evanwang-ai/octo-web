/**
 * [INPUT]: 依赖 api/todoApi 的 createLoop/listProjects/uploadMatterAttachment;
 *          ui/MemberPicker(single/botsOnly 增量 prop);hooks/useMemberList(mode 配置选人的名字源)。
 * [OUTPUT]: 默认导出 MatterCreateModal —— 邮件式新建回路弹窗(vanilla buildNewMatterModal 直译):
 *           领队/协作者/主题(必填)/Brief/附件/折叠[追踪目标]/折叠[项目·优先级·截止日期·协作模式+配置],
 *           取消/保存草稿/发送。唯一必填=主题;多 Agent 模式需 ≥2 参与者。
 * [POS]: 只挂"新建回路"入口(module.tsx GlobalMatterModal 纯新建分支);
 *        IM 智能创建/QuickAdd/发送并创建仍走 SmartCreateModal,零回归。
 *        字段真相源=octo-matter index.html L9296-9567(submitCreate 实发字段)。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLoop,
  listProjects,
  uploadMatterAttachment,
  type CreateLoopReq,
  type ProjectItem,
} from "../../api/todoApi";
import type { MatterDetail } from "../../bridge/types";
import MemberPicker from "../MemberPicker";
import { useMemberList } from "../../hooks/useMemberList";
import "./matterCreate.css";

// 对齐 vanilla MODE_NAME(index.html L3074);"" = 单干(不发 mode 字段)。
const MODE_OPTS: { k: string; label: string }[] = [
  { k: "", label: "单干(默认)" },
  { k: "split", label: "分头干" },
  { k: "swarm", label: "撒网" },
  { k: "roundtable", label: "圆桌" },
  { k: "pipeline", label: "流水线" },
  { k: "critic", label: "生成-验证" },
];
// 需要 ≥2 参与者的多 Agent 模式(vanilla MULTI_AGENT_MODES)。
const MULTI_AGENT_MODES: Record<string, boolean> = {
  critic: true,
  roundtable: true,
  swarm: true,
  pipeline: true,
};
const isBotUid = (uid?: string) => !!uid && uid.endsWith("_bot");

export interface MatterCreateModalProps {
  open: boolean;
  prefillTitle?: string;
  prefillAssigneeUids?: string[];
  prefillProjectId?: string;
  channel?: { channelId: string; channelType: number; name?: string };
  onClose: () => void;
  /** dirty 时用户关闭(调用方决定是否二次确认);未传时等同 onClose。 */
  onDirtyClose?: () => void;
  /** 创建成功(已 createLoop 落库)。asDraft 供调用方定 toast 文案。 */
  onCreated: (detail: MatterDetail, asDraft: boolean) => void;
}

export default function MatterCreateModal({
  open,
  prefillTitle = "",
  prefillAssigneeUids = [],
  prefillProjectId,
  channel,
  onClose,
  onDirtyClose,
  onCreated,
}: MatterCreateModalProps) {
  // ── 表单状态(字段集=vanilla submitCreate 实发) ──
  const [leaderUids, setLeaderUids] = useState<string[]>([]);
  const [collabUids, setCollabUids] = useState<string[]>(prefillAssigneeUids);
  const [title, setTitle] = useState(prefillTitle);
  const [brief, setBrief] = useState("");
  const [goal, setGoal] = useState(""); // 追踪目标 → brief_output_spec
  const [files, setFiles] = useState<File[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState(0);
  const [dlDate, setDlDate] = useState(""); // yyyy-mm-dd
  const [dlTime, setDlTime] = useState("19:00"); // vanilla 默认 19:00
  const [mode, setMode] = useState("");
  const [criticGen, setCriticGen] = useState("");
  const [criticVer, setCriticVer] = useState("");
  const [criticRounds, setCriticRounds] = useState(3);
  const [pipeSteps, setPipeSteps] = useState<string[]>(["", ""]); // vanilla 初始两步
  const [titleBad, setTitleBad] = useState(false);
  const [modeWarn, setModeWarn] = useState("");
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);
  const [submitLabel, setSubmitLabel] = useState("");
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // mode 配置选人的名字源(space 成员缓存,与 MemberPicker 同源)。
  const { members } = useMemberList({ channel, enabled: open });
  const nameOf = useCallback(
    (uid: string) => members.find((m) => m.uid === uid)?.name || uid,
    [members],
  );
  // mode 配置候选=已选领队+协作者中的 bot(vanilla allBots 同法)。
  const selectedBots = useMemo(
    () =>
      [...leaderUids, ...collabUids].filter(
        (u, i, arr) => u && arr.indexOf(u) === i && (members.find((m) => m.uid === u)?.isBot ?? isBotUid(u)),
      ),
    [leaderUids, collabUids, members],
  );

  // 打开时重置 + 拉项目列表(默认选 scope=default,vanilla 同法)。
  useEffect(() => {
    if (!open) return;
    setLeaderUids([]);
    setCollabUids(prefillAssigneeUids);
    setTitle(prefillTitle);
    setBrief("");
    setGoal("");
    setFiles([]);
    setPriority(0);
    setDlDate("");
    setDlTime("19:00");
    setMode("");
    setCriticGen("");
    setCriticVer("");
    setCriticRounds(3);
    setPipeSteps(["", ""]);
    setTitleBad(false);
    setModeWarn("");
    setSubmitting(null);
    setError("");
    listProjects()
      .then((all) => {
        const live = all.filter((p) => !p.archived || p.archived === 0);
        setProjects(live);
        const def = live.find((p) => p.scope === "default");
        setProjectId(prefillProjectId || (def ? def.id : ""));
      })
      .catch(() => setProjects([]));
    setTimeout(() => titleRef.current?.focus(), 80);
    // prefill 引用仅开门一刻生效
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 项目联动默认领队(vanilla nmProj change → default_leader_uid)。
  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    const p = projects.find((x) => x.id === pid);
    if (p?.default_leader_uid) setLeaderUids([p.default_leader_uid]);
  };

  // 多 Agent 模式参与者预警(vanilla syncModeWarn)。
  useEffect(() => {
    if (!MULTI_AGENT_MODES[mode]) {
      setModeWarn("");
      return;
    }
    const parts = new Set([...leaderUids, ...collabUids].filter(Boolean));
    setModeWarn(parts.size < 2 ? "此模式至少需要 2 个不同的参与者(领队 + 协作者)" : "");
  }, [mode, leaderUids, collabUids]);

  const isDirty = useMemo(() => {
    if (title.trim() !== prefillTitle.trim()) return true;
    if (brief.trim() || goal.trim()) return true;
    if (files.length) return true;
    if (leaderUids.length) return true;
    if (collabUids.join(",") !== prefillAssigneeUids.join(",")) return true;
    if (dlDate || priority > 0 || mode) return true;
    return false;
  }, [title, brief, goal, files, leaderUids, collabUids, dlDate, priority, mode, prefillTitle, prefillAssigneeUids]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    if (isDirty && onDirtyClose) onDirtyClose();
    else onClose();
  }, [submitting, isDirty, onClose, onDirtyClose]);

  const pickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const submit = async (asDraft: boolean) => {
    if (submitting) return;
    setError("");
    // 校验:主题必填;多 Agent 模式 ≥2 参与者(vanilla submitCreate 同序)。
    const titleV = title.trim();
    if (!titleV) {
      setTitleBad(true);
      titleRef.current?.focus();
      return;
    }
    if (MULTI_AGENT_MODES[mode]) {
      const parts = new Set([...leaderUids, ...collabUids].filter(Boolean));
      if (parts.size < 2) {
        setModeWarn("此模式至少需要 2 个不同的 Agent 协作");
        return;
      }
    }
    const body: CreateLoopReq = { title: titleV, status: asDraft ? "backlog" : "open" };
    const briefV = brief.trim();
    const goalV = goal.trim();
    if (briefV) body.description = briefV;
    if (goalV) body.brief_output_spec = goalV;
    if (projectId) body.project_id = projectId;
    if (dlDate) {
      const [y, m, d] = dlDate.split("-").map(Number);
      const [hh, mm] = (dlTime || "19:00").split(":").map(Number);
      body.deadline = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).toISOString();
    }
    if (leaderUids.length) body.leader_uid = leaderUids[0];
    if (collabUids.length) body.assignee_ids = collabUids;
    if (mode) body.mode = mode;
    if (mode === "critic") {
      if (criticGen && criticVer && criticGen !== criticVer) {
        body.mode_config = JSON.stringify({
          generator: criticGen,
          verifier: criticVer,
          max_rounds: criticRounds || 3,
        });
      }
    } else if (mode === "pipeline") {
      const steps = pipeSteps.filter(Boolean).map((assignee) => ({ assignee }));
      if (steps.length >= 2) body.mode_config = JSON.stringify({ steps });
    } else if (mode === "roundtable" || mode === "swarm") {
      if (selectedBots.length >= 2) body.mode_config = JSON.stringify({ participants: selectedBots });
    }
    if (priority > 0) body.priority = priority;

    setSubmitting(asDraft ? "draft" : "send");
    setSubmitLabel(files.length ? "上传附件…" : asDraft ? "保存中…" : "发送中…");
    try {
      if (files.length) {
        const atts = await Promise.all(files.map((f) => uploadMatterAttachment(f, "new")));
        body.input_attachments = atts;
        setSubmitLabel(asDraft ? "保存中…" : "发送中…");
      }
      const detail = await createLoop(body);
      onCreated(detail, asDraft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
      setSubmitting(null);
    }
  };

  if (!open) return null;

  return (
    <div className="mcm-overlay" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="mcm" role="dialog" aria-label="新建回路" onKeyDown={(e) => e.key === "Escape" && handleClose()}>
        <div className="mcm-head">
          <span className="mcm-title">新建回路</span>
          <button type="button" className="mcm-x" onClick={handleClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="mcm-body">
          {/* 收件人区:领队/协作者(邮件式头部) */}
          <div className="mcm-field">
            <label>领队</label>
            <MemberPicker
              mode="controlled"
              single
              botsOnly
              value={leaderUids}
              onChange={setLeaderUids}
              channel={channel}
              placeholder="选择领队"
            />
          </div>
          <div className="mcm-field">
            <label>协作者</label>
            <MemberPicker
              mode="controlled"
              value={collabUids}
              onChange={setCollabUids}
              channel={channel}
              placeholder="添加协作者"
            />
            <div className="mcm-hint">添加协作者或你自己的 worker;别人的 worker 需要由本人添加</div>
          </div>

          <hr className="mcm-sep" />

          {/* 正文区:主题/Brief/附件 */}
          <div className={`mcm-field${titleBad ? " is-invalid" : ""}`}>
            <label>
              主题<span className="mcm-req">*</span>
            </label>
            <input
              ref={titleRef}
              className="mcm-input"
              maxLength={500}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleBad) setTitleBad(false);
              }}
              placeholder="一句话概括这件事"
            />
            {titleBad && <div className="mcm-err">主题不能为空</div>}
          </div>
          <div className="mcm-field">
            <label>Brief</label>
            <textarea
              className="mcm-textarea"
              style={{ minHeight: 120 }}
              maxLength={4000}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="描述你要什么——背景、要求、约束都可以写在这里"
            />
          </div>
          <div className="mcm-field">
            <label>附件</label>
            <button type="button" className="mcm-attach-zone" onClick={() => fileRef.current?.click()}>
              <svg className="mcm-attach-ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.5 5.5l-5.8 5.8a2.3 2.3 0 003.2 3.2l6-6a3.8 3.8 0 00-5.4-5.4l-6 6a5.3 5.3 0 007.5 7.5l5.3-5.3" />
              </svg>
              <span className="mcm-attach-main">
                <span className="mcm-attach-title">添加附件</span>
                <span className="mcm-attach-sub">简历、文档、数据等材料</span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                pickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 && (
              <div className="mcm-attach-list">
                {files.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="mcm-file-chip">
                    <span className="mcm-file-name">{f.name}</span>
                    <button
                      type="button"
                      className="mcm-file-rm"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      aria-label="移除附件"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 折叠:追踪目标(→ brief_output_spec) */}
          <details className="mcm-fold">
            <summary>
              追踪目标<span className="mcm-fold-hint">长程任务建议填写</span>
            </summary>
            <div className="mcm-field">
              <textarea
                className="mcm-textarea"
                style={{ minHeight: 64 }}
                maxLength={4000}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="什么结果你会满意?"
              />
            </div>
          </details>

          {/* 折叠:更多选项(项目/优先级/截止日期/协作模式) */}
          <details className="mcm-fold">
            <summary>更多选项</summary>
            <div className="mcm-field">
              <label>项目</label>
              <select className="mcm-select" value={projectId} onChange={(e) => handleProjectChange(e.target.value)}>
                {projects.length === 0 && <option value="">无可用项目</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {projectId && (
                <div className="mcm-scope">
                  <span className="mcm-scope-dot" />
                  {projects.find((p) => p.id === projectId)?.scope === "private" ? "私有项目" : "共享项目"}
                </div>
              )}
            </div>
            <div className="mcm-field">
              <label>优先级</label>
              <select className="mcm-select" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                <option value={0}>无优先级</option>
                <option value={1}>紧急</option>
                <option value={2}>高</option>
                <option value={3}>中</option>
                <option value={4}>低</option>
              </select>
            </div>
            <div className="mcm-field">
              <label>截止日期</label>
              <div className="mcm-dl">
                <input
                  type="date"
                  className="mcm-input mcm-dl-date"
                  value={dlDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDlDate(e.target.value)}
                />
                <input
                  type="time"
                  className="mcm-input mcm-dl-time"
                  value={dlTime}
                  onChange={(e) => setDlTime(e.target.value)}
                  disabled={!dlDate}
                />
              </div>
            </div>
            <div className="mcm-field">
              <label>协作模式</label>
              <select className="mcm-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                {MODE_OPTS.map((m) => (
                  <option key={m.k} value={m.k}>
                    {m.label}
                  </option>
                ))}
              </select>
              {modeWarn && <div className="mcm-warn">{modeWarn}</div>}
              {mode === "critic" && (
                <div className="mcm-mode-cfg">
                  <div className="mcm-mode-cfg-hint">生成-验证:指定生成者和验证者</div>
                  <div className="mcm-mode-grid">
                    <div>
                      <label className="mcm-sublabel">生成者</label>
                      <select className="mcm-select" value={criticGen} onChange={(e) => setCriticGen(e.target.value)}>
                        <option value="">选择…</option>
                        {selectedBots.map((u) => (
                          <option key={u} value={u}>
                            {nameOf(u)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mcm-sublabel">验证者</label>
                      <select className="mcm-select" value={criticVer} onChange={(e) => setCriticVer(e.target.value)}>
                        <option value="">选择…</option>
                        {selectedBots.map((u) => (
                          <option key={u} value={u}>
                            {nameOf(u)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mcm-mode-rounds">
                    <label className="mcm-sublabel">最大轮次</label>
                    <input
                      type="number"
                      className="mcm-input"
                      style={{ width: 80 }}
                      min={1}
                      max={10}
                      value={criticRounds}
                      onChange={(e) => setCriticRounds(Number(e.target.value) || 3)}
                    />
                  </div>
                </div>
              )}
              {mode === "pipeline" && (
                <div className="mcm-mode-cfg">
                  <div className="mcm-mode-cfg-hint">流水线:定义执行步骤(按顺序)</div>
                  {pipeSteps.map((uid, i) => (
                    <div key={i} className="mcm-pipe-step">
                      <span className="mcm-sublabel">步骤 {i + 1}</span>
                      <select
                        className="mcm-select"
                        value={uid}
                        onChange={(e) =>
                          setPipeSteps((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                        }
                      >
                        <option value="">选择…</option>
                        {selectedBots.map((u) => (
                          <option key={u} value={u}>
                            {nameOf(u)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <button type="button" className="mcm-pipe-add" onClick={() => setPipeSteps((prev) => [...prev, ""])}>
                    + 添加步骤
                  </button>
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="mcm-foot">
          <span className="mcm-foot-err">{error}</span>
          <button type="button" className="mcm-btn" onClick={handleClose} disabled={!!submitting}>
            取消
          </button>
          <button type="button" className="mcm-btn" onClick={() => submit(true)} disabled={!!submitting}>
            {submitting === "draft" ? submitLabel : "保存草稿"}
          </button>
          <button type="button" className="mcm-btn mcm-btn-primary" onClick={() => submit(false)} disabled={!!submitting}>
            {submitting === "send" ? submitLabel : "发送"}
          </button>
        </div>
      </div>
    </div>
  );
}
