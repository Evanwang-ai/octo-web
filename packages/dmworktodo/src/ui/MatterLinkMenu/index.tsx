import React, { Component } from "react";
import ReactDOM from "react-dom";
import { I18nContext, t } from "@octo/base";
import "./index.css";

/**
 * MatterLinkMenu — 多选消息后"同步到项目"弹出菜单
 *
 * 参考原型 MultiMenu（18-Matters-prototype-v4-shadcn.html）：
 *   - "→ 同步到项目" + Project 列表 — 写入项目上下文
 *
 * 组件分层：Layer 1 纯 UI，无 SDK/WKApp/Service 依赖。
 * 通过 props 接收 anchorRef（用于定位）和 onClose 回调，由调用方负责事件派发。
 *
 * Portal 渲染到 document.body —
 * 避免 MultiplePanel 祖先的 transform 把 fixed 变成相对定位。
 *
 * TODO(interaction): 需要时支持项目搜索,避免项目过多时列表过长
 */

export interface MatterLinkMenuItem {
  id: string;
  title: string;
}

export interface MatterLinkMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  /** 项目列表 — 「存入项目上下文」分区（设计 06 §9.3） */
  projects?: MatterLinkMenuItem[];
  onClose: () => void;
  onPickProject?: (project: MatterLinkMenuItem) => void;
  /** 所有选项是否 disabled（占位阶段使用） */
  disabled?: boolean;
}

// 无默认 mock 数据 — 调用方必须传入 projects prop
// 如果未传，显示空列表

class MatterLinkMenu extends Component<MatterLinkMenuProps> {
  static contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  private menuRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    document.addEventListener("mousedown", this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleClickOutside);
  }

  private handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node;
    if (
      this.menuRef.current &&
      !this.menuRef.current.contains(target) &&
      this.props.anchorRef.current &&
      !this.props.anchorRef.current.contains(target)
    ) {
      this.props.onClose();
    }
  };

  render() {
    const { anchorRef, onPickProject, disabled } = this.props;
    const projects = this.props.projects ?? [];
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return null;

    // 定位在 anchor 元素上方（viewport 坐标）
    const style: React.CSSProperties = {
      position: "fixed",
      left: rect.left,
      bottom: window.innerHeight - rect.top + 8,
    };

    return ReactDOM.createPortal(
      <div
        ref={this.menuRef}
        className="wk-matter-link-menu"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wk-matter-link-menu__head">{t("todo.linkMenu.saveToProject")}</div>
        <div className="wk-matter-link-menu__sub">{t("todo.linkMenu.syncExisting")}</div>
        {projects.length > 0 && onPickProject ? projects.map((p) => (
          <button
            key={p.id}
            type="button"
            className="wk-matter-link-menu__item"
            disabled={disabled}
            onClick={() => onPickProject(p)}
          >
            <span className="wk-matter-link-menu__title">{p.title}</span>
          </button>
        )) : (
          <div className="wk-matter-link-menu__empty">{t("todo.linkMenu.noProjects")}</div>
        )}
      </div>,
      document.body,
    );
  }
}

export default MatterLinkMenu;
export { MatterLinkMenu };
