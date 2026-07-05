/**
 * [INPUT]: api/multica 的 listAgentTemplates/listMarketSkills/listSkills(MarketListingMeta:icon/verified/featured/price)。
 * [OUTPUT]: 对外默认导出 MarketplaceView —— 市集首页,Notion Marketplace 五层结构(2026-07-05 整屏重构):
 *           中心化 tab(探索/worker 模板/技能)→ hero(标题+副句+黑白线条插画)→ 精选卡行(featured)
 *           → 类目 chip 过滤条(+搜索+排序)→ 全量列表行(icon/名+认证徽章/描述/类型·安装量/免费)。
 * [POS]: dmworktodo/ui/MatterListView 的市集,MatterRouteHost view="market" 挂载。
 *        市集=逛(发现与安装),技能页=管(已装与自建)。已装技能标"已安装"(installedNames 去重)。
 *        插画=内联 SVG(仓库无图资产;codex-image-bridge 批量出图为后续管线)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import { listAgentTemplates, listMarketSkills, listSkills } from "../../api/multica/client";
import type { AgentTemplateSummary, MarketSkill, SkillSummary } from "../../api/multica/types";
import "./market.css";

type Tab = "explore" | "templates" | "skills";
type SortKey = "installs" | "name";

// 统一条目形状:模板与技能共用行/卡渲染。
interface Listing {
  kind: "template" | "skill";
  slug: string;
  name: string;
  description: string;
  category: string;
  author: string;
  installs: number;
  icon?: string;
  verified?: boolean;
  featured?: boolean;
  price?: number | null;
}

const KIND_LABEL: Record<Listing["kind"], string> = {
  template: "worker 模板",
  skill: "技能",
};

const toListing = (t: AgentTemplateSummary): Listing => ({
  kind: "template",
  slug: t.slug,
  name: t.name,
  description: t.description,
  category: t.category,
  author: t.author,
  installs: t.installs,
  icon: t.icon,
  verified: t.verified,
  featured: t.featured,
  price: t.price ?? null,
});

const skillToListing = (s: MarketSkill): Listing => ({
  kind: "skill",
  slug: s.slug,
  name: s.name,
  description: s.description,
  category: s.category || "其它",
  author: s.author,
  installs: s.installs,
  icon: s.icon,
  verified: s.verified,
  featured: s.featured,
  price: s.price ?? null,
});

// 免费/价格标签(mock 全免费;price 数值为接线留位)。
const priceLabel = (p?: number | null) => (p ? `¥${p}` : "免费");

// 黑白线条插画(Notion hero 位;单色描边,取次级文字色)。
function HeroArt() {
  return (
    <svg className="mkth-art" viewBox="0 0 240 130" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* 主体:被拼装的大块 */}
      <rect x="86" y="34" width="68" height="68" rx="10" />
      <path d="M104 68h32M120 52v32" strokeDasharray="0" />
      {/* 浮动小块(拼装中) */}
      <rect x="34" y="20" width="26" height="26" rx="6" />
      <path d="M64 40 82 50" strokeDasharray="3 4" />
      <rect x="176" y="72" width="24" height="24" rx="6" />
      <path d="M172 82l-14-6" strokeDasharray="3 4" />
      {/* 火花 */}
      <path d="M186 26l3.2 6.8 6.8 3.2-6.8 3.2-3.2 6.8-3.2-6.8-6.8-3.2 6.8-3.2 3.2-6.8Z" />
      <path d="M46 88v14M39 95h14" />
      {/* 地面线 */}
      <path d="M22 116h196" strokeDasharray="1 6" />
    </svg>
  );
}

