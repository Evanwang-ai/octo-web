/**
 * Agent Card API 类型定义
 * 
 * 核心类型从 @octo/base/Types/AgentCard 重新导出，打破循环依赖
 * 根据 /tmp/shared/agent-card-server-api.md
 */

// 从 @octo/base 重新导出核心类型
export type {
  SessionStatus,
  PeerType,
  ChannelType,
  CoreFileCategory,
  ProcessStatus,
  GatewayStatus,
  RuntimeInfo,
  SessionInfo,
  CoreFile,
  MemoryFile,
  AgentCardData,
  FileContentData,
} from '@octo/base/src/Types/AgentCard';

/**
 * Agent Card API 响应（HTTP 层封装）
 * 
 * 注意：这是完整的 HTTP 响应结构 { code, message, data }
 * 与 AgentCardService 中的 AgentCardResponse 别名不同，后者仅指 data 载荷
 */
export interface AgentCardResponse {
  code: number;
  message: string;
  data: import('@octo/base/src/Types/AgentCard').AgentCardData;
}

/**
 * 文件内容 API 响应
 */
export interface FileContentResponse {
  code: number;
  message: string;
  data: import('@octo/base/src/Types/AgentCard').FileContentData;
}

/**
 * API 错误响应
 */
export interface ApiErrorResponse {
  code: number;
  message: string;
}
