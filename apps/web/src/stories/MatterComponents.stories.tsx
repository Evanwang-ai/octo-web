import type { Meta, StoryObj } from '@storybook/react-vite'
import React, { useState } from 'react'
import MatterCard from '../../../../packages/dmworktodo/src/ui/MatterCard'
import MemberPicker from '../../../../packages/dmworktodo/src/ui/MemberPicker'
import CreateTaskModal from '../../../../packages/dmworktodo/src/ui/CreateTaskModal'
import type { Matter, MatterStatus } from '../../../../packages/dmworktodo/src/bridge/types'

// ── Mock WKApp + SpaceService（仅 Story 范围内生效）─────────

const MOCK_MEMBERS = [
  { uid: 'u1', name: '李四', avatar: '', robot: 0 },
  { uid: 'u2', name: '王五', avatar: '', robot: 0 },
  { uid: 'u3', name: '张三', avatar: '', robot: 0 },
  { uid: 'u4', name: '审核 Bot', avatar: '', robot: 1 },
  { uid: 'u5', name: '自动化助手', avatar: '', robot: 1 },
]

// patch 全局 WKApp，让 useMemberList 拿到 mock 数据
;(globalThis as any).__STORYBOOK_MOCK__ = true

// mock SpaceService
const mockSpaceService = {
  shared: {
    getMembers: async (_spaceId: string) => MOCK_MEMBERS,
  },
}

// mock WKApp
const mockWKApp = {
  shared: {
    currentSpaceId: 'space-mock',
  },
  loginInfo: { uid: 'me', token: 'mock-token' },
  dataSource: {
    channelDataSource: {
      subscribers: async (_channel: any, _opts: any) => MOCK_MEMBERS,
    },
  },
}

// 在模块加载时 patch（storybook vite 环境下直接替换模块级引用不可行，
// 改为让 useMemberList 读 window.__mockMembers）
;(window as any).__mockSpaceMembers = MOCK_MEMBERS
;(window as any).__mockWKApp = mockWKApp
;(window as any).__mockSpaceService = mockSpaceService

// ── Mock 数据 ──────────────────────────────────────────────

const today = new Date().toISOString()
const yesterday = new Date(Date.now() - 86400000).toISOString()
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString()

const baseMatter: Matter = {
  id: 'matter-1',
  space_id: 'space-1',
  title: '修复登录页闪屏问题',
  status: 'open',
  creator_id: 'user-1',
  deadline: today,
  remind_at: undefined,
  source_channel_id: 'channel-1',
  source_channel_type: 2,
  source_name: '开发讨论',
  created_at: today,
  updated_at: today,
}

// ── Meta ───────────────────────────────────────────────────

const meta: Meta = {
  title: 'Matter/Components',
  parameters: { layout: 'padded' },
}
export default meta

// ── MatterCard Story ─────────────────────────────────────────

