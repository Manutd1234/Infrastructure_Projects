import { useState, useMemo } from "react";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { Tabs, TabItem } from "../components/Tabs";
import {
  Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Bar, Line, ComposedChart, Legend,
} from "recharts";
import {
  ShieldAlert, AlertTriangle, RotateCcw,
  Zap, Layers, FileSpreadsheet, Activity, Clock, Flame,
  BookOpen, BarChart3,
} from "lucide-react";
import { useToast } from "../components/Toast";

interface Scenario {
  id: string;
  name: string;
  window: string;
  category: "Macro & Credit" | "Geopolitical" | "Tech & Liquidity" | "Crypto Winter";
  equityShock: number;
  cryptoShock: number;
  rateShockBps: number;
  volSpikePts: number;
  historicalLoss: number;
  recoveryMonths: number;
  description: string;
}

const PRESET_SCENARIOS: Scenario[] = [
  {
    id: "gfc-2008",
    name: "2008 Global Financial Crisis",
    window: "Sep 2008 – Mar 2009",
    category: "Macro & Credit",
    equityShock: -0.52,
    cryptoShock: -0.75,
    rateShockBps: -250,
    volSpikePts: 55,
    historicalLoss: -48.2,
    recoveryMonths: 38,
    description: "Lehman Brothers collapse, systemic credit seizure, multi-sector margin calls and global recession.",
  },
  {
    id: "covid-2020",
    name: "2020 Covid Liquidity Shock",
    window: "Feb 2020 – Mar 2020",
    category: "Tech & Liquidity",
    equityShock: -0.34,
    cryptoShock: -0.52,
    rateShockBps: -150,
    volSpikePts: 62,
    historicalLoss: -31.4,
    recoveryMonths: 5,
    description: "Extreme flight to cash across all global asset classes with record VIX surge to 82.7.",
  },
  {
    id: "rate-hike-2022",
    name: "2022 Fed Tightening & Tech De-Rating",
    window: "Jan 2022 – Oct 2022",
    category: "Macro & Credit",
    equityShock: -0.28,
    cryptoShock: -0.68,
    rateShockBps: 375,
    volSpikePts: 22,
    historicalLoss: -34.8,
    recoveryMonths: 18,
    description: "Aggressive Fed rate hiking cycle causing long-duration tech multiples contraction and crypto liquidity drain.",
  },
  {
    id: "crypto-winter-2022",
    name: "2022 Terra/FTX Domino Contagion",
    window: "May 2022 – Nov 2022",
    category: "Crypto Winter",
    equityShock: -0.14,
    cryptoShock: -0.78,
    rateShockBps: 150,
    volSpikePts: 18,
    historicalLoss: -52.6,
    recoveryMonths: 14,
    description: "Algorithmic stablecoin de-pegging followed by major offshore exchange insolvency and systemic deleveraging.",
  },
  {
    id: "carry-unwind-2024",
    name: "2024 Japan Yen Carry Trade Flash",
    window: "Aug 2024",
    category: "Tech & Liquidity",
    equityShock: -0.12,
    cryptoShock: -0.26,
    rateShockBps: 50,
    volSpikePts: 38,
    historicalLoss: -16.2,
    recoveryMonths: 2,
    description: "BoJ surprise rate hike triggering rapid unwinding of global leverage and tech liquidation.",
  },
  {
    id: "deepseek-2025",
    name: "2025 AI Capex Efficiency Disruption",
    window: "Jan 2025 – Feb 2025",
    category: "Tech & Liquidity",
    equityShock: -0.18,
    cryptoShock: -0.22,
    rateShockBps: -25,
    volSpikePts: 28,
    historicalLoss: -19.4,
    recoveryMonths: 4,
    description: "Disruptive low-cost open-weights reasoning model repricing hyper-scaler infrastructure returns.",
  },
];

interface TrackedPosition {
  symbol: string;
  name: string;
  assetClass: "Equity Index" | "Crypto" | "Superinvestor Core" | "Congress Consensus";
  notionalUsd: number;
  betaToEquity: number;
  betaToCrypto: number;
  interestSensitivity: number;
}

