/**
 * [INPUT]: 依赖 ./viewSpec 的 MatterFilters/MatterRow;./icons 的 StatusIcon/STATUS_ORDER/STATUS_LABEL;
 *          @octo/base 的 WKAvatar、wukongimjssdk 的 Channel;../UserName。
 * [OUTPUT]: 默认导出 FilterMenu(筛选 popover:状态多选 / 项目单选 / 发起人单选 / 清空)。
 * [POS]: dmworktodo/ui/MatterListView 的筛选面板,被 index.tsx 工具条"筛选"按钮开合;
 *        受控:读 spec.filters、改动走 onChange(MatterFilters);全 client-side(对齐 vanilla)。兄弟 DisplayPanel。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useMemo } from "react";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import type { MatterFilters, MatterRow } from "./viewSpec";
import { StatusIcon, STATUS_ORDER, STATUS_LABEL } from "./icons";
import UserName from "../UserName";
import "./panels.css";

export default function FilterMenu({
  filters,
  matters,
  projects,
  onChange,
  onClose,
}: {
  filters: MatterFilters;
  matters: MatterRow[];
  projects: { id: string; name: string }[];
  onChange: (filters: MatterFilters) => void;
  onClose: () => void;
}) {
  // 发起人候选 = 当前已载入行的去重 creator(对齐 vanilla,从 rows 派生)。
  const creators = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    matters.forEach((m) => {
      if (m.creator_id && !seen.has(m.creator_id)) {
        seen.add(m.creator_id);
        out.push(m.creator_id);
      }
    });
    return out;
  }, [matters]);

  const toggleStatus = (s: string) => {
    const has = filters.statuses.includes(s);
    onChange({
      ...filters,
      statuses: has ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s],
    });
  };

  return (
    <>
      <div className="mlv-pop-backdrop" onClick={onClose} />
      <div className="mlv-pop mlv-filter-pop" role="dialog" aria-label="筛选">
        <div className="mlv-pop-head">
          <span className="mlv-pop-title">筛选</span>
          <button
            type="button"
            className="mlv-pop-clear"
            onClick={() => onChange({ statuses: [], creator: "", project: "" })}
          >
            清空
          </button>
        </div>

        <div className="mlv-pop-subhead">状态</div>
        <div className="mlv-pop-opts">
          {STATUS_ORDER.map((s) => (
            <label key={s} className="mlv-pop-opt">
              <input
                type="checkbox"
                checked={filters.statuses.includes(s)}
                onChange={() => toggleStatus(s)}
              />
              <StatusIcon status={s} size={14} />
              <span className="mlv-pop-opt-label">{STATUS_LABEL[s]}</span>
            </label>
          ))}
        </div>

        <div className="mlv-pop-subhead">项目</div>
        <div className="mlv-pop-opts">
          <label className="mlv-pop-opt">
            <input
              type="radio"
              name="mlv-flt-project"
              checked={!filters.project}
              onChange={() => onChange({ ...filters, project: "" })}
            />
            <span className="mlv-pop-opt-label">全部项目</span>
          </label>
          {projects.map((p) => (
            <label key={p.id} className="mlv-pop-opt">
              <input
                type="radio"
                name="mlv-flt-project"
                checked={filters.project === p.id}
                onChange={() => onChange({ ...filters, project: p.id })}
              />
              <span className="mlv-pop-opt-label">{p.name}</span>
            </label>
          ))}
        </div>

        <div className="mlv-pop-subhead">发起人</div>
        <div className="mlv-pop-opts">
          <label className="mlv-pop-opt">
            <input
              type="radio"
              name="mlv-flt-creator"
              checked={!filters.creator}
              onChange={() => onChange({ ...filters, creator: "" })}
            />
            <span className="mlv-pop-opt-label">全部发起人</span>
          </label>
          {creators.map((uid) => (
            <label key={uid} className="mlv-pop-opt">
              <input
                type="radio"
                name="mlv-flt-creator"
                checked={filters.creator === uid}
                onChange={() => onChange({ ...filters, creator: uid })}
              />
              <WKAvatar
                channel={new Channel(uid, ChannelTypePerson)}
                style={{ width: 16, height: 16, borderRadius: "50%" }}
              />
              <span className="mlv-pop-opt-label">
                <UserName uid={uid} />
              </span>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
