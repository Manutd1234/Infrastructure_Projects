import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Database() {
  const [sql, setSql] = useState("SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 10");
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: tables } = useQuery({ queryKey: ["tables"], queryFn: api.tables });

  function runQuery() {
    setError(null);
    api.query(sql)
      .then((r) => setResult(r))
      .catch((e) => { setError(String(e)); setResult(null); });
  }

  const cols = result && result.length ? Object.keys(result[0]) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Database</h1>
        <p className="text-desk-muted text-sm">
          Read-only SQL browser. SELECT only; results capped at 1000 rows.
        </p>
      </header>

      <section className="panel">
        <h2 className="font-medium mb-3">Tables</h2>
        <table className="data">
          <thead><tr><th>Table</th><th>Rows</th></tr></thead>
          <tbody>
            {(tables ?? []).map((t) => (
              <tr key={t.name}>
                <td className="font-mono">{t.name}</td>
                <td>{t.rows.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2 className="font-medium mb-3">Query</h2>
        <textarea
          className="w-full bg-desk-bg border border-desk-border rounded p-3 font-mono text-sm h-24"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <button className="btn-primary" onClick={runQuery}>Run</button>
          <button
            className="btn"
            onClick={() => {
              const csv = result && result.length
                ? [Object.keys(result[0]).join(","), ...result.map((r) => Object.values(r).join(","))].join("\n")
                : "";
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "query.csv"; a.click();
            }}
            disabled={!result || !result.length}
          >
            Export CSV
          </button>
        </div>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        {result && (
          <table className="data mt-3">
            <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {result.map((row, i) => (
                <tr key={i}>{cols.map((c) => <td key={c} className="font-mono">{String(row[c] ?? "")}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
