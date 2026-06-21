import React from "react";
import { MessageBaseCellProps, MessageCell } from "../MessageCell";
import { ActionCardContent } from "./ActionCardContent";
import WKApp from "../../App";
import { getMessageRow } from "../../bridge/message/useMessageRow";
import { isMessageSelectable } from "../../Service/messageSelection";
import MessageRow from "../../ui/message/MessageRow";
import "./index.css";

const ICON_MAP: Record<string, string> = {
  task: "\u{1F4CB}",
  alert: "⚠️",
  check: "✅",
  info: "ℹ️",
};

export class ActionCardCell extends MessageCell<MessageBaseCellProps> {
  handleAction = (
    e: React.MouseEvent,
    action: { label: string; url: string; style?: string }
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (action.url.startsWith("matter:")) {
      const matterId = action.url.replace("matter:", "");
      if (WKApp.openMatterDetail) {
        WKApp.openMatterDetail(matterId);
      } else {
        window.open(`/matter/ui/#/matter/${matterId}`, "_blank");
      }
    } else if (action.url.startsWith("/") || action.url.startsWith("http")) {
      window.open(action.url, "_blank");
    }
  };

  render() {
    const { message, context } = this.props;
    const content = message.content as ActionCardContent;
    const header = content.header || { title: "", icon: "" };
    const icon = ICON_MAP[header.icon || ""] || header.icon || "";
    const selectionMode = context.editOn();
    const selectable = isMessageSelectable(message);
    const rowProps = getMessageRow(message, {
      selectionMode,
      showCheckbox: selectionMode && selectable,
      isSelected: selectable && !!message.checked,
      onSelect: selectable
        ? (selected) => context.checkeMessage(message.message, selected)
        : undefined,
    });

    return (
      <MessageRow
        {...rowProps}
        onContextMenu={(event) => context.showContextMenus(message, event)}
        isActive={context.isContextMenuOpen(message.message)}
        onAvatarClick={(e) => context.onTapAvatar(message.fromUID, e)}
        onSenderNameClick={() => context.showUser(message.fromUID)}
      >
        <div className="wk-action-card">
          <div className="wk-action-card-header">
            {icon && <span className="wk-action-card-header-icon">{icon}</span>}
            <span>{header.title}</span>
          </div>
          {content.fields?.length > 0 && (
            <div className="wk-action-card-fields">
              {content.fields.map((f, i) => (
                <div className="wk-action-card-field" key={i}>
                  <span className="wk-action-card-field-label">{f.label}</span>
                  <span className="wk-action-card-field-value">{f.value}</span>
                </div>
              ))}
            </div>
          )}
          {content.actions?.length > 0 && (
            <div className="wk-action-card-actions">
              {content.actions.map((a, i) => (
                <span
                  key={i}
                  className={`wk-action-card-btn${
                    a.style === "primary" ? " wk-action-card-btn-primary" : ""
                  }`}
                  onClick={(e) => this.handleAction(e, a)}
                >
                  {a.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </MessageRow>
    );
  }
}

export default ActionCardCell;
