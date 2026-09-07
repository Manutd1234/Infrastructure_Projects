import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import Overview from "./pages/Overview";
import Crypto from "./pages/Crypto";
import Filings from "./pages/Filings";
import Congress from "./pages/Congress";
import Database from "./pages/Database";

const NAV = [
  { to: "/",         label: "Overview",  icon: "▦", end: true },
  { to: "/crypto",    label: "Crypto",    icon: "₿" },
  { to: "/filings",   label: "Filings",   icon: "∑" },
  { to: "/congress",  label: "Congress",  icon: "⚑" },
  { to: "/database",  label: "Database",  icon: "⛁" },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-xs text-sky-200 tabular-nums">
      {now.toLocaleTimeString("en-SG", { hour12: false })}
    </span>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!open) return null;
  const go = (to: string) => { navigate(to); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="panel w-full max-w-lg p-2 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 text-xs text-slate-500 border-b border-white/5 mb-2">
          Jump to…
        </div>
        {NAV.map((n) => (
          <button
            key={n.to}
            onClick={() => go(n.to)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                       text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <span className="w-6 text-center text-slate-500">{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div className="px-3 py-2 mt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-600">
          <span>Press <span className="kbd">Esc</span> to close</span>
          <span>NUSSIF Trading Desk</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

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

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-slate-600/80 bg-[#0b1220] p-4 flex flex-col gap-1">
        <div className="px-2 py-4 mb-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/40 ring-1 ring-white/20">
            N
          </div>
          <div>
            <div className="text-[10px] text-slate-300 uppercase tracking-widest font-semibold">NUSSIF</div>
            <div className="text-sm font-semibold text-white leading-tight">Trading Desk</div>
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-500/25 text-white ring-1 ring-blue-400/50 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.25)]"
                  : "text-slate-200 hover:text-white hover:bg-white/10"
              }`
            }
          >
            <span className="w-5 text-center text-base">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
        <div className="mt-auto px-2 pt-4 border-t border-slate-600/80 text-[11px] text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Status</span>
            <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
              <span className="dot-ok" /> Live
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Build</span>
            <span className="font-mono text-slate-200">v0.2.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shortcuts</span>
            <span className="kbd !text-slate-200 !border-slate-500 !bg-white/10">⌘K</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-sky-400/20 bg-[#0d1528]/80 backdrop-blur-xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sky-200 text-sm">Operations Engineer</span>
            <span className="text-sky-300/70">/</span>
            <span className="text-white text-sm font-medium">Trading Desk</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPaletteOpen(true)}
              className="btn-ghost text-xs"
            >
              Search <span className="kbd ml-1">⌘K</span>
            </button>
            <div className="h-4 w-px bg-white/10" />
            <Clock />
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 text-[11px] font-bold flex items-center justify-center text-white">
                TD
              </div>
              <span className="text-xs text-slate-200">desk.ops</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-7 overflow-x-auto scrollbar-thin">
          <Routes>
            <Route path="/"         element={<Overview />} />
            <Route path="/crypto"    element={<Crypto />} />
            <Route path="/filings"   element={<Filings />} />
            <Route path="/congress"  element={<Congress />} />
            <Route path="/database" element={<Database />} />
          </Routes>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
