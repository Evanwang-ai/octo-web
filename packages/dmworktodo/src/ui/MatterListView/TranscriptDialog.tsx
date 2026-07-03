/**
 * [INPUT]: api/multica 的 listTaskMessages/buildTimeline(TimelineItem);types 的 AgentTask。
 * [OUTPUT]: 对外默认导出 TranscriptDialog —— 执行 transcript 模态(⭐Wave A-3)。
 * [POS]: dmworktodo/ui/MatterListView 的 Run 过程透明面,WorkerDetailView 的 Run 行打开
 *        (multica 同款入口拓扑:transcript 是 Dialog 非路由页;取消/重跑在调用方行)。
 *        结构镜像 multica agent-transcript-dialog:头部(worker 名+状态徽章+时长+工具/事件计数)
 *        + 事件流(60px 型徽章+单行摘要+#seq+时刻,点击展开 <pre> 详情,tool_use 展格式化 JSON)。
 *        契约事实:无 role/无 tool_use_id,tool_use/result 平铺靠 seq 邻接;text/thinking 碎片
 *        已在 buildTimeline coalesce;content/output 过 redactSecrets 显示层脱敏。
 *        欠账:排序切换/工具过滤/TimelineBar 分段条/复制全部/WS 实时追加(等 WS 底座)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import { listTaskMessages, buildTimeline } from "../../api/multica/client";
import type { TimelineItem } from "../../api/multica/client";
import type { AgentTask } from "../../api/multica/types";
import "./transcript.css";

const TYPE_CONF: Record<TimelineItem["type"], { label: string; cls: string }> = {
  text: { label: "worker", cls: "is-text" },
  thinking: { label: "思考", cls: "is-thinking" },
  tool_use: { label: "工具", cls: "is-tool-use" },
  tool_result: { label: "结果", cls: "is-tool-result" },
  error: { label: "错误", cls: "is-error" },
};

const STATUS_LABEL: Record<string, string> = {
  queued: "排队中",
  dispatched: "已派发",
  waiting_local_directory: "等待目录",
  running: "运行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

// 单行摘要(镜像 multica getEventSummary:tool_use 智能抽 input 关键字段)。
function summaryOf(it: TimelineItem): string {
  if (it.type === "tool_use") {
    const input = it.input || {};
    for (const key of ["command", "query", "file_path", "path", "pattern", "description", "prompt", "url"]) {
      const v = input[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    return JSON.stringify(input).slice(0, 200);
  }
  if (it.type === "tool_result") return (it.output || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const firstLine = (it.content || "").split("\n").find((l) => l.trim());
  return (firstLine || "").slice(0, 200);
}

function clock(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function durationOf(task: AgentTask): string {
  if (!task.started_at) return "";
  const end = task.completed_at ? new Date(task.completed_at).getTime() : Date.now();
  const s = Math.max(1, Math.round((end - new Date(task.started_at).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function DetailPre({ it }: { it: TimelineItem }) {
  let text = "";
  if (it.type === "tool_use") text = JSON.stringify(it.input ?? {}, null, 2);
  else if (it.type === "tool_result") {
    text = it.output || "";
    if (text.length > 4000) text = `${text.slice(0, 4000)}\n… (已截断)`;
  } else text = it.content || "";
  return <pre className={`tsc-pre${it.type === "error" ? " is-error" : ""}`}>{text}</pre>;
}

export default function TranscriptDialog({
  task,
  agentName,
  onClose,
}: {
  task: AgentTask;
  agentName: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [openSeqs, setOpenSeqs] = useState<Set<number>>(new Set());

  useEffect(() => {
    let alive = true;
    listTaskMessages(task.id).then((msgs) => {
      if (alive) setItems(buildTimeline(msgs));
    });
    return () => {
      alive = false;
    };
  }, [task.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toolCalls = useMemo(() => (items || []).filter((i) => i.type === "tool_use").length, [items]);
  const live = task.status === "running";
  const dur = durationOf(task);

  return (
    <div className="tsc-overlay" onMouseDown={onClose}>
      <div className="tsc-panel" role="dialog" aria-label="执行过程" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tsc-head">
          <span className="tsc-agent">{agentName}</span>
          <span className={`tsc-status is-${task.status}`}>
            {live && <span className="tsc-live-dot" />}
            {STATUS_LABEL[task.status] || task.status}
          </span>
          <span className="tsc-head-spacer" />
          <button type="button" className="tsc-close" aria-label="关闭" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="tsc-meta">
          {task.trigger_summary && <span className="tsc-chip">{task.trigger_summary}</span>}
          {dur && <span className="tsc-chip">时长 {dur}</span>}
          <span className="tsc-chip">{toolCalls} 次工具调用</span>
          <span className="tsc-chip">{items?.length ?? "…"} 个事件</span>
        </div>
        <div className="tsc-list">
          {items === null ? (
            <div className="tsc-empty">加载中…</div>
          ) : items.length === 0 ? (
            <div className="tsc-empty">{live ? "等待事件流…" : "此 Run 没有留下事件。"}</div>
          ) : (
            items.map((it) => {
              const conf = TYPE_CONF[it.type];
              const open = openSeqs.has(it.seq);
              return (
                <div key={it.seq} className="tsc-row-wrap">
                  <button
                    type="button"
                    className={`tsc-row${open ? " is-open" : ""}`}
                    onClick={() =>
                      setOpenSeqs((prev) => {
                        const next = new Set(prev);
                        if (next.has(it.seq)) next.delete(it.seq);
                        else next.add(it.seq);
                        return next;
                      })
                    }
                  >
                    <span className={`tsc-badge ${conf.cls}`}>
                      {it.type === "tool_use" || it.type === "tool_result" ? it.tool || conf.label : conf.label}
                    </span>
                    <span className="tsc-summary">{summaryOf(it)}</span>
                    <span className="tsc-row-meta">
                      #{it.seq} · {clock(it.created_at)}
                    </span>
                  </button>
                  {open && <DetailPre it={it} />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
