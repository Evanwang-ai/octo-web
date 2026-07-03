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

  return (
    <div className="mkt-root">
      <div className="mkt-head">
        <span className="mkt-title">市集</span>
        <span className="mkt-head-hint">给 worker 找模板与技能——装完即用</span>
      </div>
      <div className="mkt-body">
        <nav className="mkt-cats">
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
        </nav>
        <div className="mkt-main">
          {templates === null ? (
            <div className="mkt-empty">加载中…</div>
          ) : (
            <>
              {(cat === "all" || cat === "templates") && (
                <section className="mkt-section">
                  <div className="mkt-section-title">worker 模板</div>
                  <div className="mkt-grid">
                    {templates.map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        className="mkt-card"
                        onClick={() => onOpenDetail("template", t.slug)}
                      >
                        <div className="mkt-card-top">
                          <WorkerAvatar name={t.name} size={36} />
                          <span className="mkt-card-name">{t.name}</span>
                        </div>
                        <div className="mkt-card-desc">{t.description}</div>
                        <div className="mkt-card-meta">
                          <span>{t.author}</span>
                          <span>{t.installs.toLocaleString()} 次安装</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {(cat === "all" || cat === "skills") && (
                <section className="mkt-section">
                  <div className="mkt-section-title">技能</div>
                  <div className="mkt-grid">
                    {shelf.map((s) => (
                      <button
                        key={s.slug}
                        type="button"
                        className="mkt-card"
                        onClick={() => onOpenDetail("skill", s.slug)}
                      >
                        <div className="mkt-card-top">
                          <span className="mkt-skill-ic">
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
                              <path d="M8 1.8l1.7 3.6 3.9.5-2.9 2.7.75 3.9L8 10.6l-3.45 1.9L5.3 8.6 2.4 5.9l3.9-.5L8 1.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="mkt-card-name">{s.name}</span>
                          {installedNames.has(s.name) && <span className="mkt-installed">已安装</span>}
                        </div>
                        <div className="mkt-card-desc">{s.description}</div>
                        <div className="mkt-card-meta">
                          <span>{s.author}</span>
                          <span>{s.installs.toLocaleString()} 次安装</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
