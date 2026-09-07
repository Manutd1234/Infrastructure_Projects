import { NavLink, Route, Routes } from "react-router-dom";
import Overview from "./pages/Overview";
import Crypto from "./pages/Crypto";
import Filings from "./pages/Filings";
import Congress from "./pages/Congress";
import Database from "./pages/Database";

const NAV = [
  { to: "/",         label: "Overview",  end: true },
  { to: "/crypto",    label: "Crypto" },
  { to: "/filings",   label: "Filings" },
  { to: "/congress",  label: "Congress" },
  { to: "/database",  label: "Database" },
];

export default function App() {
  return (
    <div className="min-h-screen flex">
      <nav className="w-56 shrink-0 border-r border-desk-border bg-desk-panel p-4 flex flex-col gap-1">
        <div className="px-2 py-3 mb-2">
          <div className="text-xs text-desk-muted uppercase tracking-wider">NUSSIF</div>
          <div className="text-lg font-semibold">Trading Desk</div>
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${
                isActive
                  ? "bg-desk-accent text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
        <div className="mt-auto px-2 text-xs text-desk-muted">
          v0.1.0 · <span className="text-emerald-400">●</span> live
        </div>
      </nav>
      <main className="flex-1 p-6 overflow-x-auto">
        <Routes>
          <Route path="/"         element={<Overview />} />
          <Route path="/crypto"    element={<Crypto />} />
          <Route path="/filings"   element={<Filings />} />
          <Route path="/congress"  element={<Congress />} />
          <Route path="/database" element={<Database />} />
        </Routes>
      </main>
    </div>
  );
}
