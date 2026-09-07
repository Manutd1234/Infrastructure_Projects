# Coding Standards

These standards apply to **all** code in the repository — pipelines,
backend, frontend, notebooks, and skills. They are enforced in review and,
where possible, by CI.

## 1. Language and tooling

| Layer | Language | Linter / formatter | Type checker |
|---|---|---|---|
| Pipelines | Python 3.10+ | `ruff` (format + lint) | `mypy --strict` on shared modules |
| Backend | Python 3.10+ | `ruff` | `mypy --strict` |
| Frontend | TypeScript 5+ | `eslint`, `prettier` | `tsc --noEmit` |
| Notebooks | Python 3.10+ | `nbstripout` (clean outputs before commit) | — |

## 2. Python

### 2.1 Layout
- One module per concern. A module should fit on a screen; if not, split it.
- `__init__.py` only for re-exports; no logic.
- No `import *`. Explicit imports, grouped: stdlib, third-party, local.

### 2.2 Style
- 4 spaces, no tabs. Max line 100 chars (120 where unavoidable).
- Functions: snake_case. Classes: PascalCase. Constants: SCREAMING_SNAKE.
- Type-hint all public functions; use `from __future__ import annotations`
  so forward references work without strings.
- Docstrings: triple-double-quoted, Google style, with `Args:` / `Returns:`
  / `Raises:` sections for non-trivial functions.

### 2.3 Error handling
- Raise specific exceptions, never bare `Exception`.
- Never `except:` without re-raising — it swallows `KeyboardInterrupt`.
- Pipelines exit non-zero on failure so the scheduler can detect it.

### 2.4 Testing
- `pytest`. One test file per module under `tests/`.
- Use `tmp_path` for filesystem tests; never write to the repo root.
- Mock network with `responses` or `vcrpy`; do not hit real networks in CI.

## 3. TypeScript / React

### 3.1 Layout
- One component per file. Default export only for pages; named exports for
  components.
- Co-locate component, its styles, and its tests in one folder.

### 3.2 Style
- 2 spaces. Single quotes. Trailing commas. Semicolons always.
- Function components only; no class components.
- Hooks: `useX` prefix. Effects last; memoise with `useMemo` / `useCallback`
  only when measured.

### 3.3 State
- Server state via `@tanstack/react-query`. Cache keys are stable arrays.
- Client state via `zustand` or React context. No prop drilling past two
  levels.

### 3.4 Testing
- `vitest` + `@testing-library/react`. One `*.test.tsx` per component.

## 4. SQL

- Keyword UPPER, identifier lower_with_underscores.
- Every foreign key indexed. Every filter column indexed.
- Migrations are append-only; never edit a shipped migration.
- Read queries use `SELECT` with explicit column lists — no `SELECT *` in
  the backend.

## 5. Git

### 5.1 Branches
- `main` is always deployable.
- Feature branches: `feat/<short>`, `fix/<short>`, `docs/<short>`.
- Long-lived branches are deleted after merge.

### 5.2 Commits
- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
  `chore:`, `perf:`.
- Subject ≤ 72 chars, imperative mood. Body explains *why*, not *what*.
- One logical change per commit. If you need "and also", split.

### 5.3 Pull requests
- Linked issue required. Description, screenshots for UI, perf numbers for
  backend.
- Squash-merge for features; merge commits for release branches.
- Required reviews: one for `docs/`, two for `backend/` and `data/`.

## 6. Reviewing

Reviewers check, in order:
1. **Does it do the right thing?** (read the issue, the diff, run it)
2. **Does it respect the layering?** (no analytics in backend/frontend)
3. **Is it tested?** (happy path + one failure path minimum)
4. **Is it documented?** (public API has docstrings; user-facing changes
   update `docs/product/`)
5. **Is it clean?** (naming, no dead code, no commented-out blocks)

Style nits are caught by the linter and are not the focus of review.

## 7. Files and naming

- Folders: `snake_case` for Python, `kebab-case` for frontend, `PascalCase`
  for top-level project folders.
- Docs: `SCREAMING_SNAKE_CASE.md` for top-level docs, `snake_case.md` for
  supplementary.
- No author attributions in code or docs. History is in `git log`.

## 8. Notebooks

- Run `nbstripout --install` once so outputs are stripped on commit.
- Notebooks are exploratory. Production logic belongs in a pipeline.
- Name notebooks `NN_topic.ipynb` (zero-padded) so they sort in reading
  order.
