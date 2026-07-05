/**
 * [INPUT]: 依赖 ./viewSpec 的 ViewSpec 类型 + GROUPABLE_FIELDS/ORDERABLE_FIELDS/DISPLAY_PROPS/VIEW_SPEC_DEFAULTS。
 * [OUTPUT]: 默认导出 DisplayPanel(显示设置 popover:布局/分组/排序+方向/看板密度·隐藏空列/显示属性 chips/重置)。
 * [POS]: dmworktodo/ui/MatterListView 的 Display 面板(Linear 招牌),被 index.tsx 工具条"显示"按钮开合;
 *        受控:读 spec、改动走 onChange(Partial<ViewSpec>);兄弟 FilterMenu。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React from "react";
import type { ViewSpec, GroupBy, OrderBy } from "./viewSpec";
import {
  GROUPABLE_FIELDS,
  ORDERABLE_FIELDS,
  DISPLAY_PROPS,
  VIEW_SPEC_DEFAULTS,
} from "./viewSpec";
import "./panels.css";

export default function DisplayPanel({
  spec,
  onChange,
  onClose,
}: {
  spec: ViewSpec;
  onChange: (patch: Partial<ViewSpec>) => void;
  onClose: () => void;
}) {
  const isBoard = spec.layout === "board";
  return (
    <>
      <div className="mlv-pop-backdrop" onClick={onClose} />
      <div className="mlv-pop mlv-display-pop" role="dialog" aria-label="显示设置">
        {/* 布局 */}
        <div className="mlv-pop-seg">
          <button
            type="button"
            className={`mlv-pop-seg-btn${!isBoard ? " is-active" : ""}`}
            onClick={() => onChange({ layout: "list" })}
          >
            列表
          </button>
          <button
            type="button"
            className={`mlv-pop-seg-btn${isBoard ? " is-active" : ""}`}
            onClick={() => onChange({ layout: "board" })}
          >
            看板
          </button>
        </div>

        {/* 分组(看板时标签为"列") */}
        <div className="mlv-pop-row">
          <span className="mlv-pop-label">{isBoard ? "列" : "分组"}</span>
          <select
            className="mlv-pop-sel"
            value={spec.groupBy}
            onChange={(e) => onChange({ groupBy: e.target.value as GroupBy })}
          >
            {GROUPABLE_FIELDS.map((g) => (
              <option key={g.k} value={g.k}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* 排序 + 方向 */}
        <div className="mlv-pop-row">
          <span className="mlv-pop-label">排序</span>
          <select
            className="mlv-pop-sel"
            value={spec.orderBy}
            onChange={(e) => onChange({ orderBy: e.target.value as OrderBy })}
          >
            {ORDERABLE_FIELDS.map((o) => (
              <option key={o.k} value={o.k}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mlv-pop-dir"
            title={spec.orderDir === "asc" ? "升序" : "降序"}
            aria-label="排序方向"
            onClick={() => onChange({ orderDir: spec.orderDir === "asc" ? "desc" : "asc" })}
          >
            {spec.orderDir === "asc" ? "↑" : "↓"}
          </button>
        </div>

        {/* 看板专属:密度 + 隐藏空列 */}
        {isBoard && (
          <>
            <div className="mlv-pop-row">
              <span className="mlv-pop-label">密度</span>
              <div className="mlv-pop-seg mlv-pop-seg-sm">
                <button
                  type="button"
                  className={`mlv-pop-seg-btn${spec.board.density === "comfortable" ? " is-active" : ""}`}
                  onClick={() => onChange({ board: { ...spec.board, density: "comfortable" } })}
                >
                  舒适
                </button>
                <button
                  type="button"
                  className={`mlv-pop-seg-btn${spec.board.density === "compact" ? " is-active" : ""}`}
                  onClick={() => onChange({ board: { ...spec.board, density: "compact" } })}
                >
                  紧凑
                </button>
              </div>
            </div>
            <label className="mlv-pop-toggle">
              <input
                type="checkbox"
                checked={spec.board.hideEmpty}
                onChange={(e) => onChange({ board: { ...spec.board, hideEmpty: e.target.checked } })}
              />
              隐藏空列
            </label>
          </>
        )}

        {/* 显示属性 chips */}
        <div className="mlv-pop-sep" />
        <div className="mlv-pop-subhead">显示属性</div>
        <div className="mlv-pop-chips">
          {DISPLAY_PROPS.map((p) => {
            const on = spec.displayProps[p.k] !== false;
            return (
              <button
                key={p.k}
                type="button"
                className={`mlv-pop-chip${on ? " is-on" : ""}`}
                aria-pressed={on}
                onClick={() =>
                  onChange({ displayProps: { ...spec.displayProps, [p.k]: !on } })
                }
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* 重置(布局/分组/排序/属性/看板 回默认,不动筛选)——仅 spec 偏离默认时出现(Linear 条件性 footer) */}
        {!specIsDefault(spec) && (
          <>
            <div className="mlv-pop-sep" />
            <button
              type="button"
              className="mlv-pop-reset"
              onClick={() =>
                onChange({
                  layout: VIEW_SPEC_DEFAULTS.layout,
                  groupBy: VIEW_SPEC_DEFAULTS.groupBy,
                  orderBy: VIEW_SPEC_DEFAULTS.orderBy,
                  orderDir: VIEW_SPEC_DEFAULTS.orderDir,
                  displayProps: { ...VIEW_SPEC_DEFAULTS.displayProps },
                  board: { ...VIEW_SPEC_DEFAULTS.board },
                })
              }
            >
              重置为默认
            </button>
          </>
        )}
      </div>
    </>
  );
}

// 本面板管辖的字段(不含 filters)是否全在默认位。displayProps 的缺省键=true,与显式 true 等价。
function specIsDefault(spec: ViewSpec): boolean {
  const propsEq = DISPLAY_PROPS.every(
    (p) => (spec.displayProps[p.k] !== false) === (VIEW_SPEC_DEFAULTS.displayProps[p.k] !== false),
  );
  return (
    spec.layout === VIEW_SPEC_DEFAULTS.layout &&
    spec.groupBy === VIEW_SPEC_DEFAULTS.groupBy &&
    spec.orderBy === VIEW_SPEC_DEFAULTS.orderBy &&
    spec.orderDir === VIEW_SPEC_DEFAULTS.orderDir &&
    propsEq &&
    spec.board.density === VIEW_SPEC_DEFAULTS.board.density &&
    spec.board.hideEmpty === VIEW_SPEC_DEFAULTS.board.hideEmpty
  );
}
