import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { TableSkeleton, EmptyState } from "../components/Skeleton";

const axis = { stroke: "#475569", fontSize: 11, tickLine: false, axisLine: false };
const grid = { stroke: "rgba(255,255,255,0.05)", strokeDasharray: "3 3" };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2 text-xs">
      <div className="text-slate-300 mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-mono text-slate-100">
            {p.dataKey === "net" ? `$${(p.value * 1e6).toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Congress() {
  const [ticker, setTicker] = useState("");
  const [party, setParty] = useState("");

  const { data: trades, isLoading: lt } = useQuery({
    queryKey: ["trades", ticker, party],
    queryFn: () => api.trades({ ticker: ticker || undefined, party: party || undefined, limit: 100 }),
  });
  const { data: consensus } = useQuery({ queryKey: ["consensus"], queryFn: api.consensus });
  const { data: monthly } = useQuery({ queryKey: ["monthlyConsensus"], queryFn: api.monthlyConsensus });
  const { data: committees } = useQuery({ queryKey: ["committees"], queryFn: api.committees });

  const aligned = (trades ?? []).filter((t) => t.committee_aligned).length;
  const alignedPct = (trades ?? []).length ? (aligned / (trades ?? []).length) * 100 : 0;
  const netUsd = (consensus ?? []).reduce((s, c) => s + (c.net_signed_usd || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Congress</span> Trading
        </h1>
        <p className="text-slate-200 text-sm mt-1">
          Trades scraped from Capitol Trades. Per-ticker consensus by net signed USD; committee alignment flags trades in sectors a politician's committee oversees.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <StatCard label="Trades loaded" value={(trades ?? []).length} sub="in current view" accent="violet" />
        <StatCard label="Committee-aligned" value={`${alignedPct.toFixed(1)}%`} sub={`${aligned} of ${trades?.length ?? 0}`} accent="amber" />
        <StatCard label="Net signed USD" value={`$${(netUsd / 1e6).toFixed(2)}M`} sub="across all tickers" trend={netUsd >= 0 ? "up" : "down"} accent={netUsd >= 0 ? "emerald" : "rose"} />
        <StatCard label="Tickers tracked" value={(consensus ?? []).length} sub="unique issuers" accent="blue" />
      </section>

      <Card
        title="Trade feed"
        subtitle="Most recent 100 trades, filterable"
        actions={
          <div className="flex gap-2">
            <input
              className="input w-32"
              placeholder="Ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
            <select className="input" value={party} onChange={(e) => setParty(e.target.value)}>
              <option value="">All parties</option>
              <option value="Democrat">Democrat</option>
              <option value="Republican">Republican</option>
            </select>
          </div>
        }
      >
        {lt ? <TableSkeleton rows={8} cols={9} /> : (trades ?? []).length === 0 ? (
          <EmptyState title="No trades match these filters" hint="Try clearing the ticker or party filter." />
        ) : (
          <div className="max-h-[28rem] overflow-y-auto scrollbar-thin">
            <table className="data">
              <thead><tr>
                <th>Traded</th><th>Politician</th><th>Party</th><th>Ticker</th>
                <th>Issuer</th><th>Type</th><th>Size</th><th>Sector</th><th>Aligned</th>
              </tr></thead>
              <tbody>
                {(trades ?? []).map((t) => (
                  <tr key={t.trade_id}>
                    <td className="font-mono text-xs">{t.traded}</td>
                    <td className="text-slate-200">{t.politician}</td>
                    <td><span className="chip-mute">{t.party}</span></td>
                    <td className="font-mono text-slate-200">{t.ticker}</td>
                    <td className="text-slate-400">{t.issuer}</td>
                    <td>
                      <span className={t.trade_type === "sell" ? "chip-err" : "chip-ok"}>{t.trade_type}</span>
                    </td>
                    <td className="font-mono text-xs">
                      {t.size_low_usd && t.size_high_usd
                        ? `$${(t.size_low_usd / 1e3).toFixed(0)}k–${(t.size_high_usd / 1e3).toFixed(0)}k`
                        : t.size_raw}
                    </td>
                    <td className="text-slate-400 text-xs">{t.sector}</td>
                    <td>{t.committee_aligned ? <span className="chip-warn" title={t.matching_committees}>●</span> : <span className="text-slate-700">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Per-ticker consensus" subtitle="Top 15 by net signed USD">
          <table className="data">
            <thead><tr><th>Ticker</th><th>Issuer</th><th>Net USD</th><th>n</th><th>Signal</th></tr></thead>
            <tbody>
              {(consensus ?? []).slice(0, 15).map((c) => (
                <tr key={c.ticker}>
                  <td className="font-mono text-slate-200">{c.ticker}</td>
                  <td className="text-slate-400">{c.issuer}</td>
                  <td className={`tabular-nums font-medium ${c.net_signed_usd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ${c.net_signed_usd.toLocaleString()}
                  </td>
                  <td className="tabular-nums">{c.n_trades}</td>
                  <td>
                    <span className={c.consensus === "BUY" ? "chip-ok" : c.consensus === "SELL" ? "chip-err" : "chip-mute"}>
                      {c.consensus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Monthly net signed USD" subtitle="Congress net buy (green) vs net sell (red), in millions">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(monthly ?? []).map((m) => ({ ...m, net: m.net_signed_usd / 1e6 }))} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid {...grid} />
              <XAxis dataKey="month" {...axis} angle={-45} textAnchor="end" interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => `$${v}M`} {...axis} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <ReferenceLine y={0} stroke="#334155" />
              <Bar dataKey="net" name="Net signed USD" radius={[3, 3, 0, 0]}>
                {(monthly ?? []).map((m, i) => (
                  <Cell key={i} fill={m.net_signed_usd >= 0 ? "#34d399" : "#fb7185"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Committee alignment" subtitle="Trades in sectors a politician's committee oversees">
        <table className="data">
          <thead><tr><th>Committee</th><th>Trades</th><th>Buy</th><th>Sell</th><th>Politicians</th><th>Size low</th></tr></thead>
          <tbody>
            {(committees ?? []).map((c) => (
              <tr key={c.committee}>
                <td className="text-slate-200">{c.committee}</td>
                <td className="tabular-nums">{c.n_trades}</td>
                <td className="tabular-nums text-emerald-400">{c.n_buy}</td>
                <td className="tabular-nums text-rose-400">{c.n_sell}</td>
                <td className="tabular-nums">{c.n_politicians}</td>
                <td className="font-mono text-xs">${c.total_size_low_usd.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
