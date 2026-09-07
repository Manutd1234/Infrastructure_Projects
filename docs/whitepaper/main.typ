// NUSSIF Infrastructure Projects — Institutional Whitepaper
// Compile: /opt/homebrew/bin/typst compile main.typ NUSSIF_Infrastructure_Projects_Whitepaper.pdf

#import "template.typ": *

#show: doc => whitepaper(
  title: "NUSSIF Infrastructure Projects",
  subtitle: "High-Throughput Multi-Asset Quantitative Alpha, Asymmetric Regimes & Operational Infrastructure",
  version: "Version 2.4.0-PROD",
  date: "September 2026",
  classification: "INSTITUTIONAL QUANTITATIVE RESEARCH // RESTRICTED",
  doc,
)

#include "sections/01_abstract.typ"
#pagebreak()

#include "sections/02_architecture.typ"
#pagebreak()

#include "sections/03_crypto_momentum.typ"
#pagebreak()

#include "sections/04_institutional_rotation.typ"
#pagebreak()

#include "sections/05_congressional_alpha.typ"
#pagebreak()

#include "sections/06_risk_stress_testing.typ"
#pagebreak()

#include "sections/07_database_and_audit.typ"
#pagebreak()

#include "sections/08_conclusion.typ"
