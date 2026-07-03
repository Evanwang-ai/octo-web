/**
 * [INPUT]: api/multica 的 listAgentTemplates/listMarketSkills/listSkills;./WorkersView 的 WorkerAvatar。
 * [OUTPUT]: 对外默认导出 MarketplaceView —— 市集首页(S6 卡⑦,D4=技能+worker 模板)。
 * [POS]: dmworktodo/ui/MatterListView 的市集,MatterRouteHost view="market" 挂载。
 *        骨架=Notion 市集(容器 1248 居中/分类侧栏/3 列×~300 卡,实测值=S6 素材解读 杂画布节);
 *        卡=头像+名+一句话+作者+安装数;已装技能标"已安装"。市集=逛(发现与安装),
 *        技能页=管(已装与自建)——App Store vs 已安装应用。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useMemo, useState } from "react";
import { listAgentTemplates, listMarketSkills, listSkills } from "../../api/multica/client";
import type { AgentTemplateSummary, MarketSkill, SkillSummary } from "../../api/multica/types";
import { WorkerAvatar } from "./WorkersView";
import "./market.css";

type Cat = "all" | "templates" | "skills";

export default function MarketplaceView({
  onOpenDetail,
}: {
  onOpenDetail: (kind: "template" | "skill", slug: string) => void;
}) {
  const [templates, setTemplates] = useState<AgentTemplateSummary[] | null>(null);
  const [shelf, setShelf] = useState<MarketSkill[]>([]);
  const [installed, setInstalled] = useState<SkillSummary[]>([]);
  const [cat, setCat] = useState<Cat>("all");

  useEffect(() => {
    Promise.all([listAgentTemplates(), listMarketSkills(), listSkills()]).then(
      ([t, m, k]) => {
        setTemplates(t);
        setShelf(m);
        setInstalled(k);
      },
    );
  }, []);

  const installedNames = useMemo(() => new Set(installed.map((s) => s.name)), [installed]);

  const CATS: Array<{ key: Cat; label: string }> = [
    { key: "all", label: "全部" },
    { key: "templates", label: "worker 模板" },
    { key: "skills", label: "技能" },
  ];

  // 模板 banner 色相:同 WorkerAvatar 的名字 hash(视觉血缘一致)。
  const hueOf = (name: string) => {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  };

  return (
    <div className="mkt-root">
      <div className="mkt-head">
        <span className="mkt-title">市集</span>
      </div>
      <div className="mkt-toolbar">
        {CATS.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`mkt-cat${cat === c.key ? " is-active" : ""}`}
            onClick={() => setCat(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mkt-main">
        {templates === null ? (
          <div className="mkt-empty">加载中…</div>
        ) : (
          <>
            {(cat === "all" || cat === "templates") && (
              <section className="mkt-section">
                <div className="mkt-section-title">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="9" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  worker 模板
                </div>
                <div className="mkt-grid">
                  {/* 卡=Notion 市集配方:大视觉区为主体 + 底行(名/作者/右缘徽章) */}
                  {templates.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      className="mkt-card"
                      onClick={() => onOpenDetail("template", t.slug)}
                    >
                      <div
                        className="mkt-card-visual"
                        style={{
                          background: `linear-gradient(135deg, hsl(${hueOf(t.name)} 42% 92%), hsl(${(hueOf(t.name) + 40) % 360} 38% 86%))`,
                        }}
                      >
                        <WorkerAvatar name={t.name} size={56} />
                      </div>
                      <div className="mkt-card-row">
                        <span className="mkt-card-name">{t.name}</span>
                        <span className="mkt-card-author">{t.author}</span>
                        <span className="mkt-card-installs">{t.installs.toLocaleString()}</span>
                      </div>
                      <div className="mkt-card-desc">{t.description}</div>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {(cat === "all" || cat === "skills") && (
              <section className="mkt-section">
                <div className="mkt-section-title">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M8 1.8l1.7 3.6 3.9.5-2.9 2.7.75 3.9L8 10.6l-3.45 1.9L5.3 8.6 2.4 5.9l3.9-.5L8 1.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  技能
                </div>
                <div className="mkt-grid">
                  {shelf.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      className="mkt-card"
                      onClick={() => onOpenDetail("skill", s.slug)}
                    >
                      <div
                        className="mkt-card-visual is-skill"
                        style={{ color: `hsl(${hueOf(s.name)} 30% 55%)`, background: `hsl(${hueOf(s.name)} 25% 96%)` }}
                      >
                        <svg width="30" height="30" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M8 1.8l1.7 3.6 3.9.5-2.9 2.7.75 3.9L8 10.6l-3.45 1.9L5.3 8.6 2.4 5.9l3.9-.5L8 1.8Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="mkt-card-row">
                        <span className="mkt-card-name">{s.name}</span>
                        <span className="mkt-card-author">{s.author}</span>
                        {installedNames.has(s.name) ? (
                          <span className="mkt-installed">已安装</span>
                        ) : (
                          <span className="mkt-card-installs">{s.installs.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="mkt-card-desc">{s.description}</div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
