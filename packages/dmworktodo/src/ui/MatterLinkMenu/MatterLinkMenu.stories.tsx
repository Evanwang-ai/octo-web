import React, { useRef } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import MatterLinkMenu from './index'
import type { MatterLinkMenuProps } from './index'

const meta: Meta<typeof MatterLinkMenu> = {
  title: 'Matter/MatterLinkMenu',
  component: MatterLinkMenu,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '200px 100px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MatterLinkMenu>

const MOCK_PROJECTS = [
  { id: 'M-2451', title: 'Octo 产品策略 PPT 打磨' },
  { id: 'M-2438', title: 'AI 杠杆率纳入绩效体系' },
  { id: 'M-2402', title: 'Kano 模型推广到所有产研群' },
]

/**
 * 默认态 — 展示关联菜单
 */
export const Default: Story = {
  render: () => {
    const Wrapper = () => {
      const anchorRef = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={anchorRef} style={{ padding: '8px 16px' }}>
            触发按钮
          </button>
          <MatterLinkMenu
            anchorRef={anchorRef as React.RefObject<HTMLElement>}
            projects={MOCK_PROJECTS}
            onClose={() => {}}
            onPickProject={(p) => alert(`选择: ${p.title}`)}
          />
        </>
      )
    }
    return <Wrapper />
  },
}

/**
 * 禁用态 — 所有选项不可点击
 */
export const Disabled: Story = {
  render: () => {
    const Wrapper = () => {
      const anchorRef = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={anchorRef} style={{ padding: '8px 16px' }}>
            触发按钮
          </button>
          <MatterLinkMenu
            anchorRef={anchorRef as React.RefObject<HTMLElement>}
            projects={MOCK_PROJECTS}
            onClose={() => {}}
            disabled
          />
        </>
      )
    }
    return <Wrapper />
  },
}

/**
 * 空列表 — 无可同步项目
 */
export const EmptyList: Story = {
  render: () => {
    const Wrapper = () => {
      const anchorRef = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={anchorRef} style={{ padding: '8px 16px' }}>
            触发按钮
          </button>
          <MatterLinkMenu
            anchorRef={anchorRef as React.RefObject<HTMLElement>}
            projects={[]}
            onClose={() => {}}
          />
        </>
      )
    }
    return <Wrapper />
  },
}

/**
 * 长标题 — 测试文本溢出
 */
export const LongTitle: Story = {
  render: () => {
    const Wrapper = () => {
      const anchorRef = useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={anchorRef} style={{ padding: '8px 16px' }}>
            触发按钮
          </button>
          <MatterLinkMenu
            anchorRef={anchorRef as React.RefObject<HTMLElement>}
            projects={[
              { id: 'M-9999', title: '这是一个非常非常长的事项标题用来测试文本溢出和截断效果是否正常工作' },
              { id: 'M-1000', title: '短标题' },
            ]}
            onClose={() => {}}
            onPickProject={() => {}}
          />
        </>
      )
    }
    return <Wrapper />
  },
}
