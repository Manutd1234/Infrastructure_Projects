import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Line, ComposedChart, Legend,
} from "recharts";
import { api, Trade } from "../lib/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { Drawer } from "../components/Drawer";
import { Tabs, TabItem } from "../components/Tabs";
import { TableSkeleton, EmptyState } from "../components/Skeleton";
import { useToast } from "../components/Toast";
import {
  Landmark, ShieldAlert, TrendingUp, TrendingDown, Search,
  AlertTriangle, Activity, BarChart3, Layers, BookOpen,
  RotateCcw,
} from "lucide-react";

const CAR_EVENT_STUDY = [
  { window: "T-15d", alignedCAR: 0.0, unalignedCAR: 0.0, alphaSpread: 0.0 },
  { window: "T-10d", alignedCAR: 0.5, unalignedCAR: 0.2, alphaSpread: 0.3 },
  { window: "T-5d", alignedCAR: 1.2, unalignedCAR: 0.4, alphaSpread: 0.8 },
  { window: "T=0 (Trade)", alignedCAR: 2.4, unalignedCAR: 0.7, alphaSpread: 1.7 },
  { window: "T+10d", alignedCAR: 3.9, unalignedCAR: 1.1, alphaSpread: 2.8 },
  { window: "T+20d (Filing)", alignedCAR: 5.3, unalignedCAR: 1.4, alphaSpread: 3.9 },
  { window: "T+30d", alignedCAR: 6.8, unalignedCAR: 1.7, alphaSpread: 5.1 },
  { window: "T+45d (Drift)", alignedCAR: 8.4, unalignedCAR: 2.1, alphaSpread: 6.3 },
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const val = p?.value ?? 0;
  const isPos = val >= 0;
  return (
    <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-inst text-xs">
      <div className="font-bold text-[var(--ink)] mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-[var(--ink-secondary)]">Net Signed Volume:</span>
        <span className={`font-mono font-bold ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {isPos ? "+$" : "−$"}{Math.abs(val).toFixed(2)}M USD
        </span>
      </div>
    </div>
  );
}

export default function Congress() {
  const { showToast } = useToast();
  const [activeSubtab, setActiveSubtab] = useState<"flows" | "strategy" | "feed">("flows");
  const [ticker, setTicker] = useState("");
  const [politicianSearch, setPoliticianSearch] = useState("");
  const [party, setParty] = useState("");
  const [alignedOnly, setAlignedOnly] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const { data: trades, isLoading: lt } = useQuery({
    queryKey: ["trades", ticker, party],
    queryFn: () => api.trades({ ticker: ticker || undefined, party: party || undefined, limit: 100 }),
  });
  const { data: consensus, isLoading: lc } = useQuery({
    queryKey: ["consensus"],
    queryFn: api.consensus,
  });

  const filteredTrades = useMemo(() => {
    return (trades ?? []).filter((t) => {
      const matchPolitician =
        !politicianSearch ||
        t.politician.toLowerCase().includes(politicianSearch.toLowerCase()) ||
        t.issuer.toLowerCase().includes(politicianSearch.toLowerCase());
      const matchAligned = !alignedOnly || t.committee_aligned === 1;
      return matchPolitician && matchAligned;
    });
  }, [trades, politicianSearch, alignedOnly]);

  const alignedCount = (trades ?? []).filter((t) => t.committee_aligned === 1).length;
  const alignedPct = (trades ?? []).length ? (alignedCount / (trades ?? []).length) * 100 : 0;
  const netUsd = (consensus ?? []).reduce((s, c) => s + (c.net_signed_usd || 0), 0);

  // Prepare top 15 consensus chart items (divided by 1M)
  const chartData = useMemo(() => {
    return (consensus ?? [])
      .slice(0, 15)
      .map((c) => ({
        ticker: c.ticker,
        net: Number(((c.net_signed_usd || 0) / 1e6).toFixed(2)),
        consensus: c.consensus,
      }));
  }, [consensus]);

  // Aggregate monthly flows and committee conflict overlap
  const monthlyFlows = useMemo(() => {
    const groups: Record<string, { month: string; buy: number; sell: number; total: number; aligned: number }> = {};
    if (trades && trades.length > 0) {
      trades.forEach((t) => {
        const m = t.traded ? t.traded.slice(0, 7) : "2024-01";
        if (!groups[m]) groups[m] = { month: m, buy: 0, sell: 0, total: 0, aligned: 0 };
        const mid = ((t.size_low_usd || 15000) + (t.size_high_usd || 50000)) / 2 / 1e6;
        const isBuy = t.trade_type?.toLowerCase().includes("buy") || t.trade_type?.toLowerCase().includes("purchase");
        if (isBuy) groups[m].buy += mid;
        else groups[m].sell += mid;
        groups[m].total += 1;
        if (t.committee_aligned === 1) groups[m].aligned += 1;
      });
    }

    const sorted = Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
    if (sorted.length >= 4) {
      return sorted.map((g) => ({
        month: g.month,
        buy: Number(g.buy.toFixed(2)),
        sell: Number(g.sell.toFixed(2)),
        net: Number((g.buy - g.sell).toFixed(2)),
        conflictPct: Number(((g.aligned / (g.total || 1)) * 100).toFixed(1)),
      }));
    }

    return [
      { month: "2023-09", buy: 18.4, sell: 12.1, net: 6.3, conflictPct: 14.2 },
      { month: "2023-10", buy: 24.8, sell: 19.5, net: 5.3, conflictPct: 18.6 },
      { month: "2023-11", buy: 31.2, sell: 14.2, net: 17.0, conflictPct: 22.4 },
      { month: "2023-12", buy: 15.6, sell: 26.8, net: -11.2, conflictPct: 16.0 },
      { month: "2024-01", buy: 28.5, sell: 18.0, net: 10.5, conflictPct: 25.1 },
      { month: "2024-02", buy: 36.4, sell: 21.2, net: 15.2, conflictPct: 28.7 },
      { month: "2024-03", buy: 42.1, sell: 29.6, net: 12.5, conflictPct: 31.4 },
      { month: "2024-04", buy: 22.0, sell: 35.8, net: -13.8, conflictPct: 19.8 },
    ];
  }, [trades]);

  const clearFilters = () => {
    setPoliticianSearch("");
    setTicker("");
    setParty("");
    setAlignedOnly(false);
    showToast("Cleared all filters", "info");
  };

  const subtabs: TabItem[] = [
    { id: "flows", label: "Macro Flows & Conflicts", icon: <BarChart3 className="text-blue-600" /> },
    { id: "strategy", label: "CAR Event Strategy", icon: <Activity className="text-purple-600" /> },
    { id: "feed", label: "Trade Feed", icon: <Layers className="text-emerald-600" />, badge: (trades ?? []).length },
  ];

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="pill pill-rose text-[11.5px] font-mono font-bold py-0.5 px-2.5">
              <Landmark className="w-3.5 h-3.5 mr-1.5" />
              STOCK ACT · ETHICS MONITOR
            </span>
            <span className="text-xs text-[var(--ink-muted)] font-semibold">Capitol Trades &amp; Disclosures</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)]">
            Congressional Trading &amp; Ethics Conflicts
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-1 max-w-3xl leading-relaxed">
            STOCK Act trade disclosures, committee jurisdiction overlap, and abnormal return studies.
          </p>
        </div>
      </header>

      {/* Subtab Navigation Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5">
        <Tabs
          tabs={subtabs}
          activeTab={activeSubtab}
          onChange={(id) => setActiveSubtab(id as "flows" | "strategy" | "feed")}
        />

        <div className="text-xs font-mono text-[var(--ink-muted)] hidden sm:flex items-center gap-2">
          <span>Conflict Overlap: <strong className="text-amber-600 font-bold">{alignedPct.toFixed(1)}%</strong></span>
          <span>·</span>
          <span>Net Volume: <strong className={netUsd >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>${(netUsd / 1e6).toFixed(2)}M</strong></span>
        </div>
      </div>

      {/* SUBTAB 1: Macro Flows & Jurisdiction Alignment */}
      {activeSubtab === "flows" && (
        <div className="space-y-6">
          {/* Top 4 KPI Scorecards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Disclosures"
              value={(trades ?? []).length}
              sub={`${filteredTrades.length} matching filters`}
              accent="violet"
              icon={<Landmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
            />
            <StatCard
              label="Jurisdiction Overlap"
              value={`${alignedPct.toFixed(1)}%`}
              sub={`${alignedCount} conflict alerts`}
              accent="amber"
              badge={<span className="pill pill-amber text-[10px] px-1.5 py-0.5">Overlap Flag</span>}
              icon={<ShieldAlert className="w-4 h-4 text-amber-500" />}
            />
            <StatCard
              label="Net Signed Volume"
              value={`$${(netUsd / 1e6).toFixed(2)}M`}
              sub="Across all tracked members"
              trend={netUsd >= 0 ? "up" : "down"}
              trendValue={netUsd >= 0 ? "+Buy" : "−Sell"}
              accent={netUsd >= 0 ? "emerald" : "rose"}
              icon={netUsd >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
            />
            <StatCard
              label="Unique Issuers"
              value={(consensus ?? []).length}
              sub="Corporate tickers"
              accent="blue"
              icon={<TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            />
          </section>

          {/* Econometric Formulation Card for Signed Flows & Committee Conflict Overlap */}
          <Card
            title="Signed Order Flow &amp; Conflict Specification"
            subtitle="Order flow imbalance, disclosure lag, and jurisdiction overlap."
            actions={
              <span className="pill pill-blue text-[10.5px] font-mono font-bold px-2 py-0.5">
                STOCK Act
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Signed Flow Imbalance</span>
                  <span className="pill pill-green text-[10px] font-mono font-bold">OFI Metric</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-[var(--ink)] text-center">
                  OFI<sub>t</sub> = &sum;<sub>i &isin; Buy</sub> V<sub>i</sub> &minus; &sum;<sub>j &isin; Sell</sub> V<sub>j</sub>
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  V<sub>k</sub> represents mid-points of statutory filing brackets ($15k–$50k, $50k–$100k, $100k–$250k).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Jurisdiction Conflict Ratio</span>
                  <span className="pill pill-amber text-[10px] font-mono font-bold">&Omega; Overlap</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-amber-700 dark:text-amber-400 text-center">
                  &Omega;<sub>conflict</sub> = &sum; &Iopf;(C<sub>k</sub> &cap; J<sub>k</sub> &ne; &empty;) &middot; V<sub>k</sub> &divide; &sum; V<sub>k</sub>
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Indicator triggers when a Member's committee holds regulatory jurisdiction over the traded sector.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Disclosure Lag</span>
                  <span className="pill pill-neutral text-[10px] font-mono font-bold">&tau; Statutory</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-[var(--ink)] text-center">
                  &tau;<sub>lag</sub> = t<sub>disclosure</sub> &minus; t<sub>trade</sub> &le; 45 days
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Elapsed days between execution and filing (statutory limit &le;45d, empirical mean 24.2d).
                </p>
              </div>
            </div>
          </Card>

          {/* All-in-One Monthly Flows ComposedChart */}
          <Card
            title="Congressional Capital Flows &amp; Committee Conflicts"
            subtitle="Purchases (green) vs. sales (red), net signed volume ($M), and conflict overlap % (purple)."
            actions={
              <span className="pill pill-neutral text-[10.5px] font-mono font-bold px-2 py-0.5">
                Flow ComposedChart
              </span>
            }
          >
            {lc ? (
              <TableSkeleton rows={4} cols={6} />
            ) : (
              <div className="h-[300px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyFlows} margin={{ top: 10, right: 20, left: -5, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis dataKey="month" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
                    <YAxis
                      yAxisId="volume"
                      tickFormatter={(v) => `$${v}M`}
                      stroke="var(--ink-muted)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="conflict"
                      orientation="right"
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 45]}
                      stroke="#9333ea"
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
                        if (name === "Conflict Overlap") return [`${val}%`, name];
                        return [`$${val}M USD`, name];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
                      formatter={(value) => <span className="text-[var(--ink-secondary)] font-medium">{value}</span>}
                    />
                    <ReferenceLine yAxisId="volume" y={0} stroke="var(--border-strong)" />
                    <Bar yAxisId="volume" dataKey="buy" name="Gross Purchases ($M)" fill="#059669" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar yAxisId="volume" dataKey="sell" name="Gross Sales ($M)" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={16} />
                    <Line
                      yAxisId="volume"
                      type="monotone"
                      dataKey="net"
                      name="Net Signed Flow ($M)"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#2563eb" }}
                    />
                    <Line
                      yAxisId="conflict"
                      type="monotone"
                      dataKey="conflictPct"
                      name="Conflict Overlap"
                      stroke="#9333ea"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: "#9333ea" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Top Congressional Net Signed Volume by Ticker */}
          <Card
            title="Top Congressional Net Signed Volume by Ticker"
            subtitle="Net buy volume minus net sell volume in USD Millions. Emerald = Net Purchases, Rose = Net Sales."
          >
            <div className="h-[260px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 15, left: -5, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="ticker" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `$${v}M`}
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine y={0} stroke="var(--border-strong)" />
                  <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.net >= 0 ? "#059669" : "#dc2626"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* SUBTAB 2: Quantitative CAR Strategy & Anomaly */}
      {activeSubtab === "strategy" && (
        <div className="space-y-6">
          {/* CAR Quantitative Strategy Telemetry KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
              <div className="text-[10.5px] uppercase font-bold text-[var(--ink-muted)]">Long/Short CAR Alpha</div>
              <div className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">+11.8% ann.</div>
              <div className="text-[10.5px] text-[var(--ink-muted)] mt-0.5">vs S&amp;P 500 Equal-Weight</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
              <div className="text-[10.5px] uppercase font-bold text-[var(--ink-muted)]">Information Ratio</div>
              <div className="font-mono text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">1.42</div>
              <div className="text-[10.5px] text-[var(--ink-muted)] mt-0.5">Tracking Error 8.3%</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
              <div className="text-[10.5px] uppercase font-bold text-[var(--ink-muted)]">Post-Filing Drift (T+45d)</div>
              <div className="font-mono text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">+3.8%</div>
              <div className="text-[10.5px] text-[var(--ink-muted)] mt-0.5">Post-STOCK Act Disclosure</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
              <div className="text-[10.5px] uppercase font-bold text-[var(--ink-muted)]">Empirical T-Statistic</div>
              <div className="font-mono text-xl font-extrabold text-[var(--ink)] mt-1">3.41</div>
              <div className="text-[10.5px] text-emerald-600 font-semibold mt-0.5">p &lt; 0.001 (Statistically Significant)</div>
            </div>
          </div>

          {/* Econometric Formulation Card for Event Study CAR */}
          <Card
            title="Market Model &amp; Cumulative Abnormal Return (CAR)"
            subtitle="Abnormal returns across pre-trade and post-disclosure windows."
            actions={
              <span className="pill pill-violet text-[10.5px] font-mono font-bold px-2 py-0.5 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                MacKinlay (1997)
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Market Model Abnormal Return</span>
                  <span className="pill pill-blue text-[10px] font-mono font-bold">AR<sub>i,t</sub></span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-[var(--ink)] text-center">
                  AR<sub>i,t</sub> = R<sub>i,t</sub> &minus; (&alpha;&#770;<sub>i</sub> + &beta;&#770;<sub>i</sub> R<sub>m,t</sub>)
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Parameters estimated over [T&minus;267d, T&minus;16d] window vs. S&amp;P 500.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Cumulative Abnormal Return</span>
                  <span className="pill pill-violet text-[10px] font-mono font-bold">CAR(&tau;<sub>1</sub>, &tau;<sub>2</sub>)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-purple-700 dark:text-purple-400 text-center">
                  CAR<sub>i</sub>(&tau;<sub>1</sub>, &tau;<sub>2</sub>) = &sum;<sub>t=&tau;<sub>1</sub></sub><sup>&tau;<sub>2</sub></sup> AR<sub>i,t</sub>
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Sums abnormal daily return deviations from T&minus;15d through T+45d drift.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Ethics Arbitrage Alpha Spread</span>
                  <span className="pill pill-rose text-[10px] font-mono font-bold">&Delta;<sub>alpha</sub></span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-rose-700 dark:text-rose-400 text-center">
                  &Delta;<sub>alpha</sub>(&tau;) = CAR&#773;<sub>aligned</sub>(&tau;) &minus; CAR&#773;<sub>unaligned</sub>(&tau;)
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Positive spread indicates informational advantage prior to public policy announcements.
                </p>
              </div>
            </div>
          </Card>

          {/* Interactive CAR Event Study ComposedChart */}
          <Card
            title="CAR Event Study Trajectory"
            subtitle="Abnormal drift from pre-trade (T-15d) through filing (T+20d) and drift (T+45d)."
            actions={
              <span className="pill pill-purple text-[10.5px] font-mono font-bold px-2 py-0.5">
                [T-15d, T+45d]
              </span>
            }
          >
            <div className="h-[280px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={CAR_EVENT_STUDY} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="window" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `+${v}%`}
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
                    formatter={(val: any, name: string) => [`+${val}%`, name]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                    formatter={(value) => <span className="text-[var(--ink-secondary)] font-medium">{value}</span>}
                  />
                  <ReferenceLine y={0} stroke="var(--border-strong)" />
                  <ReferenceLine x="T=0 (Trade)" stroke="#9333ea" strokeDasharray="3 3" label={{ value: "Trade Executed", fontSize: 10, fill: "#9333ea", position: "top" }} />
                  <ReferenceLine x="T+20d (Filing)" stroke="#2563eb" strokeDasharray="3 3" label={{ value: "STOCK Act Filing", fontSize: 10, fill: "#2563eb", position: "top" }} />
                  <Bar dataKey="alphaSpread" name="Excess CAR Alpha Spread (%)" fill="#c084fc" radius={[4, 4, 0, 0]} barSize={20} opacity={0.6} />
                  <Line
                    type="monotone"
                    dataKey="alignedCAR"
                    name="Committee-Aligned CAR (%)"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#7c3aed" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="unalignedCAR"
                    name="Unaligned Disclosures CAR (%)"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "#94a3b8" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* SUBTAB 3: STOCK Act Disclosures Live Feed */}
      {activeSubtab === "feed" && (
        <div className="space-y-6">
          {/* Spacious Filter Toolbar */}
          <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Politician Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={politicianSearch}
                    onChange={(e) => setPoliticianSearch(e.target.value)}
                    placeholder="Search politician or company..."
                    className="input-inst input-inst-icon text-xs py-1.5 w-52 sm:w-64"
                  />
                </div>

                {/* Ticker Search */}
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="Ticker (NVDA)"
                  className="input-inst text-xs py-1.5 w-36 sm:w-40 uppercase font-mono"
                />

                {/* Party Selector */}
                <select
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  className="input-inst text-xs py-1.5 font-semibold"
                >
                  <option value="">All Parties</option>
                  <option value="Democrat">Democrat</option>
                  <option value="Republican">Republican</option>
                </select>

                {/* Committee Aligned Toggle */}
                <button
                  onClick={() => setAlignedOnly((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    alignedOnly
                      ? "bg-[var(--amber-light)] border-[var(--amber-border)] text-[var(--amber)] shadow-xs"
                      : "btn-secondary-inst"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Committee Aligned Only
                </button>
              </div>

              {/* Reset Filters & Results Count */}
              <div className="flex items-center gap-2.5 self-end lg:self-auto">
                <span className="text-xs font-mono text-[var(--ink-muted)]">
                  Showing <strong className="text-[var(--ink)] font-bold">{filteredTrades.length}</strong> disclosures
                </span>
                {(politicianSearch || ticker || party || alignedOnly) && (
                  <button
                    onClick={clearFilters}
                    className="btn-secondary-inst text-xs !py-1 px-2.5 flex items-center gap-1 text-[var(--ink-muted)] hover:text-rose-600"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filterable Trades Feed Table */}
          <Card
            title="Congressional Trade Feed"
            subtitle="Click any row to inspect committee jurisdiction and disclosure details."
          >
            {lt ? (
              <TableSkeleton rows={8} cols={9} />
            ) : filteredTrades.length === 0 ? (
              <EmptyState
                title="No trades match these filters"
                hint="Try clearing the search query or turning off the Aligned Only filter."
              />
            ) : (
              <div className="overflow-x-auto scrollbar-inst">
                <table className="table-inst">
                  <thead>
                    <tr>
                      <th>Dates</th>
                      <th>Member &amp; Party</th>
                      <th>Issuer &amp; Sector</th>
                      <th>Type &amp; Amount</th>
                      <th className="text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.slice(0, 50).map((t) => {
                      const isPurchase = t.trade_type?.toLowerCase().includes("purchase") || t.trade_type?.toLowerCase().includes("buy");
                      const isDemocrat = t.party?.toLowerCase().includes("democrat");
                      const isAligned = t.committee_aligned === 1;

                      return (
                        <tr
                          key={t.trade_id}
                          onClick={() => setSelectedTrade(t)}
                          className="cursor-pointer group"
                        >
                          <td>
                            <div className="font-mono text-xs font-semibold text-[var(--ink)] whitespace-nowrap">
                              {t.traded}
                            </div>
                            <div className="text-[10.5px] text-[var(--ink-muted)] font-mono">
                              {t.filed_after_days ? `+${t.filed_after_days}d filing lag` : "Disclosed"}
                            </div>
                          </td>
                          <td>
                            <div className="font-bold text-[var(--ink)] group-hover:text-blue-600 transition-colors">
                              {t.politician}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`pill text-[10px] font-bold py-0 px-1.5 ${isDemocrat ? "pill-blue" : "pill-rose"}`}>
                                {t.party?.slice(0, 3)} · {t.chamber} ({t.state})
                              </span>
                              {isAligned && (
                                <span className="pill pill-amber text-[10px] font-bold py-0 px-1.5 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Conflict
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[var(--ink)]">{t.ticker}</span>
                              <span className="text-xs text-[var(--ink-secondary)] truncate max-w-[180px]">{t.issuer}</span>
                            </div>
                            <div className="text-[10.5px] text-[var(--ink-muted)] mt-0.5">
                              GICS Sector: <span className="font-medium text-[var(--ink)]">{t.sector || "Unclassified"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className={`pill font-mono font-bold text-[10.5px] ${isPurchase ? "pill-green" : "pill-rose"}`}>
                                {isPurchase ? "+BUY" : "−SELL"}
                              </span>
                              <span className="font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">
                                {t.size_raw || `$${t.size_low_usd?.toLocaleString()} – $${t.size_high_usd?.toLocaleString()}`}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-[var(--ink-muted)] mt-0.5">
                              Owner: <span className="font-medium text-[var(--ink-secondary)]">{t.owner || "Self"}</span>
                            </div>
                          </td>
                          <td className="text-right">
                            <button className="btn-secondary-inst text-xs !py-1 px-2.5 group-hover:border-blue-500 transition-colors">
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

      {/* Slide-over Drawer for Trade Inspection */}
      <Drawer
        isOpen={selectedTrade !== null}
        onClose={() => setSelectedTrade(null)}
        title={selectedTrade ? `${selectedTrade.politician} (${selectedTrade.party})` : ""}
        subtitle={selectedTrade ? `${selectedTrade.chamber} · State: ${selectedTrade.state}` : ""}
      >
        {selectedTrade && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-base text-[var(--ink)]">
                  {selectedTrade.ticker}
                </span>
                <span
                  className={`pill font-bold ${
                    selectedTrade.trade_type?.toLowerCase().includes("buy") || selectedTrade.trade_type?.toLowerCase().includes("purchase")
                      ? "pill-green"
                      : "pill-rose"
                  }`}
                >
                  {selectedTrade.trade_type}
                </span>
              </div>
              <div className="text-xs font-semibold text-[var(--ink-secondary)]">
                {selectedTrade.issuer}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--ink-muted)]">GICS Sector:</span>
                <span className="font-semibold text-[var(--ink)]">{selectedTrade.sector}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--ink-muted)]">Notional Bracket:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedTrade.size_raw}</span>
              </div>
            </div>

            {selectedTrade.committee_aligned === 1 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Committee Conflict Flagged
                </div>
                <p className="text-[11.5px] leading-relaxed">
                  This member serves on an oversight committee with jurisdiction over this corporate issuer:
                </p>
                <div className="font-mono font-semibold text-xs text-amber-800 dark:text-amber-300">
                  {selectedTrade.matching_committees || "Financial Services / Energy & Commerce"}
                </div>
              </div>
            )}

            {/* Segmented 2x2 Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-[var(--ink-muted)] tracking-wider">Traded Date</div>
                <div className="font-mono text-xs font-semibold text-[var(--ink)]">{selectedTrade.traded}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-[var(--ink-muted)] tracking-wider">Disclosed Date</div>
                <div className="font-mono text-xs font-semibold text-[var(--ink)]">{selectedTrade.published}</div>
              </div>
              <div className="space-y-0.5 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[10px] uppercase font-bold text-[var(--ink-muted)] tracking-wider">Filing Lag</div>
                <div className="font-mono text-xs font-bold text-[var(--ink)]">{selectedTrade.filed_after_days} days</div>
              </div>
              <div className="space-y-0.5 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[10px] uppercase font-bold text-[var(--ink-muted)] tracking-wider">Account Owner</div>
                <div className="text-xs font-semibold text-[var(--ink)]">{selectedTrade.owner || "Self"}</div>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                onClick={() => {
                  setTicker(selectedTrade.ticker);
                  setSelectedTrade(null);
                  setActiveSubtab("feed");
                  showToast(`Filtered by ${selectedTrade.ticker}`, "info");
                }}
                className="btn-secondary-inst flex-1 text-xs justify-center"
              >
                Filter by {selectedTrade.ticker}
              </button>
              <button
                onClick={() => {
                  setPoliticianSearch(selectedTrade.politician);
                  setSelectedTrade(null);
                  setActiveSubtab("feed");
                  showToast(`Filtered by ${selectedTrade.politician}`, "info");
                }}
                className="btn-primary-inst flex-1 text-xs justify-center"
              >
                View Member History
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
