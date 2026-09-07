import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <div
          className={`pointer-events-auto w-screen ${width} bg-[var(--panel)] border-l border-[var(--border)] shadow-2xl flex flex-col transform transition-transform duration-200 ease-out`}
        >
          {/* Header */}
          <div className="p-5 border-b border-[var(--border)] flex items-start justify-between bg-[var(--bg-subtle)]">
            <div>
              <h3 className="text-base font-bold text-[var(--ink)]">{title}</h3>
              {subtitle && (
                <p className="text-xs text-[var(--ink-secondary)] mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--border-subtle)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-inst space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
