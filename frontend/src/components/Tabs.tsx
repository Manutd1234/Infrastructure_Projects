import { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  badgeVariant?: "neutral" | "green" | "rose" | "amber" | "blue" | "purple";
  icon?: ReactNode;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className = "",
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`subtab-nav-bar ${className}`}
      role="tablist"
      aria-label="Sub-navigation"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`subtab-btn ${isActive ? "subtab-btn-active" : "subtab-btn-inactive"}`}
          >
            {tab.icon && <span className="subtab-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={`subtab-badge ${
                  tab.badgeVariant === "green"
                    ? "subtab-badge-green"
                    : isActive
                    ? "subtab-badge-active"
                    : "subtab-badge-neutral"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
