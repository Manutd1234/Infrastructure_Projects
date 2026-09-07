// API client for the NUSSIF backend. All endpoints are relative to the
// Vite proxy (/api -> http://localhost:8000).

export const API_BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${path}`);
  return (await res.json()) as T;
}

async function post<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${path}`);
  return (await res.json()) as T;
}

export const api = {
  // crypto
  cycles:        () => get<Cycle[]>("/crypto/cycles"),
  bearMarkets:   () => get<Cycle[]>("/crypto/bear-markets"),
  breakouts:     () => get<Breakout[]>("/crypto/breakouts"),
  breakoutDates: () => get<{ signal_date: string }[]>("/crypto/breakout-dates"),
  drawdowns:     () => get<Drawdown[]>("/crypto/drawdowns"),
  performance:   () => get<Performance[]>("/crypto/performance"),

  // filings
  funds:         () => get<Fund[]>("/filings/funds"),
  holdings:      (fund?: string, quarter?: string) =>
    get<Holding[]>(`/filings/holdings${params({ fund, quarter })}`),
  sectorWeights: (fund?: string) =>
    get<SectorWeight[]>(`/filings/sector-weights${params({ fund })}`),

  // congress
  trades: (q: TradeQuery) => get<Trade[]>(`/congress/trades${params(q)}`),
  consensus:     () => get<Consensus[]>("/congress/consensus"),
  monthlyConsensus: () => get<MonthlyConsensus[]>("/congress/consensus/monthly"),
  committees:    () => get<CommitteeSignal[]>("/congress/committees"),

  // ops
  runs:          () => get<PipelineRun[]>("/ops/runs"),
  runStatus:    (p: string) => get<PipelineRun>(`/ops/run/${p}/status`),
  triggerRun:  (p: string) => post<{ run_id: number; status: string }>(`/ops/run/${p}`),

  // db
  tables:       () => get<TableInfo[]>("/db/tables"),
  query:        (sql: string) => get<Record<string, unknown>[]>(`/db/query?sql=${encodeURIComponent(sql)}`),

  // market (Massive)
  marketStatus: () => get<MassiveStatus>("/market/status"),
  quotes:       () => get<Quote[]>("/market/quotes"),
};

function params(o: Record<string, unknown | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

// ---- types ----
export interface Cycle {
  type: "bull" | "bear"; start_date: string; end_date: string;
  start_price: number; end_price: number; return: number; duration_days: number;
}
export interface Breakout {
  horizon: number; n_breakouts: number; mean_breakout: number;
  median_breakout: number; pct_positive: number; mean_all: number;
  t_stat: number; p_value: number; excess_vs_all: number;
}
export interface Drawdown {
  peak_date: string; trough_date: string; recovery_date: string;
  max_drawdown: number; peak_to_trough_days: number; recovery_days: number;
}
export interface Performance {
  strategy: string; total_return: number; cagr: number;
  volatility_ann: number; sharpe: number; sortino: number;
  max_drawdown: number; drawdown_trough: string; drawdown_recovery: string;
  win_rate: number; win_rate_invested: number; num_trades: number; final_equity: number;
}
export interface Fund { code: string; name: string; }
export interface Holding {
  fund: string; quarter: string; rank: number; ticker: string;
  company: string; weight: number; sector: string;
}
export interface SectorWeight { fund: string; quarter: string; sector: string; weight: number; }
export interface TradeQuery {
  politician_id?: string; ticker?: string; party?: string;
  trade_type?: string; aligned?: boolean;
  start_date?: string; end_date?: string; limit?: number; offset?: number;
  [key: string]: unknown;
}
export interface Trade {
  trade_id: string; politician_id: string; politician: string; party: string;
  chamber: string; state: string; issuer: string; ticker: string;
  published: string; traded: string; filed_after_days: number; owner: string;
  trade_type: string; size_raw: string; size_low_usd: number; size_high_usd: number;
  price: number; sector: string; committee_aligned: number; matching_committees: string;
}
export interface Consensus {
  ticker: string; issuer: string; sector: string; n_trades: number;
  n_buy: number; n_sell: number; net_signed_usd: number; n_politicians: number;
  buy_pct: number; consensus: "BUY" | "SELL" | "NEUTRAL";
}
export interface MonthlyConsensus {
  month: string; n_trades: number; n_buy: number; n_sell: number;
  net_signed_usd: number; buy_share: number;
}
export interface CommitteeSignal {
  committee: string; n_trades: number; n_buy: number; n_sell: number;
  n_politicians: number; total_size_low_usd: number;
}
export interface PipelineRun {
  id: number; pipeline: string; status: "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  started_at: string; ended_at?: string; rows_produced?: number;
  error?: string; triggered_by?: string;
}
export interface TableInfo { name: string; rows: number; }
export interface MassiveStatus {
  configured: boolean; ok: boolean; provider: string;
  base_url?: string; spy_prev_close?: number; detail: string;
}
export interface Quote {
  ticker: string; close?: number; open?: number; high?: number;
  low?: number; volume?: number; vwap?: number;
}
