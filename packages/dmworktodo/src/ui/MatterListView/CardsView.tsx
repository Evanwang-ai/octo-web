/**
 * [INPUT]: 依赖 api/todoApi 的 listPreferenceCards/searchPreferenceCards/updatePreferenceCard/
 *          deletePreferenceCard/listProjects;@octo/base 的 WKApp;utils/toast。
 * [OUTPUT]: 默认导出 CardsView(原生经验页:按 scope 分组 + 状态 chip + 行展开 + 确认/弃用/恢复/删除 + 搜索)。
 * [POS]: dmworktodo/ui/MatterListView 的经验(cards)视图,被 MatterRouteHost 以 view="cards" 挂载(替 iframe);
 *        真相源 vanilla feat/loop renderCards/paintCards;bespoke 绿/琥珀 chip 统一到 --wk-*。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WKApp } from "@octo/base";
import {
  listPreferenceCards,
  searchPreferenceCards,
  updatePreferenceCard,
  deletePreferenceCard,
  listProjects,
} from "../../api/todoApi";
import type { PreferenceCard } from "../../bridge/types";
import { Toast } from "../../utils/toast";
import CardEditorModal from "./CardEditorModal";
import "./cards.css";

// 状态 chip:draft/authorized/hit/miss/discarded → --wk-* 语义色(替 vanilla bespoke 绿/琥珀)。
const CARD_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "is-draft" },
  authorized: { label: "已生效", cls: "is-authorized" },
  hit: { label: "命中", cls: "is-hit" },
  miss: { label: "未命中", cls: "is-miss" },
  discarded: { label: "已弃用", cls: "is-discarded" },
};

// scope 分组(对齐 vanilla cardScopeGroup)。
const SCOPE_GROUPS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "universal", label: "普适标准", match: (s) => s === "global" || s === "space" },
  { key: "project", label: "项目级", match: (s) => s === "project" },
  { key: "bot", label: "worker 级", match: (s) => s === "bot" },
  { key: "matter", label: "回路级", match: (s) => s === "matter" },
];

function cardFirstLine(content: string): string {
  const line = (content || "").split("\n")[0].replace(/^P-\S+\s*[:：]?\s*/, "");
  return line.length > 120 ? line.slice(0, 120) + "…" : line;
}
function relTime(iso?: string): string {
  if (!iso) return "";
  const ts = new Date(iso).getTime();
  if (!ts) return "";
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function CardsView() {
  const [cards, setCards] = useState<PreferenceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Set<string>>(new Set()); // 写操作在途的卡 id(禁按 + 防连点)
  const [editingCard, setEditingCard] = useState<PreferenceCard | "new" | null>(null); // 新建/编辑 modal
  const fullRef = useRef<PreferenceCard[]>([]); // 全量缓存,搜索降级用
  const searchGenRef = useRef(0); // 搜索代际:只让最新 query 的响应落地
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 全量重载(初次 + 新建/编辑/删除卡后刷新)。清空搜索框回到全量视图,避免旧 query 遮挡新卡。
  const loadCards = useCallback(() => {
    setLoading(true);
    listPreferenceCards(100)
      .then((cs) => {
        if (!mountedRef.current) return;
        fullRef.current = cs;
        setCards(cs);
        setQuery("");
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCards();
    listProjects()
      .then((ps) => {
        if (!mountedRef.current) return;
        const map: Record<string, string> = {};
        ps.forEach((p) => (map[p.id] = p.name));
        setProjectMap(map);
      })
      .catch(() => {});
  }, [loadCards]);

  // 搜索:后端优先,500/失败降级到内存过滤(vanilla 空 query 也走内存)。
  useEffect(() => {
    const q = query.trim();
    // 每次 query 变化占一代;含清空 query —— 旧搜索响应回来时代际不符即丢弃,不覆盖新态。
    const gen = ++searchGenRef.current;
    if (!q) {
      setCards(fullRef.current);
      return;
    }
    const localFilter = () =>
      fullRef.current.filter((c) => (c.content || "").toLowerCase().includes(q.toLowerCase()));
    const timer = setTimeout(() => {
      searchPreferenceCards(q)
        .then((cs) => {
          if (mountedRef.current && gen === searchGenRef.current) setCards(cs);
        })
        .catch(() => {
          if (mountedRef.current && gen === searchGenRef.current) setCards(localFilter());
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const gs = SCOPE_GROUPS.map((g) => {
      const items = cards.filter((c) => g.match(c.scope));
      items.forEach((c) => seen.add(c.id));
      return { key: g.key, label: g.label, items };
    }).filter((g) => g.items.length > 0);
    // 兜底:scope 不在四组的卡归"其他",绝不静默丢弃。
    const others = cards.filter((c) => !seen.has(c.id));
    if (others.length) gs.push({ key: "other", label: "其他", items: others });
    return gs;
  }, [cards]);

  const patchLocal = (id: string, patch: Partial<PreferenceCard>) => {
    const apply = (list: PreferenceCard[]) =>
      list.map((c) => (c.id === id ? { ...c, ...patch } : c));
    fullRef.current = apply(fullRef.current);
    setCards((prev) => apply(prev));
  };
  const markPending = (id: string, on: boolean) =>
    setPending((p) => {
      const n = new Set(p);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  // 改状态:乐观 + 落库,失败回滚;在途禁止同卡再触发(防乱序覆盖)。
  const setStatus = (card: PreferenceCard, status: string) => {
    if (pending.has(card.id)) return;
    const prev = card.status;
    markPending(card.id, true);
    patchLocal(card.id, { status });
    updatePreferenceCard(card.id, { status })
      .catch(() => {
        if (mountedRef.current) {
          patchLocal(card.id, { status: prev });
          Toast.error("操作失败");
        }
      })
      .finally(() => {
        if (mountedRef.current) markPending(card.id, false);
      });
  };

  // 删除:乐观移除 + 失败回滚(快照全量 + 可见态,失败恢复两者)。
  const remove = (card: PreferenceCard) => {
    if (pending.has(card.id)) return;
    if (!window.confirm("删除这条经验?此操作不可撤销。")) return;
    const snapFull = fullRef.current;
    let snapCards: PreferenceCard[] = [];
    markPending(card.id, true);
    fullRef.current = fullRef.current.filter((c) => c.id !== card.id);
    setCards((prev) => {
      snapCards = prev;
      return prev.filter((c) => c.id !== card.id);
    });
    deletePreferenceCard(card.id)
      .catch(() => {
        if (mountedRef.current) {
          fullRef.current = snapFull;
          setCards(snapCards);
          Toast.error("删除失败");
        }
      })
      .finally(() => {
        if (mountedRef.current) markPending(card.id, false);
      });
  };

  const openSource = (matterId?: string) => {
    if (matterId) WKApp.mittBus.emit("wk:open-matter-detail", { matterId });
  };

  const scopeMeta = (c: PreferenceCard): string => {
    if (c.scope === "project" && c.project_id) return projectMap[c.project_id] || "项目";
    return "";
  };

  return (
    <div className="cv">
      <div className="cv-head">
        <h1 className="cv-h1">经验</h1>
        <input
          className="cv-search"
          placeholder="搜索经验…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索经验"
        />
        <button type="button" className="cv-new" onClick={() => setEditingCard("new")}>
          <span className="cv-new-plus">+</span>新建经验
        </button>
      </div>

      {loading && <div className="cv-state">加载中…</div>}
      {!loading && groups.length === 0 && (
        <div className="cv-state">
          {query ? "没有匹配的经验" : "还没有经验记录 · 完成回路后,从反馈中总结可复用的行为规则"}
        </div>
      )}

      {!loading && (
        <div className="cv-list">
          {groups.map((g) => (
            <div key={g.key} className="cv-group">
              <div className="cv-group-head">
                {g.label}
                <span className="cv-group-count">{g.items.length}</span>
              </div>
              {g.items.map((c) => {
                const st = CARD_STATUS[c.status] || { label: c.status, cls: "is-draft" };
                const meta = scopeMeta(c);
                const isOpen = !!expanded[c.id];
                const busy = pending.has(c.id); // 写在途:禁写按钮防乱序
                return (
                  <div key={c.id} className={`cv-card${isOpen ? " is-open" : ""}`}>
                    <div
                      className="cv-card-main"
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpanded((x) => ({ ...x, [c.id]: !x[c.id] }));
                        }
                      }}
                    >
                      <span className={`cv-chip ${st.cls}`}>{st.label}</span>
                      <span className="cv-card-text">{cardFirstLine(c.content)}</span>
                      {meta && <span className="cv-card-meta">{meta}</span>}
                      <span className="cv-card-time">{relTime(c.updated_at)}</span>
                    </div>
                    {isOpen && (
                      <div className="cv-card-body">
                        {c.content && <div className="cv-card-full">{c.content}</div>}
                        {c.evidence && (
                          <div className="cv-card-sub">
                            <span className="cv-sub-label">依据</span>
                            {c.evidence}
                          </div>
                        )}
                        {c.avoid && (
                          <div className="cv-card-sub">
                            <span className="cv-sub-label">不适用</span>
                            {c.avoid}
                          </div>
                        )}
                        <div className="cv-actions">
                          {c.status === "draft" && (
                            <button
                              type="button"
                              className="cv-act is-primary"
                              disabled={busy}
                              onClick={() => setStatus(c, "authorized")}
                            >
                              确认生效
                            </button>
                          )}
                          {c.status === "discarded" ? (
                            <button
                              type="button"
                              className="cv-act"
                              disabled={busy}
                              onClick={() => setStatus(c, "authorized")}
                            >
                              恢复
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="cv-act"
                              disabled={busy}
                              onClick={() => setStatus(c, "discarded")}
                            >
                              弃用
                            </button>
                          )}
                          {c.matter_id && (
                            <button type="button" className="cv-act" onClick={() => openSource(c.matter_id)}>
                              查看来源
                            </button>
                          )}
                          <button
                            type="button"
                            className="cv-act"
                            disabled={busy}
                            onClick={() => setEditingCard(c)}
                          >
                            编辑
                          </button>
                          <span className="cv-flex" />
                          <button
                            type="button"
                            className="cv-act is-danger"
                            disabled={busy}
                            onClick={() => remove(c)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {editingCard && (
        <CardEditorModal
          editing={editingCard}
          onClose={() => setEditingCard(null)}
          onSaved={loadCards}
        />
      )}
    </div>
  );
}

export { CardsView };
