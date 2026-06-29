import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { WKApp, t as translate } from "@octo/base";
import {
  createMatterWorkspaceSrc,
  MATTER_EMBED_SRC,
  MATTER_MAILBOX_MENU_ID,
  MATTER_MENU_ID,
  restoreMatterWorkspaceRoute,
  storeMatterWorkspaceRoute,
  syncMatterAuth,
  takePendingMatterDetailId,
  postNavigateToIframe,
  hashForRoute,
  hashForMatterDetail,
} from "./matterWorkspaceBridge";
import type { MatterWorkspaceRoute } from "./matterWorkspaceBridge";

export {
  createMatterWorkspaceSrc,
  MATTER_EMBED_SRC,
  MATTER_MAILBOX_MENU_ID,
  MATTER_MENU_ID,
  MATTER_WORKSPACE_ROUTE_KEY,
  PENDING_MATTER_DETAIL_ID_KEY,
  restoreMatterWorkspaceRoute,
  storeMatterWorkspaceRoute,
  storePendingMatterDetailId,
  syncMatterAuth,
  takePendingMatterDetailId,
} from "./matterWorkspaceBridge";
export type { MatterAuthBridgeInput, MatterWorkspaceRoute } from "./matterWorkspaceBridge";

function initialWorkspaceRoute(): MatterWorkspaceRoute {
  if (WKApp.currentMenuId === MATTER_MAILBOX_MENU_ID) return "mailbox";
  if (WKApp.currentMenuId === MATTER_MENU_ID) return "matters";
  return restoreMatterWorkspaceRoute();
}

/**
 * matter-v2: the Matter workspace now lives in the octo-matter service
 * (embedded SPA served at /matter/ui/). Same origin behind nginx, so the
 * iframe shares the login token via localStorage; the current space is
 * persisted by MainPage (localStorage.currentSpaceId) and re-asserted here.
 *
 * Route pages render inside WKLayout's narrow contentLeft column, whose
 * WKViewQueue ancestors carry transforms — those trap position:fixed, so the
 * iframe is PORTALed to document.body and covers everything right of the
 * 56px NavRail. The route component itself stays mounted (MainContentLeft
 * hides routes via display:none without unmounting), so visibility follows
 * the "wk:nav-menu-activated" bus event instead of the DOM tree.
 *
 * The legacy in-app panel (TodoPage) is retired by the v2 rollout; the chat
 * integrations (SmartCreateModal / ChatMatterPanel) stay on the v1 API.
 */
const MatterWorkspace: React.FC = () => {
  const [active, setActive] = useState(true);
  const iframeSrc = MATTER_EMBED_SRC;
  const spaceId = WKApp.shared.currentSpaceId || "";
  const token = WKApp.loginInfo.token || "";
  const uid = WKApp.loginInfo.uid || "";
  const name = WKApp.loginInfo.name || "";
  const authKey = [spaceId, uid, name, token ? "token" : "no-token"].join("|");

  useEffect(() => {
    const openPendingDetail = () => {
      const matterId = takePendingMatterDetailId();
      if (matterId) {
        postNavigateToIframe(hashForMatterDetail(matterId));
        return true;
      }
      return false;
    };

    const onMenu = (payload: unknown) => {
      const menuId = (payload as { menuId?: string } | undefined)?.menuId;
      const isMatterWorkspace = menuId === MATTER_MENU_ID || menuId === MATTER_MAILBOX_MENU_ID;
      setActive(isMatterWorkspace);
      if (menuId === MATTER_MAILBOX_MENU_ID) {
        storeMatterWorkspaceRoute("mailbox");
        postNavigateToIframe(hashForRoute("mailbox"));
        return;
      }
      if (menuId === MATTER_MENU_ID && !openPendingDetail()) {
        storeMatterWorkspaceRoute("matters");
        postNavigateToIframe(hashForRoute("matters"));
      }
    };

    const onOpenMatterWorkspace = (payload: unknown) => {
      const route = (payload as { route?: "matters" | "mailbox" } | undefined)?.route || "matters";
      if (route !== "matters" && route !== "mailbox") return;
      setActive(true);
      storeMatterWorkspaceRoute(route);
      postNavigateToIframe(hashForRoute(route));
    };

    const onOpenMatterDetail = (payload: unknown) => {
      const matterId = (payload as { matterId?: string } | undefined)?.matterId;
      if (!matterId) return;
      setActive(true);
      postNavigateToIframe(hashForMatterDetail(matterId));
    };

    openPendingDetail();
    WKApp.mittBus.on("wk:nav-menu-activated", onMenu);
    WKApp.mittBus.on("wk:open-matter-workspace", onOpenMatterWorkspace);
    WKApp.mittBus.on("wk:open-matter-detail", onOpenMatterDetail);
    return () => {
      WKApp.mittBus.off("wk:nav-menu-activated", onMenu);
      WKApp.mittBus.off("wk:open-matter-workspace", onOpenMatterWorkspace);
      WKApp.mittBus.off("wk:open-matter-detail", onOpenMatterDetail);
    };
  }, []);

  useEffect(() => {
    syncMatterAuth({ token, uid, name, spaceId });
  }, [token, uid, name, spaceId]);

  return ReactDOM.createPortal(
    <iframe
      key={authKey}
      title={translate("todo.menu.title")}
      src={iframeSrc}
      style={{
        // iframes are replaced elements: left+right do NOT stretch them
        // (width:auto falls back to the intrinsic 300x150), so size
        // explicitly off the viewport.
        position: "fixed",
        top: 0,
        left: "var(--wk-width-layout-tab, 56px)",
        width: "calc(100vw - var(--wk-width-layout-tab, 56px))",
        height: "100vh",
        border: 0,
        display: active ? "block" : "none",
        zIndex: 900, // above app panes; below host modals/toasts (semi-ui ~1000+)
        background: "var(--wk-bg-color, #fff)",
      }}
    />,
    document.body,
  );
};

export default MatterWorkspace;
