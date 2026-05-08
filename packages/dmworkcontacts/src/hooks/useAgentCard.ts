/**
 * useAgentCard Hook
 * 
 * 用于获取 Agent Card 数据
 */

import { useState, useEffect, useCallback } from 'react';
import { getAgentCard } from '../api/agentCardApi';
import type { AgentCardData } from '../api/types';

interface UseAgentCardResult {
  /** Agent Card 数据 */
  data: AgentCardData | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 重新加载 */
  refetch: () => Promise<void>;
}

/**
 * 获取 Agent Card 数据
 * 
 * @param botId - Bot ID
 * @param options - 选项
 * @returns Agent Card 数据、加载状态、错误信息
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useAgentCard('pipixia_bot');
 * ```
 */
export function useAgentCard(
  botId: string | null,
  options?: {
    /** 是否启用自动加载（默认 true） */
    enabled?: boolean;
  },
): UseAgentCardResult {
  const [data, setData] = useState<AgentCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = options?.enabled ?? true;

  const fetchData = useCallback(async () => {
    if (!botId || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getAgentCard(botId);
      setData(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agent card';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [botId, enabled]);

  // 初始加载
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