// 认证徽章(Notion 蓝勾语义;取 info 色)。
function VerifiedBadge() {
  return (
    <svg className="mkt-verified" viewBox="0 0 16 16" aria-label="官方认证" role="img">
      <path
        d="M8 1.5l1.7 1.2 2-.2 1 1.8 1.9.8-.3 2 1.2 1.7-1.2 1.6.3 2-1.9.8-1 1.8-2-.2L8 15l-1.7-1.2-2 .2-1-1.8-1.9-.8.3-2L.5 7.7l1.2-1.6-.3-2 1.9-.8 1-1.8 2 .2L8 1.5Z"
        fill="var(--wk-color-info)"
        stroke="none"
      />
      <path d="M5.3 8.1l1.8 1.8 3.4-3.7" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketplaceView({
  onOpenDetail,
}: {
  onOpenDetail: (kind: "template" | "skill", slug: string) => void;
}) {
  const [templates, setTemplates] = useState<AgentTemplateSummary[] | null>(null);
  const [shelf, setShelf] = useState<MarketSkill[]>([]);
  const [installed, setInstalled] = useState<SkillSummary[]>([]);
  const [tab, setTab] = useState<Tab>("explore");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("installs");

  useEffect(() => {
    Promise.all([listAgentTemplates(), listMarketSkills(), listSkills()]).then(([t, m, k]) => {
      setTemplates(t);
      setShelf(m);
      setInstalled(k);
    });
  }, []);

  const installedNames = useMemo(() => new Set(installed.map((s) => s.name)), [installed]);

  const all = useMemo<Listing[]>(
    () => [...(templates ?? []).map(toListing), ...shelf.map(skillToListing)],
    [templates, shelf],
  );

  // tab → kind 域;类目/搜索/排序在域内过滤(切 tab 清类目,防空交集)。
  const scoped = useMemo(
    () => (tab === "explore" ? all : all.filter((l) => (tab === "templates" ? l.kind === "template" : l.kind === "skill"))),
    [all, tab],
  );
  const categories = useMemo(
    () => [...new Set(scoped.map((l) => l.category))],
    [scoped],
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = scoped.filter(
      (l) =>
        (!category || l.category === category) &&
        (!q || l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)),
    );
    return [...filtered].sort((a, b) =>
      sort === "installs" ? b.installs - a.installs : a.name.localeCompare(b.name, "zh"),
    );
  }, [scoped, category, query, sort]);

  const featured = useMemo(() => scoped.filter((l) => l.featured), [scoped]);
  const showHero = tab === "explore" && !query && !category;

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: "explore", label: "探索" },
    { key: "templates", label: "worker 模板" },
    { key: "skills", label: "技能" },
  ];

  return (
    <div className="mkt-root">
      {/* 层1:中心化一级导航 */}
      <nav className="mkt-nav" aria-label="市集导航">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`mkt-nav-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => {
              setTab(t.key);
              setCategory("");
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {templates === null ? (
        <div className="mkt-empty">加载中…</div>
      ) : (
        <div className="mkt-container">
          {/* 层2:hero(仅探索页,过滤中让位给结果) */}
          {showHero && (
            <section className="mkth">
              <div className="mkth-txt">
                <h1 className="mkth-title">市集</h1>
                <p className="mkth-sub">
                  现成的 worker 模板与技能,安装即用。
                  <br />
                  给团队补上一个岗位,或给 worker 添一门手艺。
                </p>
              </div>
              <HeroArt />
            </section>
          )}

          {/* 层3:精选卡行(策展位,仅探索页) */}
          {showHero && featured.length > 0 && (
            <section className="mkt-feat">
              <div className="mkt-sec-head">精选</div>
              <div className="mkt-feat-row">
                {featured.map((l) => (
                  <button
                    key={`${l.kind}-${l.slug}`}
                    type="button"
                    className="mkt-feat-card"
                    onClick={() => onOpenDetail(l.kind, l.slug)}
                  >
                    <span className="mkt-feat-icon" aria-hidden>
                      {l.icon || "✦"}
                    </span>
                    <span className="mkt-feat-name">
                      {l.name}
                      {l.verified && <VerifiedBadge />}
                    </span>
                    <span className="mkt-feat-meta">
                      {priceLabel(l.price)} · ↓ {l.installs.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 层4:类目 chip 过滤条 + 搜索 + 排序 */}
          <div className="mkt-filterbar">
            <div className="mkt-chips">
              <button
                type="button"
                className={`mkt-chip${!category ? " is-on" : ""}`}
                onClick={() => setCategory("")}
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`mkt-chip${category === c ? " is-on" : ""}`}
                  onClick={() => setCategory(category === c ? "" : c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              className="mkt-search"
              type="search"
              placeholder="搜索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="mkt-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="排序">
              <option value="installs">按安装量</option>
              <option value="name">按名称</option>
            </select>
          </div>

          {/* 层5:全量列表行 */}
          {shown.length === 0 ? (
            <div className="mkt-empty">没有匹配的条目</div>
          ) : (
            <div className="mkt-list">
              {shown.map((l) => (
                <button
                  key={`${l.kind}-${l.slug}`}
                  type="button"
                  className="mkt-row"
                  onClick={() => onOpenDetail(l.kind, l.slug)}
                >
                  <span className="mkt-row-icon" aria-hidden>
                    {l.icon || "✦"}
                  </span>
                  <span className="mkt-row-main">
                    <span className="mkt-row-name">
                      {l.name}
                      {l.verified && <VerifiedBadge />}
                      {l.kind === "skill" && installedNames.has(l.name) && (
                        <span className="mkt-installed">已安装</span>
                      )}
                    </span>
                    <span className="mkt-row-desc">{l.description}</span>
                  </span>
                  <span className="mkt-row-kind">{KIND_LABEL[l.kind]}</span>
                  <span className="mkt-row-installs">↓ {l.installs.toLocaleString()}</span>
                  <span className="mkt-row-price">{priceLabel(l.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
