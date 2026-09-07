import { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = "",
  headerClassName = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}) {
  return (
    <section className={`panel-card p-5 sm:p-6 animate-fade-in ${className}`}>
      {(title || actions || badge) && (
        <header className={`flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border-subtle)] ${headerClassName}`}>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                {title && <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight">{title}</h2>}
                {badge && <div>{badge}</div>}
              </div>
              {subtitle && <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-1 font-medium leading-relaxed">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2.5">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
