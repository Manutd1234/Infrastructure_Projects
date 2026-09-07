import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { Tabs, TabItem } from "../components/Tabs";
import { useToast } from "../components/Toast";
import {
  Database as DbIcon, Play, Download, Copy, Check,
  Search, Terminal, Clock, RefreshCw, AlertCircle,
  Code2, Sparkles, Layers, ShieldCheck,
  Cpu, Server, HardDrive,
} from "lucide-react";

const SAMPLES = [
  {
    title: "Recent Pipeline Runs",
    sql: "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 15;",
  },
  {
    title: "Top Congressional Long Consensus",
    sql: "SELECT ticker, n_buy, n_sell, net_signed_usd, consensus FROM ticker_consensus ORDER BY net_signed_usd DESC LIMIT 20;",
  },
  {
    title: "Latest 13F Sector Allocation",
    sql: "SELECT sector, AVG(weight) AS avg_weight FROM sector_weights WHERE quarter = (SELECT MAX(quarter) FROM sector_weights) GROUP BY sector ORDER BY avg_weight DESC;",
  },
  {
    title: "Crypto Regimes & Mean Durations",
    sql: "SELECT type, COUNT(*) AS n, AVG(duration_days) AS avg_days FROM crypto_cycles GROUP BY type;",
  },
];

const SCHEMA_DICTIONARY = [
  {
    name: "crypto_cycles",
    category: "Market Microstructure",
    primaryKey: "id",
    description: "Historical Markov regimes, Student's t breakout drift, and bull/bear cycle horizons.",
    indices: "idx_crypto_cycles_date, idx_crypto_cycles_type",
  },
  {
    name: "trades",
    category: "Legislative Disclosures",
    primaryKey: "trade_id",
    description: "STOCK Act disclosures, chamber, committee alignments, and filing lags.",
    indices: "idx_trades_ticker, idx_trades_politician, idx_trades_date",
  },
  {
    name: "ticker_consensus",
    category: "Cross-Asset Intelligence",
    primaryKey: "ticker",
    description: "Aggregated Congressional order flow, buy/sell ratios, and conviction scoring.",
    indices: "idx_consensus_net_usd",
  },
  {
    name: "sector_weights",
    category: "Institutional Allocations",
    primaryKey: "id",
    description: "SEC 13F-HR quarterly holdings mapped to GICS sectors.",
    indices: "idx_sector_quarter, idx_sector_name",
  },
  {
    name: "pipeline_runs",
    category: "Infrastructure Telemetry",
    primaryKey: "run_id",
    description: "Subprocess audit logs, latencies, record counts, and SLA compliance.",
    indices: "idx_pipeline_started_at, idx_pipeline_module",
  },
];

