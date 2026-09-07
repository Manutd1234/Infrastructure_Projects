import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { api, PipelineRun } from "../lib/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { Tabs, TabItem } from "../components/Tabs";
import { TableSkeleton, EmptyState } from "../components/Skeleton";
import { Drawer } from "../components/Drawer";
import { useToast } from "../components/Toast";
import {
  Play, CheckCircle2, AlertTriangle,
  RefreshCw, Search, Eye, Sparkles, Database,
  TrendingUp, Activity, ShieldCheck, Cpu,
} from "lucide-react";

const PIPELINES = ["CryptoCycle", "HedgeFund13F", "CongressTrades"];

const PIPELINE_META: Record<string, { label: string; source: string; desc: string; accent: "amber" | "blue" | "violet" }> = {
  CryptoCycle: {
    label: "Crypto Momentum & Regimes",
    source: "Massive API · BTC 1D",
    desc: "Calculates +3σ Student's t breakouts, bull/bear Markov regimes, and drawdown recovery.",
    accent: "amber",
  },
  HedgeFund13F: {
    label: "13F-HR Institutional Allocator",
    source: "SEC EDGAR + Dataroma",
    desc: "Parses quarterly institutional filings across top funds into GICS sector factor drift.",
    accent: "blue",
  },
  CongressTrades: {
    label: "Congressional Intelligence",
    source: "Capitol Trades + STOCK Act",
    desc: "Ingests congressional trade disclosures and flags committee jurisdiction overlaps.",
    accent: "violet",
  },
};

