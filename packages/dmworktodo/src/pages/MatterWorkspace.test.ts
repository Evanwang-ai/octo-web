// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  createMatterWorkspaceSrc,
  MATTER_EMBED_SRC,
  MATTER_WORKSPACE_ROUTE_KEY,
  PENDING_MATTER_DETAIL_ID_KEY,
  restoreMatterWorkspaceRoute,
  storeMatterWorkspaceRoute,
  storePendingMatterDetailId,
  syncMatterAuth,
  takePendingMatterDetailId,
  hashForRoute,
  hashForMatterDetail,
} from "./matterWorkspaceBridge";

describe("syncMatterAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("bridges host login identity to the Matter iframe auth keys", () => {
    syncMatterAuth({
      token: "token-1",
      uid: "user-1",
      name: "Alice",
      spaceId: "space-1",
    });

    expect(localStorage.getItem("token")).toBe("token-1");
    expect(localStorage.getItem("uid")).toBe("user-1");
    expect(localStorage.getItem("name")).toBe("Alice");
    expect(localStorage.getItem("currentSpaceId")).toBe("space-1");
  });

  it("clears stale identity when the host no longer has a uid", () => {
    localStorage.setItem("token", "old-token");
    localStorage.setItem("uid", "old-user");
    localStorage.setItem("name", "Old User");

    syncMatterAuth({ token: "token-2", uid: "", name: "", spaceId: "space-2" });

    expect(localStorage.getItem("token")).toBe("token-2");
    expect(localStorage.getItem("uid")).toBeNull();
    expect(localStorage.getItem("name")).toBeNull();
    expect(localStorage.getItem("currentSpaceId")).toBe("space-2");
  });
});

describe("MatterWorkspace postMessage routing", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns a fixed embed URL for all routes (no hash in src)", () => {
    expect(MATTER_EMBED_SRC).toBe("/matter/ui/?embed=1");
    expect(createMatterWorkspaceSrc("matters")).toBe("/matter/ui/?embed=1");
    expect(createMatterWorkspaceSrc("mailbox")).toBe("/matter/ui/?embed=1");
  });

  it("maps routes to correct hash strings for postMessage", () => {
    expect(hashForRoute("matters")).toBe("#/matters");
    expect(hashForRoute("mailbox")).toBe("#/mailbox");
  });

  it("builds matter detail hash with encoded ID", () => {
    expect(hashForMatterDetail("M-1761/id")).toBe("#/matter/M-1761%2Fid");
  });

  it("stores and consumes a pending detail id once", () => {
    storePendingMatterDetailId("matter-1");

    expect(sessionStorage.getItem(PENDING_MATTER_DETAIL_ID_KEY)).toBe("matter-1");
    expect(takePendingMatterDetailId()).toBe("matter-1");
    expect(takePendingMatterDetailId()).toBeUndefined();
  });

  it("persists the last workspace route so mailbox reloads do not fall back to matters", () => {
    storeMatterWorkspaceRoute("mailbox");

    expect(sessionStorage.getItem(MATTER_WORKSPACE_ROUTE_KEY)).toBe("mailbox");
    expect(restoreMatterWorkspaceRoute()).toBe("mailbox");

    storeMatterWorkspaceRoute("matters");
    expect(restoreMatterWorkspaceRoute()).toBe("matters");
  });
});
