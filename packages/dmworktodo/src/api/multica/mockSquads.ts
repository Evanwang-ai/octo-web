/**
 * [INPUT]: ./types 的 Squad 家族类型;./mockWorkers 的 allAgents/taskSnapshot(成员状态派生)。
 * [OUTPUT]: 小队域内存 mock 数据库:squads/members/成员状态 + CRUD,供 ./client 消费。
 * [POS]: dmworktodo/api/multica 的小队域 mock(Wave A-5)。leader/agent 成员引用 mockWorkers
 *        的 worker id(状态灯与 worker 域同源);human 成员用当前登录 uid(头像可解析)。
 *        接线时整文件废弃。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import { WKApp } from "@octo/base";
import * as wdb from "./mockWorkers";
import type {
  CreateSquadRequest,
  Squad,
  SquadMember,
  SquadMemberStatus,
  SquadMemberType,
  UpdateSquadRequest,
} from "./types";

const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

let squads: Squad[] = [];
let members: SquadMember[] = [];
let seeded = false;
let nextId = 1;
let nextMemberId = 1;

function seed() {
  if (seeded) return;
  seeded = true;
  const me = WKApp.loginInfo.uid || "";
  const ws = WKApp.shared.currentSpaceId || "";
  const mk = (
    name: string,
    description: string,
    instructions: string,
    leader: string,
    mem: Array<[SquadMemberType, string, string]>,
    createdDays: number,
  ) => {
    const id = `sq-${nextId++}`;
    squads.push({
      id,
      workspace_id: ws,
      name,
      description,
      instructions,
      avatar_url: null,
      leader_id: leader,
      creator_id: me,
      created_at: iso(createdDays * DAY),
      updated_at: iso(createdDays * DAY - 2 * 3_600_000),
      archived_at: null,
      archived_by: null,
    });
    for (const [t, mid, role] of mem) {
      members.push({
        id: `sqm-${nextMemberId++}`,
        squad_id: id,
        member_type: t,
        member_id: mid,
        role,
        created_at: iso(createdDays * DAY),
      });
    }
  };

  mk(
    "数据分析小队",
    "季度经营数据的取数、校验与看板产出。",
    "## 分工\n\n- 取数师负责所有数仓查询,产出交审计员\n- 审计员做口径与量级双检,不通过打回\n- 领队汇总并出结论,人类成员只做最终确认\n\n## 纪律\n\n- 一切数字必须可溯源(附查询语句)\n- 与上季度口径不一致时先停下来问",
    "ag-1",
    [
      ["agent", "ag-3", "取数"],
      ["agent", "ag-2", "质检"],
      ["member", WKApp.loginInfo.uid || "", "确认人"],
    ],
    18,
  );
  mk(
    "内容生产小队",
    "会议纪要、周报与知识库文档的流水线。",
    "",
    "ag-4",
    [["agent", "ag-6", "评审"]],
    9,
  );
  mk(
    "值守小队",
    "服务健康巡检与异常上报。",
    "巡检发现异常先建回路再通知,不直接改生产。",
    "ag-5",
    [],
    4,
  );
}

export function allSquads(): Squad[] {
  seed();
  return squads.map((s) => ({
    ...s,
    member_count: members.filter((m) => m.squad_id === s.id).length,
    member_preview: members
      .filter((m) => m.squad_id === s.id)
      .slice(0, 3)
      .map((m) => ({ member_type: m.member_type, member_id: m.member_id, role: m.role })),
  }));
}

export function getSquadById(id: string): Squad {
  seed();
  const s = squads.find((x) => x.id === id);
  if (!s) throw new Error("squad not found");
  return { ...s };
}

export function createSquadIn(req: CreateSquadRequest): Squad {
  seed();
  const id = `sq-${nextId++}`;
  const s: Squad = {
    id,
    workspace_id: WKApp.shared.currentSpaceId || "",
    name: req.name,
    description: req.description || "",
    instructions: "", // 契约:创建不含 instructions,建后 PUT 补
    avatar_url: req.avatar_url || null,
    leader_id: req.leader_id,
    creator_id: WKApp.loginInfo.uid || "",
    created_at: iso(0),
    updated_at: iso(0),
    archived_at: null,
    archived_by: null,
  };
  squads.push(s);
  return { ...s };
}

export function updateSquadIn(id: string, req: UpdateSquadRequest): Squad {
  seed();
  const idx = squads.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error("squad not found");
  squads[idx] = {
    ...squads[idx],
    ...Object.fromEntries(Object.entries(req).filter(([, v]) => v !== undefined)),
    updated_at: iso(0),
  } as Squad;
  return { ...squads[idx] };
}

export function deleteSquadIn(id: string): void {
  seed();
  squads = squads.filter((x) => x.id !== id);
  members = members.filter((m) => m.squad_id !== id);
}

export function membersOf(squadId: string): SquadMember[] {
  seed();
  return members.filter((m) => m.squad_id === squadId).map((m) => ({ ...m }));
}

export function addMemberIn(
  squadId: string,
  req: { member_type: SquadMemberType; member_id: string; role?: string },
): SquadMember {
  seed();
  const m: SquadMember = {
    id: `sqm-${nextMemberId++}`,
    squad_id: squadId,
    member_type: req.member_type,
    member_id: req.member_id,
    role: req.role || "",
    created_at: iso(0),
  };
  members.push(m);
  return { ...m };
}

export function removeMemberIn(
  squadId: string,
  req: { member_type: SquadMemberType; member_id: string },
): void {
  seed();
  members = members.filter(
    (m) => !(m.squad_id === squadId && m.member_type === req.member_type && m.member_id === req.member_id),
  );
}

// 成员状态:agent 从 worker 域 presence 近似派生(状态灯与 worker 列表同源);human=null。
export function memberStatusOf(squadId: string): SquadMemberStatus[] {
  seed();
  const agents = wdb.allAgents();
  const snapshot = wdb.taskSnapshot();
  const list = members.filter((m) => m.squad_id === squadId);
  const withLeader = [
    { member_type: "agent" as const, member_id: getSquadById(squadId).leader_id },
    ...list.map((m) => ({ member_type: m.member_type, member_id: m.member_id })),
  ];
  return withLeader.map(({ member_type, member_id }) => {
    if (member_type === "member") {
      return { member_type, member_id, status: null, active_issues: [], last_active_at: null };
    }
    const agent = agents.find((a) => a.id === member_id);
    const running = snapshot.filter(
      (t) => t.agent_id === member_id && ["running", "queued", "dispatched"].includes(t.status),
    );
    let status: SquadMemberStatus["status"] = "offline";
    if (agent?.archived_at) status = "archived";
    else if (running.some((t) => t.status === "running")) status = "working";
    else if (agent && agent.runtime_id !== "rt-3") status = "idle";
    return {
      member_type,
      member_id,
      status,
      active_issues: running.slice(0, 2).map((t, i) => ({
        issue_id: t.issue_id || `mock-issue-${i}`,
        identifier: `M-${1790 + i}`,
        title: t.trigger_summary || "执行中的回路",
        issue_status: "in_progress",
      })),
      last_active_at: agent?.updated_at || null,
    };
  });
}
