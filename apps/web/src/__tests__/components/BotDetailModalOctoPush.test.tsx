import { describe, it, expect } from 'vitest';

/**
 * Unit tests for BotDetailModal OctoPush status display logic
 * Tests chip rendering and "查看龙虾信息" button state (A/B/C/D)
 */

describe('BotDetailModal OctoPush status logic', () => {
    // Helper: OctoPush 状态判断逻辑（提取自 BotDetailModal）
    type OctoPushStatus = 'reported' | 'managed_unreported' | 'unmanaged' | null;

    interface BotData {
        creatorUid: string;
        octopushStatus: OctoPushStatus;
    }

    function getOctoPushDisplayState(
        botData: BotData,
        loginUid: string
    ): {
        showChip: boolean;
        showButton: boolean;
        buttonEnabled: boolean;
        chipColor: 'green' | 'orange' | 'gray' | null;
        chipText: string | null;
        buttonTooltip: string | null;
    } {
        const isOwner = botData.creatorUid === loginUid;
        const { octopushStatus } = botData;

        // D（他人创建）：chip 不显示，按钮隐藏
        if (!isOwner) {
            return {
                showChip: false,
                showButton: false,
                buttonEnabled: false,
                chipColor: null,
                chipText: null,
                buttonTooltip: null,
            };
        }

        // 我创建的 bot，但无 OctoPush 状态信息（老数据）
        if (!octopushStatus) {
            return {
                showChip: false,
                showButton: false,
                buttonEnabled: false,
                chipColor: null,
                chipText: null,
                buttonTooltip: null,
            };
        }

        // A/B/C 状态
        let chipColor: 'green' | 'orange' | 'gray';
        let chipText: string;
        let buttonEnabled: boolean;
        let buttonTooltip: string | null = null;

        if (octopushStatus === 'reported') {
            // A: 已管理·已上报
            chipColor = 'green';
            chipText = 'OctoPush · 已上报';
            buttonEnabled = true;
        } else if (octopushStatus === 'managed_unreported') {
            // B: 已管理·未上报
            chipColor = 'orange';
            chipText = 'OctoPush · 未上报';
            buttonEnabled = false;
            buttonTooltip = '请先在 OctoPush 中上报机器信息，才可查看龙虾信息';
        } else {
            // C: 未接入 OctoPush
            chipColor = 'gray';
            chipText = '未接入 OctoPush';
            buttonEnabled = false;
            buttonTooltip = '请在 OctoPush 中配置连接，由 OctoPush 管理该龙虾后再查看';
        }

        return {
            showChip: true,
            showButton: true,
            buttonEnabled,
            chipColor,
            chipText,
            buttonTooltip,
        };
    }

    describe('状态 A（已管理·已上报）', () => {
        it('应该显示绿色 chip + 可点击按钮', () => {
            const state = getOctoPushDisplayState(
                { creatorUid: 'user123', octopushStatus: 'reported' },
                'user123'
            );

            expect(state.showChip).toBe(true);
            expect(state.showButton).toBe(true);
            expect(state.buttonEnabled).toBe(true);
            expect(state.chipColor).toBe('green');
            expect(state.chipText).toBe('OctoPush · 已上报');
            expect(state.buttonTooltip).toBeNull();
        });
    });

    describe('状态 B（已管理·未上报）', () => {
        it('应该显示橙色 chip + 灰态按钮 + tooltip', () => {
            const state = getOctoPushDisplayState(
                { creatorUid: 'user123', octopushStatus: 'managed_unreported' },
                'user123'
            );

            expect(state.showChip).toBe(true);
            expect(state.showButton).toBe(true);
            expect(state.buttonEnabled).toBe(false);
            expect(state.chipColor).toBe('orange');
            expect(state.chipText).toBe('OctoPush · 未上报');
            expect(state.buttonTooltip).toBe('请先在 OctoPush 中上报机器信息，才可查看龙虾信息');
        });
    });

    describe('状态 C（未接入 OctoPush）', () => {
        it('应该显示灰色 chip + 灰态按钮 + tooltip', () => {
            const state = getOctoPushDisplayState(
                { creatorUid: 'user123', octopushStatus: 'unmanaged' },
                'user123'
            );

            expect(state.showChip).toBe(true);
            expect(state.showButton).toBe(true);
            expect(state.buttonEnabled).toBe(false);
            expect(state.chipColor).toBe('gray');
            expect(state.chipText).toBe('未接入 OctoPush');
            expect(state.buttonTooltip).toBe('请在 OctoPush 中配置连接，由 OctoPush 管理该龙虾后再查看');
        });
    });

    describe('状态 D（他人创建）', () => {
        it('应该隐藏 chip 和按钮', () => {
            const state = getOctoPushDisplayState(
                { creatorUid: 'otherUser', octopushStatus: 'reported' },
                'user123'
            );

            expect(state.showChip).toBe(false);
            expect(state.showButton).toBe(false);
            expect(state.buttonEnabled).toBe(false);
            expect(state.chipColor).toBeNull();
            expect(state.chipText).toBeNull();
            expect(state.buttonTooltip).toBeNull();
        });

        it('即使 octopushStatus 为 reported，非创建者也不显示', () => {
            const state = getOctoPushDisplayState(
                { creatorUid: 'user456', octopushStatus: 'reported' },
                'user123'
            );

            expect(state.showChip).toBe(false);
            expect(state.showButton).toBe(false);
        });
    });

    describe('边界情况', () => {
        it('我创建的 bot，但 octopushStatus 为 null（老数据）', () => {
            const state = getOctoPushDisplayState(
                { creatorUid: 'user123', octopushStatus: null },
                'user123'
            );

            expect(state.showChip).toBe(false);
            expect(state.showButton).toBe(false);
            expect(state.buttonEnabled).toBe(false);
        });

        it('creatorUid 为空字符串（无创建者信息）', () => {
            const state = getOctoPushDisplayState(
                { creatorUid: '', octopushStatus: 'reported' },
                'user123'
            );

            expect(state.showChip).toBe(false);
            expect(state.showButton).toBe(false);
        });

        it('loginUid 为空（未登录）', () => {
            const state = getOctoPushDisplayState(
                { creatorUid: 'user123', octopushStatus: 'reported' },
                ''
            );

            expect(state.showChip).toBe(false);
            expect(state.showButton).toBe(false);
        });
    });
});
