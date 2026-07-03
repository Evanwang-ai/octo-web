/**
 * [INPUT]: hooks/useMemberList(@提及候选);api/todoApi 的 addTimelineEntry/addFeedback/
 *          uploadMatterAttachment;utils/toast;./icons 无。
 * [OUTPUT]: 对外默认导出 MatterComposer —— 详情页 composer(欠账族②,vanilla 轻路径)。
 * [POS]: dmworktodo/ui/MatterListView 的详情发车条,MatterDetailView 挂载。
 *        真相源=vanilla L7542-7654(mention picker 分组/附件挑完即传随下条发送)+
 *        L7667-7699(发送双路语义:@人或 review 态 ⇒ feedback 敲铃[target_uid=首个提及,
 *        review 态服务端自动退回修改];带附件走 timeline 落档;两者兼有则双发各司其职)。
 *        分组降级:vanilla 四组(参与人/我的Bot/其他Bot/成员),React 侧成员数据无 bot 归属,
 *        降为三组(本单参与人/Bot/其他成员),归属组随接线补(欠账注记)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMemberList } from "../../hooks/useMemberList";
import {
  addTimelineEntry,
  addFeedback,
  uploadMatterAttachment,
} from "../../api/todoApi";
import type { TimelineAttachmentReq, TimelineReq } from "../../bridge/types";
import type { MatterDetail } from "../../bridge/types";
import { Toast } from "../../utils/toast";
import "./composer.css";

interface PendingAtt extends TimelineAttachmentReq {
  file_name: string;
}

export default function MatterComposer({
  matter,
  onSent,
}: {
  matter: Pick<MatterDetail, "id" | "status" | "creator_id" | "assignees"> & {
    leader_uid?: string;
  };
  onSent: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [atts, setAtts] = useState<PendingAtt[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mpOpen, setMpOpen] = useState(false);
  const [mpQuery, setMpQuery] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 点击 picker 外部关闭(vanilla document click 同款)。
  useEffect(() => {
    if (!mpOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMpOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [mpOpen]);

  const { members } = useMemberList({});

  // 分组(vanilla buildMentionList 降级三组):本单参与人 / Bot / 其他成员。
  const groups = useMemo(() => {
    const q = mpQuery.trim().toLowerCase();
    const participants = new Set(
      [matter.creator_id, matter.leader_uid, ...(matter.assignees || []).map((a) => a.user_id)].filter(
        Boolean,
      ) as string[],
    );
    const all = members.filter(
      (m) =>
        m.uid &&
        (!q || (m.name || m.uid).toLowerCase().includes(q) || m.uid.toLowerCase().includes(q)),
    );
    return [
      { label: "本单参与人", items: all.filter((m) => participants.has(m.uid)) },
      { label: "Bot", items: all.filter((m) => !participants.has(m.uid) && m.isBot) },
      { label: "其他成员", items: all.filter((m) => !participants.has(m.uid) && !m.isBot) },
    ].filter((g) => g.items.length > 0);
  }, [members, mpQuery, matter]);

  const insertMention = (name: string) => {
    const tag = `@${name} `;
    setDraft((v) => (v ? `${v.replace(/\s+$/, "")} ${tag}` : tag));
    setMpOpen(false);
    taRef.current?.focus();
  };

  // vanilla parseMentions:按 "@名字" 出现位置匹配成员表。
  const parseMentions = (text: string) => {
    const hits: Array<{ uid: string; pos: number; name: string }> = [];
    for (const m of members) {
      if (!m.uid) continue;
      const nm = m.name || m.uid;
      const idx = text.indexOf(`@${nm}`);
      if (idx >= 0) hits.push({ uid: m.uid, pos: idx, name: nm });
    }
    return hits.sort((a, b) => a.pos - b.pos);
  };

  const pickFiles = () => fileRef.current?.click();

  const onFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    Toast.success("上传中…");
    try {
      const uploaded = await Promise.all(files.map((f) => uploadMatterAttachment(f, matter.id)));
      if (!mountedRef.current) return;
      setAtts((prev) => [
        ...prev,
        ...uploaded.map((a) => ({ ...a, mime_type: a.mime_type || undefined })),
      ]);
      Toast.success("传好了,随下一条发送一起带上");
    } catch (e) {
      if (mountedRef.current) Toast.error((e as Error).message || "上传失败");
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  };

  const send = async () => {
    const text = draft.trim();
    const hasAtts = atts.length > 0;
    if (uploading) {
      Toast.error("附件还在上传,稍等一下");
      return;
    }
    if ((!text && !hasAtts) || sending) {
      if (!text && !hasAtts) Toast.error("写点什么再发");
      return;
    }
    setSending(true);
    const mentions = parseMentions(text);
    // vanilla 双路:@人 或 review 态 ⇒ feedback(敲铃/审核退回);附件走 timeline 落档。
    const asFeedback = mentions.length > 0 || (matter.status as string) === "review";
    try {
      const timelineBody: TimelineReq = { content: text };
      if (hasAtts) timelineBody.attachments = atts.map(({ file_url, file_name, file_size, mime_type }) => ({
        file_url,
        file_name,
        file_size,
        mime_type,
      }));
      try {
        await addTimelineEntry(matter.id, timelineBody);
      } catch {
        if (mountedRef.current) Toast.error("发送失败");
        return;
      }
      // timeline 已落——此后无论 feedback 成败都清草稿,避免重试重复落档(codex 双审严重项)。
      if (asFeedback && text) {
        try {
          const resp = await addFeedback(matter.id, {
            content: text,
            ...(mentions.length ? { target_uid: mentions[0].uid } : {}),
          });
          const flipped =
            resp?.matter_status === "in_progress" && (matter.status as string) === "review";
          const who = mentions.length ? mentions[0].name : "";
          Toast.success(
            flipped
              ? `已退回修改${who ? ` — 已通知 ${who}` : ""}`
              : `记下了${who ? ` — 已通知 ${who}` : ""}`,
          );
        } catch {
          if (mountedRef.current) Toast.error("动态已发,但通知对方失败");
        }
      }
      if (!mountedRef.current) return;
      setDraft("");
      setAtts([]);
      onSent();
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  return (
    <div className="mdc" ref={rootRef}>
      {atts.length > 0 && (
        <div className="mdc-atts">
          {atts.map((a, i) => (
            <span key={`${i}-${a.file_url}`} className="mdc-chip">
              <span className="mdc-chip-name">{a.file_name}</span>
              <button
                type="button"
                className="mdc-chip-x"
                aria-label="移除附件"
                onClick={() => setAtts(atts.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mdc-row">
        <button
          type="button"
          className="mdc-icon"
          title="@提及(会通知对方;审核中会退回修改)"
          aria-label="提及"
          onClick={(e) => {
            e.stopPropagation();
            setMpOpen((v) => !v);
            setMpQuery("");
          }}
        >
          @
        </button>
        <button
          type="button"
          className="mdc-icon"
          title="附件(传好随下一条发送)"
          aria-label="附件"
          disabled={uploading}
          onClick={pickFiles}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M13 7.5 8.2 12.3a3.2 3.2 0 0 1-4.5-4.5l5.2-5.2a2.2 2.2 0 0 1 3.1 3.1L6.9 10.8a1.2 1.2 0 0 1-1.7-1.7l4.4-4.4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            onFiles(files);
          }}
        />
        <textarea
          ref={taRef}
          className="mdc-input"
          rows={1}
          aria-label="添加进展"
          placeholder={
            (matter.status as string) === "review"
              ? "说一句 — 审核中,@人或直接发都会退回修改"
              : "说一句 — 会记进这单的动态;@人会通知对方"
          }
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
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
          disabled={sending || uploading || (!draft.trim() && atts.length === 0)}
        >
          {sending ? "发送中…" : "发送"}
        </button>
      </div>
      {mpOpen && (
        <div className="mdc-mp" role="listbox" aria-label="提及成员">
          <input
            className="mdc-mp-search"
            placeholder="搜成员…"
            value={mpQuery}
            autoFocus
            onChange={(e) => setMpQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setMpOpen(false);
                taRef.current?.focus();
              }
            }}
          />
          <div className="mdc-mp-list">
            {groups.length === 0 ? (
              <div className="mdc-mp-empty">无匹配成员</div>
            ) : (
              groups.map((g) => (
                <React.Fragment key={g.label}>
                  <div className="mdc-mp-sec">{g.label}</div>
                  {g.items.map((m) => (
                    <button
                      key={m.uid}
                      type="button"
                      className="mdc-mp-item"
                      onClick={() => insertMention(m.name || m.uid)}
                    >
                      <span className="mdc-mp-name">{m.name || m.uid}</span>
                      {m.isBot && <span className="mdv-ai">AI</span>}
                    </button>
                  ))}
                </React.Fragment>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
