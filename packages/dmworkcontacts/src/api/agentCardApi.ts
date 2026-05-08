/**
 * Agent Card API 服务
 * 
 * 对接 agent-card-server HTTP 接口
 * 当前使用 Mock 数据模拟 A/B/D 三种 OctoPush 状态
 */

import axios, { type AxiosError } from 'axios';
import { WKApp } from '@octo/base';
import type {
  AgentCardResponse,
  FileContentResponse,
  ApiErrorResponse,
  AgentCardData,
  FileContentData,
} from './types';
import { getMockAgentCard, mockFileContents } from './mockData';

/**
 * Isolated axios instance for agent-card-server API.
 * Must NOT inherit axios.defaults.baseURL
 */
const agentCardAxios = axios.create({ baseURL: '' });

// Inject auth headers via interceptor
agentCardAxios.interceptors.request.use((config) => {
  const token = WKApp.loginInfo.token;
  if (token) {
    config.headers['Token'] = token; // 注意：agent-card-server 使用 "Token" header
  }
  return config;
});

// Handle 401 — trigger logout on expired token
agentCardAxios.interceptors.response.use(undefined, (err: AxiosError) => {
  if (err?.response?.status === 401) {
    WKApp.shared.logout();
  }
  return Promise.reject(err);
});

/**
 * Extract server error message from axios error response
 */
function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiErrorResponse>;
  const msg = axiosErr?.response?.data?.message;
  const raw = msg || (err instanceof Error ? err.message : 'Request failed');
  return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
}

/**
 * Base path for agent-card-server API
 * 环境变量控制 Mock 模式
 */
const USE_MOCK = import.meta.env.VITE_AGENT_CARD_MOCK === 'true';
const CARD_BASE_URL = import.meta.env.VITE_AGENT_CARD_BASE_URL || '/agent-card/api/v1';

/**
 * GET /api/v1/agent-cards/:bot_id — 获取 Agent Card
 * 
 * @param botId - Bot 唯一标识
 * @returns Agent Card 数据
 * @throws Error 当请求失败或无权访问时
 */
export async function getAgentCard(botId: string): Promise<AgentCardData> {
  // Mock 模式
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const mock = getMockAgentCard(botId);
        if (mock.status === 200 && mock.data) {
          resolve(mock.data);
        } else if (mock.error) {
          reject(new Error(mock.error.message));
        } else {
          reject(new Error('Unknown error'));
        }
      }, 300); // 模拟网络延迟
    });
  }

  // 真实 API 调用
  try {
    const resp = await agentCardAxios.get<AgentCardResponse>(
      `${CARD_BASE_URL}/agent-cards/${botId}`,
    );
    if (resp.data.code === 0) {
      return resp.data.data;
    } else {
      throw new Error(resp.data.message || 'Failed to fetch agent card');
    }
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * GET /api/v1/agent-cards/:bot_id/files/*file_name — 获取文件内容
 * 
 * @param botId - Bot 唯一标识
 * @param fileName - 文件路径（如 "AGENTS.md" 或 "memory/2026-05-07.md"）
 * @returns 文件内容数据
 * @throws Error 当请求失败或文件不存在时
 */
export async function getAgentCardFile(
  botId: string,
  fileName: string,
): Promise<FileContentData> {
  // Mock 模式
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const mock = getMockAgentCard(botId);
        
        // 检查权限
        if (mock.status === 403) {
          reject(new Error('permission denied'));
          return;
        }
        if (mock.status === 404) {
          reject(new Error('agent not found'));
          return;
        }

        // 检查文件是否存在
        const content = mockFileContents[fileName];
        if (!content) {
          reject(new Error('file not found'));
          return;
        }

        // 返回文件内容
        resolve({
          bot_id: botId,
          file_name: fileName,
          content_type: 'text/markdown',
          file_size: content.length,
          content: content,
          last_synced_at: new Date().toISOString(),
        });
      }, 200);
    });
  }

  // 真实 API 调用
  try {
    const resp = await agentCardAxios.get<FileContentResponse>(
      `${CARD_BASE_URL}/agent-cards/${botId}/files/${fileName}`,
    );
    if (resp.data.code === 0) {
      return resp.data.data;
    } else {
      throw new Error(resp.data.message || 'Failed to fetch file content');
    }
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * 健康检查 - GET /healthz
 */
export async function healthCheck(): Promise<{ status: string; service: string; version: string }> {
  if (USE_MOCK) {
    return Promise.resolve({
      status: 'ok',
      service: 'agent-card-server',
      version: '1.0.0',
    });
  }

  try {
    const resp = await agentCardAxios.get<{ status: string; service: string; version: string }>(
      `${CARD_BASE_URL.replace('/api/v1', '')}/healthz`,
    );
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}