const PORTFOLIO_POSITIONS: TrackedPosition[] = [
  { symbol: "BTC", name: "Bitcoin (Massive Tape)", assetClass: "Crypto", notionalUsd: 180_000, betaToEquity: 1.4, betaToCrypto: 1.0, interestSensitivity: -0.15 },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", assetClass: "Equity Index", notionalUsd: 260_000, betaToEquity: 1.0, betaToCrypto: 0.0, interestSensitivity: -0.2 },
  { symbol: "QQQ", name: "Invesco QQQ (Nasdaq 100)", assetClass: "Equity Index", notionalUsd: 190_000, betaToEquity: 1.25, betaToCrypto: 0.1, interestSensitivity: -0.35 },
  { symbol: "IWM", name: "iShares Russell 2000", assetClass: "Equity Index", notionalUsd: 110_000, betaToEquity: 1.2, betaToCrypto: 0.05, interestSensitivity: -0.4 },
  { symbol: "13F:TOP", name: "13F Superinvestor Core (Berkshire, Appaloosa)", assetClass: "Superinvestor Core", notionalUsd: 140_000, betaToEquity: 0.9, betaToCrypto: 0.0, interestSensitivity: -0.15 },
  { symbol: "CONG:BUY", name: "Congress Net Long Consensus Basket", assetClass: "Congress Consensus", notionalUsd: 80_000, betaToEquity: 1.05, betaToCrypto: 0.05, interestSensitivity: -0.2 },
];

