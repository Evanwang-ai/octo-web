## Agent Card API

Agent Card API 用于获取 OctoPush 上报的龙虾运行时信息。

### 使用方式

#### 1. 环境变量配置

在 `.env` 文件中配置：

```bash
# Mock 模式（开发阶段）
VITE_AGENT_CARD_MOCK=true

# 真实 API 地址（生产环境）
VITE_AGENT_CARD_BASE_URL=/agent-card/api/v1
```

#### 2. API 调用

```typescript
import { getAgentCard, getAgentCardFile } from '@octo/contacts';

// 获取 Agent Card
const data = await getAgentCard('pipixia_bot');

// 获取文件内容
const file = await getAgentCardFile('pipixia_bot', 'AGENTS.md');
const memoryFile = await getAgentCardFile('pipixia_bot', 'memory/2026-05-07.md');
```

#### 3. 使用 Hook

```tsx
import { useAgentCard, useAgentCardFile } from '@octo/contacts';

function ClawInfoDialog({ botId }: { botId: string }) {
  const { data, loading, error, refetch } = useAgentCard(botId);

  if (loading) return <Spin />;
  if (error) return <Alert message={error} />;

  return (
    <div>
      <h1>{data.bot_id}</h1>
      <p>Total Sessions: {data.session_total}</p>
      <p>Running Sessions: {data.session_running_count}</p>
      {/* ... */}
    </div>
  );
}
```

### OctoPush 状态说明

根据 PRD 定义的三种状态：

| 状态 | Bot ID | Mock 响应 | 说明 |
|------|--------|----------|------|
| **A** · 已管理·已上报 | `pipixia_bot` | 200 + 完整数据 | 可查看龙虾信息 |
| **B** · 已管理·未上报 | `bot_4` | 404 | OctoPush 未上报数据 |
| **D** · 他人创建 | `xiaoyan_bot` | 403 | 无权查看他人龙虾 |

### Mock 数据结构

Mock 数据包含：

- **Runtime Info**：OS、CPU、内存、磁盘、Gateway 连接状态等
- **Sessions**：4 个 session（3 个 running，1 个 idle）
  - 2 个 DMWork private
  - 1 个 DMWork group
  - 1 个 Discord channel
- **Core Files**：AGENTS.md、SOUL.md、TOOLS.md
- **Memory Files**：2026-05-08.md、2026-05-07.md

### 数据类型

详见 `types.ts`：

- `AgentCardData` - Agent Card 完整数据
- `SessionInfo` - Session 信息
- `RuntimeInfo` - 运行时信息
- `CoreFile` - 核心文件
- `MemoryFile` - 记忆文件
- `FileContentData` - 文件内容

### API 接口文档

完整接口定义见 `/tmp/shared/agent-card-server-api.md`。

### 测试

运行单元测试：

```bash
pnpm test packages/dmworkcontacts/src/api/__tests__
pnpm test packages/dmworkcontacts/src/hooks/__tests__
```
