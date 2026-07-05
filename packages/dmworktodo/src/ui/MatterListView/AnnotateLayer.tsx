/**
 * [INPUT]: api/todoApi 的 addTimelineEntry/addFeedback;utils/toast。
 * [OUTPUT]: 对外默认导出 AnnotateLayer —— 选中文字批注(欠账 §9-③,vanilla annotFab
 *           L10255-10293 + openInlineReply isFeedback 分支 L7805-7845 直译)。
 * [POS]: dmworktodo/ui/MatterListView 的批注浮层,MatterDetailView 挂载(动态/产出内容卡
 *        带 data-annot-entry=条目id)。选中卡内文字(≥2字)→「批注」FAB→浮层(引用+输入)→
 *        双写:timeline(content=批注: "snippet60…"+正文,parent_entry_id)+ feedback
 *        ({content, anchor:{snippet}, entry_id});timelinePosted 守护防重试重复落档;
 *        review 态服务端自动退回→toast"已批注 · 已退回修改"。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addTimelineEntry, addFeedback } from "../../api/todoApi";
import { Toast } from "../../utils/toast";

interface Snap {
  snippet: string;
  entryId: string;
  x: number; // FAB fixed 坐标
  y: number;
}

export default function AnnotateLayer({
  matterId,
  onDone,
}: {
  matterId: string;
  onDone: () => void;
}) {
  const [fab, setFab] = useState<Snap | null>(null);
  const [box, setBox] = useState<Snap | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const timelinePostedRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // 选中检测(vanilla positionAnnotFab):两端都落在同一 [data-annot-entry] 内才亮 FAB。
  useEffect(() => {
    const onUp = () => {
      // 浮层开着时不重定位(vanilla:有 reply-input 时不动 fab)。
      if (boxRef.current) return;
      const sel = window.getSelection();
      const txt = sel ? String(sel).trim() : "";
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || txt.length < 2) {
        setFab(null);
        return;
      }
      const elOf = (n: Node | null) =>
        n ? (n.nodeType === 1 ? (n as HTMLElement) : n.parentElement) : null;
      const ae = elOf(sel.anchorNode);
      const fe = elOf(sel.focusNode);
      const card = ae?.closest?.("[data-annot-entry]") as HTMLElement | null;
      if (!card || !fe || !card.contains(fe)) {
        setFab(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      if (!r || (!r.width && !r.height)) {
        setFab(null);
        return;
      }
      setFab({
        snippet: txt.slice(0, 200),
        entryId: card.getAttribute("data-annot-entry") || "",
        x: Math.max(8, Math.min(r.left + r.width / 2 - 40, window.innerWidth - 110)),
        y: r.top - 40 < 54 ? r.bottom + 8 : r.top - 40,
      });
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (fabRef.current?.contains(t) || boxRef.current?.contains(t)) return;
      setFab(null);
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const openBox = () => {
    if (!fab) return;
    setBox(fab);
    setFab(null);
    setText("");
    timelinePostedRef.current = false;
    window.getSelection()?.removeAllRanges();
  };

  const close = () => {
    if (busy) return;
    setBox(null);
    setText("");
  };

  const submit = async () => {
    // busy 前置:按钮有 disabled,但 textarea Enter 直调 submit,pending 中连发会双落 timeline(codex)。
    if (!box || busy) return;
    const t = text.trim();
    if (!t) {
      Toast.error("内容不能为空");
      return;
    }
    setBusy(true);
    const snippet = box.snippet;
    const tlContent = `批注: "${snippet.slice(0, 60)}${snippet.length > 60 ? "..." : ""}"\n\n${t}`;
    try {
      // timelinePosted 守护:重试不重复落档(vanilla replyBox.__timelinePosted)。
      if (!timelinePostedRef.current) {
        await addTimelineEntry(matterId, {
          content: tlContent,
          ...(box.entryId ? { parent_entry_id: box.entryId } : {}),
        });
        timelinePostedRef.current = true;
      }
      const resp = await addFeedback(matterId, {
        content: t,
        anchor: { snippet },
        ...(box.entryId ? { entry_id: box.entryId } : {}),
      });
      const flipped = resp?.matter_status === "in_progress";
      Toast.success(flipped ? "已批注 · 已退回修改" : "已批注");
      setBox(null);
      setText("");
      onDone();
    } catch (e) {
      Toast.error((e as Error).message || "批注失败");
    } finally {
      setBusy(false);
    }
  };

  const quote = box
    ? box.snippet.length > 80
      ? `${box.snippet.slice(0, 80)}...`
      : box.snippet
    : "";

  return createPortal(
    <>
      {fab && (
        <button
          ref={fabRef}
          type="button"
          className="mdv-annot-fab"
          style={{ left: fab.x, top: fab.y }}
          onClick={openBox}
        >
          ✏ 批注
        </button>
      )}
      {box && (
        <div
          ref={boxRef}
          className="mdv-annot-box"
          role="dialog"
          aria-label="批注"
          style={{
            left: Math.min(box.x, window.innerWidth - 336),
            top: Math.min(box.y, window.innerHeight - 220),
          }}
        >
          <div className="mdv-annot-quote" title={box.snippet}>
            “{quote}”
          </div>
          <textarea
            className="mdv-annot-input"
            rows={3}
            autoFocus
            maxLength={4000}
            placeholder="批注内容"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                close();
              }
            }}
          />
          <div className="mdv-annot-acts">
            <button type="button" className="mdv-annot-cancel" disabled={busy} onClick={close}>
              取消
            </button>
            <button
              type="button"
              className="mdv-annot-send"
              disabled={busy || !text.trim()}
              onClick={submit}
            >
              {busy ? "发送中…" : "发送"}
            </button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
