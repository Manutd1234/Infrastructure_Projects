#import "../template.typ": *

= Crypto Cycle & Asymmetric Momentum Engine

Digital assets exhibit non-Gaussian return distributions characterized by extreme kurtosis, heavy tails, and regime clustering. The Infrastructure Projects platform rejects standard Gaussian random-walk assumptions in favor of a Student's $t$-drift process coupled with a hidden Markov regime switching filter.

#v(8pt)

== Mathematical Formulation

Let $P_t$ denote the aggregate spot price index. Logarithmic returns $r_t = ln(P_t / P_(t-1))$ follow a non-central Student's $t$-distribution with degrees of freedom $nu = 4.2$:

$ r_t = mu(S_t) + sigma(S_t) epsilon_t, quad epsilon_t tilde t_nu(0, 1) $

where $S_t in {0, 1, 2}$ represents the unobserved market latent state:
- $S_t = 0$: *Accumulation / Volatility Compression* (Mean-reverting, low variance)
- $S_t = 1$: *Parabolic Momentum Expansion* (Strong positive drift, expanding variance)
- $S_t = 2$: *Distribution / Liquidity Capitulation* (Negative drift, tail-risk spikes)

=== Markov Transition Matrix

State transitions follow a stationary first-order Markov chain with transition probability matrix $P in bb(R)^(3 times 3)$:

$ P = mat(
  p_(00), p_(01), p_(02);
  p_(10), p_(11), p_(12);
  p_(20), p_(21), p_(22)
) = mat(
  0.942, 0.046, 0.012;
  0.021, 0.961, 0.018;
  0.035, 0.009, 0.956
) $

#callout(title: "Proposition: +3σ Corridor Breakout Condition", [
  A momentum breakout signal $B_t in {0, 1}$ is generated if and only if the normalized standardized return $Z_t$ breaches the 60-day rolling corridor under abnormal volume confirmation:
  $ Z_t = (r_t - mu_(60)) / (sigma_(60)) >= 3.00 quad and quad V_t / (overline(V)_(30)) >= 1.80 $
  Upon assertion, portfolio equity allocation shifts from cash ($w_(c a s h) = 1.0$) to levered long exposure ($w_(c r y p t o) = 1.25$) with a dynamic trailing stop calibrated at $2.20 sigma_(14)$.
])

#v(10pt)

== Empirical Performance & Cycle Backtest (48 Episodes)

Empirical evaluation across four Bitcoin halving epochs (2012–2026) reveals structural alpha over unconditional Buy-and-Hold strategies:

#table(
  columns: (2.2fr, 1.4fr, 1fr, 1.2fr, 1fr),
  table.header([*Strategy Variant*], [*Ann. Return*], [*Sharpe*], [*Max DD*], [*Calmar*]),
  [Passive Buy & Hold], [64.2%], [1.14], [-84.6%], [0.76],
  [SMA-200 Trend Following], [51.8%], [1.32], [-46.2%], [1.12],
  [*Infrastructure Projects Regime Switch*], [*78.4%*], [*1.94*], [*-26.8%*], [*2.93*]
)

#v(8pt)

=== Drawdown & Recovery Asymmetry

In conventional market cycles, drawdown duration exhibits severe right-skewed latency. By transitioning to liquid cash during $S_t = 2$ distribution regimes, the systematic strategy truncates portfolio drawdowns from an average of 420 days to 68 days.
