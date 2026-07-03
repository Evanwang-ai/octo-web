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
import MarkdownContent from "@octo/base/src/Messages/Text/MarkdownContent";
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
      if (typeof v === "string" && v.trim()) return v.slice(0, 200);
    }
    try {
      return JSON.stringify(input).slice(0, 200);
    } catch {
      return "[无法序列化的入参]";
    }
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
  if (it.type === "tool_use") {
    try {
      text = JSON.stringify(it.input ?? {}, null, 2);
    } catch {
      text = "[无法序列化的入参(循环引用)]";
    }
  } else if (it.type === "tool_result") {
    text = it.output || "";
    if (text.length > 4000) text = `${text.slice(0, 4000)}\n… (已截断)`;
  } else text = it.content || "";
  return <pre className={`tsc-pre${it.type === "error" ? " is-error" : ""}`}>{text}</pre>;
}

// 右栏详情(Langfuse 配方:meta chips + Input/Output 卡;text 类带 markdown 预览切换)。
function DetailPane({
  node,
  focusSeq,
}: {
  node: { item: TimelineItem; child?: TimelineItem; durSec: number | null };
  focusSeq: number | null;
}) {
  const [md, setMd] = useState(false);
  const it = node.child && focusSeq === node.child.seq ? node.child : node.item;
  const conf = TYPE_CONF[it.type];
  const isTextual = it.type === "text" || it.type === "thinking";
  useEffect(() => setMd(false), [focusSeq]);
  return (
    <div className="tsc-dp">
      <div className="tsc-dp-chips">
        <span className={`tsc-badge ${conf.cls}`}>
          {it.tool || conf.label}
        </span>
        <span className="tsc-chip">#{it.seq}</span>
        {it.created_at && <span className="tsc-chip">{clock(it.created_at)}</span>}
        {node.durSec !== null && it === node.item && <span className="tsc-chip">耗时 {node.durSec}s</span>}
        {isTextual && (
          <button type="button" className="tsc-md-toggle" onClick={() => setMd((v) => !v)}>
            {md ? "原文" : "预览"}
          </button>
        )}
      </div>
      {it.type === "tool_use" && (
        <>
          <div className="tsc-dp-k">入参</div>
          <DetailPre it={it} />
          {node.child && (
            <>
              <div className="tsc-dp-k">结果</div>
              <DetailPre it={node.child} />
            </>
          )}
        </>
      )}
      {it.type === "tool_result" && (
        <>
          <div className="tsc-dp-k">结果</div>
          <DetailPre it={it} />
        </>
      )}
      {isTextual &&
        (md ? (
          <div className="tsc-dp-md">
            <MarkdownContent content={it.content || ""} />
          </div>
        ) : (
          <DetailPre it={it} />
        ))}
      {it.type === "error" && <DetailPre it={it} />}
    </div>
  );
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
  // S6 卡⑤:双栏 trace(Langfuse 配方);D2=窄屏(<720)降级为原单栏。
  const [narrow, setNarrow] = useState(() => window.innerWidth < 720);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 720);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let alive = true;
    // 换 Run 时回加载态并清空展开集(防御:当前入口每次重开 Dialog,但同实例切换也要正确)。
    setItems(null);
    setOpenSeqs(new Set());
    setSelectedSeq(null);
    listTaskMessages(task.id).then((msgs) => {
      if (!alive) return;
      const tl = buildTimeline(msgs);
      setItems(tl);
      // 结论优先(Notion 速记印证):终态默认选中最后一条 text;否则首条。
      const lastText = [...tl].reverse().find((m) => m.type === "text");
      setSelectedSeq(lastText?.seq ?? tl[0]?.seq ?? null);
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

  // 渲染层配对:tool_use + 紧邻同名 tool_result 折成父子节点(数据仍平铺,契约无 tool_use_id)。
  interface TreeNode {
    item: TimelineItem;
    child?: TimelineItem;
    durSec: number | null;
  }
  const tree: TreeNode[] = useMemo(() => {
    const list = items || [];
    const out: TreeNode[] = [];
    const at = (m?: TimelineItem) => (m?.created_at ? new Date(m.created_at).getTime() : null);
    for (let i = 0; i < list.length; i++) {
      const cur = list[i];
      const next = list[i + 1];
      const paired =
        cur.type === "tool_use" && next?.type === "tool_result" && next.tool === cur.tool;
      const end = paired ? list[i + 2] : next;
      const t0 = at(cur);
      const t1 = end ? at(end) : task.completed_at ? new Date(task.completed_at).getTime() : null;
      out.push({
        item: cur,
        child: paired ? next : undefined,
        durSec: t0 !== null && t1 !== null ? Math.max(0, Math.round((t1 - t0) / 1000)) : null,
      });
      if (paired) i++;
    }
    return out;
  }, [items, task.completed_at]);
  const selected = useMemo(() => {
    for (const n of tree) {
      if (n.item.seq === selectedSeq) return n;
      if (n.child?.seq === selectedSeq) return n;
    }
    return null;
  }, [tree, selectedSeq]);
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
        {narrow ? (
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
        ) : (
          <div className="tsc-split">
            <div className="tsc-tree">
              {items === null ? (
                <div className="tsc-empty">加载中…</div>
              ) : tree.length === 0 ? (
                <div className="tsc-empty">{live ? "等待事件流…" : "此 Run 没有留下事件。"}</div>
              ) : (
                tree.map((n) => {
                  const conf = TYPE_CONF[n.item.type];
                  const isSel = selectedSeq === n.item.seq || selectedSeq === n.child?.seq;
                  return (
                    <div key={n.item.seq} className="tsc-tree-group">
                      <button
                        type="button"
                        className={`tsc-tree-row${isSel ? " is-active" : ""}`}
                        onClick={() => setSelectedSeq(n.item.seq)}
                      >
                        <span className={`tsc-badge ${conf.cls}`}>
                          {n.item.type === "tool_use" ? n.item.tool || conf.label : conf.label}
                        </span>
                        <span className="tsc-tree-summary">{summaryOf(n.item)}</span>
                        <span className="tsc-tree-dur">
                          {n.durSec !== null ? (n.durSec < 60 ? `${n.durSec}s` : `${Math.floor(n.durSec / 60)}m`) : ""}
                        </span>
                      </button>
                      {n.child && (
                        <button
                          type="button"
                          className={`tsc-tree-row is-child${selectedSeq === n.child.seq ? " is-active" : ""}`}
                          onClick={() => setSelectedSeq(n.child!.seq)}
                        >
                          <span className="tsc-tree-branch">└</span>
                          <span className="tsc-tree-summary">{summaryOf(n.child)}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="tsc-detail">
              {selected === null ? (
                <div className="tsc-empty">选中左侧事件查看详情</div>
              ) : (
                <DetailPane node={selected} focusSeq={selectedSeq} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
