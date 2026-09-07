import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/Card";

const SAMPLES = [
  "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 10",
  "SELECT ticker, n_buy, n_sell, net_signed_usd, consensus FROM ticker_consensus ORDER BY net_signed_usd DESC LIMIT 20",
  "SELECT sector, AVG(weight) AS avg_weight FROM sector_weights WHERE quarter = (SELECT MAX(quarter) FROM sector_weights) GROUP BY sector ORDER BY avg_weight DESC",
  "SELECT type, COUNT(*) AS n, AVG(duration_days) AS avg_days FROM crypto_cycles GROUP BY type",
];

export default function Database() {
  const [sql, setSql] = useState(SAMPLES[0]);
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const { data: tables } = useQuery({ queryKey: ["tables"], queryFn: api.tables });

  function runQuery() {
    setError(null);
    const t0 = performance.now();
    api.query(sql)
      .then((r) => { setResult(r); setElapsed(performance.now() - t0); })
      .catch((e) => { setError(String(e)); setResult(null); setElapsed(null); });
  }

  const cols = result && result.length ? Object.keys(result[0]) : [];

  function exportCsv() {
    if (!result || !result.length) return;
    const csv = [cols.join(","), ...result.map((r) => cols.map((c) => r[c] ?? "").join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "query.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Database</span> Browser
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Read-only SQL console. SELECT only; results capped at 1000 rows.
        </p>
      </header>

      <div className="grid grid-cols-4 gap-4">
        <Card title="Tables" className="col-span-1">
          <div className="space-y-1">
            {(tables ?? []).map((t) => (
              <button
                key={t.name}
                onClick={() => setSql(`SELECT * FROM ${t.name} LIMIT 100`)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm
                           text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <span className="font-mono text-xs">{t.name}</span>
                <span className="text-[11px] text-slate-500 tabular-nums">{t.rows.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </Card>

        <div className="col-span-3 space-y-4">
          <Card
            title="Query"
            actions={
              <div className="flex gap-2">
                <button className="btn-primary" onClick={runQuery}>▶ Run</button>
                <button className="btn" onClick={exportCsv} disabled={!result || !result.length}>
                  ↓ Export CSV
                </button>
              </div>
            }
          >
            <textarea
              className="input w-full font-mono text-sm h-28 resize-y"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runQuery(); }
              }}
            />
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
              <span>Press <span className="kbd">⌘</span><span className="kbd">↵</span> to run</span>
              {elapsed !== null && <span className="font-mono">{elapsed.toFixed(0)} ms · {result?.length ?? 0} rows</span>}
            </div>
          </Card>

          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s, i) => (
              <button key={i} className="btn text-xs" onClick={() => setSql(s)}>
                Sample {i + 1}
              </button>
            ))}
          </div>

          <Card title="Results">
            {error && <div className="text-rose-400 text-sm font-mono p-2">{error}</div>}
            {result && result.length === 0 && <div className="text-slate-500 text-sm py-4 text-center">0 rows</div>}
            {result && result.length > 0 && (
              <div className="max-h-[28rem] overflow-auto scrollbar-thin">
                <table className="data">
                  <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {result.map((row, i) => (
                      <tr key={i}>
                        {cols.map((c) => <td key={c} className="font-mono text-xs">{String(row[c] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!result && !error && (
              <div className="text-slate-600 text-sm py-8 text-center">
                Run a query to see results.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
