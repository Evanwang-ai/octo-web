/**
 * [INPUT]: 依赖 api/todoApi 的 listSchedules/updateSchedule/listProjects;./automationCron 的 cronHuman;
 *          ./AutomationWizard(三步向导 create/edit,D6);utils/toast;../UserName。
 * [OUTPUT]: 默认导出 AutomationView(原生自动化页:schedule 卡列表 + cron 人话 + enabled 开关 +
 *          三步向导新建/编辑(AutomationWizard),内部 editing 状态驱动;行点击进详情页)。
 * [POS]: dmworktodo/ui/MatterListView 的自动化(automation)视图,被 MatterRouteHost 以 view="automation" 挂载(替 iframe);
 *        真相源 vanilla feat/loop renderAutomation。**巨型 modal 已原生化,自动化编辑器 iframe 已杀**。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listSchedules, updateSchedule, listProjects } from "../../api/todoApi";
import type { Schedule } from "../../bridge/types";
import { Toast } from "../../utils/toast";
import UserName from "../UserName";
import { cronHuman } from "./automationCron";
import AutomationWizard from "./AutomationWizard";
import { listAutopilotRuns } from "../../api/multica/client";
import type { AutopilotRunLite } from "../../api/multica/types";
import "./automation.css";

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

export default function AutomationView({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const [runsMap, setRunsMap] = useState<Record<string, AutopilotRunLite[]>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Set<string>>(new Set()); // 开关在途,防连点乱序
  const [editing, setEditing] = useState<Schedule | "new" | null>(null); // 原生编辑 modal
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 每卡状态点串(run 历史 mock;接线换 §1.10 真端点)。
  // 依赖 id 集合而非数组引用:开关乐观更新/重载不触发全量重拉(codex 统审)。
  const scheduleIdsKey = useMemo(() => schedules.map((s) => s.id).sort().join(","), [schedules]);
  useEffect(() => {
    if (!scheduleIdsKey) return;
    let alive = true;
    const ids = scheduleIdsKey.split(",");
    Promise.all(ids.map((id: string) => listAutopilotRuns(id).then((rs) => [id, rs] as const))).then(
      (pairs) => {
        if (alive) setRunsMap(Object.fromEntries(pairs));
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleIdsKey]);

  const reloadSchedules = useCallback(() => {
    listSchedules()
      .then((ss) => {
        if (mountedRef.current) setSchedules(ss);
      })
      .catch(() => {});
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
        <button className="av-new" type="button" onClick={() => setEditing("new")}>
          <span className="av-new-plus">+</span>新建自动化
        </button>
      </div>

      {loading && <div className="av-state">加载中…</div>}
      {!loading && schedules.length === 0 && (
        <div className="av-state">还没有自动化 · 定个时间,让你的 bot 按点干活</div>
      )}

      {!loading && schedules.length > 0 && (
        <div className="av-list">
          {/* 行=Listview 语法:40px 单行——开关/标题/runbook 首行内联/右缘(健康点串·cron·执行方·下次) */}
          {schedules.map((s) => {
            const on = s.enabled === 1 || s.enabled === true;
            return (
              <div key={s.id} className={`av-row${on ? "" : " is-off"}`}>
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
                  className="av-row-body"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenDetail(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenDetail(s.id);
                    }
                  }}
                >
                  <span className="av-title">{s.title || "未命名自动化"}</span>
                  {s.runbook && <span className="av-runbook">{s.runbook.split("\n")[0]}</span>}
                  {(runsMap[s.id]?.length ?? 0) > 0 && (
                    <span className="av-dots" title="最近 8 次运行">
                      {runsMap[s.id].slice(0, 8).reverse().map((r) => (
                        <span key={r.id} className={`av-hdot ${r.status === "failed" ? "is-bad" : "is-ok"}`} />
                      ))}
                    </span>
                  )}
                  <span className="av-cron">{cronHuman(s.cron_expr)}</span>
                  <span className="av-exec">
                    <UserName uid={s.executor_uid} />
                    {isBot(s.executor_uid) && <span className="av-ai">AI</span>}
                  </span>
                  <span className="av-next">
                    {on ? (s.next_run_at ? `下次 ${relFuture(s.next_run_at)}` : "") : "已停用"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <AutomationWizard
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={reloadSchedules}
        />
      )}
    </div>
  );
}

export { AutomationView };
