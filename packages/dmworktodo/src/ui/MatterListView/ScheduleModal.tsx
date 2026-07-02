/**
 * [INPUT]: 依赖 react;hooks/useMemberList(空间成员+isBot,选 executor bot);api/todoApi 的
 *          createSchedule/updateSchedule/listProjects/listBotChannels;./automationCron 的 cronHuman;utils/toast。
 * [OUTPUT]: 默认导出 ScheduleModal(自动化 create/edit 巨型表单:名称/RUNBOOK/执行方 bot/输出模式/
 *          项目 or 目标群/cron+预览/时区/启用 → createSchedule|updateSchedule)。
 * [POS]: MatterListView 的自动化编辑器(P3,替 iframe 编辑器),被 AutomationView 内联挂载。
 *        真相源 vanilla renderAutomation 巨型 modal;字段对齐后端 scheduleReq struct。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMemberList } from "../../hooks/useMemberList";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listProjects,
  listBotChannels,
} from "../../api/todoApi";
import type { Schedule, SaveScheduleReq } from "../../bridge/types";
import type { BotChannel } from "../../api/todoApi";
import { cronHuman } from "./automationCron";
import { Toast } from "../../utils/toast";
import "./schedModal.css";

const TZ_OPTS = [
  "Asia/Shanghai",
  "Asia/Tokyo",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
];
const CRON_PRESETS: { label: string; cron: string }[] = [
  { label: "每天 9:00", cron: "0 9 * * *" },
  { label: "工作日 9:00", cron: "0 9 * * 1-5" },
  { label: "每周一 9:00", cron: "0 9 * * 1" },
  { label: "每月 1 号 9:00", cron: "0 9 1 * *" },
];

export default function ScheduleModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Schedule | "new";
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = editing === "new";
  const s = isNew ? null : (editing as Schedule);

  const [title, setTitle] = useState(s?.title ?? "");
  const [runbook, setRunbook] = useState(s?.runbook ?? "");
  const [executorUid, setExecutorUid] = useState(s?.executor_uid ?? "");
  const [outputMode, setOutputMode] = useState(s?.output_mode ?? "track");
  const [projectId, setProjectId] = useState(s?.project_id ?? "");
  const [targetChannelId, setTargetChannelId] = useState(s?.target_channel_id ?? "");
  const [cronExpr, setCronExpr] = useState(s?.cron_expr ?? "0 9 * * *");
  const [timezone, setTimezone] = useState(s?.timezone ?? "Asia/Shanghai");
  const [enabled, setEnabled] = useState(s ? s.enabled === 1 || s.enabled === true : true);
  const [busy, setBusy] = useState(false);
  const [delArmed, setDelArmed] = useState(false); // 删除两击确认(对齐 vanilla amDel)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [channels, setChannels] = useState<BotChannel[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 执行方候选:空间成员里的 bot。
  const { members } = useMemberList({});
  const botOptions = useMemo(() => members.filter((m) => m.isBot), [members]);

  useEffect(() => {
    listProjects()
      .then((ps) => {
        if (mountedRef.current) setProjects(ps.map((p) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  // 执行方变 → 拉它的群(target 候选)。用户切换 executor(非初始)时清掉旧 bot 的 target(Codex#3)。
  const prevExecRef = useRef(executorUid);
  useEffect(() => {
    if (prevExecRef.current !== executorUid) {
      setTargetChannelId(""); // 旧 target 属于旧 bot,不能带到新 bot
      prevExecRef.current = executorUid;
    }
    if (!executorUid) {
      setChannels([]);
      return;
    }
    let alive = true;
    listBotChannels(executorUid)
      .then((cs) => {
        if (alive) setChannels(cs);
      })
      .catch(() => {
        if (alive) setChannels([]);
      });
    return () => {
      alive = false;
    };
  }, [executorUid]);

  const save = async () => {
    if (busy) return;
    if (!title.trim()) return Toast.error("先填名称");
    if (!executorUid) return Toast.error("先选执行方 bot");
    if (!cronExpr.trim()) return Toast.error("先填时间表");
    setBusy(true);
    // Codex#3:target 必须属于当前 executor 的群(否则视为未选,不提交旧 bot 的群)。
    const validTarget = channels.some((c) => c.group_no === targetChannelId) ? targetChannelId : "";
    const chName = channels.find((c) => c.group_no === validTarget)?.name;
    const req: SaveScheduleReq = {
      title: title.trim(),
      runbook: runbook.trim(),
      cron_expr: cronExpr.trim(),
      timezone,
      executor_uid: executorUid,
      output_mode: outputMode,
      enabled,
      project_id: outputMode === "track" ? projectId || null : null,
      target_channel_id: outputMode === "runonly" ? validTarget || null : null,
      target_channel_name: outputMode === "runonly" ? chName || null : null,
    };
    try {
      if (isNew) await createSchedule(req);
      else await updateSchedule(s!.id, req);
      if (!mountedRef.current) return;
      onSaved();
      onClose();
    } catch {
      if (mountedRef.current) Toast.error("保存失败");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  // Codex#4:保存中禁止关闭 —— 防写成功但组件卸载导致 onSaved 跳过、列表不刷新。
  const close = () => {
    if (!busy) onClose();
  };

  // 删除:两击确认(对齐 vanilla amDel)。首点武装,二点落库;删除中算 busy(禁关闭/防连点),失败解除武装。
  const del = async () => {
    if (busy || isNew || !s) return;
    if (!delArmed) {
      setDelArmed(true);
      return;
    }
    setBusy(true);
    try {
      await deleteSchedule(s.id);
      if (!mountedRef.current) return;
      Toast.success("删掉了");
      onSaved();
      onClose();
    } catch {
      if (mountedRef.current) {
        Toast.error("删除失败");
        setDelArmed(false);
        setBusy(false);
      }
    }
  };

  return (
    <div className="sm-overlay" onClick={close}>
      <div className="sm" onClick={(e) => e.stopPropagation()}>
        <div className="sm-head">
          <div className="sm-head-t">
            <span className="sm-title">{isNew ? "新建自动化" : "编辑自动化"}</span>
            <span className="sm-sub">周期性的 AI 任务</span>
          </div>
          <button type="button" className="sm-x" onClick={close} disabled={busy} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="sm-body">
          <div className="sm-main">
            <input
              className="sm-name"
              aria-label="自动化名称"
              placeholder="自动化名称"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="sm-runbook-label">RUNBOOK · 智能体每次运行时读取</div>
            <textarea
              className="sm-runbook"
              aria-label="runbook"
              placeholder={"# 目标\n你希望智能体完成什么?\n\n# 上下文\n这是给谁的?有什么约束?\n\n# 步骤\n1. …\n2. …"}
              value={runbook}
              onChange={(e) => setRunbook(e.target.value)}
            />
          </div>

          <div className="sm-side">
            <label className="sm-field">
              <span className="sm-fl">执行方</span>
              <select
                className="sm-sel"
                value={executorUid}
                onChange={(e) => setExecutorUid(e.target.value)}
              >
                <option value="">选智能体 bot</option>
                {botOptions.map((b) => (
                  <option key={b.uid} value={b.uid}>
                    {b.name || b.uid}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm-field">
              <span className="sm-fl">输出模式</span>
              <div className="sm-seg">
                <button
                  type="button"
                  className={`sm-seg-b${outputMode === "track" ? " is-on" : ""}`}
                  onClick={() => setOutputMode("track")}
                >
                  创建 issue
                </button>
                <button
                  type="button"
                  className={`sm-seg-b${outputMode === "runonly" ? " is-on" : ""}`}
                  onClick={() => setOutputMode("runonly")}
                >
                  仅运行
                </button>
              </div>
              <span className="sm-hint">
                {outputMode === "track" ? "每次运行创建一个可追踪的 issue" : "静默运行,不创建 issue"}
              </span>
            </div>

            {outputMode === "track" ? (
              <label className="sm-field">
                <span className="sm-fl">关联项目</span>
                <select
                  className="sm-sel"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">不关联项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="sm-field">
                <span className="sm-fl">发到哪个群</span>
                <select
                  className="sm-sel"
                  value={targetChannelId}
                  onChange={(e) => setTargetChannelId(e.target.value)}
                  disabled={!executorUid}
                >
                  <option value="">{executorUid ? "选一个群" : "先选执行方"}</option>
                  {channels.map((c) => (
                    <option key={c.group_no} value={c.group_no}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="sm-field">
              <span className="sm-fl">时间表(cron)</span>
              <input
                className="sm-inp"
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                placeholder="0 9 * * *"
              />
              <span className="sm-cron-preview">{cronHuman(cronExpr)}</span>
              <div className="sm-presets">
                {CRON_PRESETS.map((p) => (
                  <button
                    key={p.cron}
                    type="button"
                    className="sm-preset"
                    onClick={() => setCronExpr(p.cron)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="sm-field">
              <span className="sm-fl">时区</span>
              <select
                className="sm-sel"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TZ_OPTS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>

            <label className="sm-toggle-row">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>保存后立即启用</span>
            </label>
          </div>
        </div>

        <div className="sm-foot">
          {isNew ? (
            <span className="sm-foot-note">⚡ 保存后会自动运行,直到暂停</span>
          ) : (
            <button
              type="button"
              className={`sm-del${delArmed ? " is-armed" : ""}`}
              onClick={del}
              disabled={busy}
            >
              {delArmed ? "再点一次确认删除" : "删除"}
            </button>
          )}
          <div className="sm-foot-btns">
            <button type="button" className="sm-cancel" onClick={close} disabled={busy}>
              取消
            </button>
            <button
              type="button"
              className="sm-save"
              onClick={save}
              disabled={busy || !title.trim() || !executorUid}
            >
              {busy ? "保存中…" : isNew ? "创建自动化" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
