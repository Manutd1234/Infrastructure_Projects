import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import Overview from "./pages/Overview";
import Crypto from "./pages/Crypto";
import Filings from "./pages/Filings";
import Congress from "./pages/Congress";
import Database from "./pages/Database";
import StressTest from "./pages/StressTest";
import { ToastProvider } from "./components/Toast";
import { ThemeToggle } from "./components/ThemeToggle";
import { MarketTape } from "./components/MarketTape";
import {
  LayoutDashboard, Coins, PieChart, Landmark, Database as DbIcon,
  ShieldAlert, Search, Clock as ClockIcon, ChevronRight,
} from "lucide-react";

const NAV = [
  { to: "/",          label: "Overview",             icon: <LayoutDashboard className="w-5 h-5" />, end: true },
  { to: "/crypto",    label: "Crypto Cycles",        icon: <Coins className="w-5 h-5" /> },
  { to: "/filings",   label: "13F Filings",          icon: <PieChart className="w-5 h-5" /> },
  { to: "/congress",  label: "Congress Trading",     icon: <Landmark className="w-5 h-5" /> },
  { to: "/stress",    label: "Scenario Stress Test", icon: <ShieldAlert className="w-5 h-5" />, badge: "IBKR" },
  { to: "/database",  label: "Database Console",     icon: <DbIcon className="w-5 h-5" /> },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 font-sans text-sm text-[var(--ink-secondary)] tabular-nums font-semibold">
      <ClockIcon className="w-4 h-4 text-[var(--ink-muted)]" />
      <span>{now.toLocaleTimeString("en-SG", { hour12: false })} SGT</span>
    </div>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!open) return null;
  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-28 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="panel-card w-full max-w-xl p-4 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] border-b border-[var(--border-subtle)] mb-2 flex items-center justify-between">
          <span>Jump to Workspace…</span>
          <span className="kbd-inst">ESC</span>
        </div>
        <div className="space-y-1.5">
          {NAV.map((n) => (
            <button
              key={n.to}
              onClick={() => go(n.to)}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold
                         text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)] transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <span className="text-[var(--brown)] group-hover:text-[var(--brown)] transition-colors">
                  {n.icon}
                </span>
                <span>{n.label}</span>
              </div>
              {n.badge && (
                <span className="pill pill-rose text-[10px] font-bold">
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="px-3 py-2.5 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span>Navigate using keyboard or click</span>
          <span className="font-semibold text-[var(--ink-secondary)]">NUSSIF Infrastructure</span>
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const currentNav = NAV.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      {/* Sleek, High-Density Sidebar */}
      <aside className="w-72 shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border)] p-4 flex flex-col justify-between select-none">
        <div>
          {/* Brand Header - Unified Institutional NUSSIF Lockup */}
          <div className="pb-4 mb-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Crest Badge */}
              <div className="h-9 px-3 bg-gradient-to-br from-[#00205b] via-[#0a1931] to-[#1e3a8a] rounded-xl shadow-xs flex items-center justify-center border border-blue-400/30 shrink-0">
                <span className="nussif-brand-crest text-xs tracking-wider text-white font-serif font-black drop-shadow-xs">
                  NUSSIF
                </span>
              </div>
              {/* Text Lockup: Investment Fund + Trading Desk */}
              <div className="min-w-0 whitespace-nowrap">
                <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-muted)] leading-tight">
                  Investment Fund
                </div>
                <div className="text-sm font-black text-[var(--ink)] tracking-tight leading-tight mt-0.5">
                  Trading Desk
                </div>
              </div>
            </div>

            {/* Version Pill */}
            <span className="shrink-0 pill pill-blue !text-[10px] !px-2 !py-0.5 font-mono font-bold">
              v1.0
            </span>
          </div>

          {/* Navigation Section */}
          <div className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-muted)] px-2 mb-2">
            Quantitative Modules
          </div>
          <nav className="space-y-1.5">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                    isActive
                      ? "bg-white text-[var(--blue)] shadow-xs border border-[var(--border)] ring-2 ring-blue-600/20"
                      : "text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--bg-subtle)]"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0 w-5 h-5 flex items-center justify-center">{n.icon}</span>
                  <span>{n.label}</span>
                </div>
                {n.badge && (
                  <span className="pill pill-rose text-xs font-bold px-2 py-0.5">
                    {n.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar System Connectivity & Quantitative Telemetry (Below Database Console) */}
          <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-3">
            <div className="p-3 rounded-xl border border-[var(--border)] bg-white shadow-2xs space-y-2 text-xs sm:text-[13px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[var(--ink)]">
                  <span className="dot dot-green animate-pulse" />
                  <span>FastAPI Backend</span>
                </div>
                <span className="pill pill-green text-xs font-mono font-bold px-2 py-0.5">
                  :8000
                </span>
              </div>
              <div className="text-xs text-[var(--ink-muted)] flex items-center justify-between font-medium">
                <span>SQLite Data Lake</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  WAL Mode
                </span>
              </div>
              <div className="text-xs text-[var(--ink-muted)] flex items-center justify-between font-medium">
                <span>Telemetry Latency</span>
                <span className="font-mono font-bold text-[var(--ink)]">
                  &lt; 2.4 ms
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 text-xs text-[var(--ink-muted)]">
              <span>Palette: <span className="kbd-inst text-[11px]">⌘K</span></span>
              <span className="font-bold text-[var(--ink-secondary)]">NUSSIF Desk</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame - Fills 100% of remaining viewport */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg)]">
        {/* Top Navbar Header - Height h-16 with generous padding */}
        <header className="h-16 shrink-0 border-b border-[var(--border)] bg-white px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          {/* Breadcrumb Left */}
          <div className="flex items-center gap-2.5 text-sm">
            <span className="font-black text-[var(--ink-muted)] uppercase tracking-wider text-xs leading-none">
              NUSSIF
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--border-strong)] shrink-0" />
            <span className="font-black text-[var(--ink)] text-sm leading-none">
              {currentNav?.label || "Execution Desk"}
            </span>
            <span className="pill pill-green hidden sm:inline-flex !text-[11px] !py-0.5 !px-2 ml-1 leading-none font-bold items-center">
              <span className="dot dot-green animate-pulse" />
              L1 Live Tape
            </span>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="btn-secondary-inst !py-1.5 px-3 text-xs sm:text-sm flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-[var(--ink-muted)]" />
              <span>Search / Jump…</span>
              <span className="kbd-inst ml-1 text-xs">⌘K</span>
            </button>

            <div className="h-5 w-px bg-[var(--border)] hidden sm:block" />
            <div className="hidden sm:block">
              <Clock />
            </div>
            <div className="h-5 w-px bg-[var(--border)]" />
            <ThemeToggle />
          </div>
        </header>

        {/* Dedicated Live Streaming Market Tape Ribbon */}
        <MarketTape />

        {/* Scrollable Main Application Content - Fills available width nicely */}
        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-7 overflow-y-auto scrollbar-inst">
          <div className="w-full mx-auto">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/crypto" element={<Crypto />} />
              <Route path="/filings" element={<Filings />} />
              <Route path="/congress" element={<Congress />} />
              <Route path="/stress" element={<StressTest />} />
              <Route path="/database" element={<Database />} />
            </Routes>
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainLayout />
    </ToastProvider>
  );
}
