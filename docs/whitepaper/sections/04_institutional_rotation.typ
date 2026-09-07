#import "../template.typ": *

= Institutional 13F-HR Holdings & Sector Rotation

Institutional investment managers exercising investment discretion over \$100 million or more in Section 13(f) securities are mandated by the U.S. Securities and Exchange Commission (*SEC*) to disclose long holdings via Form 13F-HR within 45 days of calendar quarter-end.

#v(8pt)

== Quantitative Formulation & Factor Decomposition

While 13F disclosures suffer from statutory reporting lag ($tau = 45$ days), institutional quarterly allocations reveal persistent, structural sector tilts that generate medium-term drift alpha.

=== Active Share Formulation

Following Cremers and Petajisto (2009), the Active Share ($A S_j$) of fund $j$ relative to the benchmark index (S&P 500) evaluates fundamental divergence:

$ A S_j = 1/2 sum_(i=1)^N | w_(i, j) - w_(i, b) | $

where $w_(i, j)$ is the portfolio weight of asset $i$ in fund $j$, and $w_(i, b)$ is the weight of asset $i$ in the benchmark. Funds exhibiting $A S_j >= 0.80$ represent high-conviction discretionary stock-pickers.

=== Sector Concentration & Herfindahl Index

Portfolio diversification across $K = 11$ GICS sectors is measured by the Herfindahl-Hirschman Index ($H H I$):

$ H H I_j = sum_(k=1)^K (100 dot w_(k, j))^2 $

#callout(title: "Proposition: Smart-Money Consensus Scoring", [
  Let $cal(M)$ represent the universe of tracked premier institutional managers ($|cal(M)| = 8$). The multi-manager consensus conviction score $C_i$ for asset $i$ is formulated as an AUM-weighted, rank-adjusted aggregation:
  $ C_i = sum_(j in cal(M)) ln("AUM"_j) dot sum_(r=1)^(10) (11 - r) dot bb(I)("Rank"_(i, j) = r) $
  Positions with $C_i$ exceeding the 90th percentile constitute the *Institutional High-Conviction Consensus Basket*.
])

#v(10pt)

== Empirical Tracking Universe (8 Premier Funds)

#table(
  columns: (2fr, 1.5fr, 1fr, 1.2fr, 1.2fr),
  table.header([*Manager / Firm*], [*Strategy*], [*Holdings*], [*Active Share*], [*Top Sector*]),
  [Berkshire Hathaway], [Value / Discretionary], [41], [0.89], [Technology (Apple)],
  [Bridgewater Associates], [Global Macro], [712], [0.74], [Consumer Staples],
  [Citadel Advisors], [Multi-Strategy Quant], [2,140], [0.82], [InfoTech & Financials],
  [Millennium Management], [Multi-Manager Pod], [1,890], [0.85], [Healthcare & Tech],
  [Renaissance Technologies], [Systematic Statistical], [1,240], [0.91], [Technology],
  [Pershing Square], [Concentrated Activist], [8], [0.94], [Consumer Discretionary],
  [Tiger Global], [Tech Growth / L/S], [48], [0.93], [Software & Internet],
  [Coatue Management], [TMT Thematic], [62], [0.88], [Semiconductors]
)
