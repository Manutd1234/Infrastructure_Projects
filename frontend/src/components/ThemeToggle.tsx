import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("nussif-theme");
    if (saved) return saved === "dark";
    return false; // Default to institutional light theme inspired by IBKR Stress Test!
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("nussif-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("nussif-theme", "light");
    }
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark((prev) => !prev)}
      className="btn-secondary-inst !p-1.5 !rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink)]"
      title={isDark ? "Switch to Institutional Ivory Mode" : "Switch to Midnight Terminal Mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600" />
      )}
    </button>
  );
}
