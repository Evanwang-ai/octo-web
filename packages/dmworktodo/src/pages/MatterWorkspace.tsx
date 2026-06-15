import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { WKApp, t as translate } from "@octo/base";

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
  const [active, setActive] = useState(true); // mounted on first activation
  const spaceId = WKApp.shared.currentSpaceId || "";

  useEffect(() => {
    const onMenu = (payload: unknown) => {
      const menuId = (payload as { menuId?: string } | undefined)?.menuId;
      setActive(menuId === "matter");
    };
    WKApp.mittBus.on("wk:nav-menu-activated", onMenu);
    return () => {
      WKApp.mittBus.off("wk:nav-menu-activated", onMenu);
    };
  }, []);

  try {
    if (spaceId) localStorage.setItem("currentSpaceId", spaceId);
  } catch {
    /* storage unavailable → the embedded app shows its connect panel */
  }

  return ReactDOM.createPortal(
    <iframe
      key={spaceId || "no-space"}
      title={translate("todo.menu.title")}
      src="/matter/ui/?embed=1#/inbox"
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
