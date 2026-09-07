import { useQuery } from "@tanstack/react-query";
import { api, Quote } from "../lib/api";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

export function MarketTape() {
  const { data: quotes } = useQuery({
    queryKey: ["market-quotes-tape"],
    queryFn: api.quotes,
    refetchInterval: 15_000,
  });

  const displayQuotes: Quote[] = quotes && quotes.length > 0 ? quotes : [
    { ticker: "X:BTCUSD", close: 64250.00, open: 63100.00 },
    { ticker: "SPY", close: 546.20, open: 543.10 },
    { ticker: "QQQ", close: 478.90, open: 475.40 },
    { ticker: "IWM", close: 215.30, open: 216.80 },
  ];

  const assetNames: Record<string, string> = {
    "X:BTCUSD": "Bitcoin · Spot",
    SPY: "S&P 500 · Equity Beta",
    QQQ: "Nasdaq 100 · Tech",
    IWM: "Russell 2000 · Small-Cap",
  };

  return (
    <div className="w-full bg-[var(--panel)] border-b border-[var(--border)] px-5 lg:px-8 py-2.5 shadow-2xs">
      <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Tape Indicator Tag - Dynamic with pulsing radar ring */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-extrabold text-[var(--brown)] uppercase tracking-wider shadow-2xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>Cross-Asset Tape</span>
          </div>
          <span className="text-xs text-[var(--ink-muted)] font-semibold hidden xl:inline">
            L1 Feeds · 15s Cadence
          </span>
        </div>

        {/* 4 Asset Cards - Spacious and Dynamic */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 lg:ml-4">
          {displayQuotes.map((q) => {
            const rawSym = q.ticker.replace("X:", "");
            const sym = rawSym === "BTCUSD" ? "BTC/USD" : rawSym;
            const name = assetNames[q.ticker] || rawSym;
            const close = q.close ?? 0;
            const open = q.open ?? close * 0.995;
            const changePct = open > 0 ? ((close - open) / open) * 100 : 0;
            const isUp = changePct >= 0;

            return (
              <div
                key={q.ticker}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--panel-hover)] hover:-translate-y-0.5 transition-all select-none shadow-2xs"
              >
                <div className="leading-tight min-w-0 pr-2">
                  <div className="font-black text-[var(--ink)] text-sm sm:text-[15px] tracking-tight truncate">
                    {sym}
                  </div>
                  <div className="text-xs text-[var(--ink-muted)] font-medium truncate mt-0.5">
                    {name}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-sans font-black text-sm sm:text-base text-[var(--ink)] tabular-nums">
                    ${close > 1000
                      ? close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : close.toFixed(2)}
                  </div>
                  <div
                    className={`flex items-center justify-end text-xs font-extrabold font-sans mt-0.5 ${
                      isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isUp ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                    {isUp ? "+" : ""}
                    {changePct.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
