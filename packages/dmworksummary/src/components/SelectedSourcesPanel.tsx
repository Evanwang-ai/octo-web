import React, { useState } from "react";
import { IconChevronDown, IconChevronUp } from "@douyinfe/semi-icons";
import type { SourceItem } from "../types/summary";
import { SourceType } from "../types/summary";
import type { SourceTypeValue } from "../types/summary";

interface SelectedSourcesPanelProps {
    sources: SourceItem[];
}

const SelectedSourcesPanel: React.FC<SelectedSourcesPanelProps> = ({ sources }) => {
    const [expanded, setExpanded] = useState(false);

    if (!sources || sources.length === 0) return null;

    const getIcon = (sourceType: SourceTypeValue): string => {
        switch (sourceType) {
            case SourceType.GROUP_CHAT:
                return "👥";
            case SourceType.THREAD:
                return "💬";
            case SourceType.DIRECT_MESSAGE:
                return "👤";
            default:
                return "📄";
        }
    };

    const getDisplayName = (source: SourceItem): string => {
        const name = source.source_name || source.source_id;
        if (source.source_type === SourceType.DIRECT_MESSAGE) {
            return `和${name}的聊天记录`;
        }
        return name;
    };

    return (
        <div className="selected-sources-panel">
            <div
                className="selected-sources-toggle"
                onClick={() => setExpanded(!expanded)}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
            >
                <span className="selected-sources-toggle-text">
                    已选择的信息来源
                </span>
                {expanded ? (
                    <IconChevronUp size="small" />
                ) : (
                    <IconChevronDown size="small" />
                )}
            </div>
            {expanded && (
                <div className="selected-sources-list">
                    {sources.map((source) => (
                        <div key={`${source.source_type}-${source.source_id}`} className="selected-sources-item">
                            <span className="selected-sources-item-icon">
                                {getIcon(source.source_type)}
                            </span>
                            <span className="selected-sources-item-name">
                                {getDisplayName(source)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SelectedSourcesPanel;
