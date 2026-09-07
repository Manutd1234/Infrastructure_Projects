import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Legend, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { TableSkeleton } from "../components/Skeleton";

const axis = { stroke: "#475569", fontSize: 11, tickLine: false, axisLine: false };
const grid = { stroke: "rgba(255,255,255,0.05)", strokeDasharray: "3 3" };

function pct(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${(Number(v) * 100).toFixed(digits)}%`;
}
function num(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return Number(v).toFixed(digits);
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2 text-xs">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-mono text-slate-100">
            {typeof p.value === "number" ? `${(p.value * 100).toFixed(2)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Crypto() {
  const { data: breakouts, isLoading: lb } = useQuery({ queryKey: ["breakouts"], queryFn: api.breakouts });
  const { data: drawdowns } = useQuery({ queryKey: ["drawdowns"], queryFn: api.drawdowns });
  const { data: perf } = useQuery({ queryKey: ["perf"], queryFn: api.performance });
  const { data: cycles } = useQuery({ queryKey: ["cycles"], queryFn: api.cycles });

  const bears = (cycles ?? []).filter((c) => c.type === "bear");
  const bulls = (cycles ?? []).filter((c) => c.type === "bull");
  const deepest = (drawdowns ?? [])[0];

  return (
    <div className="space-y-6 max-w-7xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Crypto</span> Bull Cycle
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          BTC cycle identification, +3σ weekly breakout drift study, drawdowns, and a 30-day-hold backtest vs buy &amp; hold.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <StatCard label="Bull cycles" value={bulls.length} sub={`avg ${Math.round(bulls.reduce((s, c) => s + c.duration_days, 0) / Math.max(bulls.length, 1))}d`} accent="emerald" />
        <StatCard label="Bear cycles" value={bears.length} sub={`avg ${Math.round(bears.reduce((s, c) => s + c.duration_days, 0) / Math.max(bears.length, 1))}d`} accent="rose" />
        <StatCard label="Deepest DD" value={deepest ? pct(deepest.max_drawdown, 1) : "—"} sub={deepest?.trough_date} accent="amber" />
        <StatCard label="+3σ breakouts" value={(breakouts ?? [])[0]?.n_breakouts ?? "—"} sub="signal events" accent="violet" />
      </section>

      <Card title="+3σ breakout forward returns vs. baseline" subtitle="Mean forward return after a +3σ weekly breakout, compared to the unconditional baseline. Bars below show excess drift.">
        {lb ? <TableSkeleton rows={4} cols={4} /> : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={breakouts ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="horizon" tickFormatter={(h) => `${h}d`} {...axis} />
                <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} {...axis} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mean_breakout" name="After breakout" radius={[4, 4, 0, 0]} fill="#60a5fa" />
                <Bar dataKey="mean_all" name="Baseline" radius={[4, 4, 0, 0]} fill="#475569" />
                <ReferenceLine y={0} stroke="#334155" />
              </BarChart>
            </ResponsiveContainer>
            <table className="data mt-4">
              <thead><tr>
                <th>Horizon</th><th>n</th><th>Mean (post)</th><th>% positive</th>
                <th>Mean (all)</th><th>t-stat</th><th>p-value</th><th>Excess</th>
              </tr></thead>
              <tbody>
                {(breakouts ?? []).map((b) => (
                  <tr key={b.horizon}>
                    <td className="font-medium">{b.horizon}d</td>
                    <td className="tabular-nums">{b.n_breakouts}</td>
                    <td className="tabular-nums">{pct(b.mean_breakout)}</td>
                    <td className="tabular-nums">{pct(b.pct_positive, 0)}</td>
                    <td className="tabular-nums">{pct(b.mean_all)}</td>
                    <td className="tabular-nums">{num(b.t_stat)}</td>
                    <td className="tabular-nums">{num(b.p_value, 3)}</td>
                    <td className={`tabular-nums font-medium ${(b.excess_vs_all ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pct(b.excess_vs_all)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Bull / bear cycles" subtitle="Peak-to-trough episodes (≥20% decline = bear)">
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            <table className="data">
              <thead><tr><th>Type</th><th>Start</th><th>End</th><th>Return</th><th>Days</th></tr></thead>
              <tbody>
                {(cycles ?? []).map((c, i) => (
                  <tr key={i}>
                    <td>
                      <span className={c.type === "bear" ? "chip-err" : "chip-ok"}>
                        {c.type}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{c.start_date}</td>
                    <td className="font-mono text-xs">{c.end_date}</td>
                    <td className={`tabular-nums font-medium ${(c.return ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pct(c.return, 1)}
                    </td>
                    <td className="tabular-nums">{c.duration_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Top drawdowns" subtitle="Deepest peak-to-trough episodes">
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            <table className="data">
              <thead><tr><th>Peak</th><th>Trough</th><th>Recovery</th><th>Max DD</th><th>P→T</th></tr></thead>
              <tbody>
                {(drawdowns ?? []).map((d, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs">{d.peak_date}</td>
                    <td className="font-mono text-xs">{d.trough_date}</td>
                    <td className="font-mono text-xs">{d.recovery_date || "—"}</td>
                    <td className="tabular-nums text-rose-400 font-medium">{(d.max_drawdown * 100).toFixed(1)}%</td>
                    <td className="tabular-nums">{d.peak_to_trough_days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Strategy vs buy &amp; hold" subtitle="Risk-adjusted comparison — hold 30 days after each +3σ breakout, flat otherwise">
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr>
              <th>Strategy</th><th>CAGR</th><th>Vol</th><th>Sharpe</th>
              <th>Sortino</th><th>Max DD</th><th>Win rate</th><th>Trades</th>
            </tr></thead>
            <tbody>
              {(perf ?? []).map((p) => (
                <tr key={p.strategy}>
                  <td className="font-medium text-slate-100">{p.strategy}</td>
                  <td className="tabular-nums text-emerald-400">{pct(p.cagr, 1)}</td>
                  <td className="tabular-nums">{pct(p.volatility_ann, 1)}</td>
                  <td className="tabular-nums">{num(p.sharpe)}</td>
                  <td className="tabular-nums">{num(p.sortino)}</td>
                  <td className="tabular-nums text-rose-400">{pct(p.max_drawdown, 1)}</td>
                  <td className="tabular-nums">{pct(p.win_rate_invested, 0)}</td>
                  <td className="tabular-nums">{p.num_trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
