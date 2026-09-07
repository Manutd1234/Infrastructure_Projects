import { ReactNode } from "react";

export function StatCard({
  label, value, sub, trend, icon, accent = "blue",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: "up" | "down" | "flat";
  icon?: ReactNode;
  accent?: "blue" | "emerald" | "amber" | "rose" | "violet";
}) {
  const ring: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-500/0 text-blue-300",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-300",
    violet: "from-violet-500/20 to-violet-500/0 text-violet-300",
  };
  const trendColor =
    trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-slate-500";
  const trendArrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "■";

  return (
    <div className="panel-hover p-4 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-b ${ring[accent]} blur-2xl pointer-events-none`} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
        {icon && <span className={`text-lg ${ring[accent].split(" ").pop()}`}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-50 tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend && <span className={trendColor}>{trendArrow}</span>}
        {sub && <span className="text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}
