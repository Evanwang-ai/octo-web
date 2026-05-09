/**
 * useAgentCardFile Hook
 * 
 * 用于获取 Agent Card 文件内容
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentCardService } from '@octo/base';
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
  const cancelledRef = useRef(false);

  // 组件卸载时标记为已取消
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const fetchFile = useCallback(
    async (fileName: string) => {
      if (!botId) {
        setError('Bot ID is required');
        return;
      }

      cancelledRef.current = false; // 重置取消标记
      setLoading(true);
      setError(null);

      try {
        const result = await AgentCardService.getFileData(botId, fileName);
        if (cancelledRef.current) return; // 如果已取消，忽略结果
        setData(result);
        setError(null);
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to fetch file content';
        setError(message);
        setData(null);
      } finally {
        if (!cancelledRef.current) {
          setLoading(false);
        }
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
