# Workflow

How work moves from idea to production. Read alongside
`engineering/CODING_STANDARDS.md` (the rules) and `planning/PLAN.md` (the
plan).

## 1. Branches

- `main` — always deployable; protected; requires 2 reviews for
  `backend/` and `data/`, 1 for `docs/`.
- `feat/<short>`, `fix/<short>`, `docs/<short>`, `refactor/<short>` —
  short-lived, deleted after merge.
- No long-lived dev branches. If a feature takes more than a week, split
  it.

## 2. A typical change

1. **Issue.** Open an issue describing the problem and the proposed
   approach. Link to the relevant doc (`PRD.md`, an ADR, a runbook).
2. **Branch.** `git switch -c feat/<short>` from `main`.
3. **Code.** Small commits, Conventional Commits messages. Run linters
   locally (`ruff format && ruff check && mypy` or `npm run lint`).
4. **Test.** Add tests alongside the change. `pytest` / `vitest`. Hit
   the happy path and at least one failure path.
5. **Docs.** Update `docs/` if the change is user-visible or changes
   architecture. Update `CURRENT_STATE.md` if it changes status.
6. **PR.** Push, open a PR with the issue link, screenshots for UI,
   perf numbers for backend. Request review.
7. **Review.** Reviewer checks §6 of `CODING_STANDARDS.md`. Comments are
   resolved before merge.
8. **Merge.** Squash-merge for features. The commit message is the PR
   title prefixed with the type (`feat:`, `fix:`, …).
9. **Verify.** Watch CI on `main`. If it fails, fix forward with a
   follow-up PR; do not force-push `main`.

## 3. CI

Every PR and every `main` push runs:

| Job | Steps |
|---|---|
| `lint-py` | `ruff format --check`, `ruff check`, `mypy` |
| `lint-ts` | `eslint`, `prettier --check`, `tsc --noEmit` |
| `test-py` | `pytest` (pipelines + backend) |
| `test-ts` | `vitest run` |
| `smoke-pipelines` | Run each pipeline with `--smoke` (uses fixture cache, no network) |
| `schema-check` | Verify every `outputs/*.csv` matches `database/schema.sql` |
| `import-boundary` | Fail if `backend/` imports from `data/pipelines/` or `frontend/` imports from `backend/` |
| `build-frontend` | `npm run build` (catches type and bundle errors) |

CI must be green to merge. `main` is deployable at every commit.

## 4. Releases

- No formal release cadence yet; `main` is the release.
- Target: tagged releases monthly once the dashboard is end-to-end.
- The whitepaper PDF is a release artifact, compiled from `docs/whitepaper/`
  in the release job.

## 5. Local development

```bash
# one-time
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
pip install -r data/pipelines/*/requirements.txt
cd frontend && npm install && cd ..

# database
python database/init_db.py

# backend (terminal 1)
uvicorn backend.app.main:app --reload

# frontend (terminal 2)
cd frontend && npm run dev

# run a pipeline (terminal 3)
cd data/pipelines/crypto_bull_cycle && python main.py
```

`.env` is loaded by the backend via `pydantic-settings`; copy
`.env.example` to `.env` and adjust.

## 6. Data refresh workflow

- **Scheduled:** cron runs each pipeline on its policy (see
  `DATA_PROCESSING_FLOW.md` §5). The pipeline writes CSVs and the loader
  ingests them into SQLite.
- **Manual:** the operator clicks "Run" on the dashboard; the backend
  spawns the pipeline subprocess and records the run.
- **Cache invalidation:** delete a pipeline's `cache/` folder to force a
  full re-pull on the next run. Use sparingly — it's impolite to the
  upstream sources.

## 7. Hotfix workflow

1. Branch `fix/<short>` from `main`.
2. Minimal change + regression test.
3. PR with `hotfix:` prefix; request expedited review.
4. Merge; do not wait for the next release window.
5. Post-merge: add a line to `CURRENT_STATE.md` and, if user-facing, a
   note in the next release notes.

## 8. Secrets

- Local: `.env` (gitignored). Never commit.
- CI: GitHub Actions secrets. Names prefixed `NUSSIF_`.
- Production: environment of the service; rotated via the TLS flip runbook
  for certs, via the secrets manager for keys.
