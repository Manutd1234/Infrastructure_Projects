import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../lib/api";

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3b82f6", Financials: "#22c55e", Healthcare: "#ef4444",
  "Consumer Discretionary": "#eab308", "Consumer Staples": "#a855f7",
  "Communication Services": "#06b6d4", Industrials: "#f97316",
  Energy: "#84cc16", Materials: "#ec4899", "Real Estate": "#14b8a6",
  Utilities: "#64748b", Unknown: "#475569",
};

export default function Filings() {
  const [fund, setFund] = useState<string>("");
  const { data: funds } = useQuery({ queryKey: ["funds"], queryFn: api.funds });
  const { data: weights } = useQuery({
    queryKey: ["sectorWeights", fund],
    queryFn: () => api.sectorWeights(fund || undefined),
  });

  // pivot to quarter × sector for the stacked bar
  const quarters = Array.from(new Set((weights ?? []).map((w) => w.quarter))).sort();
  const sectors = Array.from(new Set((weights ?? []).map((w) => w.sector)));
  const chartData = quarters.map((q) => {
    const row: Record<string, string | number> = { quarter: q };
    for (const s of sectors) {
      const w = weights?.find((x) => x.quarter === q && x.sector === s);
      row[s] = w ? +(w.weight * 100).toFixed(2) : 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">13F Filings — Sector Rotation</h1>
          <p className="text-desk-muted text-sm">
            Top-20 holdings per quarter for 8 superinvestor funds, classified into GICS sectors.
          </p>
        </div>
        <select
          className="btn"
          value={fund}
          onChange={(e) => setFund(e.target.value)}
        >
          <option value="">All funds (aggregate)</option>
          {(funds ?? []).map((f) => (
            <option key={f.code} value={f.code}>{f.name}</option>
          ))}
        </select>
      </header>

      <section className="panel">
        <h2 className="font-medium mb-3">Sector rotation over time</h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="quarter" stroke="#94a3b8" angle={-45} textAnchor="end" height={70} />
            <YAxis stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
            <Tooltip />
            <Legend />
            {sectors.map((s) => (
              <Bar key={s} dataKey={s} stackId="a" fill={SECTOR_COLORS[s] ?? "#475569"} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <h2 className="font-medium mb-3">Latest-quarter sector exposure</h2>
        <table className="data">
          <thead><tr><th>Fund</th><th>Quarter</th><th>Sector</th><th>Weight</th></tr></thead>
          <tbody>
            {(weights ?? [])
              .filter((w) => w.quarter === quarters[quarters.length - 1])
              .sort((a, b) => b.weight - a.weight)
              .map((w, i) => (
                <tr key={i}>
                  <td>{w.fund}</td>
                  <td className="font-mono">{w.quarter}</td>
                  <td>{w.sector}</td>
                  <td>{(w.weight * 100).toFixed(2)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
