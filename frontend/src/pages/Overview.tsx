import { useQuery } from "@tanstack/react-query";
import { api, PipelineRun } from "../lib/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { TableSkeleton, EmptyState } from "../components/Skeleton";

const PIPELINES = ["CryptoCycle", "HedgeFund13F", "CongressTrades"];

const PIPELINE_META: Record<string, { label: string; source: string; accent: "blue" | "emerald" | "amber" | "rose" | "violet" }> = {
  CryptoCycle:     { label: "Crypto Cycle",     source: "Massive · BTC, SPY",     accent: "amber" },
  HedgeFund13F:    { label: "Hedge Fund 13F",   source: "Dataroma + Massive SIC", accent: "blue" },
  CongressTrades:  { label: "Congress Trades",  source: "Capitol Trades + Massive", accent: "violet" },
};

function statusChip(status: string) {
  if (status === "SUCCEEDED") return <span className="chip-ok"><span className="dot-ok" />SUCCEEDED</span>;
  if (status === "RUNNING")   return <span className="chip-warn"><span className="dot-warn animate-pulse-soft" />RUNNING</span>;
  if (status === "FAILED")    return <span className="chip-err"><span className="dot-err" />FAILED</span>;
  return <span className="chip-mute">{status}</span>;
}

function latestPerPipeline(runs: PipelineRun[]) {
  const map = new Map<string, PipelineRun>();
  for (const r of runs) if (!map.has(r.pipeline)) map.set(r.pipeline, r);
  return map;
}

function freshness(status: string, startedAt: string): "ok" | "warn" | "err" {
  if (status !== "SUCCEEDED") return status === "FAILED" ? "err" : "warn";
  const ageHrs = (Date.now() - new Date(startedAt).getTime()) / 36e5;
  if (ageHrs < 24) return "ok";
  if (ageHrs < 48) return "warn";
  return "err";
}

export default function Overview() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: api.runs,
    refetchInterval: 5_000,
  });

  const { data: massive } = useQuery({
    queryKey: ["massive"],
    queryFn: api.marketStatus,
    refetchInterval: 30_000,
  });
  const { data: quotes } = useQuery({
    queryKey: ["quotes"],
    queryFn: api.quotes,
    refetchInterval: 30_000,
  });

  const latest = latestPerPipeline(runs ?? []);
  const succeeded = (runs ?? []).filter((r) => r.status === "SUCCEEDED").length;
  const failed = (runs ?? []).filter((r) => r.status === "FAILED").length;
  const totalRows = (runs ?? []).reduce((s, r) => s + (r.rows_produced ?? 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Trading Desk</span> Overview
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pipeline health, Massive market tape, and recent activity. Status chips refresh every 5s.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <div>{(runs ?? []).length} total runs tracked</div>
          <div className="mt-0.5">3 modules · 1 operator</div>
        </div>
      </header>

      <section className="panel p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Massive</span>
          {massive?.ok ? (
            <span className="chip-ok"><span className="dot-ok" />Connected</span>
          ) : massive?.configured ? (
            <span className="chip-warn"><span className="dot-warn" />Key set · request failed</span>
          ) : (
            <span className="chip-err"><span className="dot-err" />Not configured</span>
          )}
          <span className="text-xs text-slate-500">{massive?.detail ?? "checking…"}</span>
        </div>
        <div className="flex items-center gap-4 overflow-x-auto">
          {(quotes ?? []).map((q) => (
            <div key={q.ticker} className="text-right min-w-[5.5rem]">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">{q.ticker.replace("X:", "")}</div>
              <div className="font-mono text-sm text-slate-100 tabular-nums">
                {q.close != null ? q.close.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* KPI strip */}
      <section className="grid grid-cols-4 gap-4">
        <StatCard label="Active modules" value={PIPELINES.length} sub="of 3 tracked" accent="blue" />
        <StatCard label="Successful runs" value={succeeded} sub={`${failed} failed`} trend={failed === 0 ? "up" : "down"} accent={failed === 0 ? "emerald" : "rose"} />
        <StatCard label="Rows produced" value={totalRows.toLocaleString()} sub="across all runs" trend="up" accent="violet" />
        <StatCard
          label="Data freshness"
          value={PIPELINES.every((p) => freshness(latest.get(p)?.status ?? "FAILED", latest.get(p)?.started_at ?? "1970") === "ok") ? "Fresh" : "Stale"}
          sub="last 24h"
          accent={PIPELINES.every((p) => freshness(latest.get(p)?.status ?? "FAILED", latest.get(p)?.started_at ?? "1970") === "ok") ? "emerald" : "amber"}
        />
      </section>

      {/* Pipeline cards */}
      <section className="grid grid-cols-3 gap-4">
        {PIPELINES.map((p) => {
          const r = latest.get(p);
          const meta = PIPELINE_META[p];
          const fresh = r ? freshness(r.status, r.started_at) : "err";
          const freshChip =
            fresh === "ok" ? <span className="chip-ok"><span className="dot-ok" />Fresh</span> :
            fresh === "warn" ? <span className="chip-warn"><span className="dot-warn" />Stale</span> :
            <span className="chip-err"><span className="dot-err" />Down</span>;
          return (
            <div key={p} className="panel-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{meta.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{meta.source}</div>
                </div>
                {freshChip}
              </div>
              <dl className="mt-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Last run</dt>
                  <dd className="font-mono text-slate-300">{r?.started_at ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd>{r ? statusChip(r.status) : <span className="chip-err">NEVER RUN</span>}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Rows</dt>
                  <dd className="tabular-nums">{r?.rows_produced?.toLocaleString() ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Trigger</dt>
                  <dd className="text-slate-400">{r?.triggered_by ?? "—"}</dd>
                </div>
              </dl>
              <button
                className="btn-primary w-full mt-4 justify-center"
                onClick={() => api.triggerRun(p).then(() => alert(`Triggered ${meta.label}`)).catch((e) => alert(`Failed: ${e}`))}
              >
                ▶ Run now
              </button>
            </div>
          );
        })}
      </section>

      {/* Recent runs */}
      <Card title="Recent runs" subtitle="Last 20 across all modules">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (runs ?? []).length === 0 ? (
          <EmptyState title="No runs yet" hint="Run a module to populate this table." />
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Module</th><th>Status</th><th>Started</th><th>Ended</th>
                <th>Rows</th><th>Error</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).slice(0, 20).map((r) => (
                <tr key={r.id}>
                  <td className="font-medium text-slate-200">{PIPELINE_META[r.pipeline]?.label ?? r.pipeline}</td>
                  <td>{statusChip(r.status)}</td>
                  <td className="font-mono text-xs">{r.started_at}</td>
                  <td className="font-mono text-xs">{r.ended_at ?? "—"}</td>
                  <td className="tabular-nums">{r.rows_produced?.toLocaleString() ?? "—"}</td>
                  <td className="text-rose-400 text-xs max-w-xs truncate">{r.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
