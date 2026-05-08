/**
 * useAgentCardFile Hook
 * 
 * 用于获取 Agent Card 文件内容
 */

import { useState, useCallback } from 'react';
import { getAgentCardFile } from '../api/agentCardApi';
import type { FileContentData } from '../api/types';

interface UseAgentCardFileResult {
  /** 文件内容数据 */
  data: FileContentData | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 获取文件内容 */
  fetchFile: (fileName: string) => Promise<void>;
}

/**
 * 获取 Agent Card 文件内容
 * 
 * @param botId - Bot ID
 * @returns 文件内容数据、加载状态、错误信息
 * 
 * @example
 * ```tsx
 * const { data, loading, error, fetchFile } = useAgentCardFile('pipixia_bot');
 * 
 * // 获取文件
 * await fetchFile('AGENTS.md');
 * await fetchFile('memory/2026-05-07.md');
 * ```
 */
export function useAgentCardFile(botId: string | null): UseAgentCardFileResult {
  const [data, setData] = useState<FileContentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback(
    async (fileName: string) => {
      if (!botId) {
        setError('Bot ID is required');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getAgentCardFile(botId, fileName);
        setData(result);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch file content';
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [botId],
  );

  return {
    data,
    loading,
    error,
    fetchFile,
  };
}
