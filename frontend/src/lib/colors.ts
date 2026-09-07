// Sector color palette — consistent across all charts.
export const SECTOR_COLORS: Record<string, string> = {
  Technology: "#60a5fa",
  Financials: "#34d399",
  Healthcare: "#fb7185",
  "Consumer Discretionary": "#fbbf24",
  "Consumer Staples": "#c084fc",
  "Communication Services": "#22d3ee",
  Industrials: "#fb923c",
  Energy: "#a3e635",
  Materials: "#f472b6",
  "Real Estate": "#2dd4bf",
  Utilities: "#94a3b8",
  Unknown: "#475569",
};

export function colorForSector(s: string): string {
  return SECTOR_COLORS[s] ?? "#64748b";
}
