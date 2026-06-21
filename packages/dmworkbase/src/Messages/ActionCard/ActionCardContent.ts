import { MessageContent } from "wukongimjssdk";

export interface ActionCardField {
  label: string;
  value: string;
}

export interface ActionCardAction {
  label: string;
  url: string;
  style?: "primary" | "default";
}

export interface ActionCardHeader {
  title: string;
  icon?: string;
}

export class ActionCardContent extends MessageContent {
  template!: string;
  header!: ActionCardHeader;
  fields!: ActionCardField[];
  actions!: ActionCardAction[];

  get contentType() {
    return 50;
  }

  get conversationDigest() {
    return `[${this.header?.title || "卡片"}] ${this.fields?.[0]?.value || ""}`;
  }

  encodeJSON(): Record<string, unknown> {
    return {
      type: this.contentType,
      card: {
        template: this.template,
        header: this.header,
        fields: this.fields,
        actions: this.actions,
      },
    };
  }

  decodeJSON(content: Record<string, unknown>): void {
    const card = (content.card || content) as Record<string, unknown>;
    this.template = (card.template as string) || "";
    this.header = (card.header as ActionCardHeader) || { title: "" };
    this.fields = (card.fields as ActionCardField[]) || [];
    this.actions = (card.actions as ActionCardAction[]) || [];
  }
}

export default ActionCardContent;
