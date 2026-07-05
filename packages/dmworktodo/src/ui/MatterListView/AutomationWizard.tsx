/**
 * [INPUT]: hooks/useMemberList(executor bot 候选);api/todoApi 的 createSchedule/updateSchedule/
 *          listProjects/listBotChannels;./automationCron 的 cronHuman;utils/toast。
 * [OUTPUT]: 对外默认导出 AutomationWizard —— 自动化三步向导(S6 卡⑧,D6 拍板替代巨表单)。
 * [POS]: dmworktodo/ui/MatterListView 的自动化新建/编辑,AutomationView 与 AutomationDetailView 调用。
 *        Notion connector 步骤基因:①要做什么(名称+RUNBOOK)②什么时候(cron 预设+人话预览+时区)
 *        ③谁来做、发到哪(executor bot+输出模式 track/runonly+目标)。
 *        保存 payload 与原 ScheduleModal 完全一致(含 target 归属校验),数据层不动。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMemberList } from "../../hooks/useMemberList";
import {
  createSchedule,
  updateSchedule,
  listProjects,
  listBotChannels,
} from "../../api/todoApi";
import type { Schedule, SaveScheduleReq } from "../../bridge/types";
import type { BotChannel } from "../../api/todoApi";
import { cronHuman } from "./automationCron";
import { Toast } from "../../utils/toast";
import "./schedModal.css";
import "./automationWizard.css";

const CRON_PRESETS: { label: string; cron: string }[] = [
  { label: "每天 9:00", cron: "0 9 * * *" },
  { label: "工作日 9:00", cron: "0 9 * * 1-5" },
  { label: "每周一 9:00", cron: "0 9 * * 1" },
  { label: "每月 1 号 9:00", cron: "0 9 1 * *" },
];

const STEPS = ["任务", "计划", "执行与输出"];

export default function AutomationWizard({
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

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(s?.title ?? "");
  const [runbook, setRunbook] = useState(s?.runbook ?? "");
  const [executorUid, setExecutorUid] = useState(s?.executor_uid ?? "");
  const [outputMode, setOutputMode] = useState(s?.output_mode ?? "track");
  const [projectId, setProjectId] = useState(s?.project_id ?? "");
  const [targetChannelId, setTargetChannelId] = useState(s?.target_channel_id ?? "");
  const [cronExpr, setCronExpr] = useState(s?.cron_expr ?? "0 9 * * *");
  const [timezone, setTimezone] = useState(s?.timezone ?? "Asia/Shanghai");
  const [busy, setBusy] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [channels, setChannels] = useState<BotChannel[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const { members } = useMemberList({});
  const botOptions = useMemo(() => members.filter((m) => m.isBot), [members]);

  useEffect(() => {
    listProjects()
      .then((ps) => mountedRef.current && setProjects(ps.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!executorUid) {
      setChannels([]);
      return;
    }
    let alive = true;
    listBotChannels(executorUid)
      .then((cs) => alive && setChannels(cs))
      .catch(() => alive && setChannels([]));
    return () => {
      alive = false;
    };
  }, [executorUid]);

  const stepOk = (i: number) =>
    i === 0 ? !!title.trim() : i === 1 ? !!cronExpr.trim() : !!executorUid;

  const save = async () => {
    if (busy) return;
    setBusy(true);
    const validTarget = channels.some((c) => c.group_no === targetChannelId) ? targetChannelId : "";
    const chName = channels.find((c) => c.group_no === validTarget)?.name;
    const req: SaveScheduleReq = {
      title: title.trim(),
      runbook: runbook.trim(),
      cron_expr: cronExpr.trim(),
      timezone,
      executor_uid: executorUid,
      output_mode: outputMode,
      enabled: s ? s.enabled === 1 || s.enabled === true : true,
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

  return (
    <div className="sm-overlay" onMouseDown={onClose}>
      <div className="sm awz-modal" role="dialog" aria-label="自动化向导" onMouseDown={(e) => e.stopPropagation()}>
        <div className="awz-title">{isNew ? "新建自动化" : "编辑自动化"}</div>
        <div className="awz-steps">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <span className={`awz-step-line${step >= i ? " is-done" : ""}`} />}
              <button
                type="button"
                className={`awz-step${step === i ? " is-active" : ""}${step > i ? " is-done" : ""}`}
                onClick={() => {
                  // 允许回跳;前跳需逐步校验
                  if (i < step || (i === step + 1 && stepOk(step))) setStep(i);
                }}
              >
                <span className="awz-step-n">{step > i ? "✓" : i + 1}</span>
                {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="awz-body">
          {step === 0 && (
            <>
              <label className="awz-field">
                <span>名称</span>
                <input
                  className="awz-input"
                  placeholder="例如 每日巡检"
                  value={title}
                  autoFocus
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="awz-field">
                <span>任务说明</span>
                <textarea
                  className="awz-textarea"
                  rows={7}
                  placeholder="每次运行要执行的任务"
                  value={runbook}
                  onChange={(e) => setRunbook(e.target.value)}
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <div className="awz-presets">
                {CRON_PRESETS.map((p) => (
                  <button
                    key={p.cron}
                    type="button"
                    className={`awz-preset${cronExpr === p.cron ? " is-active" : ""}`}
                    onClick={() => setCronExpr(p.cron)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="awz-field">
                <span>cron 表达式</span>
                <input
                  className="awz-input awz-mono"
                  value={cronExpr}
                  onChange={(e) => setCronExpr(e.target.value)}
                />
              </label>
              <div className="awz-cron-human">{cronHuman(cronExpr) || "…"}</div>
              <label className="awz-field">
                <span>时区</span>
                <input className="awz-input" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <label className="awz-field">
                <span>执行 worker</span>
                <select
                  className="awz-input"
                  value={executorUid}
                  onChange={(e) => {
                    setExecutorUid(e.target.value);
                    // 切执行方即失效旧目标群(旧 channels 未刷新前 save 会误判有效——codex 统审严重项)。
                    setTargetChannelId("");
                  }}
                >
                  <option value="">选择 worker</option>
                  {botOptions.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="awz-field">
                <span>输出模式</span>
                <div className="awz-modes">
                  <button
                    type="button"
                    className={`awz-mode${outputMode === "track" ? " is-active" : ""}`}
                    onClick={() => setOutputMode("track")}
                  >
                    <span className="awz-mode-name">创建回路跟踪</span>
                    <span className="awz-mode-desc">每次运行建一条回路,进度/产出全程可追</span>
                  </button>
                  <button
                    type="button"
                    className={`awz-mode${outputMode === "runonly" ? " is-active" : ""}`}
                    onClick={() => setOutputMode("runonly")}
                  >
                    <span className="awz-mode-name">仅运行</span>
                    <span className="awz-mode-desc">结果直接发到指定群,不建回路</span>
                  </button>
                </div>
              </div>
              {outputMode === "track" && (
                <label className="awz-field">
                  <span>归属项目(可选)</span>
                  <select className="awz-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">不归属项目</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {outputMode === "runonly" && (
                <label className="awz-field">
                  <span>发到哪个群</span>
                  <select
                    className="awz-input"
                    value={targetChannelId}
                    onChange={(e) => setTargetChannelId(e.target.value)}
                  >
                    <option value="">选择目标群</option>
                    {channels.map((c) => (
                      <option key={c.group_no} value={c.group_no}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
        </div>

        <div className="awz-foot">
          <button type="button" className="awz-ghost" onClick={onClose}>
            取消
          </button>
          <span className="awz-foot-spacer" />
          {step > 0 && (
            <button type="button" className="awz-ghost" onClick={() => setStep(step - 1)}>
              上一步
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="awz-primary"
              disabled={!stepOk(step)}
              onClick={() => setStep(step + 1)}
            >
              下一步
            </button>
          ) : (
            <button type="button" className="awz-primary" disabled={!stepOk(2) || busy} onClick={save}>
              {busy ? "保存中…" : isNew ? "创建自动化" : "保存"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
