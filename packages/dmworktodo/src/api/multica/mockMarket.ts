/**
 * [INPUT]: ./types 的 AgentTemplate/MarketSkill;./mockWorkers 的 createAgentFromSeed;
 *          ./mockSkills 的 createSkillIn(安装拷贝)。
 * [OUTPUT]: 市集域内存 mock:worker 模板货架 + 技能货架 + 安装动作,供 ./client 消费。
 * [POS]: dmworktodo/api/multica 的市集 mock(S6 卡⑦)。模板安装=真建 worker(落 mockWorkers,
 *        全站可见);技能安装=createSkill 拷贝进技能库。接线:模板走 createAgentFromTemplate,
 *        技能走 importSkill(source_url)。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import type { Agent, AgentTemplate, MarketSkill } from "./types";
import * as wdb from "./mockWorkers";
import * as kdb from "./mockSkills";

const TEMPLATES: AgentTemplate[] = [
  {
    slug: "quarterly-analyst",
    name: "季度数据分析师",
    description: "接经营数据需求:取数、口径校验、出看板,数字可溯源。",
    category: "数据",
    author: "Octo 官方",
    installs: 1240,
    recommended_model: "claude-sonnet-5",
    instructions:
      "# 角色\n\n你是季度数据分析师:接经营数据需求,产出看板与结论。\n\n## 纪律\n\n- 一切数字附查询语句可溯源\n- 口径与上期不一致先停下来问\n- 产出挂回路附件,动态里给一句话摘要",
    skills: [
      { name: "数据校验", description: "取数后做口径与量级双重校验" },
      { name: "周报整理", description: "把一周回路动态收敛成周报" },
    ],
  },
  {
    slug: "code-reviewer",
    name: "代码评审官",
    description: "按团队规约做二遍评审,输出分级 findings,不放过边界。",
    category: "工程",
    author: "Octo 官方",
    installs: 986,
    recommended_model: "claude-opus-4-8",
    instructions:
      "# 角色\n\n你是代码评审官。\n\n## 输出\n\n- findings 按 严重/建议/可忽略 分级\n- 每条带 文件:行号 与理由\n- 不改码,只评审",
    skills: [{ name: "评审清单", description: "团队代码规约的结构化检查单" }],
  },
  {
    slug: "meeting-scribe",
    name: "会议纪要官",
    description: "会议转录进来,三行结论先行的结构化纪要出去。",
    category: "协作",
    author: "社区 · 妙啊",
    installs: 712,
    instructions:
      "# 角色\n\n你是会议纪要官:结论先行,每场会先写三行结论,再放待办与过程。",
    skills: [{ name: "纪要模板", description: "会议纪要的结构化模板" }],
  },
];

const MARKET_SKILLS: MarketSkill[] = [
  {
    slug: "sql-guard",
    name: "SQL 守门员",
    description: "跑任何查询前先 EXPLAIN,禁全表扫描,给成本预估。",
    author: "社区 · 数仓组",
    installs: 430,
    source_url: "https://clawhub.ai/octo/sql-guard",
    content_preview: "---\nname: SQL 守门员\n---\n\n1. 任何查询先 EXPLAIN\n2. 预估扫描行 >100万 需要确认\n3. 输出附成本预估",
  },
  {
    slug: "release-notes",
    name: "发布纪要",
    description: "从合并记录自动生成对外发布纪要,分 新增/修复/破坏性。",
    author: "社区 · 前端组",
    installs: 289,
    source_url: "https://clawhub.ai/octo/release-notes",
    content_preview: "---\nname: 发布纪要\n---\n\n按 新增/修复/破坏性 三档收敛合并记录,面向用户措辞。",
  },
  {
    slug: "risk-radar",
    name: "风险雷达",
    description: "长任务开工前列风险清单:时间/并发/规模/对抗/缝合五轴。",
    author: "Octo 官方",
    installs: 655,
    source_url: "https://clawhub.ai/octo/risk-radar",
    content_preview: "---\nname: 风险雷达\n---\n\n开工前按五轴出风险清单,每条给缓解动作。",
  },
];

export function allTemplates(): AgentTemplate[] {
  return TEMPLATES.map((t) => ({ ...t, skills: t.skills.map((s) => ({ ...s })) }));
}

export function getTemplate(slug: string): AgentTemplate {
  const t = TEMPLATES.find((x) => x.slug === slug);
  if (!t) throw new Error("template not found");
  return { ...t, skills: t.skills.map((s) => ({ ...s })) };
}

export function allMarketSkills(): MarketSkill[] {
  return MARKET_SKILLS.map((s) => ({ ...s }));
}

export function getMarketSkill(slug: string): MarketSkill {
  const s = MARKET_SKILLS.find((x) => x.slug === slug);
  if (!s) throw new Error("market skill not found");
  return { ...s };
}

// 模板建 worker:落 mockWorkers(全站可见),内置技能一并入库并挂载。
export function createFromTemplate(slug: string, req: { name?: string; runtime_id: string }): Agent {
  const t = getTemplate(slug);
  const skills = t.skills.map((ref) => {
    const created = kdb.createSkillIn({ name: ref.name, description: ref.description });
    return { id: created.id, name: created.name, description: created.description };
  });
  return wdb.createAgentIn({
    name: req.name || t.name,
    description: t.description,
    instructions: t.instructions,
    runtime_id: req.runtime_id,
    model: t.recommended_model || "",
    skills,
  });
}

// 技能安装:拷贝进技能库(接线=importSkill(source_url))。
export function installMarketSkill(slug: string) {
  const m = getMarketSkill(slug);
  return kdb.createSkillIn({
    name: m.name,
    description: m.description,
    content: m.content_preview,
    config: { source: m.source_url },
  });
}

// ── 自动化 run 历史合成(卡⑧;按 schedule 节奏造最近 N 次,确定性)──
import type { AutopilotRunLite } from "./types";

const runCache = new Map<string, AutopilotRunLite[]>();

export function runsOfSchedule(scheduleId: string): AutopilotRunLite[] {
  const hit = runCache.get(scheduleId);
  if (hit) return hit.map((r) => ({ ...r }));
  let h = 0;
  for (const ch of scheduleId) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const prand = (j: number) => {
    const x = Math.sin(h * 127.1 + j * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const DAY = 86_400_000;
  const out: AutopilotRunLite[] = [];
  for (let i = 0; i < 8; i++) {
    const failed = prand(i) > 0.85;
    out.push({
      id: `apr-${scheduleId}-${i}`,
      autopilot_id: scheduleId,
      status: failed ? "failed" : "success",
      started_at: new Date(Date.now() - (i + 1) * DAY + prand(i + 20) * 3_600_000).toISOString(),
      duration_sec: 40 + Math.floor(prand(i + 40) * 200),
      summary: failed
        ? "执行超时:目标数据源未在窗口内响应"
        : ["已创建回路并派发执行", "产出已生成,无异常", "巡检通过,全部服务健康"][Math.floor(prand(i + 60) * 3)],
    });
  }
  runCache.set(scheduleId, out);
  return out.map((r) => ({ ...r }));
}
