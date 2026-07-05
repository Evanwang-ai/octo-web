/**
 * [INPUT]: api/todoApi 的 getMatterSummary/updateMatterSummary/postReview/distillRequest;
 *          hooks/useMemberList(distill 选 bot);utils/toast。
 * [OUTPUT]: 对外默认导出 ExperiencePanel —— 详情终态经验面板(欠账 §9,vanilla L7992-8046 直译)。
 * [POS]: dmworktodo/ui/MatterListView 的经验沉淀面板,MatterDetailView Inspector 底部挂载
 *        (仅 done/cancelled 终态渲染)。5 分支:authorized=✓已生效+范围可改(发起人)/
 *        draft+发起人=待确认+生效·弃用/discarded=已弃用+重新总结/无记录+发起人=
 *        有反馈→总结经验(distill 选 bot)|无反馈→点评输入(post-review)/其它=状态展示。
 *        后端 summary 域已就绪(curl 实测 2026-07-03,旧"未就绪"判断作废)。
 *        降级:vanilla distill 只列"我的 Bot"(ownedBotInfo),React 成员数据无归属,列全部 Bot。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  getMatterSummary,
  updateMatterSummary,
  postReview,
  distillRequest,
} from "../../api/todoApi";
import type { MatterSummary } from "../../api/todoApi";
import { useMemberList } from "../../hooks/useMemberList";
import { Toast } from "../../utils/toast";
import MarkdownContent from "@octo/base/src/Messages/Text/MarkdownContent";

const SCOPE_LABEL: Record<string, string> = {
  matter: "当前回路",
  project: "项目",
  global: "普适",
  space: "普适",
};

export default function ExperiencePanel({
  matterId,
  status,
  creatorId,
  leaderUid,
  myUid,
  feedbackCount,
  onChanged,
}: {
  matterId: string;
  status: string;
  creatorId: string;
  leaderUid?: string;
  myUid: string;
  feedbackCount: number | null; // null=activities 未载,先不渲染无记录分支(时序守护)
  onChanged?: () => void; // 变更成功后通知宿主(迭代区经验总结行同步重拉)
}) {
  const isTerminal = status === "done" || status === "cancelled";
  const isCreator = creatorId === myUid;
  const [row, setRow] = useState<MatterSummary | null | undefined>(undefined); // undefined=加载中
  const [expanded, setExpanded] = useState(false);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [distillOpen, setDistillOpen] = useState(false);
  const [distillBot, setDistillBot] = useState("");
  const [loadErr, setLoadErr] = useState(false);

  const { members } = useMemberList({});
  const bots = useMemo(() => members.filter((m) => m.isBot), [members]);
  const aliveRef = React.useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // matterId 闭包校验:旧响应不覆盖新面板(codex 双审严重项)。
  const reload = () => {
    const id = matterId;
    return getMatterSummary(id)
      .then((r) => {
        if (aliveRef.current && id === matterId) {
          setRow(r);
          setLoadErr(false);
        }
      })
      .catch(() => {
        if (aliveRef.current && id === matterId) {
          setRow(null);
          setLoadErr(true);
        }
      });
  };

  useEffect(() => {
    setRow(undefined);
    setLoadErr(false);
    if (isTerminal) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matterId, isTerminal]);

  if (!isTerminal || row === undefined) return null;

  const authorize = async (scopeType?: string) => {
    if (!row) return;
    setBusy(true);
    try {
      await updateMatterSummary(matterId, row.id, {
        action: "authorize",
        ...(scopeType ? { scope_type: scopeType } : {}),
        target_bot_uid: row.target_bot_uid || leaderUid || "",
      });
      Toast.success(scopeType ? `范围已更新为「${SCOPE_LABEL[scopeType] || scopeType}」` : "已生效");
      await reload();
      onChanged?.();
    } catch {
      Toast.error("操作失败");
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (!row) return;
    setBusy(true);
    try {
      await updateMatterSummary(matterId, row.id, { action: "discard" });
      Toast.success("已弃用");
      await reload();
      onChanged?.();
    } catch {
      Toast.error("操作失败");
    } finally {
      setBusy(false);
    }
  };

  const fireDistill = async () => {
    const bot = distillBot || bots[0]?.uid;
    if (!bot) {
      Toast.error("暂无可用的 worker");
      return;
    }
    setBusy(true);
    try {
      await distillRequest(matterId, bot);
      Toast.success("已发起总结");
      setDistillOpen(false);
      await reload();
      onChanged?.();
    } catch {
      Toast.error("操作失败");
    } finally {
      setBusy(false);
    }
  };

  const content = (row?.content || "").split("\n")[0];
  // vanilla:authorized 截 100 / draft 截 120。
  const limit = row?.status === "draft" ? 120 : 100;
  const truncated = content.length > limit;
  const shown = expanded || !truncated ? content : `${content.slice(0, limit)}…`;

  let body: React.ReactNode;
  if (row && row.status === "authorized") {
    body = (
      <>
        <div className="mdv-exp-status is-done">✓ 已生效</div>
        <div className="mdv-exp-content"><MarkdownContent content={shown} /></div>
        <div className="mdv-exp-meta">
          范围:
          {isCreator ? (
            <select
              className="mdv-exp-scope"
              disabled={busy}
              value={row.scope_type === "space" ? "global" : row.scope_type || "matter"}
              onChange={(e) => authorize(e.target.value)}
            >
              <option value="matter">当前回路</option>
              <option value="project">项目</option>
              <option value="global">普适</option>
            </select>
          ) : (
            SCOPE_LABEL[row.scope_type || ""] || row.scope_type || "—"
          )}
          {row.task_type && ` · 类型: ${row.task_type}`}
        </div>
        {truncated && (
          <button type="button" className="mdv-exp-toggle" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "▴ 收起" : "▾ 展开全部"}
          </button>
        )}
      </>
    );
  } else if (row && row.status === "draft" && isCreator) {
    body = (
      <>
        <div className="mdv-exp-status is-pending">● 待确认</div>
        <div className="mdv-exp-content"><MarkdownContent content={shown} /></div>
        {truncated && (
          <button type="button" className="mdv-exp-toggle" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "▴ 收起" : "▾ 展开全部"}
          </button>
        )}
        <div className="mdv-exp-acts">
          <button type="button" className="mdv-exp-act is-ok" disabled={busy} onClick={() => authorize()}>
            生效
          </button>
          <button type="button" className="mdv-exp-act is-warn" disabled={busy} onClick={discard}>
            弃用
          </button>
        </div>
      </>
    );
  } else if (row && row.status === "discarded") {
    body = (
      <>
        <div className="mdv-exp-status is-muted">✗ 已弃用</div>
        {isCreator && (
          <button type="button" className="mdv-exp-open" disabled={busy} onClick={() => setDistillOpen(true)}>
            重新总结
          </button>
        )}
      </>
    );
  } else if (!row && isCreator) {
    body = loadErr ? (
      <div className="mdv-exp-status is-muted">经验读取失败</div>
    ) : feedbackCount === null ? (
      <div className="mdv-exp-status is-muted">…</div>
    ) : feedbackCount > 0 ? (
        <>
          <div className="mdv-exp-status">这次任务有 {feedbackCount} 条反馈</div>
          <button type="button" className="mdv-exp-open" disabled={busy} onClick={() => setDistillOpen(true)}>
            总结经验
          </button>
        </>
      ) : (
        <>
          <div className="mdv-exp-status">点评本次任务(选填)</div>
          <textarea
            className="mdv-exp-review"
            rows={2}
            maxLength={4000}
            placeholder="评价"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <button
            type="button"
            className="mdv-exp-open"
            disabled={busy || !review.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await postReview(matterId, review.trim());
                Toast.success("点评已记录");
                setReview("");
                await reload();
                onChanged?.();
              } catch {
                Toast.error("提交失败");
              } finally {
                setBusy(false);
              }
            }}
          >
            提交
          </button>
        </>
      );
  } else if (row) {
    body = <div className="mdv-exp-status is-muted">经验状态: {row.status || "未知"}</div>;
  } else {
    body = <div className="mdv-exp-status is-muted">暂无经验记录</div>;
  }

  return (
    <div className="mdv-exp">
      <div className="mdv-props-divider" />
      <div className="mdv-exp-title">经验</div>
      {body}
      {distillOpen && (
        <div className="mdv-exp-distill">
          <div className="mdv-exp-meta">由哪个 worker 总结这次的经验？</div>
          <select
            className="mdv-exp-scope"
            value={distillBot || bots[0]?.uid || ""}
            onChange={(e) => setDistillBot(e.target.value)}
          >
            {bots.map((b) => (
              <option key={b.uid} value={b.uid}>
                {b.name || b.uid}
              </option>
            ))}
          </select>
          <div className="mdv-exp-acts">
            <button type="button" className="mdv-exp-act" disabled={busy} onClick={() => setDistillOpen(false)}>
              取消
            </button>
            <button type="button" className="mdv-exp-act is-ok" disabled={busy} onClick={fireDistill}>
              开始总结
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
