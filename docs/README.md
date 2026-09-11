# NUSSIF Infrastructure Projects — Documentation

This folder contains the institutional documentation for the NUSSIF
Infrastructure Projects platform: a unified research-and-operations
environment that combines three quantitative data pipelines (crypto cycle
analysis, 13F filings, congress trading) with a high-performance FastAPI backend,
a SQLite WAL database, and a React "Trading Desk Operations" dashboard with
real-time WebSocket telemetry.

## Documentation Map

```
docs/
├── README.md                      # this file
├── CURRENT_STATE.md               # living status report (what works, what's next)
├── architecture/                  # system design and data flow
│   ├── ARCHITECTURE.md            # high-level system design
│   ├── DATA_PROCESSING_FLOW.md   # how data moves through pipelines
│   ├── DATA_OPS_BACKEND.md        # backend transport service design
│   ├── LATENCY_BUDGET.md          # end-to-end latency targets and benchmarks
│   ├── latency-bench.generated.json # automated benchmark run outputs
│   ├── UML_DIAGRAMS.md            # component, ER, and sequence diagrams (Mermaid)
│   └── ADR_*.md                   # architectural decision records
├── engineering/                   # development standards
│   ├── CODING_STANDARDS.md        # style, layout, Pydantic schemas, review rules
│   └── TLS_FLIP.md                # zero-downtime cert rotation runbook
├── planning/                      # product and project management
│   ├── PRD.md                     # product requirements
│   ├── PLAN.md                    # phased delivery plan
│   ├── TECH_STACK.md              # technology choices and rationale
│   └── WORKFLOW.md                # git, CI, release workflow
├── product/                       # user-facing documentation
│   ├── PRODUCT_GUIDE.md          # operator's manual for the 6 desk surfaces
│   ├── FEATURE_TOUR.md            # walkthrough of each quantitative feature
│   └── TESTING.md                 # test pyramid, pytest suite, and coverage
└── whitepaper/                    # formal / institutional write-up
    ├── main.typ                   # Typst entry point
    ├── template.typ               # Typst template
    ├── NUSSIF_Infrastructure_Projects_Whitepaper.pdf # compiled whitepaper
    └── sections/                  # modular whitepaper sections
```

## How to Read This Documentation

| Audience | Start here |
|---|---|
| New engineer onboarding | `planning/TECH_STACK.md` → `architecture/ARCHITECTURE.md` → `engineering/CODING_STANDARDS.md` |
| Product / PM | `planning/PRD.md` → `product/PRODUCT_GUIDE.md` → `planning/PLAN.md` |
| Operations / SRE | `architecture/LATENCY_BUDGET.md` → `engineering/TLS_FLIP.md` → `architecture/DATA_OPS_BACKEND.md` |
| External / institutional reader | `whitepaper/` (compile with Typst or read PDF) |
| Anyone wanting the current status | `CURRENT_STATE.md` |

## Conventions

- **Naming:** Markdown files use `SCREAMING_SNAKE_CASE.md` for top-level
  documents (e.g. `ARCHITECTURE.md`, `PRD.md`) and `snake_case.md` for
  supplementary files. ADRs are dated `ADR_YYYY-MM-DD_TITLE.md`.
- **Diagrams:** Use Mermaid so they render natively on GitHub and in Typst.
- **Living documents:** `CURRENT_STATE.md` and `PLAN.md` are updated as work
  progresses; everything else is versioned with the code.
- **No author attributions:** Documents describe the system, not who wrote
  them. History lives in `git log`.

## Compiling the Whitepaper

The institutional whitepaper is typeset with [Typst](https://typst.app):

```bash
cd docs/whitepaper
typst compile main.typ NUSSIF_Infrastructure_Projects_Whitepaper.pdf
```
