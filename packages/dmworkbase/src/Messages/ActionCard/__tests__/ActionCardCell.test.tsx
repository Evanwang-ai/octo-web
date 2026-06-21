import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const channelManager = vi.hoisted(() => ({
  getChannelInfo: vi.fn(),
  getSubscribes: vi.fn(),
}));

const openMatterDetail = vi.hoisted(() => vi.fn());

vi.mock("wukongimjssdk", () => {
  const ChannelTypePerson = 1;
  const ChannelTypeGroup = 2;

  class Channel {
    channelID: string;
    channelType: number;

    constructor(channelID: string, channelType: number) {
      this.channelID = channelID;
      this.channelType = channelType;
    }

    isEqual(other?: Channel) {
      return (
        !!other &&
        this.channelID === other.channelID &&
        this.channelType === other.channelType
      );
    }
  }

  class MessageContent {
    get contentType() {
      return 0;
    }

    encodeJSON() {
      return {};
    }

    decodeJSON() {}
  }

  const sdk = { shared: () => ({ channelManager }) };

  return {
    default: sdk,
    WKSDK: sdk,
    Channel,
    ChannelTypePerson,
    ChannelTypeGroup,
    MessageContent,
  };
});

vi.mock("../../../App", () => ({
  default: {
    shared: {
      currentSpaceId: "space-1",
      avatarUser: (uid: string) => `avatar://${uid}`,
    },
    loginInfo: {
      uid: "current-user",
      selfDisplayName: () => "Current User",
      realnameVerified: false,
    },
    openMatterDetail,
  },
}));

vi.mock("../../../i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

import { Channel, ChannelTypeGroup, ChannelTypePerson } from "wukongimjssdk";
import { ActionCardContent } from "../ActionCardContent";
import { ActionCardCell } from "../index";

function createMessage() {
  const content = new ActionCardContent();
  content.decodeJSON({
    card: {
      header: { title: "Matter invite", icon: "task" },
      fields: [
        { label: "Matter", value: "M-1760 Visual alignment" },
        { label: "Status", value: "Pending" },
      ],
      actions: [{ label: "Open", url: "matter:M-1760", style: "primary" }],
    },
  });

  return {
    content,
    contentType: 50,
    send: false,
    fromUID: "bot-1",
    channel: new Channel("group-1", ChannelTypeGroup),
    timestamp: 1782045600,
    checked: false,
    clientMsgNo: "msg-1",
    messageSeq: 1760,
    message: { remoteExtra: {} },
  } as any;
}

function createContext() {
  return {
    editOn: () => false,
    showContextMenus: vi.fn(),
    isContextMenuOpen: () => false,
    onTapAvatar: vi.fn(),
    showUser: vi.fn(),
    checkeMessage: vi.fn(),
  } as any;
}

describe("ActionCardCell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    channelManager.getSubscribes.mockReturnValue([]);
    channelManager.getChannelInfo.mockImplementation((channel: Channel) => {
      if (channel.channelType !== ChannelTypePerson) {
        return undefined;
      }
      return {
        channel,
        title: "BotFather",
        online: false,
        orgData: {
          robot: 1,
          displayName: "BotFather",
        },
      };
    });
  });

  it("renders inside the normal MessageRow shell instead of legacy MessageBase", () => {
    const html = renderToStaticMarkup(
      <ActionCardCell message={createMessage()} context={createContext()} />
    );

    expect(html).toContain("wk-msg-row");
    expect(html).toContain("wk-msg-row-header");
    expect(html).toContain("wk-action-card");
    expect(html).toContain("BotFather");
    expect(html).toContain("AI");
    expect(html).toContain("Matter invite");
    expect(html).not.toContain("wk-message-base");
  });
});
