/**
 * Agent Card Mock 数据
 * 
 * 根据 PRD 定义的三种 OctoPush 状态：
 * - A：已管理·已上报 - 返回完整数据
 * - B：已管理·未上报 - 返回 404（bot 不存在）
 * - D：他人创建 - 返回 403（无权访问）
 */

import type { AgentCardData } from './types';

/**
 * 状态 A：已管理·已上报
 * bot_id: pipixia_bot (皮皮虾)
 */
export const mockAgentCardA: AgentCardData = {
  bot_id: 'pipixia_bot',
  session_total: 7,
  session_running_count: 3,
  last_report_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5分钟前
  runtime_info: {
    os_version: 'macOS 14.2',
    arch: 'arm64',
    disk_space_gb: 128.5,
    memory_gb: 32.0,
    app_data_dir: '/Users/agent/.openclaw',
    claw_version: '1.2.3',
    admin_url: 'http://localhost:3000/admin',
    team_name: 'MyTeam',
    process_status: 'running',
    gateway_status: 'connected',
    gateway_name: 'Gateway-1',
    claw_id: 'claw-a8f3d2e1',
    gateway_total_agents: 10,
    gateway_alive_agents: 8,
    nodejs_version: 'v20.11.0',
    network_latency_ms: 45.2,
    last_heartbeat_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    memory_retention_count: 50,
    memory_retention_note: '保留最近50天记忆，已清理3条过期记录',
  },
  sessions: [
    {
      session_id: 'sess_abc123',
      session_key: 'dmwork:group:a75b56c8d9e0f1a2b3c4d5e6f7890123',
      channel: 'dmwork',
      status: 'running',
      peer_name: 'Alice',
      peer_type: 'private',
      group_member_count: null,
      model: 'claude-sonnet-4-6',
      context_used: 148200,
      context_total: 200000,
      context_percent: 74.1,
      last_user_message: '帮我写一个函数',
      last_active_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      session_id: 'sess_def456',
      session_key: 'dmwork:group:b86c67d0a1f2g3h4i5j6k7l890234',
      channel: 'dmwork',
      status: 'running',
      peer_name: '产品需求讨论组',
      peer_type: 'group',
      group_member_count: 8,
      model: 'claude-sonnet-4-6',
      context_used: 92000,
      context_total: 200000,
      context_percent: 46.0,
      last_user_message: '这个功能明天能完成吗？',
      last_active_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      session_id: 'sess_ghi789',
      session_key: 'discord:channel:123456789012345678',
      channel: 'discord',
      status: 'running',
      peer_name: '#general',
      peer_type: 'group',
      group_member_count: 42,
      model: 'claude-sonnet-4-6',
      context_used: 15000,
      context_total: 200000,
      context_percent: 7.5,
      last_user_message: 'hello world',
      last_active_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      session_id: 'sess_jkl012',
      session_key: 'dmwork:private:c97d78e1b2f3g4h5i6j7k8l901345',
      channel: 'dmwork',
      status: 'idle',
      peer_name: 'Bob',
      peer_type: 'private',
      group_member_count: null,
      model: 'claude-sonnet-4-6',
      context_used: 5000,
      context_total: 200000,
      context_percent: 2.5,
      last_user_message: '谢谢',
      last_active_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
    },
  ],
  core_files: [
    {
      file_name: 'AGENTS.md',
      category: 'identity',
      file_size: 2048,
      content_preview: '# Agent Identity\n\nI am...',
      last_synced_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      file_name: 'SOUL.md',
      category: 'identity',
      file_size: 1536,
      content_preview: '# Soul\n\nMy personality...',
      last_synced_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      file_name: 'TOOLS.md',
      category: 'tools',
      file_size: 3072,
      content_preview: '# Tools\n\nAvailable tools...',
      last_synced_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  ],
  memory_files: [
    {
      file_name: 'memory/2026-05-08.md',
      file_size: 1024,
      content_preview: '## Today\'s Notes\n...',
      last_synced_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      file_name: 'memory/2026-05-07.md',
      file_size: 2048,
      content_preview: '## Yesterday\'s Notes\n...',
      last_synced_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

/**
 * 不同 bot 对应的 Mock 状态
 * 
 * - pipixia_bot: 状态 A（已管理·已上报）
 * - bot_4: 状态 B（已管理·未上报）→ 返回 404
 * - xiaoyan_bot: 状态 D（他人创建）→ 返回 403
 */
export const BOT_STATUS_MAP = {
  pipixia_bot: 'A',
  bot_4: 'B',
  xiaoyan_bot: 'D',
} as const;

/**
 * 根据 bot_id 获取 Mock 数据
 */
export function getMockAgentCard(botId: string): {
  status: number;
  data?: AgentCardData;
  error?: { code: number; message: string };
} {
  const status = BOT_STATUS_MAP[botId as keyof typeof BOT_STATUS_MAP];

  switch (status) {
    case 'A':
      // 已管理·已上报 - 返回完整数据
      return {
        status: 200,
        data: mockAgentCardA,
      };
    case 'B':
      // 已管理·未上报 - 返回 404
      return {
        status: 404,
        error: { code: 4041, message: 'agent not found' },
      };
    case 'D':
      // 他人创建 - 返回 403
      return {
        status: 403,
        error: { code: 4030, message: 'permission denied' },
      };
    default:
      // 未知 bot - 返回 404
      return {
        status: 404,
        error: { code: 4041, message: 'agent not found' },
      };
  }
}

/**
 * Mock 文件内容数据
 */
export const mockFileContents: Record<string, string> = {
  'AGENTS.md': `# Agent Identity

I am an AI agent named Pipixia (皮皮虾).

## Role
- Personal assistant
- Code helper
- Knowledge companion

## Capabilities
- Natural language understanding
- Code generation and review
- Task planning and execution

## Personality
- Helpful and friendly
- Professional but approachable
- Detail-oriented`,

  'SOUL.md': `# Soul

My personality is warm and supportive.

## Core Values
- Honesty
- Efficiency
- Continuous learning

## Communication Style
- Clear and concise
- Patient with questions
- Encouraging positive outcomes`,

  'TOOLS.md': `# Tools

Available tools and integrations.

## Code Tools
- Git integration
- Code review assistant
- Documentation generator

## Communication
- Multi-channel messaging
- Context-aware responses
- Smart notifications`,

  'memory/2026-05-08.md': `## Today's Notes

### Morning
- Discussed new feature requirements with team
- Reviewed PR #123

### Afternoon
- Helped debug database connection issue
- Updated documentation

### Learning
- Explored new React patterns
- Read article on performance optimization`,

  'memory/2026-05-07.md': `## Yesterday's Notes

### Tasks Completed
- Implemented user authentication flow
- Fixed critical bug in payment module
- Updated API documentation

### Meetings
- Team standup - discussed sprint goals
- 1-on-1 with manager - career development

### Notes
- Need to refactor legacy code in user service
- Consider migrating to new state management library`,
};
