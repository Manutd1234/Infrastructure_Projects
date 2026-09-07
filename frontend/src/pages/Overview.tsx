import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const PIPELINES = ["crypto_bull_cycle", "thirteen_f_filings", "congress_trading"];

const PIPELINE_LABEL: Record<string, string> = {
  crypto_bull_cycle: "Crypto Bull Cycle",
  thirteen_f_filings: "13F Filings",
  congress_trading: "Congress Trading",
};

function statusChip(status: string) {
  if (status === "SUCCEEDED") return <span className="chip-ok">● SUCCEEDED</span>;
  if (status === "RUNNING") return <span className="chip-warn">● RUNNING</span>;
  if (status === "FAILED") return <span className="chip-err">● FAILED</span>;
  return <span className="chip">{status}</span>;
}

function latestPerPipeline(runs: Awaited<ReturnType<typeof api.runs>>) {
  const map = new Map<string, (typeof runs)[number]>();
  for (const r of runs) {
    if (!map.has(r.pipeline)) map.set(r.pipeline, r);
  }
  return map;
}

export default function Overview() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: api.runs,
    refetchInterval: 5_000,
  });

  if (isLoading) return <div className="text-desk-muted">Loading…</div>;
  const latest = latestPerPipeline(runs ?? []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-desk-muted text-sm">
          Pipeline health and recent runs. Status chips refresh every 5s.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        {PIPELINES.map((p) => {
          const r = latest.get(p);
          return (
            <div key={p} className="panel">
              <div className="flex items-center justify-between">
                <div className="font-medium">{PIPELINE_LABEL[p]}</div>
                {r ? statusChip(r.status) : <span className="chip-err">● NEVER RUN</span>}
              </div>
              <dl className="mt-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-desk-muted">Last run</dt>
                  <dd className="font-mono">{r?.started_at ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-desk-muted">Rows</dt>
                  <dd>{r?.rows_produced ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-desk-muted">Triggered by</dt>
                  <dd>{r?.triggered_by ?? "—"}</dd>
                </div>
              </dl>
              <button
                className="btn-primary mt-4 w-full"
                onClick={() => api.triggerRun(p).then(() => alert(`Triggered ${p}`))}
              >
                Run now
              </button>
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h2 className="font-medium mb-3">Recent runs</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Pipeline</th><th>Status</th><th>Started</th><th>Ended</th>
              <th>Rows</th><th>Error</th>
            </tr>
          </thead>
          <tbody>
            {(runs ?? []).slice(0, 20).map((r) => (
              <tr key={r.id}>
                <td>{PIPELINE_LABEL[r.pipeline] ?? r.pipeline}</td>
                <td>{statusChip(r.status)}</td>
                <td className="font-mono">{r.started_at}</td>
                <td className="font-mono">{r.ended_at ?? "—"}</td>
                <td>{r.rows_produced ?? "—"}</td>
                <td className="text-red-400 text-xs">{r.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
