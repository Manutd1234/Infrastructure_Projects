import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../lib/api";

export default function Crypto() {
  const { data: breakouts } = useQuery({ queryKey: ["breakouts"], queryFn: api.breakouts });
  const { data: drawdowns } = useQuery({ queryKey: ["drawdowns"], queryFn: api.drawdowns });
  const { data: perf } = useQuery({ queryKey: ["perf"], queryFn: api.performance });
  const { data: cycles } = useQuery({ queryKey: ["cycles"], queryFn: api.cycles });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Crypto Bull Cycle</h1>
        <p className="text-desk-muted text-sm">
          BTC cycle identification, +3σ breakout drift study, drawdowns, and strategy backtest.
        </p>
      </header>

      <section className="panel">
        <h2 className="font-medium mb-3">Bull / bear cycles</h2>
        <table className="data">
          <thead><tr><th>Type</th><th>Start</th><th>End</th><th>Return</th><th>Days</th></tr></thead>
          <tbody>
            {(cycles ?? []).map((c, i) => (
              <tr key={i}>
                <td className={c.type === "bear" ? "text-red-400" : "text-emerald-400"}>{c.type}</td>
                <td className="font-mono">{c.start_date}</td>
                <td className="font-mono">{c.end_date}</td>
                <td className={(c.return * 100).toFixed(1).startsWith("-") ? "text-red-400" : "text-emerald-400"}>
                  {(c.return * 100).toFixed(1)}%
                </td>
                <td>{c.duration_days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2 className="font-medium mb-3">+3σ breakout forward returns vs. baseline</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={breakouts ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="horizon" tickFormatter={(h) => `${h}d`} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip formatter={(v: number) => `${(v * 100).toFixed(2)}%`} />
            <Legend />
            <Bar dataKey="mean_breakout" name="After breakout" fill="#3b82f6" />
            <Bar dataKey="mean_all"     name="Baseline"      fill="#64748b" />
            <ReferenceLine y={0} stroke="#475569" />
          </BarChart>
        </ResponsiveContainer>
        <table className="data mt-3">
          <thead><tr>
            <th>Horizon</th><th>n</th><th>Mean (post)</th><th>% positive</th>
            <th>Mean (all)</th><th>t-stat</th><th>p-value</th><th>Excess</th>
          </tr></thead>
          <tbody>
            {(breakouts ?? []).map((b) => (
              <tr key={b.horizon}>
                <td>{b.horizon}d</td>
                <td>{b.n_breakouts}</td>
                <td>{(b.mean_breakout * 100).toFixed(2)}%</td>
                <td>{(b.pct_positive * 100).toFixed(0)}%</td>
                <td>{(b.mean_all * 100).toFixed(2)}%</td>
                <td>{b.t_stat.toFixed(2)}</td>
                <td>{b.p_value.toFixed(3)}</td>
                <td className={b.excess_vs_all >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {(b.excess_vs_all * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2 className="font-medium mb-3">Top drawdowns</h2>
        <table className="data">
          <thead><tr>
            <th>Peak</th><th>Trough</th><th>Recovery</th>
            <th>Max DD</th><th>P→T days</th><th>Recovery days</th>
          </tr></thead>
          <tbody>
            {(drawdowns ?? []).map((d, i) => (
              <tr key={i}>
                <td className="font-mono">{d.peak_date}</td>
                <td className="font-mono">{d.trough_date}</td>
                <td className="font-mono">{d.recovery_date || "—"}</td>
                <td className="text-red-400">{(d.max_drawdown * 100).toFixed(1)}%</td>
                <td>{d.peak_to_trough_days}</td>
                <td>{d.recovery_days ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2 className="font-medium mb-3">Strategy vs buy &amp; hold</h2>
        <table className="data">
          <thead><tr>
            <th>Strategy</th><th>CAGR</th><th>Vol</th><th>Sharpe</th>
            <th>Sortino</th><th>Max DD</th><th>Win rate</th>
          </tr></thead>
          <tbody>
            {(perf ?? []).map((p) => (
              <tr key={p.strategy}>
                <td>{p.strategy}</td>
                <td>{(p.cagr * 100).toFixed(1)}%</td>
                <td>{(p.volatility_ann * 100).toFixed(1)}%</td>
                <td>{p.sharpe.toFixed(2)}</td>
                <td>{p.sortino.toFixed(2)}</td>
                <td className="text-red-400">{(p.max_drawdown * 100).toFixed(1)}%</td>
                <td>{(p.win_rate_invested * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
