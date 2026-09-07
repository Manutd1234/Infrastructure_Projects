import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  trend,
  trendValue,
  icon,
  accent = "blue",
  badge,
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon?: ReactNode;
  accent?: "blue" | "emerald" | "amber" | "rose" | "violet";
  badge?: ReactNode;
  className?: string;
}) {
  const accentBorder: Record<string, string> = {
    blue: "border-l-[4px] border-l-blue-600 dark:border-l-blue-400",
    emerald: "border-l-[4px] border-l-emerald-600 dark:border-l-emerald-400",
    amber: "border-l-[4px] border-l-amber-500 dark:border-l-amber-400",
    rose: "border-l-[4px] border-l-rose-500 dark:border-l-rose-400",
    violet: "border-l-[4px] border-l-purple-600 dark:border-l-purple-400",
  };

  return (
    <div
      className={`panel-card-hover p-4 sm:p-5 flex flex-col justify-between ${accentBorder[accent] || ""} ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs lg:text-[13px] uppercase tracking-wider text-[var(--ink-muted)] font-extrabold">
            {label}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {badge}
            {icon && (
              <div className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center text-[var(--ink-secondary)]">
                {icon}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-black text-[var(--ink)] tracking-tight font-sans tabular-nums">
            {value}
          </div>
          {trendValue && (
            <span
              className={`pill text-xs font-extrabold ${
                trend === "up"
                  ? "pill-green"
                  : trend === "down"
                  ? "pill-rose"
                  : "pill-neutral"
              }`}
            >
              {trend === "up" && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
              {trend === "down" && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
              {trend === "flat" && <Minus className="w-3.5 h-3.5 mr-0.5" />}
              {trendValue}
            </span>
          )}
        </div>
      </div>

      {sub && (
        <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-xs sm:text-[13px] text-[var(--ink-secondary)] font-semibold flex items-center justify-between">
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}
