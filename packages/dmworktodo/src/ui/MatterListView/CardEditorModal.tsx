/**
 * [INPUT]: 依赖 api/todoApi 的 createPreferenceCard/updatePreferenceCard/deletePreferenceCard;
 *          bridge/types 的 PreferenceCard;utils/toast。
 * [OUTPUT]: 默认导出 CardEditorModal(经验新建/编辑弹窗:行为规则/依据/不适用/范围/状态[编辑] → create|update,编辑带两击删除)。
 * [POS]: dmworktodo/ui/MatterListView 的经验编辑弹窗,被 CardsView 的"新建经验"/"编辑"驱动;
 *        字段对齐 vanilla cardFormHTML/openNewCardModal/openEditCardModal。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useEffect, useRef, useState } from "react";
import {
  createPreferenceCard,
  updatePreferenceCard,
  deletePreferenceCard,
} from "../../api/todoApi";
import type { PreferenceCard } from "../../bridge/types";
import { Toast } from "../../utils/toast";
import "./cardEditor.css";

// 范围/状态选项对齐 vanilla cardFormHTML。
const SCOPE_OPTS = [
  { k: "matter", label: "当前回路" },
  { k: "project", label: "项目" },
  { k: "global", label: "普适" },
];
const STATUS_OPTS = [
  { k: "authorized", label: "已生效" },
  { k: "discarded", label: "已弃用" },
];
// bot/space 归一到 global(对齐 vanilla scopeVal 收敛)。
const normScope = (s?: string) => (s === "bot" || s === "space" ? "global" : s || "project");

export default function CardEditorModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: PreferenceCard | "new";
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = editing === "new";
  const c = isNew ? null : (editing as PreferenceCard);

  const [content, setContent] = useState(c?.content ?? "");
  const [evidence, setEvidence] = useState(c?.evidence ?? "");
  const [avoid, setAvoid] = useState(c?.avoid ?? "");
  const [scope, setScope] = useState(normScope(c?.scope));
  // 状态 select 仅 authorized/discarded;draft/hit/miss 落到 authorized(与 vanilla 首项默认一致)。
  const [status, setStatus] = useState(c?.status === "discarded" ? "discarded" : "authorized");
  const [busy, setBusy] = useState(false);
  const [delArmed, setDelArmed] = useState(false); // 删除两击确认(对齐 ScheduleModal amDel)
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const close = () => {
    if (!busy) onClose();
  };

  const save = async () => {
    if (busy) return;
    const text = content.trim();
    if (!text) return Toast.error("规则不能为空");
    setBusy(true);
    try {
      if (isNew) {
        // 新建:evidence/avoid 仅非空才传(对齐 vanilla openNewCardModal)。
        await createPreferenceCard({
          content: text,
          scope,
          ...(evidence.trim() ? { evidence: evidence.trim() } : {}),
          ...(avoid.trim() ? { avoid: avoid.trim() } : {}),
        });
      } else {
        // 编辑:evidence/avoid 恒传(空串可清空),status 一并提交(对齐 vanilla openEditCardModal)。
        await updatePreferenceCard(c!.id, {
          content: text,
          scope,
          status,
          evidence: evidence.trim(),
          avoid: avoid.trim(),
        });
      }
      if (!mountedRef.current) return;
      Toast.success(isNew ? "经验已创建" : "已保存");
      onSaved();
      onClose();
    } catch {
      if (mountedRef.current) {
        Toast.error("保存失败");
        setBusy(false);
      }
    }
  };

  // 删除:两击确认;删除中算 busy,失败解武装。
  const del = async () => {
    if (busy || isNew || !c) return;
    if (!delArmed) {
      setDelArmed(true);
      return;
    }
    setBusy(true);
    try {
      await deletePreferenceCard(c.id);
      if (!mountedRef.current) return;
      Toast.success("已删除");
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
    <div className="ce-overlay" onClick={close}>
      <div className="ce" onClick={(e) => e.stopPropagation()}>
        <div className="ce-head">
          <div className="ce-title">{isNew ? "新建经验" : "编辑经验"}</div>
          <button type="button" className="ce-x" onClick={close} disabled={busy} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="ce-body">
          <div className="ce-field">
            <label>
              行为规则<span className="ce-req">*</span>
            </label>
            <textarea
              className="ce-textarea"
              rows={4}
              placeholder="一条可执行的祈使句"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="ce-field">
            <label>依据</label>
            <textarea
              className="ce-textarea"
              rows={2}
              placeholder="来自哪次任务的什么反馈"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </div>
          <div className="ce-field">
            <label>不适用场景</label>
            <textarea
              className="ce-textarea"
              rows={2}
              placeholder="什么情况下不应该用这条规则"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
            />
          </div>
          <div className="ce-row">
            <div className="ce-field">
              <label>范围</label>
              <select className="ce-select" value={scope} onChange={(e) => setScope(e.target.value)}>
                {SCOPE_OPTS.map((s) => (
                  <option key={s.k} value={s.k}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {!isNew && (
              <div className="ce-field">
                <label>状态</label>
                <select className="ce-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTS.map((s) => (
                    <option key={s.k} value={s.k}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="ce-foot">
          {!isNew && (
            <button
              type="button"
              className={`ce-del${delArmed ? " is-armed" : ""}`}
              onClick={del}
              disabled={busy}
            >
              {delArmed ? "再点一次确认删除" : "删除"}
            </button>
          )}
          <span className="ce-flex" />
          <button type="button" className="ce-cancel" onClick={close} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className="ce-save"
            onClick={save}
            disabled={busy || !content.trim()}
          >
            {busy ? "保存中…" : isNew ? "创建" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
