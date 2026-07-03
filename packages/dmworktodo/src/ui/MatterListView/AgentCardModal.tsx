/**
 * [INPUT]: api/todoApi 的 getAgentStats/getAgentCard;@octo/base WKApp(mittBus 跳单)+WKAvatar;
 *          ../UserName。
 * [OUTPUT]: 对外默认导出 AgentCardModal —— 战绩名片(欠账 §9-⑤,vanilla openAgentCard L10139
 *           + agentCardLedgerHTML L9638 收敛直译)。
 * [POS]: dmworktodo/ui/MatterListView 的成员名片模态,MatterDetailView Inspector 头像行点击挂载。
 *        bot:升段(RANKS 从 done 数派生,战绩即真相)+协作能力(agent-cards declared:tagline/
 *        描述/技能/系统 chips,declared_visible=false→"未向你公开")+当前回路/已验证记录/经验;
 *        human:三格数字+当前/记录。行点击 emit wk:open-matter-detail 跳单。
 *        降级注记:vanilla 的"你创建的"tag(ownedBotInfo)、@到当前回路按钮、capabilities 分组
 *        明细未搬(owner 数据/composer 注入待接线)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WKApp } from "@octo/base";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import { getAgentStats, getAgentCard } from "../../api/todoApi";
import type { AgentStats, AgentCardDeclared, AgentStatMatter, AgentPrefRow } from "../../api/todoApi";
import UserName from "../UserName";
import "./agentCard.css";

const isBot = (uid?: string) => !!uid && uid.endsWith("_bot");

// 升段(vanilla RANKS,06 §11):从真实验收数派生,不存储 — 战绩即真相。
const RANKS: Array<{ at: number; name: string }> = [
  { at: 0, name: "新虾" },
  { at: 5, name: "出徒" },
  { at: 20, name: "熟手" },
  { at: 50, name: "老手" },
  { at: 100, name: "宗师" },
];
function rankOf(done: number): { name: string; next: string } {
  let cur = RANKS[0];
  let next: { at: number; name: string } | null = null;
  for (const r of RANKS) {
    if (done >= r.at) cur = r;
    else {
      next = r;
      break;
    }
  }
  return {
    name: cur.name,
    next: next ? `还差 ${next.at - done} 件到「${next.name}」` : "已到顶",
  };
}

const SCOPE_LABEL: Record<string, string> = {
  matter: "回路",
  project: "项目",
  global: "普适",
  space: "普适",
};

function fmtShort(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!d.getTime()) return "";
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function AgentCardModal({ uid, onClose }: { uid: string; onClose: () => void }) {
  const bot = isBot(uid);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [statsErr, setStatsErr] = useState(false);
  const [decl, setDecl] = useState<AgentCardDeclared | null>(null);
  const [declVisible, setDeclVisible] = useState(true);
  const [declLoaded, setDeclLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getAgentStats(uid)
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(() => {
        if (alive) setStatsErr(true);
      });
    if (isBot(uid)) {
      getAgentCard(uid)
        .then((v) => {
          if (!alive) return;
          setDecl(v.declared || null);
          setDeclVisible(v.viewer?.declared_visible !== false);
          setDeclLoaded(true);
        })
        .catch(() => {
          if (alive) setDeclLoaded(true);
        });
    }
    return () => {
      alive = false;
    };
  }, [uid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openMatter = (matterId: string) => {
    onClose();
    WKApp.mittBus.emit("wk:open-matter-detail", { matterId });
  };

  const rowM = (it: AgentStatMatter) => (
    <button
      key={it.matter_id}
      type="button"
      className="agc-row"
      onClick={() => openMatter(it.matter_id)}
    >
      <span className="agc-row-id">{it.seq_no != null ? `M-${it.seq_no}` : ""}</span>
      <span className="agc-row-t" title={it.title || ""}>
        {it.title || ""}
      </span>
      {it.done_at && <span className="agc-row-when">{fmtShort(it.done_at)}</span>}
    </button>
  );

  const curList = stats?.current || [];
  const recent = stats?.recent || [];
  const prefs = stats?.preferences || [];
  const done = Number(stats?.done || 0);
  const rank = rankOf(done);

  const declHasContent =
    decl &&
    (decl.tagline || decl.description || (decl.skills || []).length || (decl.systems || []).length);

  return createPortal(
    <div
      className="agc-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="agc-modal" role="dialog" aria-modal="true" aria-label="成员名片">
        <div className="agc-head">
          <WKAvatar
            channel={new Channel(uid, ChannelTypePerson)}
            style={{ width: 44, height: 44, borderRadius: "50%", flex: "none" }}
          />
          <div className="agc-head-main">
            <div className="agc-name">
              <UserName uid={uid} />
              {bot && <span className="mdv-ai">AI</span>}
            </div>
            <div className="agc-handle">@{uid}</div>
          </div>
          <button type="button" className="agc-x" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="agc-body">
          {bot && (
            <div className="agc-sec">
              <div className="agc-sec-title">协作能力</div>
              {!declLoaded ? (
                <div className="agc-empty">查名片…</div>
              ) : !declVisible ? (
                <div className="agc-empty">能力描述未向你公开;战绩仍可见</div>
              ) : declHasContent ? (
                <>
                  {decl!.tagline && <div className="agc-tagline">“{decl!.tagline}”</div>}
                  {decl!.description && <div className="agc-desc">{decl!.description}</div>}
                  {(decl!.skills || []).length > 0 && (
                    <div className="agc-chips">
                      {decl!.skills!.map((x) => (
                        <span key={x} className="agc-chip">
                          {x}
                        </span>
                      ))}
                    </div>
                  )}
                  {(decl!.systems || []).length > 0 && (
                    <div className="agc-chips is-dim">
                      {decl!.systems!.map((x) => (
                        <span key={x} className="agc-chip">
                          {x}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="agc-empty">creator 还没发布协作能力</div>
              )}
            </div>
          )}

          {statsErr ? (
            <div className="agc-empty">记录读取失败</div>
          ) : stats === null ? (
            <div className="agc-empty">查记录…</div>
          ) : (
            <>
              <div className="agc-facts">
                <div className="agc-fact">
                  <div className="agc-fact-v">{curList.length}</div>
                  <div className="agc-fact-k">进行中</div>
                </div>
                <div className="agc-fact">
                  <div className="agc-fact-v">{done}</div>
                  <div className="agc-fact-k">完成</div>
                </div>
                <div className="agc-fact">
                  <div className="agc-fact-v">{Number(stats.in_review || 0)}</div>
                  <div className="agc-fact-k">待确认</div>
                </div>
                {bot && (
                  <div className="agc-fact is-rank" title={rank.next}>
                    <div className="agc-fact-v">{rank.name}</div>
                    <div className="agc-fact-k">段位</div>
                  </div>
                )}
              </div>

              <div className="agc-sec">
                <div className="agc-sec-title">
                  当前回路{curList.length > 0 && <span>{curList.length} 个活跃</span>}
                </div>
                {curList.length ? (
                  curList.slice(0, 5).map(rowM)
                ) : (
                  <div className="agc-empty">手上没有进行中的回路</div>
                )}
              </div>

              <div className="agc-sec">
                <div className="agc-sec-title">已验证记录{done > 0 && <span>{done} 件</span>}</div>
                {recent.length ? (
                  recent.slice(0, 5).map(rowM)
                ) : (
                  <div className="agc-empty">还没有验证过的交回</div>
                )}
              </div>

              {bot && (
                <div className="agc-sec">
                  <div className="agc-sec-title">
                    经验{prefs.length > 0 && <span>{prefs.length} 条</span>}
                  </div>
                  {prefs.length ? (
                    prefs.slice(0, 5).map((p: AgentPrefRow) => (
                      <button
                        key={p.summary_id}
                        type="button"
                        className="agc-pref"
                        title={p.content || ""}
                        onClick={() => openMatter(p.matter_id)}
                      >
                        <span className="agc-pref-top">
                          <span className="agc-pref-scope">
                            {SCOPE_LABEL[p.scope_type || ""] || "综合"}
                          </span>
                          <span className="agc-pref-score">
                            C{Number(p.confidence || 0)} +{Number(p.hit_count || 0)}/-
                            {Number(p.miss_count || 0)}
                          </span>
                          {p.updated_at && (
                            <span className="agc-row-when">{fmtShort(p.updated_at)}</span>
                          )}
                        </span>
                        <span className="agc-pref-rule">
                          {(p.content || "").split("\n")[0] || "点开看完整经验"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="agc-empty">还没有已生效的经验</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
