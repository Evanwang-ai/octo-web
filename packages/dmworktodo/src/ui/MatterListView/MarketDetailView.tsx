/**
 * [INPUT]: api/multica 的 getAgentTemplate/createAgentFromTemplate/getMarketSkillDetail/
 *          installMarketSkill/listRuntimes;./WorkersView 的 WorkerAvatar。
 * [OUTPUT]: 对外默认导出 MarketDetailView —— 市集详情(S6 卡⑦,onboarding 式)。
 * [POS]: dmworktodo/ui/MatterListView 的市集详情,MatterRouteHost view="marketDetail" 挂载。
 *        范式=Notion connector 详情(Evan 拍板核心灵感):左=步骤引导(worker 模板:
 *        ①选设备→②命名→③创建即用;技能:预览→安装),右=key-value 信息栏
 *        (作者/类别/推荐模型/内置技能/来源)。装完直接跳产物(worker 档案/技能详情)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useState } from "react";
import {
  getAgentTemplate,
  createAgentFromTemplate,
  getMarketSkillDetail,
  installMarketSkill,
  listRuntimes,
} from "../../api/multica/client";
import type { AgentTemplate, MarketSkill, RuntimeSummary } from "../../api/multica/types";
import { WorkerAvatar } from "./WorkersView";

// 名字 hue(与 WorkerAvatar/市集卡同算法,视觉血缘)。
function hueOf(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
import "./market.css";

export default function MarketDetailView({
  kind,
  slug,
  onBack,
  onOpenWorker,
  onOpenSkill,
}: {
  kind: "template" | "skill";
  slug: string;
  onBack: () => void;
  onOpenWorker: (id: string) => void;
  onOpenSkill: (id: string) => void;
}) {
  const [tpl, setTpl] = useState<AgentTemplate | null>(null);
  const [mkSkill, setMkSkill] = useState<MarketSkill | null>(null);
  const [runtimes, setRuntimes] = useState<RuntimeSummary[]>([]);
  const [runtimeId, setRuntimeId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  useEffect(() => {
    setDoneId(null);
    if (kind === "template") {
      Promise.all([getAgentTemplate(slug), listRuntimes()]).then(([t, rts]) => {
        setTpl(t);
        setName(t.name);
        setRuntimes(rts);
        const online = rts.find((r) => r.status === "online");
        setRuntimeId(online?.id || rts[0]?.id || "");
      });
    } else {
      getMarketSkillDetail(slug).then(setMkSkill);
    }
  }, [kind, slug]);

  const title = kind === "template" ? tpl?.name : mkSkill?.name;

  return (
    <div className="mkt-root">
      <div className="mkt-crumbbar">
        <button className="mkt-back" type="button" onClick={onBack}>
          市集
        </button>
        <span className="mkt-crumb-sep">›</span>
        <span className="mkt-crumb-name">{title || "…"}</span>
      </div>
      {kind === "template" && tpl && (
        <div className="mkt-detail">
          <div className="mkt-onboard">
            <div
              className="mkt-hero-banner"
              style={{
                background: `linear-gradient(135deg, hsl(${hueOf(tpl.name)} 42% 92%), hsl(${(hueOf(tpl.name) + 40) % 360} 38% 86%))`,
              }}
            >
              <WorkerAvatar name={tpl.name} size={64} />
            </div>
            <div className="mkt-hero">
              <div>
                <div className="mkt-hero-name">{tpl.name}</div>
                <div className="mkt-hero-desc">{tpl.description}</div>
              </div>
            </div>
            {doneId === null ? (
              <>
                <div className="mkt-step">
                  <span className="mkt-step-n">1</span>
                  <div className="mkt-step-body">
                    <div className="mkt-step-title">选择运行设备</div>
                    <select
                      className="mkt-input"
                      value={runtimeId}
                      onChange={(e) => setRuntimeId(e.target.value)}
                    >
                      {runtimes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {r.status === "online" ? "(在线)" : "(离线)"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mkt-step">
                  <span className="mkt-step-n">2</span>
                  <div className="mkt-step-body">
                    <div className="mkt-step-title">给它起个名字</div>
                    <input
                      className="mkt-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mkt-step">
                  <span className="mkt-step-n">3</span>
                  <div className="mkt-step-body">
                    <div className="mkt-step-title">创建即用</div>
                    <div className="mkt-step-hint">
                      内置 {tpl.skills.length} 个技能与 Instructions 会一并装好
                      {tpl.recommended_model && `,模型默认 ${tpl.recommended_model}`}。
                    </div>
                    <button
                      type="button"
                      className="mkt-primary"
                      disabled={!runtimeId || !name.trim() || busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const agent = await createAgentFromTemplate({
                            slug,
                            name: name.trim(),
                            runtime_id: runtimeId,
                          });
                          setDoneId(agent.id);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {busy ? "创建中…" : "创建 worker"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mkt-done">
                <div className="mkt-done-title">✓ 「{name}」已就位</div>
                <div className="mkt-step-hint">技能已挂载,现在就能在回路里指派它。</div>
                <button type="button" className="mkt-primary" onClick={() => onOpenWorker(doneId)}>
                  查看它的档案 →
                </button>
              </div>
            )}
            <div className="mkt-ins-preview">
              <div className="mkt-kv-k">Instructions 预览</div>
              <pre className="mkt-pre">{tpl.instructions}</pre>
            </div>
          </div>
          <aside className="mkt-info">
            <div className="mkt-kv">
              <span className="mkt-kv-k">作者</span>
              <span>{tpl.author}</span>
            </div>
            <div className="mkt-kv">
              <span className="mkt-kv-k">类别</span>
              <span>{tpl.category}</span>
            </div>
            {tpl.recommended_model && (
              <div className="mkt-kv">
                <span className="mkt-kv-k">推荐模型</span>
                <span className="mkt-mono">{tpl.recommended_model}</span>
              </div>
            )}
            <div className="mkt-kv">
              <span className="mkt-kv-k">安装数</span>
              <span>{tpl.installs.toLocaleString()}</span>
            </div>
            <div className="mkt-kv is-col">
              <span className="mkt-kv-k">内置技能</span>
              {tpl.skills.map((s) => (
                <div key={s.name} className="mkt-skill-line" title={s.description}>
                  {s.name}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
      {kind === "skill" && mkSkill && (
        <div className="mkt-detail">
          <div className="mkt-onboard">
            <div
              className="mkt-hero-banner is-skill"
              style={{ color: `hsl(${hueOf(mkSkill.name)} 30% 55%)`, background: `hsl(${hueOf(mkSkill.name)} 25% 96%)` }}
            >
              <svg width="34" height="34" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1.8l1.7 3.6 3.9.5-2.9 2.7.75 3.9L8 10.6l-3.45 1.9L5.3 8.6 2.4 5.9l3.9-.5L8 1.8Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="mkt-hero">
              <div>
                <div className="mkt-hero-name">{mkSkill.name}</div>
                <div className="mkt-hero-desc">{mkSkill.description}</div>
              </div>
            </div>
            <div className="mkt-ins-preview">
              <div className="mkt-kv-k">SKILL.md 预览</div>
              <pre className="mkt-pre">{mkSkill.content_preview}</pre>
            </div>
            {doneId === null ? (
              <button
                type="button"
                className="mkt-primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const created = await installMarketSkill(slug);
                    setDoneId(created.id);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "安装中…" : "安装到技能库"}
              </button>
            ) : (
              <div className="mkt-done">
                <div className="mkt-done-title">✓ 已入库</div>
                <div className="mkt-step-hint">到 worker 的「配置 → 技能」里挂载即可生效。</div>
                <button type="button" className="mkt-primary" onClick={() => onOpenSkill(doneId)}>
                  查看技能 →
                </button>
              </div>
            )}
          </div>
          <aside className="mkt-info">
            <div className="mkt-kv">
              <span className="mkt-kv-k">作者</span>
              <span>{mkSkill.author}</span>
            </div>
            <div className="mkt-kv">
              <span className="mkt-kv-k">安装数</span>
              <span>{mkSkill.installs.toLocaleString()}</span>
            </div>
            <div className="mkt-kv is-col">
              <span className="mkt-kv-k">来源</span>
              <span className="mkt-mono mkt-wrap">{mkSkill.source_url}</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
