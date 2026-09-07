// NUSSIF Infrastructure Projects — Institutional Whitepaper
// Compile: typst compile main.typ AlphaEngine_Institutional_Whitepaper.pdf

#import "template.typ": *

#show: doc => whitepaper(
  title: "NUSSIF Infrastructure Projects",
  subtitle: "An institutional research-and-operations platform",
  author: "NUSSIF",
  date: datetime.today().display(),
  doc,
)

#include "sections/01_abstract.md"
#include "sections/02_system_overview.md"
#include "sections/03_crypto_cycle.md"
#include "sections/04_filings.md"
#include "sections/05_congress.md"
#include "sections/06_risk.md"
#include "sections/07_conclusion.md"