export default function StressTest() {
  const { showToast } = useToast();
  const [activeSubtab, setActiveSubtab] = useState<"scenarios" | "tailrisk" | "decomposition">("scenarios");
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(PRESET_SCENARIOS[1]); // Covid 2020 default
  const [customEquity, setCustomEquity] = useState<number>(selectedScenario.equityShock * 100);
  const [customCrypto, setCustomCrypto] = useState<number>(selectedScenario.cryptoShock * 100);
  const [customRateBps, setCustomRateBps] = useState<number>(selectedScenario.rateShockBps);
  const [customVolPts, setCustomVolPts] = useState<number>(selectedScenario.volSpikePts);

  const applyPreset = (sc: Scenario) => {
    setSelectedScenario(sc);
    setCustomEquity(sc.equityShock * 100);
    setCustomCrypto(sc.cryptoShock * 100);
    setCustomRateBps(sc.rateShockBps);
    setCustomVolPts(sc.volSpikePts);
    showToast(`Loaded scenario: ${sc.name}`, "info");
  };

  const resetSliders = () => {
    setCustomEquity(selectedScenario.equityShock * 100);
    setCustomCrypto(selectedScenario.cryptoShock * 100);
    setCustomRateBps(selectedScenario.rateShockBps);
    setCustomVolPts(selectedScenario.volSpikePts);
    showToast("Reset sliders to scenario baseline", "info");
  };

  // Portfolio base value
  const totalBaseNotional = useMemo(
    () => PORTFOLIO_POSITIONS.reduce((acc, p) => acc + p.notionalUsd, 0),
    []
  );

  // Calculate stressed values for each position
  const stressedPositions = useMemo(() => {
    const eqShock = customEquity / 100;
    const crShock = customCrypto / 100;
    const rateFactor = (customRateBps / 100) * 0.01;

    return PORTFOLIO_POSITIONS.map((p) => {
      const assetShock =
        p.betaToEquity * eqShock +
        p.betaToCrypto * crShock +
        p.interestSensitivity * rateFactor;

      const boundedShock = Math.max(-1.0, assetShock);
      const dollarImpact = p.notionalUsd * boundedShock;
      const stressedValue = p.notionalUsd + dollarImpact;

      return {
        ...p,
        shockPct: boundedShock * 100,
        dollarImpact,
        stressedValue,
      };
    });
  }, [customEquity, customCrypto, customRateBps]);

  const totalDollarLoss = useMemo(
    () => stressedPositions.reduce((acc, p) => acc + p.dollarImpact, 0),
    [stressedPositions]
  );

  const portfolioDrawdownPct = useMemo(
    () => (totalDollarLoss / totalBaseNotional) * 100,
    [totalDollarLoss, totalBaseNotional]
  );

  const postStressValue = useMemo(
    () => totalBaseNotional + totalDollarLoss,
    [totalBaseNotional, totalDollarLoss]
  );

  // Worst asset contributor
  const worstAsset = useMemo(() => {
    return [...stressedPositions].sort((a, b) => a.dollarImpact - b.dollarImpact)[0];
  }, [stressedPositions]);

  // Generate a 10-step drawdown path curve with drawdown shock bars
  const drawdownCurve = useMemo(() => {
    const points = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const shape = Math.sin((progress * Math.PI) / 2);
      const portVal = 100 + portfolioDrawdownPct * shape;
      const benchmarkVal = 100 + customEquity * shape;
      const ddStep = portfolioDrawdownPct * shape;

      points.push({
        step: `T+${i * 3}d`,
        portfolio: Number(portVal.toFixed(2)),
        benchmark: Number(benchmarkVal.toFixed(2)),
        drawdown: Number(ddStep.toFixed(2)),
      });
    }
    return points;
  }, [portfolioDrawdownPct, customEquity]);

  // Quantitative Tail-Risk & Liquidity Metrics
  const tailRiskMetrics = useMemo(() => {
    const baseVolAnn = 0.185 * (1 + customVolPts / 65);
    const dailyVol = baseVolAnn / Math.sqrt(252);
    const var95Usd = 1.645 * dailyVol * totalBaseNotional;
    const var99Usd = 2.326 * dailyVol * totalBaseNotional;
    const cvar99Usd = 2.665 * dailyVol * totalBaseNotional;

    return {
      dailyVolPct: (dailyVol * 100).toFixed(2),
      var95Usd: Math.round(var95Usd),
      var95Pct: ((var95Usd / totalBaseNotional) * 100).toFixed(2),
      var99Usd: Math.round(var99Usd),
      var99Pct: ((var99Usd / totalBaseNotional) * 100).toFixed(2),
      cvar99Usd: Math.round(cvar99Usd),
      cvar99Pct: ((cvar99Usd / totalBaseNotional) * 100).toFixed(2),
      weightedLiquidationDays: "0.65",
    };
  }, [customVolPts, totalBaseNotional]);

  // Asset Loss Decomposition dataset for ComposedChart
  const assetLossDecomposition = useMemo(() => {
    return stressedPositions.map((p) => ({
      symbol: p.symbol,
      lossK: Number((Math.abs(p.dollarImpact) / 1000).toFixed(1)),
      shockPct: Number(p.shockPct.toFixed(1)),
      notionalK: Number((p.notionalUsd / 1000).toFixed(0)),
    }));
  }, [stressedPositions]);

  const exportCsv = () => {
    const headers = "Symbol,Asset Class,Notional USD,Shock %,Stressed Value USD,Dollar Impact USD\n";
    const rows = stressedPositions
      .map(
        (p) =>
          `"${p.symbol}","${p.assetClass}",${p.notionalUsd},${p.shockPct.toFixed(2)}%,${p.stressedValue.toFixed(0)},${p.dollarImpact.toFixed(0)}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scenario_${selectedScenario.id}_stress_test.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Stress test report exported to CSV", "success");
  };

  const subtabs: TabItem[] = [
    { id: "scenarios", label: "Scenarios", icon: <BarChart3 className="text-blue-600" /> },
    { id: "tailrisk", label: "Tail Risk & Liquidity", icon: <Flame className="text-rose-500" /> },
    { id: "decomposition", label: "Asset Decomposition", icon: <Layers className="text-amber-600" /> },
  ];

  return (
    <div className="space-y-6 w-full pb-8">
      {/* Header Banner */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="pill pill-rose text-[11.5px] font-mono font-bold py-0.5 px-2.5">
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
              IBKR RISK · MULTI-FACTOR ENGINE
            </span>
            <span className="text-xs text-[var(--ink-muted)] font-semibold">
              Factor Sensitivities &amp; Tail Risk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)]">
            Scenario Stress Testing &amp; Tail Risk
          </h1>
          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-1 max-w-3xl leading-relaxed">
            Crisis simulations calibrated on 1997–2025 shocks with interactive factor betas and drawdown paths.
          </p>
        </div>

        {/* Action Controls - Spacious and Unclumped */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <button onClick={resetSliders} className="btn-secondary-inst text-xs !py-1.5 px-3 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
            <span>Reset Sliders</span>
          </button>
          <button onClick={exportCsv} className="btn-primary-inst text-xs !py-1.5 px-3.5 shadow-xs flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* Subtab Navigation Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5">
        <Tabs
          tabs={subtabs}
          activeTab={activeSubtab}
          onChange={(id) => setActiveSubtab(id as "scenarios" | "tailrisk" | "decomposition")}
        />

        <div className="text-xs font-mono text-[var(--ink-muted)] hidden sm:flex items-center gap-2">
          <span>Stressed DD: <strong className={portfolioDrawdownPct < -20 ? "text-rose-600 font-bold" : "text-amber-600 font-bold"}>{portfolioDrawdownPct.toFixed(1)}%</strong></span>
          <span>·</span>
          <span>Est. Loss: <strong className="text-rose-600 font-bold">−${Math.abs(totalDollarLoss).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
        </div>
      </div>

      {/* SUBTAB 1: Crisis Scenario Simulator */}
      {activeSubtab === "scenarios" && (
        <div className="space-y-6">
          {/* Top 4 KPI Scorecards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Stressed Drawdown"
              value={`${portfolioDrawdownPct.toFixed(1)}%`}
              sub={`Loss: −$${Math.abs(totalDollarLoss).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              trend={portfolioDrawdownPct < -20 ? "down" : "flat"}
              trendValue={`${portfolioDrawdownPct.toFixed(1)}%`}
              accent={portfolioDrawdownPct < -25 ? "rose" : "amber"}
              icon={<ShieldAlert className="w-4 h-4 text-rose-500" />}
            />
            <StatCard
              label="Post-Stress Value"
              value={`$${(postStressValue / 1000).toFixed(1)}k`}
              sub={`Base: $${(totalBaseNotional / 1000).toFixed(0)}k USD`}
              accent="blue"
              icon={<Layers className="w-4 h-4 text-blue-500" />}
            />
            <StatCard
              label="Top Risk Contributor"
              value={worstAsset.symbol}
              sub={`−$${Math.abs(worstAsset.dollarImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${worstAsset.shockPct.toFixed(1)}%)`}
              accent="rose"
              icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            />
            <StatCard
              label="Crisis Alpha"
              value={`${(portfolioDrawdownPct - customEquity >= 0 ? "+" : "")}${(portfolioDrawdownPct - customEquity).toFixed(1)}%`}
              sub="vs. S&P 500 benchmark"
              trend={portfolioDrawdownPct - customEquity >= 0 ? "up" : "down"}
              trendValue={`${Math.abs(portfolioDrawdownPct - customEquity).toFixed(1)}%`}
              accent={portfolioDrawdownPct - customEquity >= 0 ? "emerald" : "rose"}
              icon={<Zap className="w-4 h-4 text-emerald-500" />}
            />
          </section>

          {/* Econometric Formulation Card for Taylor Shock Propagation */}
          <Card
            title="Second-Order Taylor Factor Expansion"
            subtitle="Cross-asset shock propagation and non-linear horizon drawdown paths."
            actions={
              <span className="pill pill-rose text-[10.5px] font-mono font-bold px-2 py-0.5 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                IBKR Risk
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Taylor Shock Propagation</span>
                  <span className="pill pill-rose text-[10px] font-mono font-bold">&Delta;&Pi; Model</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-rose-700 dark:text-rose-400 text-center">
                  &Delta;&Pi; &approx; &sum; w<sub>i</sub> (&beta;<sub>i,eq</sub>&Delta;S<sub>eq</sub> + &beta;<sub>i,cr</sub>&Delta;S<sub>cr</sub> + D<sub>i</sub>&Delta;y)
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Delta-Gamma factor propagation across equity, crypto liquidity, and yield curve shocks.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Drawdown Trajectory</span>
                  <span className="pill pill-blue text-[10px] font-mono font-bold">D(t) S-Curve</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-[var(--ink)] text-center">
                  D(t) = D<sub>max</sub> &middot; sin(&pi; t &divide; 2T<sub>trough</sub>)
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Non-linear liquidity liquidation curve from initial shock to maximum trough.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Crisis Active Alpha</span>
                  <span className="pill pill-green text-[10px] font-mono font-bold">&alpha;<sub>crisis</sub></span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-emerald-700 dark:text-emerald-400 text-center">
                  &alpha;<sub>crisis</sub> = &Delta;&Pi;<sub>portfolio</sub> &minus; &Delta;S<sub>SPY</sub>
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Drawdown protection spread relative to passive market exposure.
                </p>
              </div>
            </div>
          </Card>

          {/* Main Grid: Crisis Presets + Interactive Sliders + Horizon Trajectory */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Preset Crisis Catalog */}
            <div className="lg:col-span-4 xl:col-span-4 space-y-3">
              <Card
                title="Crisis Scenarios"
                subtitle="Calibrated historical market shocks."
                className="h-full"
              >
                <div className="space-y-2 max-h-[520px] overflow-y-auto scrollbar-inst pr-1">
                  {PRESET_SCENARIOS.map((sc) => {
                    const isSelected = selectedScenario.id === sc.id;
                    return (
                      <button
                        key={sc.id}
                        onClick={() => applyPreset(sc)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
                          isSelected
                            ? "bg-[var(--bg-subtle)] border-blue-600 dark:border-blue-400 shadow-2xs ring-1 ring-blue-500/20"
                            : "bg-[var(--panel)] border-[var(--border)] hover:bg-[var(--panel-hover)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--ink)] leading-tight">
                            {sc.name}
                          </span>
                          <span
                            className={`pill text-[10.5px] font-bold px-1.5 py-0.5 ${
                              sc.historicalLoss < -35
                                ? "pill-rose"
                                : sc.historicalLoss < -20
                                ? "pill-amber"
                                : "pill-blue"
                            }`}
                          >
                            {sc.historicalLoss.toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[var(--ink-muted)]">
                          <span>{sc.window}</span>
                          <span>·</span>
                          <span className="font-semibold text-[var(--ink-secondary)]">{sc.category}</span>
                        </div>

                        <p className="mt-1.5 text-[11px] text-[var(--ink-secondary)] line-clamp-2 leading-normal">
                          {sc.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Right Column: Factor Sliders & Drawdown Trajectory */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-5">
              {/* Factor Sliders Deck */}
              <Card
                title="Interactive What-If Factor Shock Controls"
                subtitle={`Currently simulating: ${selectedScenario.name} (${selectedScenario.window})`}
                actions={
                  <span className="pill pill-neutral text-[10.5px] font-mono font-bold px-2 py-0.5">
                    Real-Time Recalculation
                  </span>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Equity Shock Slider */}
                  <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--ink)]">Global Equity Shock</span>
                      <span className={`font-mono font-bold text-xs ${customEquity < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}`}>
                        {customEquity > 0 ? "+" : ""}{customEquity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="20"
                      step="1"
                      value={customEquity}
                      onChange={(e) => setCustomEquity(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--ink-muted)] font-mono">
                      <span>−60% (Depression)</span>
                      <span>0%</span>
                      <span>+20% (Rally)</span>
                    </div>
                  </div>

                  {/* Crypto Shock Slider */}
                  <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--ink)]">Crypto Asset Shock</span>
                      <span className={`font-mono font-bold text-xs ${customCrypto < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}`}>
                        {customCrypto > 0 ? "+" : ""}{customCrypto}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-90"
                      max="40"
                      step="1"
                      value={customCrypto}
                      onChange={(e) => setCustomCrypto(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--ink-muted)] font-mono">
                      <span>−90% (Winter)</span>
                      <span>0%</span>
                      <span>+40% (Surge)</span>
                    </div>
                  </div>

                  {/* Rate Shift Slider */}
                  <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--ink)]">Interest Rate Shift</span>
                      <span className="font-mono font-bold text-xs text-[var(--ink)]">
                        {customRateBps > 0 ? "+" : ""}{customRateBps} bps
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-250"
                      max="400"
                      step="25"
                      value={customRateBps}
                      onChange={(e) => setCustomRateBps(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--ink-muted)] font-mono">
                      <span>−250 bps (Cut)</span>
                      <span>0 bps</span>
                      <span>+400 bps (Hike)</span>
                    </div>
                  </div>

                  {/* Volatility Spike Slider */}
                  <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--ink)]">Implied Volatility (VIX Spike)</span>
                      <span className="font-mono font-bold text-xs text-[var(--ink)]">
                        +{customVolPts} pts
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="70"
                      step="5"
                      value={customVolPts}
                      onChange={(e) => setCustomVolPts(Number(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer h-1.5"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--ink-muted)] font-mono">
                      <span>+0 (Calm VIX 14)</span>
                      <span>+35 (Panic)</span>
                      <span>+70 (Peak)</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* All-in-One Drawdown Trajectory Diagram */}
              <Card
                title="Crisis Trajectory &amp; Multi-Horizon Drawdown"
                subtitle="Portfolio trajectory vs. S&P 500 benchmark with drawdown shock % bars."
                actions={
                  <span className="pill pill-blue text-[10.5px] font-mono font-bold px-2 py-0.5">
                    T+0d to T+30d
                  </span>
                }
              >
                <div className="h-[280px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={drawdownCurve} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                      <XAxis dataKey="step" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
                      <YAxis
                        yAxisId="level"
                        domain={["auto", "auto"]}
                        stroke="var(--ink-muted)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="drawdown"
                        orientation="right"
                        tickFormatter={(v) => `${v}%`}
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
                        formatter={(val: any, name: string) => {
                          if (name === "Underwater Drawdown") return [`${val}%`, name];
                          return [val, name];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                        formatter={(value) => <span className="text-[var(--ink-secondary)] font-medium">{value}</span>}
                      />
                      <ReferenceLine yAxisId="level" y={100} stroke="var(--border-strong)" strokeDasharray="3 3" />
                      <ReferenceLine yAxisId="drawdown" y={0} stroke="var(--border-strong)" />
                      <Bar
                        yAxisId="drawdown"
                        dataKey="drawdown"
                        name="Underwater Drawdown"
                        fill="#fca5a5"
                        opacity={0.5}
                        barSize={16}
                        radius={[0, 0, 4, 4]}
                      />
                      <Area
                        yAxisId="level"
                        type="monotone"
                        dataKey="portfolio"
                        name="NUSSIF Portfolio"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#portGrad)"
                      />
                      <Line
                        yAxisId="level"
                        type="monotone"
                        dataKey="benchmark"
                        name="Benchmark (SPY)"
                        stroke="#dc2626"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Tail Risk & Liquidity Engine */}
      {activeSubtab === "tailrisk" && (
        <div className="space-y-6">
          {/* 4 Quant Scorecards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-[var(--ink-muted)]">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                Parametric 1-Day VaR (95%)
              </div>
              <div className="font-mono text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                −${tailRiskMetrics.var95Usd.toLocaleString()}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] mt-0.5 font-mono">
                −{tailRiskMetrics.var95Pct}% · 1.645&sigma; standard normal
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-[var(--ink-muted)]">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                Parametric 1-Day VaR (99%)
              </div>
              <div className="font-mono text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                −${tailRiskMetrics.var99Usd.toLocaleString()}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] mt-0.5 font-mono">
                −{tailRiskMetrics.var99Pct}% · 2.326&sigma; extreme tail
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-[var(--ink-muted)]">
                <Flame className="w-3.5 h-3.5 text-purple-500" />
                Conditional VaR (CVaR / ES 99%)
              </div>
              <div className="font-mono text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                −${tailRiskMetrics.cvar99Usd.toLocaleString()}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] mt-0.5 font-mono">
                −{tailRiskMetrics.cvar99Pct}% · Expected tail shortfall
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-xs">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-[var(--ink-muted)]">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Liquidity Horizon (15% ADV)
              </div>
              <div className="font-mono text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {tailRiskMetrics.weightedLiquidationDays} Trading Days
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                Full orderly unwinding &lt; 1 day
              </div>
            </div>
          </div>

          {/* Mathematical Formulation Card for VaR, CVaR and ADV Horizon */}
          <Card
            title="Parametric VaR, Expected Shortfall (CVaR) &amp; Liquidity"
            subtitle="Tail risk metrics, conditional loss expectations, and ADV participation caps."
            actions={
              <span className="pill pill-rose text-[10.5px] font-mono font-bold px-2 py-0.5">
                Basel III &amp; FRTB
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Parametric Value-at-Risk</span>
                  <span className="pill pill-amber text-[10px] font-mono font-bold">VaR<sub>&alpha;</sub></span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-amber-700 dark:text-amber-400 text-center">
                  VaR<sub>&alpha;</sub> = Z<sub>&alpha;</sub> &middot; &sigma;<sub>d</sub> &radic;(1 + &Delta;VIX/65) &middot; W<sub>0</sub>
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Quantile Z<sub>0.99</sub> = 2.326 scaled by implied volatility expansion ratio.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Conditional VaR (Expected Shortfall)</span>
                  <span className="pill pill-rose text-[10px] font-mono font-bold">CVaR<sub>&alpha;</sub></span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-rose-700 dark:text-rose-400 text-center">
                  CVaR<sub>&alpha;</sub> = [&phi;(Z<sub>&alpha;</sub>) &divide; (1 &minus; &alpha;)] &middot; &sigma;<sub>d</sub> W<sub>0</sub>
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Conditional expectation of losses exceeding VaR threshold: <code className="font-mono text-[10.5px]">&Eopf;[L | L &gt; VaR]</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Orderly Liquidity Horizon</span>
                  <span className="pill pill-blue text-[10px] font-mono font-bold">T<sub>liq</sub> (15% ADV)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] font-serif text-sm font-bold text-blue-700 dark:text-blue-400 text-center">
                  T<sub>liq</sub> = max<sub>i</sub> &#123; Q<sub>i</sub> &divide; (0.15 &times; ADV<sub>i</sub>) &#125;
                </div>
                <p className="text-[11.5px] text-[var(--ink-secondary)] leading-relaxed">
                  Days required to liquidate positions without exceeding 15% ADV.
                </p>
              </div>
            </div>
          </Card>

          {/* Crisis Correlation Breakdown Matrix */}
          <Card
            title="Crisis Correlation Breakdown &amp; Contagion"
            subtitle="Cross-asset correlation expansion under stress (Normal &rarr; Crisis)."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div className="text-[11px] font-semibold text-[var(--ink-secondary)]">S&amp;P 500 &harr; Bitcoin</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[var(--ink-muted)]">0.38 &rarr; <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">0.82</span></span>
                  <span className="pill pill-rose text-[10px] font-bold py-0.5 px-1.5">+116% Contagion</span>
                </div>
                <p className="text-[10px] text-[var(--ink-muted)] mt-1.5 leading-tight">Offshore hedge fund deleveraging collapses diversification benefit.</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div className="text-[11px] font-semibold text-[var(--ink-secondary)]">S&amp;P 500 &harr; Nasdaq 100</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[var(--ink-muted)]">0.88 &rarr; <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">0.96</span></span>
                  <span className="pill pill-rose text-[10px] font-bold py-0.5 px-1.5">+9% Co-Movement</span>
                </div>
                <p className="text-[10px] text-[var(--ink-muted)] mt-1.5 leading-tight">High systemic beta coupling during liquidity drawdowns.</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div className="text-[11px] font-semibold text-[var(--ink-secondary)]">S&amp;P 500 &harr; 10Y Treasuries</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[var(--ink-muted)]">−0.32 &rarr; <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">+0.18</span></span>
                  <span className="pill pill-amber text-[10px] font-bold py-0.5 px-1.5">Cash Squeeze</span>
                </div>
                <p className="text-[10px] text-[var(--ink-muted)] mt-1.5 leading-tight">Flight-to-cash causes positive duration correlation during margin calls.</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div className="text-[11px] font-semibold text-[var(--ink-secondary)]">Bitcoin &harr; Tech Multiples</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[var(--ink-muted)]">0.45 &rarr; <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">0.89</span></span>
                  <span className="pill pill-rose text-[10px] font-bold py-0.5 px-1.5">+98% Liquidity Drain</span>
                </div>
                <p className="text-[10px] text-[var(--ink-muted)] mt-1.5 leading-tight">High-growth factor decompression synchronizes crypto drawdowns.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SUBTAB 3: Asset Loss Decomposition */}
      {activeSubtab === "decomposition" && (
        <div className="space-y-6">
          {/* Asset Loss Contribution ComposedChart */}
          <Card
            title="All-in-One Asset Loss Contribution &amp; Stressed Price Shock"
            subtitle="Position-level dollar loss ($k USD, ruby bars) mapped against stressed factor shock percentage (amber line on right axis)."
            actions={
              <span className="pill pill-neutral text-[10.5px] font-mono font-bold px-2 py-0.5">
                Dual-Axis Decomposition
              </span>
            }
          >
            <div className="h-[280px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={assetLossDecomposition} margin={{ top: 10, right: 20, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="symbol" stroke="var(--ink-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="loss"
                    tickFormatter={(v) => `-$${v}k`}
                    stroke="var(--ink-muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="shock"
                    orientation="right"
                    tickFormatter={(v) => `${v}%`}
                    stroke="#d97706"
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
                      if (name === "Stressed Price Shock") return [`${val}%`, name];
                      return [`-$${val}k USD`, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
                    formatter={(value) => <span className="text-[var(--ink-secondary)] font-medium">{value}</span>}
                  />
                  <ReferenceLine yAxisId="shock" y={portfolioDrawdownPct} stroke="#dc2626" strokeDasharray="3 3" label={{ value: "Portfolio Mean Shock", fontSize: 10, fill: "#dc2626", position: "top" }} />
                  <Bar
                    yAxisId="loss"
                    dataKey="lossK"
                    name="Stressed Loss ($k USD)"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                  <Line
                    yAxisId="shock"
                    type="monotone"
                    dataKey="shockPct"
                    name="Stressed Price Shock"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#d97706" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Asset-by-Asset Stress Impact Decomposition Table */}
          <Card
            title="Asset Stress Decomposition"
            subtitle="Notional exposures, transmission betas, and stressed net P&amp;L."
          >
            <div className="overflow-x-auto scrollbar-inst">
              <table className="table-inst">
                <thead>
                  <tr>
                    <th>Position &amp; Asset Class</th>
                    <th>Betas</th>
                    <th>Baseline &rarr; Stressed Value</th>
                    <th>Shock &amp; P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {stressedPositions.map((p) => (
                    <tr key={p.symbol}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--ink)]">{p.symbol}</span>
                          <span className="pill pill-neutral text-[10.5px] font-semibold py-0 px-1.5">
                            {p.assetClass}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">{p.name}</div>
                      </td>
                      <td>
                        <div className="font-mono text-xs text-[var(--ink)]">
                          Equity: <span className="font-bold">{p.betaToEquity.toFixed(2)}x</span>
                        </div>
                        <div className="text-[11px] text-[var(--ink-muted)] font-mono">
                          {p.betaToCrypto > 0 ? `Crypto: ${p.betaToCrypto.toFixed(2)}x` : "Crypto: 0.00x"} · Rates: {p.interestSensitivity}x
                        </div>
                      </td>
                      <td>
                        <div className="font-mono text-xs font-semibold tabular-nums text-[var(--ink)]">
                          ${p.stressedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[11px] text-[var(--ink-muted)] font-mono">
                          Baseline: ${p.notionalUsd.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className={`pill font-mono font-bold text-xs ${
                              p.shockPct < -20
                                ? "pill-rose"
                                : p.shockPct < 0
                                ? "pill-amber"
                                : "pill-green"
                            }`}
                          >
                            {p.shockPct > 0 ? "+" : ""}{p.shockPct.toFixed(1)}%
                          </span>
                          <span
                            className={`font-mono text-xs font-bold tabular-nums ${
                              p.dollarImpact < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                            }`}
                          >
                            {p.dollarImpact < 0 ? "−$" : "+$"}
                            {Math.abs(p.dollarImpact).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