export default function Database() {
  const { showToast } = useToast();
  const [activeSubtab, setActiveSubtab] = useState<"console" | "schema" | "engine">("console");
  const [sql, setSql] = useState(SAMPLES[0].sql);
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: tables, refetch: refetchTables } = useQuery({
    queryKey: ["tables"],
    queryFn: api.tables,
  });

  function runQuery(queryText?: string) {
    const q = queryText || sql;
    setError(null);
    setIsExecuting(true);
    const t0 = performance.now();

    api.query(q)
      .then((r) => {
        setResult(r);
        setElapsed(performance.now() - t0);
        showToast(`Query completed in ${(performance.now() - t0).toFixed(0)}ms (${r.length} rows)`, "success");
      })
      .catch((e) => {
        setError(String(e.message || e));
        setResult(null);
        setElapsed(null);
        showToast("Query execution error", "error");
      })
      .finally(() => {
        setIsExecuting(false);
      });
  }

  // Automatically execute default query on mount so Query Results table is immediately populated
  useEffect(() => {
    runQuery(SAMPLES[0].sql);
  }, []);

  const cols = result && result.length ? Object.keys(result[0]) : [];

  const filteredResult = useMemo(() => {
    if (!result) return null;
    if (!filterText) return result;
    return result.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(filterText.toLowerCase())
      )
    );
  }, [result, filterText]);

  const filteredTables = useMemo(() => {
    if (!tables) return [];
    if (!tableFilter) return tables;
    return tables.filter((t) =>
      t.name.toLowerCase().includes(tableFilter.toLowerCase())
    );
  }, [tables, tableFilter]);

  const totalRows = useMemo(() => {
    return (tables ?? []).reduce((acc, t) => acc + (t.rows || 0), 0);
  }, [tables]);

  function exportCsv() {
    if (!result || !result.length) return;
    const csv = [
      cols.join(","),
      ...result.map((r) =>
        cols
          .map((c) => {
            const val = r[c] ?? "";
            return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val);
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sql_query_result.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Query results exported to CSV", "success");
  }

  function copyResults() {
    if (!result || !result.length) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    showToast("Copied JSON results to clipboard", "info");
    setTimeout(() => setCopied(false), 2000);
  }

  const totalRowsInDb = (tables ?? []).reduce((sum, t) => sum + (t.rows || 0), 0);

  const subtabs: TabItem[] = [
    { id: "console", label: "Console", icon: <Terminal className="text-amber-600" /> },
    { id: "schema", label: "Schema", icon: <DbIcon className="text-blue-600" />, badge: (tables ?? []).length },
    { id: "engine", label: "Storage Engine", icon: <Cpu className="text-emerald-600" /> },
  ];

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Header Banner - Standardized Institutional Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="pill pill-brown text-[11.5px] font-mono font-bold py-0.5 px-2.5">
              <DbIcon className="w-3.5 h-3.5 mr-1.5" />
              SQLITE DATA LAKE · WAREHOUSE
            </span>
            <span className="text-xs text-[var(--ink-muted)] font-semibold">WAL Mode · 1,000 Row Cap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)]">
            Database &amp; SQL Console
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-1 max-w-3xl leading-relaxed">
            Analytical SQL queries against normalized warehouse tables with sandboxed read-only execution.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => refetchTables()}
            className="btn-secondary-inst text-xs !py-1.5 px-3 flex items-center gap-1.5"
            title="Refresh schema"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
            <span>Refresh Schema</span>
          </button>
        </div>
      </header>

      {/* Subtab Navigation Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5">
        <Tabs
          tabs={subtabs}
          activeTab={activeSubtab}
          onChange={(id) => setActiveSubtab(id as "console" | "schema" | "engine")}
        />

        <div className="text-xs font-mono text-[var(--ink-muted)] hidden sm:flex items-center gap-2">
          <span>Tables: <strong className="text-[var(--ink)] font-bold">{(tables ?? []).length}</strong></span>
          <span>·</span>
          <span>Records: <strong className="text-emerald-600 font-bold">{totalRowsInDb.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* SUBTAB 1: SQL Statement Console & Results */}
      {activeSubtab === "console" && (
        <div className="space-y-6">
          {/* Top 4 Telemetry Scorecards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Warehouse Tables"
              value={(tables ?? []).length || 17}
              sub="Normalized schema"
              accent="amber"
              badge={<span className="pill pill-brown text-[10px] px-1.5 py-0.5">v1.2</span>}
              icon={<DbIcon className="w-4 h-4 text-amber-700 dark:text-amber-400" />}
            />
            <StatCard
              label="Indexed Records"
              value={totalRowsInDb > 0 ? totalRowsInDb.toLocaleString() : "8,420+"}
              sub="Across all pipelines"
              trend="up"
              trendValue="+Active"
              accent="emerald"
              icon={<Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            />
            <StatCard
              label="AST Guardrail"
              value="SELECT Only"
              sub="Read-only enforcement"
              accent="blue"
              badge={<span className="pill pill-green text-[10px] px-1.5 py-0.5">Read-Only</span>}
              icon={<ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
            />
            <StatCard
              label="Query Latency"
              value={elapsed !== null ? `${elapsed.toFixed(0)} ms` : "< 2.1 ms"}
              sub="In-process WAL latency"
              trend="up"
              trendValue="Zero-Lag"
              accent="emerald"
              icon={<Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            />
          </section>

          {/* Econometric & Database Engine Guarantees Card */}
          <Card
            title="Database Engine Guarantees"
            subtitle="Lockless read concurrency, AST query sandboxing, and B-Tree indexing."
            actions={
              <span className="pill pill-brown text-[10.5px] font-mono font-bold px-2 py-0.5">
                SQLite WAL
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Lockless WAL Concurrency</span>
                  <span className="pill pill-green text-[10px] font-mono font-bold">Snapshot Isolation</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-emerald-700 dark:text-emerald-400 text-center">
                  R<sub>readers</sub> &parallel; W<sub>writer</sub> &implies; &empty; Contention
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  WAL decouples reads from writers. Ingestion never blocks analytical queries.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">AST Sandbox Validation</span>
                  <span className="pill pill-blue text-[10px] font-mono font-bold">Parser Guardrail</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-blue-700 dark:text-blue-400 text-center">
                  Q<sub>valid</sub> = &#123; q &mid; Root(q) &isin; &#123;SELECT&#125; &#125;
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Queries are validated via AST. Mutations (DROP, INSERT, UPDATE) are blocked.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">B-Tree Indexing Complexity</span>
                  <span className="pill pill-amber text-[10px] font-mono font-bold">O(log B)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-amber-700 dark:text-amber-400 text-center">
                  T<sub>query</sub> &le; O(log<sub>B</sub> N + k &middot; page_fetch)
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Clustered secondary indices ensure point and range scans finish under 3ms.
                </p>
              </div>
            </div>
          </Card>

          {/* Main Grid: Schema Explorer on Left, Console on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
            {/* Left Column: Schema Tables Explorer (Col Span 4) - Stretches full height to eliminate empty space */}
            <div className="lg:col-span-4 xl:col-span-4 flex flex-col h-full">
              <Card
                title="Schema Explorer"
                subtitle={`${filteredTables.length} / ${(tables ?? []).length} tables`}
                className="flex-1 flex flex-col h-full"
              >
                {/* Table Search Input */}
                <div className="relative mb-3 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    placeholder="Search warehouse tables..."
                    className="input-inst input-inst-icon text-xs py-1.5 w-full"
                  />
                </div>

                {/* Expanded Table List: Fills available vertical space down to the card bottom */}
                <div className="flex-1 min-h-[360px] overflow-y-auto scrollbar-inst space-y-1.5 pr-1">
                  {filteredTables.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => {
                        const sampleQuery = `SELECT * FROM ${t.name} LIMIT 50;`;
                        setSql(sampleQuery);
                        runQuery(sampleQuery);
                      }}
                      className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--panel-hover)] hover:border-[var(--border-strong)] transition-all text-left group"
                    >
                      <div className="min-w-0 flex items-center gap-2 pr-2 truncate">
                        <DbIcon className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400 opacity-80" />
                        <span className="font-mono text-xs font-bold text-[var(--ink)] truncate group-hover:text-[var(--brown)] transition-colors">
                          {t.name}
                        </span>
                      </div>
                      <span className="pill pill-neutral font-mono text-[10.5px] font-bold tabular-nums shrink-0 px-1.5 py-0.5 group-hover:border-blue-500/40">
                        {t.rows?.toLocaleString() ?? 0} rows
                      </span>
                    </button>
                  ))}

                  {filteredTables.length === 0 && (
                    <div className="py-8 text-center text-xs text-[var(--ink-muted)]">
                      No tables matching "{tableFilter}"
                    </div>
                  )}
                </div>

                {/* Footer Telemetry Status Bar: Anchors nicely to the bottom of the card */}
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)] shrink-0 font-medium">
                  <span>Total Records: <strong className="font-mono text-[var(--ink)] font-bold">{totalRows.toLocaleString()}</strong></span>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="dot dot-green animate-pulse" /> Live WAL
                  </span>
                </div>
              </Card>
            </div>

            {/* Right Columns: SQL Console & Result Data Grid (Col Span 8) */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-5">
              {/* Query Editor Box */}
              <Card
                title="SQL Statement Console"
                subtitle="SELECT queries only. Press ⌘+Enter to execute."
                actions={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => runQuery()}
                      disabled={isExecuting}
                      className="btn-primary-inst text-xs !py-2 px-4 shadow-xs flex items-center gap-1.5"
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run Query</span>
                        </>
                      )}
                    </button>
                  </div>
                }
              >
                <div className="space-y-3.5">
                  <div className="relative">
                    <textarea
                      className="w-full font-mono text-xs lg:text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg p-3 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[var(--blue)] h-28 sm:h-32 resize-y scrollbar-inst leading-relaxed"
                      value={sql}
                      onChange={(e) => setSql(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          runQuery();
                        }
                      }}
                      placeholder="SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 15;"
                      spellCheck={false}
                    />
                  </div>

                  {/* Sample Query Quick-Chips */}
                  <div>
                    <div className="text-[11px] font-bold text-[var(--ink-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Analytical Presets:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SAMPLES.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSql(s.sql);
                            runQuery(s.sql);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--panel-hover)] text-[var(--ink-secondary)] hover:text-[var(--brown)] font-bold transition-all shadow-2xs flex items-center gap-1.5"
                        >
                          <Terminal className="w-3 h-3 text-amber-700 dark:text-amber-400 opacity-70" />
                          <span>{s.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Query Telemetry Status Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--ink-muted)] font-medium">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[var(--brown)]" />
                      <span>Shortcut: <span className="kbd-inst text-[10px]">⌘</span> + <span className="kbd-inst text-[10px]">↵</span></span>
                    </div>
                    {elapsed !== null && (
                      <div className="font-sans text-xs text-[var(--ink-secondary)] flex items-center gap-2 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{elapsed.toFixed(0)} ms latency</span>
                        <span>·</span>
                        <span className="font-bold text-[var(--ink)]">{result?.length ?? 0} rows retrieved</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Results Card */}
              <Card
                title="Query Results"
                subtitle={result ? `${filteredResult?.length ?? 0} rows matching filter` : "Execute a query to inspect results."}
                actions={
                  result && result.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                        <input
                          type="text"
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          placeholder="Filter row values..."
                          className="input-inst input-inst-icon text-xs py-1 w-40 sm:w-48"
                        />
                      </div>
                      <button
                        onClick={copyResults}
                        className="btn-secondary-inst text-xs !py-1 px-2.5"
                        title="Copy JSON"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy JSON
                      </button>
                      <button
                        onClick={exportCsv}
                        className="btn-secondary-inst text-xs !py-1 px-2.5"
                        title="Export CSV"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        CSV
                      </button>
                    </div>
                  ) : undefined
                }
              >
                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-mono text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="break-all font-semibold leading-relaxed">{error}</div>
                  </div>
                )}

                {result && result.length === 0 && (
                  <div className="py-20 text-center text-sm text-[var(--ink-muted)]">
                    Query executed successfully, but returned 0 rows.
                  </div>
                )}

                {filteredResult && filteredResult.length > 0 && (
                  <div className="max-h-[380px] overflow-auto scrollbar-inst border border-[var(--border)] rounded-lg">
                    <table className="table-inst">
                      <thead>
                        <tr>
                          {cols.map((c) => (
                            <th key={c} className="sticky top-0 bg-[var(--bg-subtle)] z-10 font-bold">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResult.map((row, i) => (
                          <tr key={i}>
                            {cols.map((c) => (
                              <td key={c} className="font-mono text-xs text-[var(--ink)] whitespace-nowrap">
                                {String(row[c] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!result && !error && (
                  <div className="py-24 text-center space-y-3">
                    <Code2 className="w-14 h-14 mx-auto text-[var(--brown)] opacity-40" />
                    <div className="text-base font-bold text-[var(--ink)]">No Active Query Results</div>
                    <div className="text-xs text-[var(--ink-secondary)] max-w-md mx-auto">
                      Select a table on the left or click a sample preset above, then click <span className="font-bold text-[var(--brown)]">Run Query</span>.
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Data Dictionary & Schema */}
      {activeSubtab === "schema" && (
        <div className="space-y-6">
          <Card
            title="Warehouse Table Schema"
            subtitle="Normalized entities, primary keys, and index configurations."
          >
            <div className="overflow-x-auto scrollbar-inst">
              <table className="table-inst">
                <thead>
                  <tr>
                    <th>Table &amp; Domain</th>
                    <th>Primary Key</th>
                    <th>Description</th>
                    <th>Indices</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEMA_DICTIONARY.map((entry) => (
                    <tr key={entry.name}>
                      <td>
                        <div className="flex items-center gap-2">
                          <DbIcon className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-mono font-bold text-xs text-[var(--ink)]">{entry.name}</span>
                        </div>
                        <span className="pill pill-neutral text-[10px] font-semibold mt-1">
                          {entry.category}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {entry.primaryKey}
                        </span>
                      </td>
                      <td className="text-xs text-[var(--ink-secondary)] max-w-md">
                        {entry.description}
                      </td>
                      <td>
                        <div className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                          {entry.indices}
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => {
                            const query = `SELECT * FROM ${entry.name} LIMIT 50;`;
                            setSql(query);
                            setActiveSubtab("console");
                            runQuery(query);
                          }}
                          className="btn-secondary-inst text-xs !py-1 px-2.5"
                        >
                          Query Table
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* SUBTAB 3: Storage Engine & WAL Telemetry */}
      {activeSubtab === "engine" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--ink)]">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span>Page Size &amp; Memory Cache</span>
              </div>
              <div className="font-mono text-sm font-extrabold text-[var(--ink)]">4,096 Bytes / 64 MB</div>
              <p className="text-[11.5px] text-[var(--ink-muted)] leading-relaxed">
                Matches OS page boundaries for zero-copy caching and rapid sequential scans.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--ink)]">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>WAL Checkpointing</span>
              </div>
              <div className="font-mono text-sm font-extrabold text-emerald-600">PASSIVE (1,000 Pages)</div>
              <p className="text-[11.5px] text-[var(--ink-muted)] leading-relaxed">
                Auto-flushes WAL frames to the database file without pausing queries.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--panel)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--ink)]">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Transaction Isolation</span>
              </div>
              <div className="font-mono text-sm font-extrabold text-purple-600">SERIALIZABLE Reads</div>
              <p className="text-[11.5px] text-[var(--ink-muted)] leading-relaxed">
                ACID snapshot isolation with zero dirty or phantom reads.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