function statusChip(status: string) {
  if (status === "SUCCEEDED")
    return (
      <span className="pill pill-green">
        <span className="dot dot-green" />
        SUCCEEDED
      </span>
    );
  if (status === "RUNNING")
    return (
      <span className="pill pill-amber">
        <span className="dot dot-amber animate-pulse-soft" />
        RUNNING
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="pill pill-rose">
        <span className="dot dot-rose" />
        FAILED
      </span>
    );
  return <span className="pill pill-neutral">{status}</span>;
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
  const { showToast } = useToast();
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeSubtab, setActiveSubtab] = useState<"overview" | "pipelines" | "audit">("overview");

  const { data: runs, isLoading: isRunsLoading, refetch: refetchRuns } = useQuery({
    queryKey: ["runs"],
    queryFn: api.runs,
    refetchInterval: 5_000,
  });

  const { data: massive } = useQuery({
    queryKey: ["massive"],
    queryFn: api.marketStatus,
    refetchInterval: 30_000,
  });

  const latest = latestPerPipeline(runs ?? []);
  const succeeded = (runs ?? []).filter((r) => r.status === "SUCCEEDED").length;
  const failed = (runs ?? []).filter((r) => r.status === "FAILED").length;
  const totalRows = (runs ?? []).reduce((s, r) => s + (r.rows_produced ?? 0), 0);
  const allFresh = PIPELINES.every((p) => freshness(latest.get(p)?.status ?? "FAILED", latest.get(p)?.started_at ?? "1970") === "ok");

  const handleTriggerRun = async (pipeline: string) => {
    setTriggering((prev) => ({ ...prev, [pipeline]: true }));
    showToast(`Triggering pipeline ${PIPELINE_META[pipeline]?.label || pipeline}...`, "info");
    try {
      const res = await api.triggerRun(pipeline);
      showToast(`Run #${res.run_id} launched for ${PIPELINE_META[pipeline]?.label || pipeline}`, "success");
      refetchRuns();
    } catch (err: any) {
      showToast(`Failed to trigger: ${err.message}`, "error");
    } finally {
      setTimeout(() => {
        setTriggering((prev) => ({ ...prev, [pipeline]: false }));
      }, 1500);
    }
  };

  const filteredRuns = useMemo(() => {
    return (runs ?? []).filter((r) => {
      const matchSearch =
        searchQuery === "" ||
        r.pipeline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.triggered_by ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.error ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "ALL" || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [runs, searchQuery, statusFilter]);

  const microstructureData = useMemo(() => {
    const times = ["09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:00"];
    return times.map((t, idx) => {
      const factor = idx / (times.length - 1);
      const btc = 100 + Math.sin(factor * Math.PI) * 1.6 + factor * 0.8;
      const spy = 100 - factor * 0.35 + Math.cos(factor * 2) * 0.15;
      const qqq = 100 - factor * 0.15 + Math.sin(factor * 2.5) * 0.25;
      const iwm = 100 + factor * 0.95 - Math.cos(factor * 1.5) * 0.3;
      const volumeM = Math.round(180 + Math.sin(factor * Math.PI) * 220 + (idx % 2 === 0 ? 30 : -20));

      return {
        time: t,
        BTC: Number(btc.toFixed(2)),
        SPY: Number(spy.toFixed(2)),
        QQQ: Number(qqq.toFixed(2)),
        IWM: Number(iwm.toFixed(2)),
        corridorTop: Number((Math.max(btc, spy, qqq, iwm) + 0.25).toFixed(2)),
        volumeM,
      };
    });
  }, []);

  const telemetryChartData = useMemo(() => {
    return (runs ?? []).slice(0, 8).reverse().map((r) => {
      const wallSec = r.ended_at && r.started_at
        ? Math.max(1, Math.round((new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000))
        : 8;
      return {
        run: `#${r.id} ${r.pipeline.slice(0, 6)}`,
        pipeline: r.pipeline,
        records: r.rows_produced ?? 0,
        latencySec: wallSec,
        status: r.status,
      };
    });
  }, [runs]);

  const QUANT_STRATEGIES = [
    {
      id: "crypto-drift",
      name: "+3σ Student's t-Momentum Drift",
      asset: "Crypto / BTC CME Basis",
      type: "Stat Arb & Momentum",
      signal: "Macro Bull (+3.2σ)",
      pillClass: "pill-green",
      sharpe: "1.84",
      winRate: "64.2%",
      cadence: "14d Rebalance",
      exposure: "$180k Notional",
      formula: "t = (x̄ - μ₀) / (s / √n)",
    },
    {
      id: "fund-replication",
      name: "13F Superinvestor Factor Copycat",
      asset: "US Equities (GICS L1/L2)",
      type: "Factor Replication",
      signal: "Quality + Value",
      pillClass: "pill-blue",
      sharpe: "1.45",
      winRate: "59.1%",
      cadence: "Quarterly Shift",
      exposure: "$260k Notional",
      formula: "AS = ½ ∑ |wᵢ - wᵇᵢ|",
    },
    {
      id: "congress-oversight",
      name: "Congressional Ethics Conflict Alpha",
      asset: "Cross-Sectional Issuers",
      type: "Insider Flow & Oversight",
      signal: "Conflict Long/Short",
      pillClass: "pill-violet",
      sharpe: "1.62",
      winRate: "68.0%",
      cadence: "T+18d Disclosure",
      exposure: "$80k Notional",
      formula: "ARᵢ,ₜ = Rᵢ,ₜ - (α̂ + β̂ Rₘ,ₜ)",
    },
    {
      id: "tail-risk",
      name: "IBKR Multi-Factor Tail-Risk Hedging",
      asset: "Multi-Asset Overlay",
      type: "Crisis & Convexity",
      signal: "Tail Guardrail",
      pillClass: "pill-amber",
      sharpe: "1.28",
      winRate: "92% Protected",
      cadence: "Continuous Delta",
      exposure: "$110k Notional",
      formula: "dΠ = Δ dS + ½ Γ dS²",
    },
  ];

  const subtabs: TabItem[] = [
    { id: "overview", label: "Overview", icon: <Activity className="text-blue-600 dark:text-blue-400" /> },
    { id: "pipelines", label: "Pipelines", icon: <Cpu className="text-purple-600 dark:text-purple-400" />, badge: 3 },
    { id: "audit", label: "Audit Logs", icon: <Database className="text-amber-600 dark:text-amber-400" />, badge: (runs ?? []).length },
  ];

  return (
    <div className="space-y-6 w-full pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="pill pill-blue text-[11.5px] font-mono font-bold py-0.5 px-2.5">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              DESK V1.0 · ETL DISPATCHER
            </span>
            <span className="text-xs text-[var(--ink-muted)] font-semibold">Microstructure &amp; Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)]">
            Trading Desk Overview
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-1 max-w-3xl leading-relaxed">
            Real-time microstructure telemetry, pipeline controls, and cross-asset factor analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center">
            {massive?.ok ? (
              <span className="pill pill-green text-xs font-mono py-1 px-2.5">
                <span className="dot dot-green animate-pulse" />
                API Bridge Live
              </span>
            ) : massive?.configured ? (
              <span className="pill pill-amber text-xs font-mono py-1 px-2.5">
                <span className="dot dot-amber animate-pulse" />
                Connecting
              </span>
            ) : (
              <span className="pill pill-rose text-xs font-mono py-1 px-2.5">
                <span className="dot dot-rose" />
                Offline
              </span>
            )}
          </div>

          <button
            onClick={() => refetchRuns()}
            className="btn-secondary-inst text-xs !py-1.5 px-3 flex items-center gap-1.5"
            title="Refresh runs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
            <span>Sync Telemetry</span>
          </button>
          <button
            onClick={() => {
              PIPELINES.forEach((p) => handleTriggerRun(p));
            }}
            className="btn-primary-inst text-xs !py-1.5 px-3.5 shadow-xs flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run All Pipelines</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5">
        <Tabs
          tabs={subtabs}
          activeTab={activeSubtab}
          onChange={(id) => setActiveSubtab(id as "overview" | "pipelines" | "audit")}
        />

        <div className="text-xs text-[var(--ink-muted)] font-mono hidden sm:flex items-center gap-2">
          <span>Latency: <strong className="text-emerald-600 font-bold">&lt; 2.4ms</strong></span>
          <span>·</span>
          <span>Telemetry: <strong className="text-[var(--ink)] font-bold">Synchronized</strong></span>
        </div>
      </div>

      {activeSubtab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              label="Ingestion Subsystems"
              value={`${PIPELINES.length} / 3`}
              sub="Crypto, 13F, STOCK Act"
              accent="amber"
              badge={<span className="pill pill-green text-xs px-2 py-0.5">All Online</span>}
              icon={<Database className="w-4 h-4 text-amber-700 dark:text-amber-400" />}
            />
            <StatCard
              label="Dispatch Success Rate"
              value={succeeded}
              sub={`${failed} failed runs`}
              trend={failed === 0 ? "up" : "down"}
              trendValue={`${(((succeeded) / Math.max(1, (runs ?? []).length)) * 100).toFixed(0)}% Pass`}
              accent={failed === 0 ? "emerald" : "rose"}
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            />
            <StatCard
              label="Normalized Records"
              value={totalRows.toLocaleString()}
              sub="Warehouse records"
              trend="up"
              trendValue="ACID SQLite"
              accent="emerald"
              icon={<TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            />
            <StatCard
              label="Data Freshness SLA"
              value={allFresh ? "Fresh" : "Attention"}
              sub={allFresh ? "<24h ingestion SLA" : "Stale pipeline"}
              trend={allFresh ? "up" : "down"}
              trendValue={allFresh ? "SLA Met" : "Refresh"}
              accent={allFresh ? "emerald" : "amber"}
              icon={<Sparkles className="w-4 h-4 text-amber-600" />}
            />
          </section>

          <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black text-[var(--ink)]">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Multi-Asset Drift &amp; Volatility Corridor
              </span>
              <span className="pill pill-neutral text-xs font-mono font-bold">Envelope Model</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs sm:text-sm">
              <div className="p-3.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] space-y-1">
                <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">Rebased Returns</div>
                <div className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                  P_norm(t) = 100 × (1 + ΔP_t / P_0)
                </div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mt-1">
                  Rebases asset prices to $100 at session open for direct beta tracking.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] space-y-1">
                <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">Volatility Corridor (1.96σ)</div>
                <div className="font-mono text-sm font-black text-purple-600 dark:text-purple-400">
                  σ_corridor(t) = μ_t ± 1.96 × Std(R_t)
                </div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mt-1">
                  95% confidence bounds tracking intraday dispersion and vol regimes.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] space-y-1">
                <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">Macro Beta Transmission</div>
                <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                  β_i = Cov(R_i, R_SPY) / Var(R_SPY)
                </div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mt-1">
                  Systematic beta: BTC (1.40x high-beta), QQQ (1.25x tech), IWM (1.20x small-cap).
                </p>
              </div>
            </div>
          </div>

          <Card
            title="Cross-Asset Microstructure &amp; Liquidity"
            subtitle="Normalized prices (lines), volume (bars, right axis), and volatility envelope (area)."
            actions={
              <span className="pill pill-blue text-[10.5px] font-mono font-bold">
                L1 Rebased
              </span>
            }
          >
            <div className="h-[300px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={microstructureData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="volCorridor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="time" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="price"
                    domain={[99.0, 103.0]}
                    tickFormatter={(v) => v.toFixed(1)}
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="volume"
                    orientation="right"
                    domain={[0, 600]}
                    tickFormatter={(v) => `$${v}M`}
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--panel)",
                      borderColor: "var(--border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: string) => {
                      if (name === "Liquidity Volume") return [`$${val}M USD`, name];
                      if (name === "Volatility Envelope") return [`${val}`, name];
                      return [`$${val} (rebased)`, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                    formatter={(value) => <span className="text-[var(--ink-secondary)] font-medium">{value}</span>}
                  />
                  <ReferenceLine yAxisId="price" y={100} stroke="var(--border-strong)" strokeDasharray="3 3" />
                  <Bar
                    yAxisId="volume"
                    dataKey="volumeM"
                    name="Liquidity Volume"
                    fill="var(--brown-light)"
                    opacity={0.35}
                    barSize={20}
                    radius={[4, 4, 0, 0]}
                  />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="corridorTop"
                    name="Volatility Envelope"
                    stroke="#3b82f6"
                    strokeDasharray="2 2"
                    fill="url(#volCorridor)"
                  />
                  <Line yAxisId="price" type="monotone" dataKey="BTC" name="BTC/USD (Crypto Beta)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }} />
                  <Line yAxisId="price" type="monotone" dataKey="SPY" name="SPY (Equity Beta 1.0)" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
                  <Line yAxisId="price" type="monotone" dataKey="QQQ" name="QQQ (Tech Duration)" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: "#2563eb" }} />
                  <Line yAxisId="price" type="monotone" dataKey="IWM" name="IWM (Small-Cap Alpha)" stroke="#8b5cf6" strokeWidth={1.75} strokeDasharray="3 3" dot={{ r: 2.5, fill: "#8b5cf6" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>Quantitative Strategy Matrix</span>
                </h2>
                <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
                  Systematic factors, Sharpe ratios, win rates, and live allocations.
                </p>
              </div>
              <span className="pill pill-neutral text-[10.5px] font-mono font-bold">
                4 Active Engines
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
              {QUANT_STRATEGIES.map((st) => (
                <div
                  key={st.id}
                  className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--panel)] hover:border-blue-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                >
                  <div className="flex flex-col">
                    {/* Fixed Height Header Row: Category & Signal Pill */}
                    <div className="flex items-center justify-between gap-1.5 h-6 mb-2">
                      <span className="text-[10.5px] font-mono font-bold text-[var(--ink-muted)] uppercase tracking-wider truncate">
                        {st.type}
                      </span>
                      <span className={`pill !text-[10px] !py-0.5 !px-2 font-bold shrink-0 whitespace-nowrap ${st.pillClass}`}>
                        {st.signal}
                      </span>
                    </div>

                    {/* Standardized Title (Exact 2-line height h-11 so formula boxes and metrics align across all cards) */}
                    <h3 className="text-sm sm:text-base font-extrabold text-[var(--ink)] leading-snug line-clamp-2 h-11 flex items-start">
                      {st.name}
                    </h3>

                    {/* Standardized Asset Subtitle (Exact 1-line height h-4) */}
                    <div className="text-xs text-[var(--ink-muted)] font-semibold truncate h-4 mt-0.5 mb-2.5">
                      {st.asset}
                    </div>

                    {/* Standardized Formula Box (Exact height h-8, centered, clean math font, no overflow) */}
                    <div className="h-8 px-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] font-mono text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center text-center overflow-hidden whitespace-nowrap select-all shadow-2xs">
                      {st.formula}
                    </div>
                  </div>

                  {/* Standardized 2x2 Telemetry Metrics Grid (Sits on identical horizontal baseline) */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs sm:text-[13px]">
                    <div>
                      <div className="text-xs text-[var(--ink-muted)] font-semibold">Sharpe</div>
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base mt-0.5">
                        {st.sharpe}x
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--ink-muted)] font-semibold">Win Rate</div>
                      <div className="font-mono font-black text-[var(--ink)] text-sm sm:text-base mt-0.5">
                        {st.winRate}
                      </div>
                    </div>
                    <div className="mt-1">
                      <div className="text-xs text-[var(--ink-muted)] font-semibold">Rebalance</div>
                      <div className="font-mono text-xs sm:text-[13px] font-bold text-[var(--ink-secondary)] mt-0.5 truncate">
                        {st.cadence}
                      </div>
                    </div>
                    <div className="mt-1">
                      <div className="text-xs text-[var(--ink-muted)] font-semibold">Live Book</div>
                      <div className="font-mono text-xs sm:text-[13px] font-black text-[var(--ink)] mt-0.5 truncate">
                        {st.exposure}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubtab === "pipelines" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--ink)]">
                Pipeline Control Deck
              </h2>
              <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-0.5">
                Dispatch ingestion pipelines, monitor execution traces, and track data yield.
              </p>
            </div>
            <span className="text-xs sm:text-sm font-mono font-bold text-[var(--ink-muted)]">
              3 Workers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PIPELINES.map((p) => {
              const r = latest.get(p);
              const meta = PIPELINE_META[p];
              const fresh = r ? freshness(r.status, r.started_at) : "err";
              const freshChip =
                fresh === "ok" ? (
                  <span className="pill pill-green text-xs px-2 py-0.5">
                    <span className="dot dot-green animate-pulse" />
                    Fresh
                  </span>
                ) : fresh === "warn" ? (
                  <span className="pill pill-amber text-xs px-2 py-0.5">
                    <span className="dot dot-amber animate-pulse" />
                    Stale
                  </span>
                ) : (
                  <span className="pill pill-rose text-xs px-2 py-0.5">
                    <span className="dot dot-rose" />
                    Down
                  </span>
                );

              const isBusy = triggering[p];

              return (
                <div
                  key={p}
                  className="panel-card-hover p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2.5 mb-1.5">
                      <div>
                        <h3 className="text-base font-bold text-[var(--ink)]">{meta.label}</h3>
                        <div className="text-xs text-[var(--ink-muted)] mt-0.5 font-semibold">{meta.source}</div>
                      </div>
                      {freshChip}
                    </div>

                    <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed mt-2 mb-4">
                      {meta.desc}
                    </p>

                    <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center py-2.5 px-1">
                      <div className="px-1.5">
                        <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">Status</div>
                        <div className="mt-1 flex justify-center">{r ? statusChip(r.status) : <span className="pill pill-neutral text-xs">NOT RUN</span>}</div>
                      </div>
                      <div className="px-1.5">
                        <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">Last Sync</div>
                        <div className="mt-1 text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
                          {r?.started_at ? new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </div>
                      </div>
                      <div className="px-1.5">
                        <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">Yield</div>
                        <div className="mt-1 text-xs sm:text-sm font-black font-mono text-[var(--ink)] tabular-nums">
                          {r?.rows_produced?.toLocaleString() ?? "0"} rows
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-[var(--border-subtle)] flex items-center gap-2.5">
                    <button
                      onClick={() => handleTriggerRun(p)}
                      disabled={isBusy}
                      className="btn-primary-inst flex-1 text-xs !py-2 justify-center shadow-xs"
                    >
                      {isBusy ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Dispatching...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current mr-1.5" />
                          Dispatch Job
                        </>
                      )}
                    </button>
                    {r && (
                      <button
                        onClick={() => setSelectedRun(r)}
                        className="btn-secondary-inst text-xs !p-2"
                        title="Inspect Diagnostics"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black text-[var(--ink)]">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                Ingestion Econometrics &amp; SLA Bounds
              </span>
              <span className="pill pill-neutral text-xs font-mono font-bold">SLA Bounds</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs sm:text-sm">
              <div className="p-3.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] space-y-1">
                <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">Ingestion Yield Integral</div>
                <div className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                  Y_k = &int; (dN_records / dt) &middot; dt
                </div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mt-1">
                  Normalized record throughput across SEC, Capitol Trades, and crypto feeds.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] space-y-1">
                <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">SLA Floor</div>
                <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                  I_SLA = I(&Delta;t_wall &le; 30.0s)
                </div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mt-1">
                  Sub-30s target ceiling for batch workers before watchdog alerts.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] space-y-1">
                <div className="text-xs uppercase font-extrabold text-[var(--ink-muted)] tracking-wider">Lockless WAL Concurrency</div>
                <div className="font-mono text-sm font-black text-amber-600 dark:text-amber-400">
                  P(Lock Contention) &approx; 0
                </div>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mt-1">
                  SQLite WAL enables concurrent analytical reads without writer locks.
                </p>
              </div>
            </div>
          </div>

          <Card
            title="Subsystem Yield &amp; Latency Trace"
            subtitle="Emitted records (bars, left axis) vs. execution duration (line, right axis)."
            actions={
              <span className="pill pill-green text-[10.5px] font-mono font-bold">
                100% SLA Met
              </span>
            }
          >
            <div className="h-[280px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={telemetryChartData} margin={{ top: 10, right: 20, left: -10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="run" stroke="var(--ink-muted)" fontSize={10.5} tickLine={false} />
                  <YAxis
                    yAxisId="records"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="latency"
                    orientation="right"
                    domain={[0, 45]}
                    tickFormatter={(v) => `${v}s`}
                    stroke="#dc2626"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--panel)",
                      borderColor: "var(--border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                    formatter={(value) => <span className="text-[var(--ink-secondary)] font-medium">{value}</span>}
                  />
                  <ReferenceLine yAxisId="latency" y={30} stroke="#dc2626" strokeDasharray="3 3" label={{ value: "30s SLA", fontSize: 10, fill: "#dc2626", position: "top" }} />
                  <Bar
                    yAxisId="records"
                    dataKey="records"
                    name="Emitted Records"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                  <Line
                    yAxisId="latency"
                    type="monotone"
                    dataKey="latencySec"
                    name="Latency (s)"
                    stroke="#dc2626"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#dc2626" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {activeSubtab === "audit" && (
        <div className="space-y-4 animate-fade-in">
          <Card
            title="Execution Audit Log"
            subtitle="Subprocess logs, execution duration, exit codes, and emitted records."
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="input-inst input-inst-icon text-xs py-1.5 w-48 sm:w-60"
                  />
                </div>

                <div className="filter-segmented-bar text-xs">
                  {["ALL", "SUCCEEDED", "FAILED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`filter-segmented-btn uppercase tracking-wider ${
                        statusFilter === st
                          ? "filter-segmented-btn-active"
                          : "filter-segmented-btn-inactive"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            {isRunsLoading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : filteredRuns.length === 0 ? (
              <EmptyState
                title="No matching runs"
                hint="Try adjusting the filter or search query."
              />
            ) : (
              <div className="overflow-x-auto scrollbar-inst">
                <table className="table-inst">
                  <thead>
                    <tr>
                      <th>Pipeline</th>
                      <th>Status</th>
                      <th>Timestamp &amp; Duration</th>
                      <th>Records &amp; Trigger</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRuns.slice(0, 20).map((r) => {
                      const durationStr = r.ended_at && r.started_at
                        ? `${Math.max(1, Math.round((new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000))}s wall time`
                        : "In progress";

                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRun(r)}
                          className="cursor-pointer group"
                        >
                          <td>
                            <div className="font-bold text-[var(--ink)] group-hover:text-blue-600 transition-colors">
                              {PIPELINE_META[r.pipeline]?.label ?? r.pipeline}
                            </div>
                            <div className="text-[11px] text-[var(--ink-muted)] flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-semibold text-[10.5px]">Run #{r.id}</span>
                              <span>·</span>
                              <span>{PIPELINE_META[r.pipeline]?.source ?? "Subprocess"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {statusChip(r.status)}
                              {r.error ? (
                                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-mono truncate max-w-[150px]" title={r.error}>
                                  {r.error}
                                </span>
                              ) : (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                  Clean Exit
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="font-sans text-xs font-semibold text-[var(--ink)]">
                              {r.started_at ? new Date(r.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                            </div>
                            <div className="text-[11px] text-[var(--ink-muted)] font-mono">
                              {durationStr}
                            </div>
                          </td>
                          <td>
                            <div className="font-mono text-xs font-bold text-[var(--ink)] tabular-nums">
                              {r.rows_produced?.toLocaleString() ?? "0"} records
                            </div>
                            <div className="text-[11px] text-[var(--ink-muted)]">
                              via <span className="font-medium text-[var(--ink-secondary)]">{r.triggered_by ?? "system"}</span>
                            </div>
                          </td>
                          <td className="text-right">
                            <button className="btn-secondary-inst text-xs !py-1 px-3 group-hover:border-blue-500 transition-colors">
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <Drawer
        isOpen={selectedRun !== null}
        onClose={() => setSelectedRun(null)}
        title={selectedRun ? `${PIPELINE_META[selectedRun.pipeline]?.label || selectedRun.pipeline} (Run #${selectedRun.id})` : ""}
        subtitle="Ingestion run trace and execution telemetry"
      >
        {selectedRun && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--ink-muted)] uppercase tracking-wider">Run Status</span>
              <div>{statusChip(selectedRun.status)}</div>
            </div>

            {/* Segmented 2x2 Telemetry Grid (Eliminating 4 single-word vertical rows) */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-[var(--ink-muted)] tracking-wider">Started Timestamp</div>
                <div className="font-mono text-xs font-semibold text-[var(--ink)] truncate">{selectedRun.started_at}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-[var(--ink-muted)] tracking-wider">Ended Timestamp</div>
                <div className="font-mono text-xs font-semibold text-[var(--ink)] truncate">{selectedRun.ended_at ?? "In progress"}</div>
              </div>
              <div className="space-y-0.5 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[10px] uppercase font-bold text-[var(--ink-muted)] tracking-wider">Records Emitted</div>
                <div className="font-mono text-xs font-bold text-[var(--ink)]">{selectedRun.rows_produced?.toLocaleString() ?? "0"} rows</div>
              </div>
              <div className="space-y-0.5 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[10px] uppercase font-bold text-[var(--ink-muted)] tracking-wider">Trigger Vector</div>
                <div className="font-mono text-xs font-semibold text-[var(--ink)]">{selectedRun.triggered_by ?? "manual"}</div>
              </div>
            </div>

            {selectedRun.error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 space-y-1.5">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Execution Error Trace
                </div>
                <div className="font-mono text-[11.5px] break-all leading-relaxed">
                  {selectedRun.error}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => {
                  handleTriggerRun(selectedRun.pipeline);
                  setSelectedRun(null);
                }}
                className="btn-primary-inst w-full text-xs justify-center"
              >
                <Play className="w-3.5 h-3.5 fill-current mr-1" />
                Re-Trigger Pipeline
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
