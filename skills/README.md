# Skills

Cursor agent skills for the NUSSIF Infrastructure Projects platform.
Each `SKILL.md` encodes an operational runbook so the AI assistant can
perform common tasks without being told the steps each time.

## Skills

| Skill | When to use |
|---|---|
| `run-all-pipelines` | Refresh all three datasets and report freshness |
| `refresh-pipeline` | Refresh a single pipeline by name |
| `start-trading-desk` | Boot the database, backend, and dashboard |
| `generate-ops-report` | Produce a one-page ops status report |
| `compile-whitepaper` | Compile the Typst whitepaper to PDF |

## How skills work

A skill is a folder with a `SKILL.md` file. The frontmatter (`name`,
`description`) tells the assistant when to use it; the body is the
runbook. When the user's request matches a skill's description, the
assistant reads the skill and follows its steps.

## Adding a skill

1. Create a folder under `skills/` named after the operation.
2. Add `SKILL.md` with frontmatter (`name`, `description`) and a
   step-by-step body.
3. Keep skills small and composable. A skill should do one thing.
4. Reference other skills by name when a step depends on them.

## Conventions

- Skills use relative paths from the repo root.
- Skills never commit or push unless explicitly told to.
- Skills that mutate state (run pipelines, ingest data) should report
  what they changed.
