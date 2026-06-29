export const MATTER_MENU_ID = "matter";
export const MATTER_MAILBOX_MENU_ID = "mailbox";
export const MATTER_EMBED_SRC = "/matter/ui/?embed=1";
export const MATTER_WORKSPACE_SRC = MATTER_EMBED_SRC;
export const MATTER_MAILBOX_SRC = MATTER_EMBED_SRC;
export const MATTER_INBOX_SRC = MATTER_EMBED_SRC;
export const PENDING_MATTER_DETAIL_ID_KEY = "wk.pendingMatterDetailId";
export const MATTER_WORKSPACE_ROUTE_KEY = "wk.matterWorkspaceRoute";

export type MatterWorkspaceRoute = "matters" | "mailbox";

export type MatterAuthBridgeInput = {
  token?: string;
  uid?: string;
  name?: string;
  spaceId?: string;
};

export function createMatterWorkspaceSrc(_route: MatterWorkspaceRoute = "matters"): string {
  return MATTER_EMBED_SRC;
}

export function createMatterDetailSrc(_matterId: string): string {
  return MATTER_EMBED_SRC;
}

const ALLOWED_HASHES = ["#/matters", "#/matters/board", "#/mailbox", "#/projects", "#/cards", "#/automation"];

export function postNavigateToIframe(hash: string): void {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe[src*="/matter/ui/"]');
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage({ type: "octo:navigate", hash }, window.location.origin);
}

export function hashForRoute(route: MatterWorkspaceRoute): string {
  return route === "mailbox" ? "#/mailbox" : "#/matters";
}

export function hashForMatterDetail(matterId: string): string {
  return "#/matter/" + encodeURIComponent(matterId);
}

function getSessionStorage(storage?: Storage): Storage | undefined {
  return storage ?? (typeof window === "undefined" ? undefined : window.sessionStorage);
}

export function normalizeMatterWorkspaceRoute(route?: string): MatterWorkspaceRoute {
  return route === "mailbox" ? "mailbox" : "matters";
}

export function storeMatterWorkspaceRoute(route: MatterWorkspaceRoute, storage?: Storage): void {
  try {
    getSessionStorage(storage)?.setItem(MATTER_WORKSPACE_ROUTE_KEY, normalizeMatterWorkspaceRoute(route));
  } catch {
    /* storage unavailable -> callers still pass the route in memory */
  }
}

export function restoreMatterWorkspaceRoute(storage?: Storage): MatterWorkspaceRoute {
  try {
    return normalizeMatterWorkspaceRoute(getSessionStorage(storage)?.getItem(MATTER_WORKSPACE_ROUTE_KEY) || undefined);
  } catch {
    return "matters";
  }
}

export function storePendingMatterDetailId(matterId: string, storage?: Storage): void {
  try {
    getSessionStorage(storage)?.setItem(PENDING_MATTER_DETAIL_ID_KEY, matterId);
  } catch {
    /* storage unavailable -> event delivery still handles mounted workspaces */
  }
}

export function takePendingMatterDetailId(storage?: Storage): string | undefined {
  try {
    const sessionStorage = getSessionStorage(storage);
    const matterId = sessionStorage?.getItem(PENDING_MATTER_DETAIL_ID_KEY);
    if (matterId) {
      sessionStorage?.removeItem(PENDING_MATTER_DETAIL_ID_KEY);
      return matterId;
    }
  } catch {
    /* storage unavailable -> no pending detail to consume */
  }
  return undefined;
}

export function syncMatterAuth(auth: MatterAuthBridgeInput): void {
  try {
    if (auth.token) localStorage.setItem("token", auth.token);
    else localStorage.removeItem("token");

    if (auth.uid) localStorage.setItem("uid", auth.uid);
    else localStorage.removeItem("uid");

    if (auth.name) localStorage.setItem("name", auth.name);
    else localStorage.removeItem("name");

    if (auth.spaceId) localStorage.setItem("currentSpaceId", auth.spaceId);
  } catch {
    /* storage unavailable -> the embedded app shows its connect panel */
  }
}
