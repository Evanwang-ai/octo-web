import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SummaryEditor from "./SummaryEditor";
import * as api from "../api/summaryApi";

jest.mock("@douyinfe/semi-ui", () => ({
    Button: ({ children, onClick, disabled, loading, theme, ...rest }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-loading={loading}
            data-theme={theme}
            {...rest}
        >
            {children}
        </button>
    ),
    Toast: {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
    },
}));

jest.mock("../api/summaryApi");

const mockApi = api as jest.Mocked<typeof api>;

describe("SummaryEditor", () => {
    const defaultProps = {
        taskId: 1,
        baseResultId: 456,
        initialContent: "Original content",
        onSave: jest.fn(),
        onCancel: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders textarea with initial content", () => {
        render(<SummaryEditor {...defaultProps} />);
        const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
        expect(textarea.value).toBe("Original content");
    });

    it("save button is disabled when content has not changed", () => {
        render(<SummaryEditor {...defaultProps} />);
        const saveBtn = screen.getByText("保存");
        expect(saveBtn).toBeDisabled();
    });

    it("save button is enabled when content changes", () => {
        render(<SummaryEditor {...defaultProps} />);
        const textarea = screen.getByRole("textbox");
        fireEvent.change(textarea, { target: { value: "Modified content" } });
        const saveBtn = screen.getByText("保存");
        expect(saveBtn).not.toBeDisabled();
    });

    it("calls onCancel when cancel button is clicked", () => {
        render(<SummaryEditor {...defaultProps} />);
        fireEvent.click(screen.getByText("取消"));
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls editSummary and onSave on successful save", async () => {
        mockApi.editSummary.mockResolvedValue({ edited_at: "2026-05-08T14:30:00Z" });
        render(<SummaryEditor {...defaultProps} />);

        const textarea = screen.getByRole("textbox");
        fireEvent.change(textarea, { target: { value: "Updated content" } });
        fireEvent.click(screen.getByText("保存"));

        await waitFor(() => {
            expect(mockApi.editSummary).toHaveBeenCalledWith(1, "Updated content", 456);
            expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
        });
    });

    it("shows warning and calls onSave on 409 conflict", async () => {
        const error = new Error("conflict") as Error & { status?: number };
        error.status = 409;
        mockApi.editSummary.mockRejectedValue(error);

        const { Toast } = require("@douyinfe/semi-ui");
        render(<SummaryEditor {...defaultProps} />);

        const textarea = screen.getByRole("textbox");
        fireEvent.change(textarea, { target: { value: "Updated content" } });
        fireEvent.click(screen.getByText("保存"));

        await waitFor(() => {
            expect(Toast.warning).toHaveBeenCalledWith("内容已更新，请刷新");
            expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
        });
    });

    it("shows error toast and keeps content on 5xx error", async () => {
        const error = new Error("服务器错误") as Error & { status?: number };
        error.status = 500;
        mockApi.editSummary.mockRejectedValue(error);

        const { Toast } = require("@douyinfe/semi-ui");
        render(<SummaryEditor {...defaultProps} />);

        const textarea = screen.getByRole("textbox");
        fireEvent.change(textarea, { target: { value: "Updated content" } });
        fireEvent.click(screen.getByText("保存"));

        await waitFor(() => {
            expect(Toast.error).toHaveBeenCalledWith("服务器错误");
            expect(defaultProps.onSave).not.toHaveBeenCalled();
        });

        const updatedTextarea = screen.getByRole("textbox") as HTMLTextAreaElement;
        expect(updatedTextarea.value).toBe("Updated content");
    });

    it("disables textarea and buttons while saving", async () => {
        let resolvePromise: (value: { edited_at: string }) => void;
        mockApi.editSummary.mockImplementation(
            () => new Promise((resolve) => { resolvePromise = resolve; }),
        );

        render(<SummaryEditor {...defaultProps} />);

        const textarea = screen.getByRole("textbox");
        fireEvent.change(textarea, { target: { value: "Updated" } });
        fireEvent.click(screen.getByText("保存"));

        await waitFor(() => {
            expect(textarea).toBeDisabled();
        });

        resolvePromise!({ edited_at: "2026-05-08T14:30:00Z" });
    });
});
