// L3 | MatterRouteHost — Matter 路由的绞杀式复合宿主。
// 回路列表走原生 React(view="matters");收件箱/详情/项目等未迁表面暂走 iframe(view="iframe")。
// iframe 懒挂载后常驻(display 切换不重载、保 SPA 状态)。
// 首次导航把目标 hash 拼进 iframe src(加载即到位,零 postMessage 竞态);后续已加载才用 postMessage。
// portal 到 document.body 覆盖 56px NavRail 右侧全区(复刻 MatterWorkspace:contentLeft 祖先 transform 困住 fixed)。
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WKApp } from "@octo/base";
import {
  MATTER_MENU_ID,
  MATTER_MAILBOX_MENU_ID,
  MATTER_EMBED_SRC,
  syncMatterAuth,
  takePendingMatterDetailId,
  storeMatterWorkspaceRoute,
} from "../../pages/MatterWorkspace";
import {
  postNavigateToIframe,
  hashForRoute,
  hashForMatterDetail,
} from "../../pages/matterWorkspaceBridge";
import MatterListView from "./index";

type View = "matters" | "iframe";

export default function MatterRouteHost() {
  const menuId = WKApp.currentMenuId;
  const [active, setActive] = useState(
    menuId === MATTER_MENU_ID || menuId === MATTER_MAILBOX_MENU_ID,
  );
  const [view, setView] = useState<View>(
    menuId === MATTER_MAILBOX_MENU_ID ? "iframe" : "matters",
  );
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  // refs 镜像,避免总线监听器(空依赖,只注册一次)读到 stale 闭包值。
  const iframeSrcRef = useRef<string | null>(null);
  const iframeLoadedRef = useRef(false);
  const pendingHashRef = useRef<string | null>(null);

  // iframe 鉴权:随 token/space 变化重新断言到 localStorage(iframe 同源读取)。
  const token = WKApp.loginInfo.token || "";
  const uid = WKApp.loginInfo.uid || "";
  const name = WKApp.loginInfo.name || "";
  const spaceId = WKApp.shared.currentSpaceId || "";
  useEffect(() => {
    syncMatterAuth({ token, uid, name, spaceId });
  }, [token, uid, name, spaceId]);

  // 切到 iframe 表面并导航到 hash。
  const navigateIframe = (hash: string) => {
    setActive(true);
    setView("iframe");
    if (iframeSrcRef.current === null) {
      // 首次:src 直接带 hash,加载即到目标,无竞态。
      const src = MATTER_EMBED_SRC + hash;
      iframeSrcRef.current = src;
      setIframeSrc(src);
    } else if (iframeLoadedRef.current) {
      // 已加载:postMessage 切换,不重载。
      postNavigateToIframe(hash);
    } else {
      // 已 mount 未 load 完:onLoad 时补发。
      pendingHashRef.current = hash;
    }
  };

  // 行点击 → 详情(暂经 iframe,详情 React 化后改为原生)。
  const openDetail = (matterId: string) => navigateIframe(hashForMatterDetail(matterId));

  useEffect(() => {
    const onMenu = (payload: unknown) => {
      const id = (payload as { menuId?: string } | undefined)?.menuId;
      if (id === MATTER_MENU_ID) {
        setActive(true);
        setView("matters");
      } else if (id === MATTER_MAILBOX_MENU_ID) {
        storeMatterWorkspaceRoute("mailbox");
        navigateIframe(hashForRoute("mailbox"));
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
        navigateIframe(hashForRoute("mailbox"));
      } else {
        setActive(true);
        setView("matters");
      }
    };
    const onOpenDetail = (payload: unknown) => {
      const matterId = (payload as { matterId?: string } | undefined)?.matterId;
      if (matterId) openDetail(matterId);
    };

    // mount 时若有待打开的详情,直接进 iframe 详情。
    const pending = takePendingMatterDetailId();
    if (pending) openDetail(pending);

    WKApp.mittBus.on("wk:nav-menu-activated", onMenu);
    WKApp.mittBus.on("wk:open-matter-workspace", onOpenWorkspace);
    WKApp.mittBus.on("wk:open-matter-detail", onOpenDetail);
    return () => {
      WKApp.mittBus.off("wk:nav-menu-activated", onMenu);
      WKApp.mittBus.off("wk:open-matter-workspace", onOpenWorkspace);
      WKApp.mittBus.off("wk:open-matter-detail", onOpenDetail);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="mlv-host" style={{ display: active ? "block" : "none" }}>
      <div
        className="mlv-host-pane"
        style={{ display: view === "matters" ? "block" : "none", height: "100%" }}
      >
        <MatterListView onOpenDetail={openDetail} />
      </div>
      {iframeSrc && (
        <iframe
          title="回路"
          className="mlv-host-iframe"
          src={iframeSrc}
          style={{ display: view === "iframe" ? "block" : "none" }}
          onLoad={() => {
            iframeLoadedRef.current = true;
            if (pendingHashRef.current) {
              postNavigateToIframe(pendingHashRef.current);
              pendingHashRef.current = null;
            }
          }}
        />
      )}
    </div>,
    document.body,
  );
}
