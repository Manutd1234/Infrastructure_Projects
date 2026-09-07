import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { colorForSector } from "../lib/colors";
import { TableSkeleton } from "../components/Skeleton";

const axis = { stroke: "#475569", fontSize: 11, tickLine: false, axisLine: false };
const grid = { stroke: "rgba(255,255,255,0.05)", strokeDasharray: "3 3" };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="panel px-3 py-2 text-xs max-w-xs">
      <div className="text-slate-300 font-medium mb-1.5">{label}</div>
      {payload.sort((a: any, b: any) => b.value - a.value).map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-400">{p.dataKey}</span>
          </span>
          <span className="font-mono text-slate-200">{(p.value || 0).toFixed(1)}%</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 mt-1.5 pt-1.5 border-t border-white/10">
        <span className="text-slate-500">Total</span>
        <span className="font-mono text-slate-300">{total.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function Filings() {
  const [fund, setFund] = useState<string>("");
  const { data: funds } = useQuery({ queryKey: ["funds"], queryFn: api.funds });
  const { data: weights, isLoading } = useQuery({
    queryKey: ["sectorWeights", fund],
    queryFn: () => api.sectorWeights(fund || undefined),
  });

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
  const latest = quarters[quarters.length - 1];
  const latestRows = (weights ?? [])
    .filter((w) => w.quarter === latest)
    .sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">13F Filings</span> — Sector Rotation
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Top-20 holdings per quarter for 8 superinvestor funds, classified into GICS sectors.
          </p>
        </div>
        <select
          className="input min-w-[14rem]"
          value={fund}
          onChange={(e) => setFund(e.target.value)}
        >
          <option value="">All funds (aggregate)</option>
          {(funds ?? []).map((f) => (
            <option key={f.code} value={f.code}>{f.name}</option>
          ))}
        </select>
      </header>

      <Card
        title="Sector rotation over time"
        subtitle={fund ? `Single-fund view · ${quarters.length} quarters` : `Aggregate across 8 funds · ${quarters.length} quarters`}
      >
        {isLoading ? <TableSkeleton rows={6} cols={8} /> : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="quarter" {...axis} angle={-45} textAnchor="end" interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => `${v}%`} {...axis} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend wrapperStyle={{ fontSize: 11, maxHeight: 80, overflowY: "auto" }} />
              {sectors.map((s) => (
                <Bar key={s} dataKey={s} stackId="a" fill={colorForSector(s)} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title={`Latest-quarter sector exposure`} subtitle={latest ? `As of ${latest}` : ""}>
        {isLoading ? <TableSkeleton rows={8} cols={4} /> : (
          <div className="grid grid-cols-2 gap-x-8">
            <table className="data">
              <thead><tr><th>Sector</th><th>Weight</th><th>Share</th></tr></thead>
              <tbody>
                {latestRows.slice(0, Math.ceil(latestRows.length / 2)).map((w) => (
                  <tr key={w.sector}>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorForSector(w.sector) }} />
                        {w.sector}
                      </span>
                    </td>
                    <td className="tabular-nums font-medium">{(w.weight * 100).toFixed(2)}%</td>
                    <td className="w-40">
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${w.weight * 100}%`, background: colorForSector(w.sector) }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="data">
              <thead><tr><th>Sector</th><th>Weight</th><th>Share</th></tr></thead>
              <tbody>
                {latestRows.slice(Math.ceil(latestRows.length / 2)).map((w) => (
                  <tr key={w.sector}>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorForSector(w.sector) }} />
                        {w.sector}
                      </span>
                    </td>
                    <td className="tabular-nums font-medium">{(w.weight * 100).toFixed(2)}%</td>
                    <td className="w-40">
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${w.weight * 100}%`, background: colorForSector(w.sector) }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
