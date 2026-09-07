"""Committee relevance signals.

The hypothesis: politicians on a given committee tend to trade stocks in
sectors that committee oversees (Armed Services → defense/industrials,
Energy → energy, Financial Services → financials, Health → healthcare,
Agriculture → consumer staples/materials, etc.).

This module provides:
  - COMMITTEE_SECTORS: committee -> set of GICS sectors it oversees
  - POLITICIAN_COMMITTEES: politician_id -> list of committees (curated for
    the most active congress traders; extendable)
  - committee_alignment(trades): for each trade, flag whether the trade's
    sector matches one of the politician's committees
  - summary tables: committee-aligned trade volume by committee, by sector
"""

from __future__ import annotations

import pandas as pd

# Map each congressional committee to the GICS sectors it has jurisdiction over.
COMMITTEE_SECTORS: dict[str, list[str]] = {
    "Armed Services": ["Industrials", "Technology"],
    "Banking, Housing, and Urban Affairs": ["Financials", "Real Estate"],
    "Finance": ["Financials"],
    "Agriculture, Nutrition, and Forestry": ["Consumer Staples", "Materials"],
    "Agriculture": ["Consumer Staples", "Materials"],
    "Energy and Natural Resources": ["Energy", "Materials", "Utilities"],
    "Energy and Commerce": ["Energy", "Healthcare", "Utilities", "Consumer Staples"],
    "Environment and Public Works": ["Industrials", "Materials", "Utilities"],
    "Commerce, Science, and Transportation": ["Industrials", "Technology", "Consumer Discretionary"],
    "Health, Education, Labor, and Pensions": ["Healthcare"],
    "Health, Education, Labor, and Pensions (HELP)": ["Healthcare"],
    "Foreign Relations": ["Industrials", "Energy", "Materials"],
    "Foreign Affairs": ["Industrials", "Energy", "Materials"],
    "Homeland Security and Governmental Affairs": ["Technology", "Industrials"],
    "Homeland Security": ["Technology", "Industrials"],
    "Intelligence": ["Technology", "Industrials", "Communication Services"],
    "Judiciary": ["Technology", "Communication Services"],
    "Rules and Administration": [],
    "Small Business and Entrepreneurship": [],
    "Veterans' Affairs": ["Healthcare", "Industrials"],
    "Appropriations": [],  # broad; not sector-specific
    "Budget": [],
    "Ways and Means": ["Financials", "Healthcare", "Consumer Discretionary"],
    "Science, Space, and Technology": ["Technology", "Industrials"],
    "Education and the Workforce": [],
    "Oversight and Accountability": ["Technology"],
    "Administration": [],
    "Ethics": [],
    "House Administration": [],
    "Natural Resources": ["Energy", "Materials"],
    "Transportation and Infrastructure": ["Industrials"],
    "Financial Services": ["Financials", "Real Estate"],
    "Armed Services (House)": ["Industrials", "Technology"],
    "Agriculture (House)": ["Consumer Staples", "Materials"],
}

