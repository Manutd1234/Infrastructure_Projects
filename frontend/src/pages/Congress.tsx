import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../lib/api";

export default function Congress() {
  const [ticker, setTicker] = useState("");
  const [party, setParty] = useState("");

  const { data: trades } = useQuery({
    queryKey: ["trades", ticker, party],
    queryFn: () => api.trades({ ticker: ticker || undefined, party: party || undefined, limit: 100 }),
  });
  const { data: consensus } = useQuery({ queryKey: ["consensus"], queryFn: api.consensus });
  const { data: monthly } = useQuery({ queryKey: ["monthlyConsensus"], queryFn: api.monthlyConsensus });
  const { data: committees } = useQuery({ queryKey: ["committees"], queryFn: api.committees });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Congress Trading</h1>
        <p className="text-desk-muted text-sm">
          Trades scraped from Capitol Trades. Consensus by net signed USD; committee alignment
          flags trades in sectors a politician's committee oversees.
        </p>
      </header>

      <section className="panel">
        <h2 className="font-medium mb-3">Trade feed</h2>
        <div className="flex gap-3 mb-3">
          <input
            className="btn" placeholder="Ticker (e.g. AAPL)"
            value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
          />
          <select className="btn" value={party} onChange={(e) => setParty(e.target.value)}>
            <option value="">All parties</option>
            <option value="Democrat">Democrat</option>
            <option value="Republican">Republican</option>
          </select>
        </div>
        <table className="data">
          <thead><tr>
            <th>Traded</th><th>Politician</th><th>Party</th><th>Ticker</th>
            <th>Issuer</th><th>Type</th><th>Size (USD)</th><th>Sector</th><th>Aligned</th>
          </tr></thead>
          <tbody>
            {(trades ?? []).map((t) => (
              <tr key={t.trade_id}>
                <td className="font-mono">{t.traded}</td>
                <td>{t.politician}</td>
                <td>{t.party}</td>
                <td className="font-mono">{t.ticker}</td>
                <td>{t.issuer}</td>
                <td className={t.trade_type === "sell" ? "text-red-400" : "text-emerald-400"}>
                  {t.trade_type}
                </td>
                <td className="font-mono">
                  {t.size_low_usd && t.size_high_usd
                    ? `$${(t.size_low_usd / 1e3).toFixed(0)}k–${(t.size_high_usd / 1e3).toFixed(0)}k`
                    : t.size_raw}
                </td>
                <td>{t.sector}</td>
                <td>{t.committee_aligned ? <span className="chip-warn">●</span> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="panel">
          <h2 className="font-medium mb-3">Per-ticker consensus (top by net signed USD)</h2>
          <table className="data">
            <thead><tr><th>Ticker</th><th>Issuer</th><th>Net USD</th><th>n</th><th>Signal</th></tr></thead>
            <tbody>
              {(consensus ?? []).slice(0, 20).map((c) => (
                <tr key={c.ticker}>
                  <td className="font-mono">{c.ticker}</td>
                  <td>{c.issuer}</td>
                  <td className={c.net_signed_usd >= 0 ? "text-emerald-400" : "text-red-400"}>
                    ${c.net_signed_usd.toLocaleString()}
                  </td>
                  <td>{c.n_trades}</td>
                  <td>
                    <span className={
                      c.consensus === "BUY" ? "chip-ok" :
                      c.consensus === "SELL" ? "chip-err" : "chip-warn"
                    }>{c.consensus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2 className="font-medium mb-3">Monthly net signed USD</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(monthly ?? []).map((m) => ({ ...m, net: m.net_signed_usd / 1e6 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" stroke="#94a3b8" angle={-45} textAnchor="end" height={70} />
              <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${v}M`} />
              <Tooltip formatter={(v: number) => `$${(v * 1e6).toLocaleString()}`} />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="net" name="Net signed USD">
                {(monthly ?? []).map((m, i) => (
                  <Cell key={i} fill={m.net_signed_usd >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h2 className="font-medium mb-3">Committee alignment</h2>
        <table className="data">
          <thead><tr><th>Committee</th><th>n trades</th><th>Buy</th><th>Sell</th><th>Politicians</th><th>Size low</th></tr></thead>
          <tbody>
            {(committees ?? []).map((c) => (
              <tr key={c.committee}>
                <td>{c.committee}</td>
                <td>{c.n_trades}</td>
                <td className="text-emerald-400">{c.n_buy}</td>
                <td className="text-red-400">{c.n_sell}</td>
                <td>{c.n_politicians}</td>
                <td className="font-mono">${c.total_size_low_usd.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
