/**
 * [INPUT]: 依赖 api/todoApi 的 listSchedules/updateSchedule/listProjects;utils/toast;../UserName。
 * [OUTPUT]: 默认导出 AutomationView(原生自动化页:schedule 卡列表 + cron 人话 + enabled 开关;新建/编辑经 onOpenEditor)。
 * [POS]: dmworktodo/ui/MatterListView 的自动化(automation)视图,被 MatterRouteHost 以 view="automation" 挂载(替 iframe 的列表);
 *        真相源 vanilla feat/loop renderAutomation。巨型 create/edit modal 暂路由 iframe 编辑器(绞杀式 partial)。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { listSchedules, updateSchedule, listProjects } from "../../api/todoApi";
import type { Schedule } from "../../bridge/types";
import { Toast } from "../../utils/toast";
import UserName from "../UserName";
import "./automation.css";

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

// cron 人话(对齐 vanilla parseCronSimple:每天/工作日/每周X/每月X号;其余原样)。
function cronHuman(cron: string): string {
  const parts = (cron || "").trim().split(/\s+/);
  if (parts.length < 5) return cron || "";
  const [min, hour, dom, , dow] = parts;
  const time =
    /^\d+$/.test(hour) && /^\d+$/.test(min)
      ? `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`
      : "";
  if (dom === "*" && dow === "*") return `每天 ${time}`.trim();
  if (dom === "*" && dow === "1-5") return `工作日 ${time}`.trim();
  if (dom === "*" && /^[0-6]$/.test(dow)) return `每周${WEEK[+dow]} ${time}`.trim();
  if (/^\d+$/.test(dom) && dow === "*") return `每月${dom}号 ${time}`.trim();
  return cron; // 高级 cron 原样
}

function relFuture(iso?: string): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (!ts) return "";
  const diff = ts - Date.now();
  if (diff <= 0) return "即将";
  const day = 86400000;
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟后`;
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时后`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
const isBot = (uid?: string) => !!uid && uid.endsWith("_bot");

export default function AutomationView({
  onOpenEditor,
}: {
  onOpenEditor?: (id?: string) => void;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Set<string>>(new Set()); // 开关在途,防连点乱序
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    listSchedules()
      .then((ss) => {
        if (mountedRef.current) setSchedules(ss);
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    listProjects()
      .then((ps) => {
        if (!mountedRef.current) return;
        const map: Record<string, string> = {};
        ps.forEach((p) => (map[p.id] = p.name));
        setProjectMap(map);
      })
      .catch(() => {});
  }, []);

  // 开关:乐观翻转 + 落库,失败回滚;在途禁止同项再触发(防连点乱序)。
  const toggle = useCallback(
    (s: Schedule) => {
      if (pending.has(s.id)) return;
      const next = !(s.enabled === 1 || s.enabled === true);
      const patch = (list: Schedule[]) =>
        list.map((x) => (x.id === s.id ? { ...x, enabled: next } : x));
      setPending((p) => new Set(p).add(s.id));
      setSchedules((prev) => patch(prev));
      updateSchedule(s.id, { enabled: next })
        .catch(() => {
          if (mountedRef.current) {
            setSchedules((prev) =>
              prev.map((x) => (x.id === s.id ? { ...x, enabled: s.enabled } : x)),
            );
            Toast.error("开关失败");
          }
        })
        .finally(() => {
          if (mountedRef.current)
            setPending((p) => {
              const n = new Set(p);
              n.delete(s.id);
              return n;
            });
        });
    },
    [pending],
  );

  const target = (s: Schedule): string => {
    if (s.output_mode === "runonly") return s.target_channel_name || "发到群";
    if (s.project_id) return projectMap[s.project_id] || "项目";
    return "回路列表";
  };

  return (
    <div className="av">
      <div className="av-head">
        <h1 className="av-h1">自动化</h1>
        <button className="av-new" type="button" onClick={() => onOpenEditor?.()}>
          <span className="av-new-plus">+</span>新建自动化
        </button>
      </div>

      {loading && <div className="av-state">加载中…</div>}
      {!loading && schedules.length === 0 && (
        <div className="av-state">还没有自动化 · 定个时间,让你的 bot 按点干活</div>
      )}

      {!loading && schedules.length > 0 && (
        <div className="av-list">
          {schedules.map((s) => {
            const on = s.enabled === 1 || s.enabled === true;
            return (
              <div key={s.id} className={`av-card${on ? "" : " is-off"}`}>
                <button
                  type="button"
                  className={`av-switch${on ? " is-on" : ""}`}
                  role="switch"
                  aria-checked={on}
                  aria-label="启用"
                  disabled={pending.has(s.id)}
                  onClick={() => toggle(s)}
                >
                  <span className="av-switch-knob" />
                </button>
                <div
                  className="av-card-body"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenEditor?.(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenEditor?.(s.id);
                    }
                  }}
                >
                  <div className="av-card-top">
                    <span className="av-cron">{cronHuman(s.cron_expr)}</span>
                    {on && s.next_run_at && (
                      <span className="av-next">下次 {relFuture(s.next_run_at)}</span>
                    )}
                    {!on && <span className="av-next av-off-tag">已停用</span>}
                  </div>
                  <div className="av-title">{s.title || "未命名自动化"}</div>
                  <div className="av-meta">
                    <span className="av-exec">
                      <UserName uid={s.executor_uid} />
                      {isBot(s.executor_uid) && <span className="av-ai">AI</span>}
                    </span>
                    <span className="av-dot">·</span>
                    <span className="av-target">{target(s)}</span>
                  </div>
                  {s.runbook && <div className="av-runbook">{s.runbook.split("\n")[0]}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { AutomationView };
