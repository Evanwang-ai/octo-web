// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  createMatterDetailSrc,
  PENDING_MATTER_DETAIL_ID_KEY,
  storePendingMatterDetailId,
  syncMatterAuth,
  takePendingMatterDetailId,
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

describe("MatterWorkspace deep links", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("builds embedded Matter detail iframe URLs instead of standalone app URLs", () => {
    expect(createMatterDetailSrc("M-1761/id")).toBe("/matter/ui/?embed=1#/matter/M-1761%2Fid");
  });

  it("stores and consumes a pending detail id once", () => {
    storePendingMatterDetailId("matter-1");

    expect(sessionStorage.getItem(PENDING_MATTER_DETAIL_ID_KEY)).toBe("matter-1");
    expect(takePendingMatterDetailId()).toBe("matter-1");
    expect(takePendingMatterDetailId()).toBeUndefined();
  });
});
