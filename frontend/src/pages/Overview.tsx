import { useQuery } from "@tanstack/react-query";
import { api, PipelineRun } from "../lib/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { TableSkeleton, EmptyState } from "../components/Skeleton";

const PIPELINES = ["CryptoCycle", "HedgeFund13F", "CongressTrades"];

const PIPELINE_META: Record<string, { label: string; source: string; accent: "blue" | "emerald" | "amber" | "rose" | "violet"; bar: string }> = {
  CryptoCycle:     { label: "Crypto Cycle",     source: "Massive · BTC, SPY",       accent: "amber",  bar: "from-amber-300 to-orange-400" },
  HedgeFund13F:    { label: "Hedge Fund 13F",   source: "Dataroma + Massive SIC",   accent: "blue",   bar: "from-sky-300 to-blue-400" },
  CongressTrades:  { label: "Congress Trades",  source: "Capitol Trades + Massive", accent: "violet", bar: "from-fuchsia-300 to-violet-400" },
};

const QUOTE_TINT: Record<string, { text: string; tile: string }> = {
  "X:BTCUSD": { text: "text-amber-200",  tile: "bg-amber-400/15 border-amber-300/35" },
  SPY:        { text: "text-sky-200",    tile: "bg-sky-400/15 border-sky-300/35" },
  QQQ:        { text: "text-fuchsia-200", tile: "bg-fuchsia-400/15 border-fuchsia-300/35" },
  IWM:        { text: "text-emerald-200", tile: "bg-emerald-400/15 border-emerald-300/35" },
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
  const allFresh = PIPELINES.every((p) => freshness(latest.get(p)?.status ?? "FAILED", latest.get(p)?.started_at ?? "1970") === "ok");

  return (
    <div className="space-y-8 max-w-7xl">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-in">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300 mb-2">Live operations</p>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">Trading Desk</span>{" "}
            <span className="text-white">Overview</span>
          </h1>
          <p className="text-slate-200 text-sm mt-2 max-w-xl">
            Pipeline health, Massive market tape, and recent activity. Status chips refresh every 5s.
          </p>
        </div>
        <div className="text-right text-sm text-slate-200">
          <div className="text-2xl font-bold text-white tabular-nums">{(runs ?? []).length}</div>
          <div className="text-sky-200/80">runs tracked</div>
          <div className="mt-1 text-xs text-slate-300">3 modules · 1 operator</div>
        </div>
      </header>

      <section className="panel p-5 animate-fade-in delay-1">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wider text-sky-200 font-semibold">Massive tape</span>
            {massive?.ok ? (
              <span className="chip-ok"><span className="dot-ok" />Connected</span>
            ) : massive?.configured ? (
              <span className="chip-warn"><span className="dot-warn" />Key set · request failed</span>
            ) : (
              <span className="chip-err"><span className="dot-err" />Not configured</span>
            )}
            <span className="text-xs text-slate-300">{massive?.detail ?? "checking…"}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(quotes ?? []).map((q) => {
            const tint = QUOTE_TINT[q.ticker] ?? { text: "text-white", tile: "bg-white/[0.06] border-white/15" };
            return (
              <div key={q.ticker} className={`rounded-xl border px-4 py-3 hover:-translate-y-0.5 transition-all duration-200 ${tint.tile}`}>
                <div className="text-[10px] uppercase tracking-wider text-slate-200">{q.ticker.replace("X:", "")}</div>
                <div className={`mt-1 font-mono text-xl font-semibold tabular-nums ${tint.text}`}>
                  {q.close != null ? q.close.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard className="animate-fade-in delay-1" label="Active modules" value={PIPELINES.length} sub="of 3 tracked" accent="blue" />
        <StatCard className="animate-fade-in delay-2" label="Successful runs" value={succeeded} sub={`${failed} failed`} trend={failed === 0 ? "up" : "down"} accent={failed === 0 ? "emerald" : "rose"} />
        <StatCard className="animate-fade-in delay-3" label="Rows produced" value={totalRows.toLocaleString()} sub="across all runs" trend="up" accent="violet" />
        <StatCard className="animate-fade-in delay-4" label="Data freshness" value={allFresh ? "Fresh" : "Stale"} sub="last 24h" accent={allFresh ? "emerald" : "amber"} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {PIPELINES.map((p, i) => {
          const r = latest.get(p);
          const meta = PIPELINE_META[p];
          const fresh = r ? freshness(r.status, r.started_at) : "err";
          const freshChip =
            fresh === "ok" ? <span className="chip-ok"><span className="dot-ok" />Fresh</span> :
            fresh === "warn" ? <span className="chip-warn"><span className="dot-warn" />Stale</span> :
            <span className="chip-err"><span className="dot-err" />Down</span>;
          return (
            <div key={p} className={`panel-hover p-5 relative overflow-hidden animate-fade-in ${["delay-1", "delay-2", "delay-3"][i]}`}>
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.bar}`} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold text-white">{meta.label}</div>
                  <div className="text-[11px] text-slate-300 mt-1">{meta.source}</div>
                </div>
                {freshChip}
              </div>
              <dl className="mt-5 text-sm space-y-2.5">
                <div className="flex justify-between">
                  <dt className="text-slate-300">Last run</dt>
                  <dd className="font-mono text-slate-100">{r?.started_at ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-300">Status</dt>
                  <dd>{r ? statusChip(r.status) : <span className="chip-err">NEVER RUN</span>}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-300">Rows</dt>
                  <dd className="tabular-nums text-white font-medium">{r?.rows_produced?.toLocaleString() ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-300">Trigger</dt>
                  <dd className="text-sky-200">{r?.triggered_by ?? "—"}</dd>
                </div>
              </dl>
              <button
                className="btn-primary w-full mt-5 justify-center"
                onClick={() => api.triggerRun(p).then(() => alert(`Triggered ${meta.label}`)).catch((e) => alert(`Failed: ${e}`))}
              >
                ▶ Run now
              </button>
            </div>
          );
        })}
      </section>

      <Card title="Recent runs" subtitle="Last 20 across all modules" className="animate-fade-in delay-3">
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
                  <td className="font-medium text-white">{PIPELINE_META[r.pipeline]?.label ?? r.pipeline}</td>
                  <td>{statusChip(r.status)}</td>
                  <td className="font-mono text-xs text-slate-200">{r.started_at}</td>
                  <td className="font-mono text-xs text-slate-200">{r.ended_at ?? "—"}</td>
                  <td className="tabular-nums text-white">{r.rows_produced?.toLocaleString() ?? "—"}</td>
                  <td className="text-rose-300 text-xs max-w-xs truncate">{r.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
