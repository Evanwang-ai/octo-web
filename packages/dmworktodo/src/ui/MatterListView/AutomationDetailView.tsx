/**
 * [INPUT]: api/todoApi 的 listSchedules/updateSchedule/deleteSchedule(真数据);
 *          api/multica 的 listAutopilotRuns(run 历史 mock,接线换 §1.10 真端点);
 *          ./automationCron 的 cronHuman;../UserName。
 * [OUTPUT]: 对外默认导出 AutomationDetailView —— 自动化详情页(S6 卡⑧新增)。
 * [POS]: dmworktodo/ui/MatterListView 的自动化详情,MatterRouteHost view="automationDetail" 挂载。
 *        头=名+启停开关+编辑(开向导)+删除(两击);属性行=cron 人话/时区/执行方/输出/下次运行;
 *        runbook 卡;run 历史=原子D 单行事件公式(32px 行/点即状态/时间右缘,S9 撤竖线)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useState } from "react";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { listSchedules, updateSchedule, deleteSchedule } from "../../api/todoApi";
import type { Schedule } from "../../bridge/types";
import { listAutopilotRuns } from "../../api/multica/client";
import type { AutopilotRunLite } from "../../api/multica/types";
import { cronHuman } from "./automationCron";
import UserName from "../UserName";
import AutomationWizard from "./AutomationWizard";
import "./automation.css";
import "./workerDetail.css";

const fmtTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = Date.now() - new Date(iso).getTime();
  const MIN = 60_000;
  if (Math.abs(d) < MIN) return "刚刚";
  if (d < 0) {
    const m = Math.round(-d / MIN);
    return m < 60 ? `${m} 分钟后` : m < 1440 ? `${Math.round(m / 60)} 小时后` : `${Math.round(m / 1440)} 天后`;
  }
  const m = Math.floor(d / MIN);
  return m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.floor(m / 60)} 小时前` : `${Math.floor(m / 1440)} 天前`;
};

export default function AutomationDetailView({
  scheduleId,
  onBack,
}: {
  scheduleId: string;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [sched, setSched] = useState<Schedule | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [runs, setRuns] = useState<AutopilotRunLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [delArmed, setDelArmed] = useState(false);

  const reload = async () => {
    // matter 后端无 GET /schedules/{id},靠列表缓存取详情(与项目详情同款兜底)。
    const list = await listSchedules();
    const hit = list.find((s) => s.id === scheduleId) || null;
    setSched(hit);
    setNotFound(!hit);
  };

  useEffect(() => {
    reload();
    listAutopilotRuns(scheduleId).then(setRuns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  if (!sched) {
    return (
      <div className="av-root">
        <div className="avd-loading">
          {notFound ? (
            <>
              这条自动化不存在或已删除。
              <button type="button" className="avd-btn" style={{ marginLeft: 8 }} onClick={onBack}>
                返回列表
              </button>
            </>
          ) : (
            "加载中…"
          )}
        </div>
      </div>
    );
  }

  const on = sched.enabled === 1 || sched.enabled === true;

  return (
    <div className="av-root avd-root">
      <div className="avd-crumb">
        <button className="avd-back" type="button" onClick={onBack}>
          自动化
        </button>
        <span className="avd-sep">›</span>
        <span className="avd-name">{sched.title}</span>
        <span className={`avd-state${on ? " is-on" : ""}`}>{on ? "运行中" : "已停用"}</span>
        <span className="avd-spacer" />
        <button
          type="button"
          className="avd-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await updateSchedule(sched.id, { enabled: !on });
              await reload();
            } finally {
              setBusy(false);
            }
          }}
        >
          {on ? "停用" : "启用"}
        </button>
        <button type="button" className="avd-btn" onClick={() => setEditing(sched)}>
          编辑
        </button>
        <button
          type="button"
          className={`avd-del${delArmed ? " is-armed" : ""}`}
          disabled={busy}
          onBlur={() => setDelArmed(false)}
          onClick={async () => {
            if (!delArmed) {
              setDelArmed(true);
              return;
            }
            setBusy(true);
            try {
              await deleteSchedule(sched.id);
              onBack();
            } finally {
              setBusy(false);
            }
          }}
        >
          {delArmed ? "再点一次确认删除" : "删除"}
        </button>
      </div>

      <div className="avd-body">
        <div className="avd-props">
          <div className="avd-prop">
            <span className="avd-prop-k">节奏</span>
            <span className="avd-prop-v">
              {cronHuman(sched.cron_expr)}
              <span className="avd-mono"> · {sched.cron_expr}</span>
            </span>
          </div>
          <div className="avd-prop">
            <span className="avd-prop-k">下次运行</span>
            <span className="avd-prop-v">{on ? fmtTime(sched.next_run_at) : "—"}</span>
          </div>
          <div className="avd-prop">
            <span className="avd-prop-k">执行方</span>
            <span className="avd-prop-v avd-owner">
              <WKAvatar
                channel={new Channel(sched.executor_uid, ChannelTypePerson)}
                style={{ width: 16, height: 16, borderRadius: "50%" }}
              />
              <UserName uid={sched.executor_uid} />
            </span>
          </div>
          <div className="avd-prop">
            <span className="avd-prop-k">输出</span>
            <span className="avd-prop-v">
              {sched.output_mode === "runonly"
                ? `仅运行 · 发到 ${sched.target_channel_name || "群"}`
                : "创建回路跟踪"}
            </span>
          </div>
          <div className="avd-prop">
            <span className="avd-prop-k">时区</span>
            <span className="avd-prop-v">{sched.timezone || "本地"}</span>
          </div>
        </div>

        <section className="wkd-card avd-runbook">
          <div className="wkd-card-title">任务说明</div>
          <pre className="avd-pre">{sched.runbook || "(空)"}</pre>
        </section>

        <section className="wkd-tl-wrap">
          <div className="wkd-card-title">
            运行历史 <span className="wkd-group-n">近 {runs.length} 次</span>
          </div>
          {/* 原子D 公式:32px 单行,点即状态(成功不写字),时长·时间恒右缘 */}
          <div className="avd-runs">
            {runs.map((r) => (
              <div key={r.id} className="avd-run">
                <span
                  className={`wkd-run-dot ${
                    r.status === "success" ? "is-success" : r.status === "failed" ? "is-error" : "is-brand"
                  }`}
                />
                <span className="avd-run-title">{r.summary}</span>
                {r.status !== "success" && (
                  <span className="avd-run-inline">{r.status === "failed" ? "失败" : "运行中"}</span>
                )}
                <span className="avd-run-meta">
                  {r.duration_sec}s · {fmtTime(r.started_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {editing && (
        <AutomationWizard
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
