# Global Preferences

## User
Backend developer at a medical chamber

## Communication
- Output language: Polish when for external use, English otherwise

## Python Development
- Use `uv` for environment and package management
- Prefer Python where suitable
- Project structure: src layout with tests/ directory

## JavaScript/React Development
- Use `npm` for package management
- Vite for project scaffolding and build
- TypeScript always (type safety from day one)
- Tailwind CSS for styling

## Code Quality
- Type safety: where beneficial (Python type hints, TypeScript)
- Python: `ruff check`, `ruff format`, `pytest`
- JavaScript/React: `eslint` (typescript-eslint + react-hooks plugin), `prettier` (no semis, single quotes), `vitest`
- Testing (React): Vitest + React Testing Library + jsdom; test files co-located as `Component.test.tsx`; `vitest/globals` enabled
- All formatting and linting runs automatically via PostToolUse hooks — do not run manually

## Workflow
- Start with planning on any new project or significant feature
- Adhere strictly to the current spec and plan
- Stop for approval at review checkpoints — TDD gates are the usual anchor
- Mark phases/tasks DONE in the active plan file as you go

## Test-Driven Development (mandatory)
- **Always write tests BEFORE implementation** — Red → Green → Refactor
- **Tests are a design conversation**: present test files for approval before writing implementation code
- **Test descriptions in plain language**: `it('shows warning when confidence is low')` not `it('renders ConfidenceBadge with variant=warning when answer.confidence === low')`
- **Cycle**:
  1. Write test file describing expected behavior + edge cases
  2. Run tests — confirm they fail (Red)
  3. Review tests — discuss edge cases, missing scenarios, business logic
  4. Implement minimum code to pass (Green)
  5. Refactor if needed — tests catch regressions
- **What to test**: behavior and outcomes, not implementation details
- **Edge cases first**: null values, empty arrays, boundary conditions, error states

## Planning Workflow
Tool choice, from lightest to heaviest:
1. **Desktop app** → root `spec.md` only (initial ideation)
2. **`/ultraplan`** → small projects
3. **Superpowers** → larger projects. `brainstorming` → `writing-plans` → `subagent-driven-development`. Per-feature files under `docs/superpowers/{specs,plans}/YYYY-MM-DD-<topic>*.md`.

Brainstorming always comes first for superpowers work. Review checkpoints (TDD gates) pause for explicit approval.

## Security
- Validate input at system boundaries
- Environment variables for secrets
- Follow OWASP guidelines

## Documentation
- README.md for each project
- Docstrings for public functions
- API examples where applicable

## Git
- Initialize git at project creation, BEFORE any code is written
- Commit cadence: one commit per phase, per plan task, or per passing test cycle
- Commit messages: conventional commits (`feat/fix/chore/docs/refactor/test`), imperative present
- Push: only when explicitly asked
- .gitignore:
  - Python: .venv, __pycache__, .pytest_cache, *.pyc, .ruff_cache
  - JavaScript: node_modules, dist, .env.local
  - Common: .env
- Identity:
  - git config user.email "anna.kowalska@example.org"
  - git config user.name "AnnaKowalska"

## File Access
- Never read office documents (.docx, .doc, .xlsx, .xls, .pptx, .ppt, .odt, .ods, .odp, .rtf, .pages, .numbers, .key) or PDFs without explicit user permission
- Read permissions for common dev/text file types are auto-approved in settings.json

## Hooks & Automation (configured in ~/.claude/settings.json)
- **PostToolUse**: auto-format + auto-lint on every file edit (ruff for Python, Prettier + ESLint for JS/TS)
- **PreToolUse**: protected files (.env*, lock files) blocked from editing; git commit/push gates run tsc + vitest (JS/TS) and ruff + pytest (Python) — blocks on failure
- **PostToolUse**: test files (*.test.*, *.spec.*) reviewed for tautological assertions, missing negative cases
- **PostCompact**: extracts current phase from plan.md + last 20 lines of progress.md, injects as context
- Do not duplicate hook work manually — hooks handle formatting, linting, and commit gating

## Preferences
- Shell: zsh
- Keep solutions simple
- Keep me honest — say if I am wrong. No points for sycophancy
