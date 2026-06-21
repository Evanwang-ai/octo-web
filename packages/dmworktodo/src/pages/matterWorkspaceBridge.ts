export const MATTER_MENU_ID = "matter";
export const MATTER_INBOX_SRC = "/matter/ui/?embed=1#/inbox";
export const PENDING_MATTER_DETAIL_ID_KEY = "wk.pendingMatterDetailId";

export type MatterAuthBridgeInput = {
  token?: string;
  uid?: string;
  name?: string;
  spaceId?: string;
};

export function createMatterDetailSrc(matterId: string): string {
  return `/matter/ui/?embed=1#/matter/${encodeURIComponent(matterId)}`;
}

function getSessionStorage(storage?: Storage): Storage | undefined {
  return storage ?? (typeof window === "undefined" ? undefined : window.sessionStorage);
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
