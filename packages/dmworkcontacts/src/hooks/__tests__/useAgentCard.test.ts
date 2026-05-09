/**
 * useAgentCard Hook 单元测试
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AgentCardService } from '@octo/base';
import { useAgentCard } from '../useAgentCard';
import { mockAgentCardA } from '../../api/mockData';

vi.mock('@octo/base', () => ({
  AgentCardService: {
    getAgentCard: vi.fn(),
  },
}));

describe('useAgentCard', () => {
  beforeEach(() => {
    vi.mocked(AgentCardService.getAgentCard).mockReset();
  });

  it('成功加载状态 A 数据', async () => {
    vi.mocked(AgentCardService.getAgentCard).mockResolvedValue(mockAgentCardA);
    const { result } = renderHook(() => useAgentCard('pipixia_bot'));

    // 初始状态
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // 等待加载完成
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 验证数据
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.bot_id).toBe('pipixia_bot');
    expect(result.current.error).toBeNull();
  });

  it('状态 B - 返回 404 错误', async () => {
    vi.mocked(AgentCardService.getAgentCard).mockRejectedValue(new Error('agent not found'));
    const { result } = renderHook(() => useAgentCard('bot_4'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('agent not found');
  });

  it('状态 D - 返回 403 错误', async () => {
    vi.mocked(AgentCardService.getAgentCard).mockRejectedValue(new Error('permission denied'));
    const { result } = renderHook(() => useAgentCard('xiaoyan_bot'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('permission denied');
  });

  it('enabled=false 时不自动加载', async () => {
    const { result } = renderHook(() => useAgentCard('pipixia_bot', { enabled: false }));

    // 等待一段时间
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 验证没有加载
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(vi.mocked(AgentCardService.getAgentCard)).not.toHaveBeenCalled();
  });

  it('botId 为 null 时不加载', async () => {
    const { result } = renderHook(() => useAgentCard(null));

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(vi.mocked(AgentCardService.getAgentCard)).not.toHaveBeenCalled();
  });

  it('refetch 可以重新加载数据', async () => {
    vi.mocked(AgentCardService.getAgentCard).mockResolvedValue(mockAgentCardA);
    const { result } = renderHook(() => useAgentCard('pipixia_bot'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBeDefined();

    // 重新加载
    await result.current.refetch();

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.bot_id).toBe('pipixia_bot');
  });
});
