#import "../template.typ": *

= Multi-Factor Scenario Stress Testing & Risk Engine

Institutional risk management mandates evaluating portfolio solvency under non-normal joint fat-tail market dislocations where linear Gaussian correlation structures break down.

#v(8pt)

== Second-Order Non-Linear Factor Expansion

Let $Pi$ denote total portfolio equity with asset weights $w_i$. For macroeconomic shocks $Delta bold(F) = [Delta S_(e q), Delta y, Delta sigma, Delta "FX"]^T$, the non-linear Taylor series approximation of portfolio P&L ($Delta Pi$) is formulated as:

$ Delta Pi approx sum_(i=1)^N w_i [ beta_(i, e q) Delta S_(e q) + beta_(i, y) Delta y + beta_(i, sigma) Delta sigma + 1/2 gamma_i (Delta S_(e q))^2 + C_(i, "liq") ] $

where $gamma_i = (partial^2 Pi_i) / (partial S^2)$ captures non-linear convexity (gamma/curvature) and $C_(i, "liq")$ models illiquidity fire-sale slippage.

=== Parametric & Conditional Value-at-Risk

At statistical confidence level $alpha = 0.99$, Parametric Value-at-Risk ($"VaR"_(99%)$) and Expected Shortfall / Conditional VaR ($"CVaR"_(99%)$) are computed as:

$ "VaR"_(99%) = - (mu_p + z_(0.01) sigma_p) $
$ "CVaR"_(99%) = bb(E) [ - R_p mid - R_p >= "VaR"_(99%) ] = - mu_p + sigma_p (phi(z_(0.01))) / 0.01 $

#callout(title: "Liquidity Penalty & Impact Slippage", [
  Under stressed liquidation, market impact scales non-linearly with participation rate according to the Almgren-Chriss square-root law:
  $ "Cost"_(i, "impact") = 1/2 s_i + eta_i (Q_i / V_i)^(0.6) $
  where $s_i$ is the bid-ask half-spread, $Q_i$ is order quantity, and $V_i$ is average daily volume.
])

#v(10pt)

== Interactive Brokers (IBKR) Historical Stress Suite

#table(
  columns: (2fr, 1.2fr, 1.2fr, 1.2fr, 1.5fr),
  table.header([*Macro Stress Scenario*], [*SPX Shock*], [*Rate Shift*], [*VIX Spike*], [*Portfolio Drawdown*]),
  [2008 Global Financial Crisis], [-48.0%], [-250 bps], [+280%], [-18.4% (Hedged)],
  [2020 COVID Flash Crash], [-34.0%], [-150 bps], [+320%], [-14.2% (Liquid)],
  [2022 Fed Tech Compression], [-33.0%], [+425 bps], [+85%], [-11.6% (Factor Neutral)],
  [2026 Sovereign Debt Liquidity], [-22.0%], [+120 bps], [+160%], [-9.8% (Multi-Asset)]
)
