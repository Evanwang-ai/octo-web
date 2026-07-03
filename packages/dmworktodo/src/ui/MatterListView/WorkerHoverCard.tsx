/**
 * [INPUT]: api/multica 的 listAgents/listRuntimes/getAgentTaskSnapshot/
 *          getWorkspaceAgentActivity30d + presence/activity 派生;./WorkersView 的 WorkerAvatar。
 * [OUTPUT]: WorkerHoverArea(包裹触发区)+ 内部 WorkerHoverCard —— worker 悬停预览卡。
 * [POS]: dmworktodo/ui/MatterListView 的 hover 身份卡(S6 卡②,Discord 配方亮色适配:
 *        300 宽/banner 105/头像 80 压 banner 44px/内容 gap12 无分割线;实测值=素材解读.md Discord 节)。
 *        纯展示无按钮(Discord 同款克制);挂载=worker 列表行/小队成员行/领队格。
 *        自取数据(agentId 进,内部拉 mock 换源层),400ms 延迟显示,portal fixed 定位右侧优先。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  listAgents,
  listRuntimes,
  getAgentTaskSnapshot,
  getWorkspaceAgentActivity30d,
  deriveAgentPresence,
  deriveActivityBuckets,
  summarizeActivity,
} from "../../api/multica/client";
import type { Agent, AgentPresenceDetail, AgentTask } from "../../api/multica/types";
import { WorkerAvatar } from "./WorkersView";
import "./workerHover.css";

const AVAIL_LABEL: Record<AgentPresenceDetail["availability"], { label: string; cls: string }> = {
  online: { label: "在线", cls: "is-online" },
  unstable: { label: "不稳定", cls: "is-unstable" },
  offline: { label: "离线", cls: "is-offline" },
  archived: { label: "已归档", cls: "is-archived" },
};

interface CardData {
  agent: Agent;
  presence: AgentPresenceDetail;
  runningTask: AgentTask | null;
  total30: number;
  successRate: number | null;
}

// 名字 hue(与 WorkerAvatar 同算法,banner 渐变用)。
function hueOf(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function Card({ data, x, y }: { data: CardData; x: number; y: number }) {
  const { agent, presence, runningTask, total30, successRate } = data;
  const av = AVAIL_LABEL[presence.availability];
  const hue = hueOf(agent.name);
  return createPortal(
    <div className="wkhc" style={{ left: x, top: y }} role="tooltip">
      <div
        className="wkhc-banner"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 50% 82%), hsl(${(hue + 40) % 360} 45% 70%))`,
        }}
      />
      <div className="wkhc-avatar">
        <WorkerAvatar name={agent.name} size={80} dot={av.cls} />
      </div>
      <div className="wkhc-body">
        <div className="wkhc-name">{agent.name}</div>
        <div className="wkhc-sub">
          {av.label}
          {presence.workload !== "idle" &&
            ` · ${presence.runningCount + presence.queuedCount} 个任务`}
        </div>
        {runningTask && (
          <div className="wkhc-block">
            <div className="wkhc-block-k">正在处理</div>
            <div className="wkhc-block-v">{runningTask.trigger_summary || "执行中的 Run"}</div>
          </div>
        )}
        {agent.skills.length > 0 && (
          <div className="wkhc-block">
            <div className="wkhc-block-k">技能</div>
            <div className="wkhc-chips">
              {agent.skills.slice(0, 3).map((s) => (
                <span key={s.id} className="wkhc-chip">
                  {s.name}
                </span>
              ))}
              {agent.skills.length > 3 && <span className="wkhc-chip">+{agent.skills.length - 3}</span>}
            </div>
          </div>
        )}
        <div className="wkhc-block">
          <div className="wkhc-block-k">近 30 天</div>
          <div className="wkhc-block-v">
            {total30} 次运行
            {successRate !== null && ` · ${Math.round(successRate * 100)}% 成功`}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 包裹任意触发区:hover 400ms 后在右侧弹 worker 预览卡(空间不足翻左)。 */
export default function WorkerHoverArea({
  agentId,
  children,
  className,
}: {
  agentId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [data, setData] = useState<CardData | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const CARD_W = 300;
  const CARD_H = 320; // 估高,只用于翻转判断

  const show = async () => {
    const el = hostRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = r.right + 8;
    if (x + CARD_W > window.innerWidth - 8) x = Math.max(8, r.left - CARD_W - 8);
    let y = Math.min(r.top, window.innerHeight - CARD_H - 8);
    y = Math.max(8, y);
    const [agents, runtimes, snapshot, activity] = await Promise.all([
      listAgents({ include_archived: true }),
      listRuntimes(),
      getAgentTaskSnapshot(),
      getWorkspaceAgentActivity30d(),
    ]);
    if (!aliveRef.current) return;
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    const presence = deriveAgentPresence(
      agent,
      runtimes.find((rt) => rt.id === agent.runtime_id),
      snapshot,
    );
    const running =
      snapshot.find((t) => t.agent_id === agentId && t.status === "running") || null;
    const sum = summarizeActivity(deriveActivityBuckets(activity, agentId), 30);
    setPos({ x, y });
    setData({ agent, presence, runningTask: running, total30: sum.total, successRate: sum.successRate });
  };

  return (
    <span
      ref={hostRef}
      className={className}
      onMouseEnter={() => {
        timerRef.current = window.setTimeout(show, 400);
      }}
      onMouseLeave={() => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setData(null);
        setPos(null);
      }}
    >
      {children}
      {data && pos && <Card data={data} x={pos.x} y={pos.y} />}
    </span>
  );
}
