export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse-soft rounded bg-white/[0.04] ${className}`} />
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center text-slate-600 text-xl mb-3">
        ∅
      </div>
      <p className="text-sm text-slate-200">{title}</p>
      {hint && <p className="text-xs text-slate-300 mt-1">{hint}</p>}
    </div>
  );
}