# Curated politician -> committee mapping for the most active congress traders.
# politician_id is the bioguide/Capitol Trades id (e.g. "P000197").
# Committees are current/recent assignments; extend as the universe grows.
POLITICIAN_COMMITTEES: dict[str, list[str]] = {
    # --- Senate ---
    "W000802": ["Environment and Public Works", "Judiciary", "Health, Education, Labor, and Pensions"],  # Sheldon Whitehouse
    "B001277": ["Armed Services", "Commerce, Science, and Transportation", "Judiciary", "Health, Education, Labor, and Pensions"],  # Richard Blumenthal
    "C001088": ["Appropriations", "Foreign Relations", "Judiciary", "Small Business and Entrepreneurship"],  # Chris Coons
    "B001236": ["Agriculture, Nutrition, and Forestry", "Appropriations", "Veterans' Affairs", "Environment and Public Works"],  # John Boozman
    "M001243": ["Agriculture, Nutrition, and Forestry", "Finance", "Health, Education, Labor, and Pensions", "Intelligence"],  # Dave McCormick
    "S001232": ["Armed Services", "Commerce, Science, and Transportation", "Veterans' Affairs"],  # Tim Sheehy
    "S001217": ["Commerce, Science, and Transportation", "Finance", "Armed Services"],  # Rick Scott
    "W000805": ["Finance", "Banking, Housing, and Urban Affairs", "Intelligence", "Rules and Administration"],  # Mark Warner
    # --- House ---
    "P000197": ["Appropriations", "Financial Services"],  # Nancy Pelosi (former Speaker)
    "J000309": ["Agriculture", "Homeland Security"],  # Jonathan Jackson
    "R000619": ["Agriculture", "Transportation and Infrastructure"],  # Michael Rulli
    "M001239": ["Armed Services", "Homeland Security"],  # John McGuire
    "F000110": ["Appropriations", "Budget"],  # Cleo Fields
    "H001082": ["Ways and Means", "Appropriations"],  # Kevin Hern
    "C001068": ["Judiciary", "Transportation and Infrastructure"],  # Steve Cohen
    "B001292": ["Ways and Means", "Science, Space, and Technology"],  # Don Beyer
    "M001217": ["Oversight and Accountability", "Foreign Affairs"],  # Jared Moskowitz
    "M001234": ["Energy and Commerce"],  # Kelly Morrison
    "K000375": ["Foreign Affairs", "Armed Services"],  # Bill Keating
    "D000617": ["Ways and Means", "Energy and Commerce"],  # Suzan DelBene
    "T000490": ["Agriculture", "Small Business and Entrepreneurship"],  # David Taylor
    "M001236": ["Agriculture", "Transportation and Infrastructure"],  # Tim Moore
    "W000829": ["Transportation and Infrastructure", "Small Business and Entrepreneurship"],  # Tony Wied
    "K000398": ["Energy and Commerce", "Financial Services"],  # Thomas Kean Jr
    "A000372": ["Agriculture", "Financial Services"],  # Rick Allen
    "C001055": ["Appropriations"],  # Ed Case
    "P000608": ["Energy and Commerce"],  # Scott Peters
    "M001218": ["Armed Services", "Foreign Affairs"],  # Rich McCormick
    "G000591": ["Appropriations", "Ethics"],  # Michael Guest
    "T000488": ["Agriculture", "Small Business and Entrepreneurship"],  # Shri Thanedar
    "T000491": ["Armed Services", "Small Business and Entrepreneurship"],  # Derek Tran
    "M001205": ["Transportation and Infrastructure", "Ways and Means"],  # Carol Miller
    "M000871": ["Agriculture", "Transportation and Infrastructure"],  # Tracey Mann
    "F000459": ["Appropriations", "Armed Services"],  # Chuck Fleischmann
    "K000376": ["Ways and Means", "Armed Services"],  # Mike Kelly
    "B001327": ["Agriculture", "Transportation and Infrastructure"],  # Rob Bresnahan
    "K000389": ["Armed Services", "Oversight and Accountability"],  # Ro Khanna
    "G000583": ["Financial Services"],  # Josh Gottheimer
    "F000479": ["Agriculture, Nutrition, and Forestry", "Banking, Housing, and Urban Affairs", "Health, Education, Labor, and Pensions"],  # John Fetterman
}


def sectors_for_committee(committee: str) -> list[str]:
    return COMMITTEE_SECTORS.get(committee, [])


def committees_for_politician(politician_id: str) -> list[str]:
    return POLITICIAN_COMMITTEES.get(politician_id, [])


def is_committee_aligned(politician_id: str, sector: str) -> tuple[bool, list[str]]:
    """Return (aligned, list_of_matching_committees)."""
    if not sector or sector == "Unknown":
        return False, []
    matched = []
    for cmte in committees_for_politician(politician_id):
        if sector in sectors_for_committee(cmte):
            matched.append(cmte)
    return bool(matched), matched


def add_committee_alignment(trades: pd.DataFrame) -> pd.DataFrame:
    """Add `committee_aligned` (bool) and `matching_committees` (str) columns."""
    aligned = []
    matched_list = []
    for _, row in trades.iterrows():
        ok, cmtes = is_committee_aligned(row["politician_id"], row.get("sector", "Unknown"))
        aligned.append(ok)
        # Use " | " separator because committee names contain commas.
        matched_list.append(" | ".join(cmtes))
    out = trades.copy()
    out["committee_aligned"] = aligned
    out["matching_committees"] = matched_list
    return out


def committee_summary(trades: pd.DataFrame) -> pd.DataFrame:
    """Per-committee trade volume and buy/sell breakdown for aligned trades."""
    aligned_trades = trades[trades["committee_aligned"]]
    if aligned_trades.empty:
        return pd.DataFrame(columns=["committee", "n_trades", "n_buy", "n_sell",
                                      "n_politicians", "total_size_low_usd"])
    rows = []
    all_committees = sorted(
        set(c for s in aligned_trades["matching_committees"] for c in s.split(" | ") if c)
    )
    for cmte in all_committees:
        # Match on the exact committee token using the " | " delimiter to avoid
        # matching substrings of other committee names.
        mask = aligned_trades["matching_committees"].apply(
            lambda s: cmte in s.split(" | ")
        )
        sub = aligned_trades[mask]
        rows.append({
            "committee": cmte,
            "n_trades": len(sub),
            "n_buy": int((sub["trade_type"] == "buy").sum()),
            "n_sell": int((sub["trade_type"] == "sell").sum()),
            "n_politicians": sub["politician_id"].nunique(),
            "total_size_low_usd": float(sub["size_low_usd"].sum()),
        })
    return pd.DataFrame(rows).sort_values("n_trades", ascending=False).reset_index(drop=True)