function CardDemo() {
  const [statuses, setStatuses] = useState<Record<string, MatterStatus>>({
    'matter-1': 'open',
    'matter-2': 'done',
    'matter-3': 'open',
    'matter-4': 'open',
  })

  const handleStatusChange = (id: string, status: MatterStatus) => {
    setStatuses(prev => ({ ...prev, [id]: status }))
  }

  const cards = [
    {
      matter: { ...baseMatter, id: 'matter-1', status: statuses['matter-1'], deadline: today },
      : '产品 v2.0', channelName: '开发讨论',
      assigneeUids: ['u1', 'u2', 'u3', 'u4'],
      label: '今天到期 + 4个负责人（超出显+1）',
    },
    {
      matter: { ...baseMatter, id: 'matter-2', title: '输出设计评审稿', status: statuses['matter-2'], deadline: yesterday },
      : 'Q2 迭代', channelName: '产品讨论',
      assigneeUids: ['u1'],
      label: '已完成 + 逾期',
    },
    {
      matter: { ...baseMatter, id: 'matter-3', title: '整理 Q2 迭代需求文档', status: statuses['matter-3'], deadline: undefined, source_channel_id: undefined, source_name: undefined },
      : undefined, channelName: undefined,
      assigneeUids: [],
      label: '无截止 + 无项目 + 无频道',
    },
    {
      matter: { ...baseMatter, id: 'matter-4', title: '完成接口联调', status: statuses['matter-4'], deadline: nextWeek },
      : '产品 v2.0', channelName: '开发讨论',
      assigneeUids: ['u1', 'u2'],
      label: '下周到期',
    },
  ]

  return (
    <div style={{ maxWidth: 500 }}>
      {cards.map(({ matter, channelName, assigneeUids, label }) => (
        <div key={matter.id} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{label}</div>
          <MatterCard
            matter={matter}
            channelName={channelName}
            assigneeUids={assigneeUids}
            onClick={(id) => console.log('点击详情:', id)}
            onStatusChange={handleStatusChange}
          />
        </div>
      ))}

      <div style={{ marginTop: 24, marginBottom: 4, fontSize: 11, color: '#aaa' }}>
        =true（项目内部视图，不显示项目名）
      </div>
      <MatterCard
        matter={{ ...baseMatter, status: statuses['matter-1'] }}
        ="产品 v2.0"
        channelName="开发讨论"
        assigneeUids={['u1', 'u2']}
        
        onClick={(id) => console.log('点击详情:', id)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}

export const MatterCardStory: StoryObj = {
  name: 'MatterCard',
  render: () => <CardDemo />,
}

// ── MemberPicker Story ─────────────────────────────────────

function MemberPickerDemo() {
  const [selected, setSelected] = useState<string[]>(['u1'])

  return (
    <div style={{ maxWidth: 400 }}>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8 }}>
        受控模式 · 初始选中「李四」· 含 2 个 Bot 成员（显示 AI 角标）
        <br />注：storybook 环境下成员列表来自 mock 数据
      </div>
      <MemberPicker
        mode="controlled"
        value={selected}
        onChange={setSelected}
        placeholder="搜索成员..."
      />
      <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
        已选：{selected.length > 0 ? selected.map(uid => MOCK_MEMBERS.find(m => m.uid === uid)?.name || uid).join('、') : '无'}
      </div>
    </div>
  )
}

export const MemberPickerStory: StoryObj = {
  name: 'MemberPicker（受控模式）',
  render: () => <MemberPickerDemo />,
}

// ── CreateTaskModal Story ──────────────────────────────────

function CreateTaskModalDemo() {
  const [visible, setVisible] = useState(false)
  const [lastAction, setLastAction] = useState<string>('—')

  const handleConfirm = async (req: any) => {
    setLastAction(`✅ 确认创建：${JSON.stringify(req)}`)
    setVisible(false)
  }

  const handleDirtyClose = () => {
    setLastAction('⚠️ 有改动后关闭（调用方应显示撤销提示条）')
    setVisible(false)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>
        CreateTaskModal — 发消息时创建任务的弹层<br />
        · 默认焦点在「发送并创建任务」按钮<br />
        · Enter / Alt+Enter 确认，Esc 关闭<br />
        · 有改动后关闭触发 onDirtyClose
      </div>
      <button
        onClick={() => setVisible(true)}
        style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', background: 'var(--wk-brand-primary, #7C5CFC)', color: '#fff', border: 'none', fontSize: 14 }}
      >
        打开弹层（模拟点击 📋 图标）
      </button>

      <CreateTaskModal
        visible={visible}
        onClose={() => { setLastAction('取消关闭'); setVisible(false) }}
        onDirtyClose={handleDirtyClose}
        onConfirm={handleConfirm}
        prefillTitle="修复登录页闪屏问题，iOS 14 以上必现"
        prefillAssigneeUids={[]}
      />

      <div style={{ marginTop: 16, fontSize: 12, color: '#666', padding: '8px 12px', background: '#f7f8fa', borderRadius: 6 }}>
        最后操作：{lastAction}
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => setVisible(true)}
          style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', border: '1px solid #ddd', fontSize: 14 }}
        >
          打开空白弹层（无预填内容）
        </button>
        <CreateTaskModal
          visible={false}
          onClose={() => {}}
          onDirtyClose={() => {}}
          onConfirm={async () => {}}
        />
      </div>
    </div>
  )
}

export const CreateTaskModalStory: StoryObj = {
  name: 'CreateTaskModal',
  render: () => <CreateTaskModalDemo />,
}
