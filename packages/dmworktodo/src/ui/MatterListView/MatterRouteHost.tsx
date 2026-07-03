// L3 | MatterRouteHost — Matter 路由的原生复合宿主。
// 绞杀式迁移完成(2026-07-03):最后一个 iframe 表面(收件箱)已换 InboxView,iframe 机器整体拆除。
// view 状态机:matters 列表 / detail 详情 / cards 经验 / automation 自动化 / projects·projectDetail 项目 / inbox 收件箱。
// portal 到 document.body 覆盖 56px NavRail 右侧全区(复刻 MatterWorkspace:contentLeft 祖先 transform 困住 fixed)。
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WKApp } from "@octo/base";
import {
  MATTER_MENU_ID,
  MATTER_MAILBOX_MENU_ID,
  syncMatterAuth,
  takePendingMatterDetailId,
  storeMatterWorkspaceRoute,
} from "../../pages/MatterWorkspace";
import MatterListView from "./index";
import MatterSubNav, { SubNavKey } from "./MatterSubNav";
import MatterDetailView from "./MatterDetailView";
import CardsView from "./CardsView";
import AutomationView from "./AutomationView";
import ProjectsView from "./ProjectsView";
import ProjectDetailView from "./ProjectDetailView";
import InboxView from "./InboxView";
import WorkersView from "./WorkersView";
import SquadsView from "./SquadsView";
import SquadDetailView from "./SquadDetailView";
import SkillsView from "./SkillsView";
import SkillDetailView from "./SkillDetailView";
import WorkerDetailView from "./WorkerDetailView";
import CommandPalette from "./CommandPalette";

type View =
  | "matters"
  | "inbox"
  | "detail"
  | "cards"
  | "automation"
  | "projects"
  | "projectDetail"
  | "workers"
  | "workerDetail"
  | "squads"
  | "squadDetail"
  | "skills"
  | "skillDetail";

