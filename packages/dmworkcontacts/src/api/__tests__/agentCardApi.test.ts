/**
 * Agent Card API 单元测试
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getAgentCard, getAgentCardFile } from '../agentCardApi';

// 确保使用 Mock 模式
beforeAll(() => {
  import.meta.env.VITE_AGENT_CARD_MOCK = 'true';
});

describe('Agent Card API', () => {
  describe('getAgentCard', () => {
    it('状态 A：已管理·已上报 - 返回完整数据', async () => {
      const data = await getAgentCard('pipixia_bot');

      expect(data).toBeDefined();
      expect(data.bot_id).toBe('pipixia_bot');
      expect(data.session_total).toBeGreaterThan(0);
      expect(data.runtime_info).toBeDefined();
      expect(data.sessions).toBeInstanceOf(Array);
      expect(data.core_files).toBeInstanceOf(Array);
      expect(data.memory_files).toBeInstanceOf(Array);
    });

    it('状态 B：已管理·未上报 - 返回 404', async () => {
      await expect(getAgentCard('bot_4')).rejects.toThrow('agent not found');
    });

    it('状态 D：他人创建 - 返回 403', async () => {
      await expect(getAgentCard('xiaoyan_bot')).rejects.toThrow('permission denied');
    });

    it('未知 bot - 返回 404', async () => {
      await expect(getAgentCard('unknown_bot')).rejects.toThrow('agent not found');
    });
  });

  describe('getAgentCardFile', () => {
    it('获取核心文件 - AGENTS.md', async () => {
      const data = await getAgentCardFile('pipixia_bot', 'AGENTS.md');

      expect(data).toBeDefined();
      expect(data.bot_id).toBe('pipixia_bot');
      expect(data.file_name).toBe('AGENTS.md');
      expect(data.content_type).toBe('text/markdown');
      expect(data.content).toContain('Agent Identity');
    });

    it('获取 memory 文件 - memory/2026-05-07.md', async () => {
      const data = await getAgentCardFile('pipixia_bot', 'memory/2026-05-07.md');

      expect(data).toBeDefined();
      expect(data.file_name).toBe('memory/2026-05-07.md');
      expect(data.content).toContain('Yesterday\'s Notes');
    });

    it('文件不存在 - 返回错误', async () => {
      await expect(getAgentCardFile('pipixia_bot', 'non-existent.md')).rejects.toThrow(
        'file not found',
      );
    });

    it('无权访问 bot - 返回 403', async () => {
      await expect(getAgentCardFile('xiaoyan_bot', 'AGENTS.md')).rejects.toThrow(
        'permission denied',
      );
    });

    it('bot 不存在 - 返回 404', async () => {
      await expect(getAgentCardFile('bot_4', 'AGENTS.md')).rejects.toThrow('agent not found');
    });
  });

  describe('Session 数据结构', () => {
    it('running session 包含所有必需字段', async () => {
      const data = await getAgentCard('pipixia_bot');
      const runningSessions = data.sessions.filter((s) => s.status === 'running');

      expect(runningSessions.length).toBeGreaterThan(0);

      const session = runningSessions[0];
      expect(session.session_id).toBeDefined();
      expect(session.session_key).toBeDefined();
      expect(session.channel).toBeDefined();
      expect(session.peer_name).toBeDefined();
      expect(session.model).toBeDefined();
      expect(session.context_used).toBeGreaterThan(0);
      expect(session.context_total).toBeGreaterThan(0);
      expect(session.context_percent).toBeGreaterThan(0);
      expect(session.last_user_message).toBeDefined();
      expect(session.last_active_at).toBeDefined();
    });

    it('group session 包含 group_member_count', async () => {
      const data = await getAgentCard('pipixia_bot');
      const groupSessions = data.sessions.filter((s) => s.peer_type === 'group');

      expect(groupSessions.length).toBeGreaterThan(0);

      const session = groupSessions[0];
      expect(session.group_member_count).toBeGreaterThan(0);
    });

    it('private session 的 group_member_count 为 null', async () => {
      const data = await getAgentCard('pipixia_bot');
      const privateSessions = data.sessions.filter((s) => s.peer_type === 'private');

      expect(privateSessions.length).toBeGreaterThan(0);

      const session = privateSessions[0];
      expect(session.group_member_count).toBeNull();
    });
  });

  describe('Runtime Info', () => {
    it('包含所有必需字段', async () => {
      const data = await getAgentCard('pipixia_bot');
      const { runtime_info } = data;

      expect(runtime_info.os_version).toBeDefined();
      expect(runtime_info.arch).toBeDefined();
      expect(runtime_info.disk_space_gb).toBeGreaterThan(0);
      expect(runtime_info.memory_gb).toBeGreaterThan(0);
      expect(runtime_info.claw_version).toBeDefined();
      expect(runtime_info.process_status).toBeDefined();
      expect(runtime_info.gateway_status).toBeDefined();
      expect(runtime_info.claw_id).toBeDefined();
      expect(runtime_info.nodejs_version).toBeDefined();
    });
  });
});
