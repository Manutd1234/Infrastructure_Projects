import { ReactNode } from "react";

export function StatCard({
  label, value, sub, trend, icon, accent = "blue", className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  accent?: "blue" | "emerald" | "amber" | "rose" | "violet";
  className?: string;
}) {
  const ring: Record<string, string> = {
    blue: "from-sky-400/45 to-sky-400/0 text-sky-200",
    emerald: "from-emerald-400/45 to-emerald-400/0 text-emerald-200",
    amber: "from-amber-300/50 to-amber-300/0 text-amber-100",
    rose: "from-rose-400/45 to-rose-400/0 text-rose-200",
    violet: "from-fuchsia-400/45 to-fuchsia-400/0 text-fuchsia-200",
  };
  const trendColor =
    trend === "up" ? "text-emerald-300" : trend === "down" ? "text-rose-300" : "text-slate-300";
  const trendArrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "■";

  return (
    <div className={`panel-hover p-5 relative overflow-hidden ${className}`}>
      <div className={`absolute -top-10 -right-6 w-36 h-36 rounded-full bg-gradient-to-b ${ring[accent]} blur-2xl pointer-events-none`} />
      <div className="flex items-center justify-between relative">
        <span className="text-[11px] uppercase tracking-wider text-sky-100/80 font-semibold">{label}</span>
        {icon && <span className={`text-lg ${ring[accent].split(" ").pop()}`}>{icon}</span>}
      </div>
      <div className="mt-3 text-3xl font-bold text-white tabular-nums tracking-tight">{value}</div>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {trend && <span className={trendColor}>{trendArrow}</span>}
        {sub && <span className="text-slate-200">{sub}</span>}
      </div>
    </div>
  );
}