export default function MatterRouteHost() {
  const menuId = WKApp.currentMenuId;
  const [active, setActive] = useState(
    menuId === MATTER_MENU_ID || menuId === MATTER_MAILBOX_MENU_ID,
  );
  const [view, setView] = useState<View>(
    menuId === MATTER_MAILBOX_MENU_ID ? "inbox" : "matters",
  );
  const [section, setSection] = useState<SubNavKey>("matters");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [projectDetailId, setProjectDetailId] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [squadId, setSquadId] = useState<string | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  // ref 镜像:全局 keydown 监听(空依赖只注册一次)读它,避免 stale 闭包。
  const activeRef = useRef(active);
  activeRef.current = active;

  // matter 鉴权断言:随 token/space 变化同步 localStorage(matter 域 SPA 同源读取,如直开 /matter/ui/)。
  const token = WKApp.loginInfo.token || "";
  const uid = WKApp.loginInfo.uid || "";
  const name = WKApp.loginInfo.name || "";
  const spaceId = WKApp.shared.currentSpaceId || "";
  useEffect(() => {
    syncMatterAuth({ token, uid, name, spaceId });
  }, [token, uid, name, spaceId]);

  // 行/卡片点击 → 原生详情(MatterDetailView)。
  const openDetail = (matterId: string) => {
    setActive(true);
    setDetailId(matterId);
    setView("detail");
    setSection("matters");
  };

  // 显示原生列表 —— 统一三处入口(子导航/NavRail/open-workspace),避免 section/view 不同步。
  const showMatterList = () => {
    setActive(true);
    setView("matters");
    setSection("matters");
  };

  // 显示原生经验页。
  const showCards = () => {
    setActive(true);
    setView("cards");
    setSection("cards");
  };
  // 显示原生自动化页。
  const showAutomation = () => {
    setActive(true);
    setView("automation");
    setSection("automation");
  };
  // 显示原生项目列表。
  const showProjects = () => {
    setActive(true);
    setView("projects");
    setSection("projects");
  };
  // 项目详情:看板内嵌 MatterListView(project 过滤)。
  const openProjectDetail = (id: string) => {
    setActive(true);
    setSection("projects");
    setProjectDetailId(id);
    setView("projectDetail");
  };
  // 显示原生收件箱(NavRail 顶级入口,与回路并列;不进子导航)。
  const showInbox = () => {
    setActive(true);
    setView("inbox");
  };
  // worker 域(loop 板块内,会2拍板):列表 + 详情。
  const showWorkers = () => {
    setActive(true);
    setView("workers");
    setSection("workers");
  };
  const openWorkerDetail = (id: string) => {
    setActive(true);
    setSection("workers");
    setWorkerId(id);
    setView("workerDetail");
  };
  // 小队域(⭐A-5):列表 + 详情。
  const showSquads = () => {
    setActive(true);
    setView("squads");
    setSection("squads");
  };
  const openSquadDetail = (id: string) => {
    setActive(true);
    setSection("squads");
    setSquadId(id);
    setView("squadDetail");
  };
  // 技能域(⭐A-5 part2):列表 + 详情。
  const showSkills = () => {
    setActive(true);
    setView("skills");
    setSection("skills");
  };
  const openSkillDetail = (id: string) => {
    setActive(true);
    setSection("skills");
    setSkillId(id);
    setView("skillDetail");
  };

  // 子导航五项全部原生视图。
  const onNavigate = (key: SubNavKey) => {
    if (key === "matters") {
      showMatterList();
    } else if (key === "cards") {
      showCards();
    } else if (key === "automation") {
      showAutomation();
    } else if (key === "projects") {
      showProjects();
    } else if (key === "workers") {
      showWorkers();
    } else if (key === "squads") {
      showSquads();
    } else if (key === "skills") {
      showSkills();
    }
  };

  useEffect(() => {
    const onMenu = (payload: unknown) => {
      const id = (payload as { menuId?: string } | undefined)?.menuId;
      if (id === MATTER_MENU_ID) {
        showMatterList();
      } else if (id === MATTER_MAILBOX_MENU_ID) {
        storeMatterWorkspaceRoute("mailbox");
        showInbox();
      } else {
        setActive(false);
      }
    };
    const onOpenWorkspace = (payload: unknown) => {
      const route =
        (payload as { route?: "matters" | "mailbox" } | undefined)?.route ||
        "matters";
      if (route === "mailbox") {
        storeMatterWorkspaceRoute("mailbox");
        showInbox();
      } else {
        showMatterList();
      }
    };
    const onOpenDetail = (payload: unknown) => {
      const matterId = (payload as { matterId?: string } | undefined)?.matterId;
      if (matterId) openDetail(matterId);
    };

    // mount 时若有待打开的详情,直接进原生详情。
    const pending = takePendingMatterDetailId();
    if (pending) openDetail(pending);

    // ⌘K/Ctrl+K:loop 板块激活时唤起命令面板(Wave A-4)。
    // 可编辑区聚焦时不劫持(聊天输入框等场景,codex 双审 finding);面板自身输入框例外(⌘K 再按=关)。
    const onKeydown = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && activeRef.current)) return;
      const el = e.target as HTMLElement | null;
      const editable =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (editable && !el.closest(".cmdk-panel")) return;
      e.preventDefault();
      setCmdkOpen((v) => !v);
    };
    window.addEventListener("keydown", onKeydown);

    WKApp.mittBus.on("wk:nav-menu-activated", onMenu);
    WKApp.mittBus.on("wk:open-matter-workspace", onOpenWorkspace);
    WKApp.mittBus.on("wk:open-matter-detail", onOpenDetail);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      WKApp.mittBus.off("wk:nav-menu-activated", onMenu);
      WKApp.mittBus.off("wk:open-matter-workspace", onOpenWorkspace);
      WKApp.mittBus.off("wk:open-matter-detail", onOpenDetail);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="mlv-host" style={{ display: active ? "block" : "none" }}>
      <div className="mlv-host-row">
        {/* 子导航:回路域表面显示;收件箱是 NavRail 并列入口,不带子导航(S4 定稿口径)。 */}
        {view !== "inbox" && (
          <MatterSubNav current={section} onNavigate={onNavigate} />
        )}
        <div className="mlv-host-content">
          <div
            className="mlv-host-pane"
            style={{ display: view === "matters" ? "block" : "none" }}
          >
            <MatterListView onOpenDetail={openDetail} />
          </div>
          {view === "detail" && detailId && (
            <MatterDetailView key={detailId} matterId={detailId} onBack={showMatterList} />
          )}
          {view === "cards" && <CardsView />}
          {view === "automation" && <AutomationView />}
          {view === "projects" && <ProjectsView onOpenDetail={openProjectDetail} />}
          {view === "projectDetail" && projectDetailId && (
            <ProjectDetailView
              key={projectDetailId}
              projectId={projectDetailId}
              onBack={showProjects}
              onOpenMatter={openDetail}
            />
          )}
          {view === "inbox" && <InboxView />}
          {view === "workers" && <WorkersView onOpenDetail={openWorkerDetail} />}
          {view === "workerDetail" && workerId && (
            <WorkerDetailView key={workerId} agentId={workerId} onBack={showWorkers} />
          )}
          {view === "squads" && <SquadsView onOpenDetail={openSquadDetail} />}
          {view === "squadDetail" && squadId && (
            <SquadDetailView key={squadId} squadId={squadId} onBack={showSquads} />
          )}
          {view === "skills" && <SkillsView onOpenDetail={openSkillDetail} />}
          {view === "skillDetail" && skillId && (
            <SkillDetailView key={skillId} skillId={skillId} onBack={showSkills} />
          )}
          <CommandPalette
            open={cmdkOpen}
            onClose={() => setCmdkOpen(false)}
            onOpenMatter={openDetail}
            onOpenProject={openProjectDetail}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
