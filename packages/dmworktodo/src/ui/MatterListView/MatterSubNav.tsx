// L3 | MatterSubNav — Matter 模块左侧子导航(全部回路/项目/自动化/经验)。
// 统一导航源:全部回路→原生列表;项目/自动化/经验→iframe(绞杀式,各表面 React 化后改原生)。
import React from "react";

export type SubNavKey = "matters" | "projects" | "automation" | "cards";

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M5.5 4h7M5.5 8h7M5.5 12h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="3" cy="4" r="1" fill="currentColor" />
      <circle cx="3" cy="8" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.1c.4 0 .77.16 1.06.44L7.5 4.5h5A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v3l2 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 2.5h5L12.5 6v7.5A1 1 0 0 1 11.5 14h-7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 2.5V6h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

const ITEMS: Array<{ key: SubNavKey; label: string; icon: React.ReactNode }> = [
  { key: "matters", label: "全部回路", icon: <ListIcon /> },
  { key: "projects", label: "项目", icon: <FolderIcon /> },
  { key: "automation", label: "自动化", icon: <ClockIcon /> },
  { key: "cards", label: "经验", icon: <DocIcon /> },
];

export default function MatterSubNav({
  current,
  onNavigate,
}: {
  current: SubNavKey;
  onNavigate: (k: SubNavKey) => void;
}) {
  return (
    <nav className="mlv-subnav">
      <div className="mlv-subnav-head">回路</div>
      <div className="mlv-subnav-items">
        {ITEMS.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`mlv-subnav-item${current === it.key ? " is-active" : ""}`}
            onClick={() => onNavigate(it.key)}
          >
            <span className="mlv-subnav-ic">{it.icon}</span>
            <span className="mlv-subnav-label">{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
