/**
 * [INPUT]: ./types 的 Skill 家族;./mockWorkers 的 allAgents(挂载关系)。
 * [OUTPUT]: 技能域内存 mock 数据库:skills CRUD + URL 导入 + 挂载查询,供 ./client 消费。
 * [POS]: dmworktodo/api/multica 的技能域 mock(Wave A-5 part2)。技能 id 与 mockWorkers
 *        的 agent.skills 内嵌摘要同 id(sk-1/2/3),"挂载 agent"跨域一致。接线时整文件废弃。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import { WKApp } from "@octo/base";
import type { CreateSkillRequest, Skill, SkillFile, UpdateSkillRequest } from "./types";

const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

let skills: Skill[] = [];
let seeded = false;
let nextId = 4;
let nextFileId = 100;

const mkFiles = (skillId: string, files: Array<[string, string]>): SkillFile[] =>
  files.map(([path, content]) => ({
    id: `skf-${nextFileId++}`,
    skill_id: skillId,
    path,
    content,
    created_at: iso(5 * DAY),
    updated_at: iso(1 * DAY),
  }));

function seed() {
  if (seeded) return;
  seeded = true;
  const me = WKApp.loginInfo.uid || "";
  const ws = WKApp.shared.currentSpaceId || "";
  const base = { workspace_id: ws, config: {}, created_by: me };
  skills = [
    {
      ...base,
      id: "sk-1",
      name: "周报整理",
      description: "把一周回路动态收敛成周报",
      content:
        "---\nname: 周报整理\ndescription: 把一周回路动态收敛成周报\n---\n\n# 周报整理\n\n## 输入\n\n- 本周全部回路的状态流转与动态\n\n## 步骤\n\n1. 按项目分组,提取已完成/进行中/受阻三档\n2. 每条一句话,带回路编号\n3. 输出到 `模板/周报.md` 的结构\n\n## 输出规范\n\n- 全文 markdown,不超过一屏\n- 数字必须可溯源",
      files: mkFiles("sk-1", [
        ["模板/周报.md", "# {{周}} 周报\n\n## 已完成\n\n## 进行中\n\n## 受阻\n"],
      ]),
      created_at: iso(20 * DAY),
      updated_at: iso(2 * DAY),
    },
    {
      ...base,
      id: "sk-2",
      name: "数据校验",
      description: "取数后做口径与量级双重校验",
      content:
        "---\nname: 数据校验\ndescription: 取数后做口径与量级双重校验\n---\n\n# 数据校验\n\n1. 口径:与上期同名指标定义逐字比对\n2. 量级:环比超 ±30% 必须给出解释\n3. 校验不过,打回取数,不得直接出报表",
      files: [],
      created_at: iso(15 * DAY),
      updated_at: iso(6 * DAY),
    },
    {
      ...base,
      id: "sk-3",
      name: "纪要模板",
      description: "会议纪要的结构化模板",
      content:
        "---\nname: 纪要模板\ndescription: 会议纪要的结构化模板\n---\n\n# 纪要模板\n\n结论先行:每场会先写三行结论,再放过程。\n\n见 `模板/纪要.md`。",
      files: mkFiles("sk-3", [
        ["模板/纪要.md", "# 会议纪要\n\n## 结论\n\n## 待办(负责人+期限)\n\n## 过程记录\n"],
        ["参考/示例.md", "(一份好纪要的样例)"],
      ]),
      created_at: iso(10 * DAY),
      updated_at: iso(1 * DAY),
    },
  ];
}

export function allSkills(): Skill[] {
  seed();
  return skills.map((s) => ({ ...s, files: s.files.map((f) => ({ ...f })) }));
}

export function getSkillById(id: string): Skill {
  seed();
  const s = skills.find((x) => x.id === id);
  if (!s) throw new Error("skill not found");
  return { ...s, files: s.files.map((f) => ({ ...f })) };
}

export function createSkillIn(req: CreateSkillRequest): Skill {
  seed();
  const id = `sk-${nextId++}`;
  const s: Skill = {
    id,
    workspace_id: WKApp.shared.currentSpaceId || "",
    name: req.name,
    description: req.description || "",
    config: req.config || {},
    created_by: WKApp.loginInfo.uid || "",
    content: req.content || `---\nname: ${req.name}\n---\n\n# ${req.name}\n`,
    files: mkFiles(id, (req.files || []).map((f) => [f.path, f.content])),
    created_at: iso(0),
    updated_at: iso(0),
  };
  skills.push(s);
  return getSkillById(id);
}

// files 传即整树替换(契约语义)。
export function updateSkillIn(id: string, req: UpdateSkillRequest): Skill {
  seed();
  const idx = skills.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error("skill not found");
  const cur = skills[idx];
  skills[idx] = {
    ...cur,
    ...(req.name !== undefined ? { name: req.name } : {}),
    ...(req.description !== undefined ? { description: req.description } : {}),
    ...(req.content !== undefined ? { content: req.content } : {}),
    ...(req.config !== undefined ? { config: req.config } : {}),
    ...(req.files !== undefined
      ? { files: mkFiles(id, req.files.map((f) => [f.path, f.content])) }
      : {}),
    updated_at: iso(0),
  };
  return getSkillById(id);
}

export function deleteSkillIn(id: string): void {
  seed();
  skills = skills.filter((x) => x.id !== id);
}

// URL 导入(mock:按 URL 尾段造壳,来源记 config.source)。
export function importSkillIn(url: string): Skill {
  seed();
  const slug = url.replace(/\/+$/, "").split("/").pop() || "imported-skill";
  const s = createSkillIn({
    name: slug,
    description: `从 ${url} 导入`,
    content: `---\nname: ${slug}\nsource: ${url}\n---\n\n# ${slug}\n\n(导入的 SKILL.md 正文)`,
  });
  return updateSkillIn(s.id, { config: { source: url } });
}
