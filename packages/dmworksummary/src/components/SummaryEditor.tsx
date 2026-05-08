import React, { Component } from "react";
import { Button, Toast } from "@douyinfe/semi-ui";
import * as api from "../api/summaryApi";

interface SummaryEditorProps {
    taskId: number;
    baseResultId: number;
    initialContent: string;
    onSave: () => void;
    onCancel: () => void;
}

interface SummaryEditorState {
    content: string;
    saving: boolean;
}

export default class SummaryEditor extends Component<SummaryEditorProps, SummaryEditorState> {
    private textareaRef = React.createRef<HTMLTextAreaElement>();

    state: SummaryEditorState = {
        content: this.props.initialContent,
        saving: false,
    };

    componentDidMount() {
        window.addEventListener("beforeunload", this.handleBeforeUnload);
        this.adjustHeight();
    }

    componentWillUnmount() {
        window.removeEventListener("beforeunload", this.handleBeforeUnload);
    }

    private handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (this.hasChanges) {
            e.preventDefault();
        }
    };

    private get hasChanges(): boolean {
        return this.state.content !== this.props.initialContent;
    }

    private adjustHeight = () => {
        const el = this.textareaRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
        }
    };

    private handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({ content: e.target.value }, this.adjustHeight);
    };

    private handleSave = async () => {
        const { taskId, baseResultId, onSave } = this.props;
        const { content } = this.state;

        this.setState({ saving: true });
        try {
            await api.editSummary(taskId, content, baseResultId);
            Toast.success("保存成功");
            onSave();
        } catch (err: unknown) {
            const error = err as Error & { status?: number };
            if (error.status === 409) {
                Toast.warning("内容已更新，请刷新");
                onSave();
            } else {
                Toast.error(error.message || "保存失败，请重试");
                this.setState({ saving: false });
            }
        }
    };

    render() {
        const { onCancel } = this.props;
        const { content, saving } = this.state;

        return (
            <div className="summary-editor">
                <textarea
                    ref={this.textareaRef}
                    className="summary-editor-textarea"
                    value={content}
                    onChange={this.handleChange}
                    disabled={saving}
                    style={{
                        width: "100%",
                        minHeight: 200,
                        padding: "12px 16px",
                        fontSize: 14,
                        lineHeight: "1.6",
                        border: "1px solid var(--semi-color-border)",
                        borderRadius: 8,
                        resize: "vertical",
                        fontFamily: "inherit",
                        color: "var(--semi-color-text-0)",
                        backgroundColor: "var(--semi-color-bg-0)",
                        outline: "none",
                        boxSizing: "border-box",
                    }}
                />
                <div
                    className="summary-editor-actions"
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 12,
                    }}
                >
                    <Button onClick={onCancel} disabled={saving}>
                        取消
                    </Button>
                    <Button
                        theme="solid"
                        onClick={this.handleSave}
                        disabled={!this.hasChanges || saving}
                        loading={saving}
                    >
                        保存
                    </Button>
                </div>
            </div>
        );
    }
}
