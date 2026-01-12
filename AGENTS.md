# AGENT GUIDE

This file captures the conventions that autonomous agents should follow while working inside `@abyrd9/harbor-cli`. It lives at the repository root and governs every subdirectory unless a more specific `AGENTS.md` exists downstream.

## Purpose
- Keep every agent aligned on `bun`-first tooling, TypeScript accuracy, and tmux-aware UX.
- Provide explicit commands for building, linting, and testing (including targeting a single test case).
- Summarize code style, naming, formatting, and error-handling expectations so changes stay consistent.

## Tooling (Build / Lint / Test)
1. **Dependency hygiene** – run `bunx npm-check -u` (`npm-check` updates dependencies interactively).
2. **Compilation** – run `bunx tsc` (builds via TypeScript) or `bun run build` (alias for the same task via `scripts.prepare`).
3. **CLI smoke** – execute `bun dist/index.js` or `bun run start` to launch the built CLI when manual verification is needed.
4. **Primary test suite** – run `bun run test`; the suite uses `vitest` and is configured in `package.json`.
5. **Watch mode** – run `bun run test:watch` for iterative development.
6. **Releasing** – run `bash release.sh` through the `release` script when publishing a new version.
7. **Single-test** – slice the test runner with `bun run test -- --runTestsByPath tests/<name>.test.ts` or narrow by name via `bun run test -- --filter 'Session Name Environment Variable'`.
8. **Manual linting** – no formal linter is configured, so rely on consistent formatting rules described below; focus on keeping `node:` specifiers and `import` order tidy.
9. **Extra helpers** – run `bun run harbor` to exercise the CLI in a non-global scenario; this mirrors `start` but ensures the local CLI binary is used.

## Directory Expectations
- `dist/` and `scripts/` are published (see `package.json.files`); avoid editing generated files directly unless you intend to regenerate them.
- `tests/` contains Vitest-driven suites; follow the existing structure when adding new tests.
- `test-services/web/.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc` contains workspace-specific tooling rules (see the "Cursor and Copilot rules" section below).

## Imports & Module Style
- Always place imports at the top of each file and keep them sorted roughly by origin: third-party packages first, followed by built-in `node:` specifiers, then relative modules.
- Prefer `node:` prefixes for core modules (`node:fs`, `node:path`, `node:child_process`, etc.).
- De-duplicate named imports from the same module instead of spreading them across multiple statements.
- Bypass `require` entirely; this repo is ESM (`package.json` sets `type: module`).

## Naming
- Use `PascalCase` for `interface`/`type` declarations (e.g., `Dependency`, `SessionInfo`).
- Use `camelCase` for functions, variables, and constants (e.g., `detectOS`, `log`, `execAsync`).
- Prefer descriptive names rather than abbreviations; clarity beats terseness.
- Environment variables (e.g., `HARBOR_SESSION_NAME`) remain uppercase with underscores when referenced.

## Formatting & Style
- Use two-space indentation and always terminate statements with semicolons.
- Keep line length around 100 characters; break strings with template literals when necessary.
- Use `const` by default; switch to `let` only when mutability is required.
- Group helper functions logically (e.g., `execInPane`, `capturePane`, `sendToPane` belong to the same conceptual area).
- When building long arrays (like `requiredDependencies`), align fields vertically to highlight structure.
- Maintain single blank lines between logical sections (helpers, command definitions, CLI registration).

## Types & Interfaces
- Prefer `interface` definitions for configuration objects (`Config`, `DevService`, etc.).
- Use `type` aliases for unions or more abstract shapes when it makes the intent clearer.
- Always declare explicit return types for exported or async helpers (`async function checkDependencies(): Promise<void>`).
- Narrow discriminated unions or optional fields before using them (`const service = session.services[target]; if (!service) throw new Error(...)`).

## Error Handling & Flow
- Guard runtime operations with `try/catch` when they rely on the filesystem or external processes (see `checkDependencies`).
- When throwing errors, include actionable text (`throw new Error('Please install missing dependencies before continuing')`).
- Prefer logging through `log.error`, `log.warn`, `log.info`, etc., which wrap `picocolors` for consistency.
- Exit early for missing prerequisites; do not let the CLI continue when the environment is invalid.
- Use descriptive helper functions to centralize repeated behaviors (`getInstallInstructions`, `promptConfigLocation`).

## Prompts & User Interaction
- Keep prompts concise yet informative (`log.plain` followed by `pc.dim` hints).
- When asking for user input, do not mix `console.log` with `readline` prompts; rely on helper functions that close their interfaces cleanly.

## Testing Guidance
- Tests live entirely under `tests/` and target the compiled `dist/index.js` binary.
- Favor Vitest’s `describe`/`it` structure and keep each case focused on a single behavior (see `tests/cli-commands.test.ts`).
- When spawning subprocesses, set `NO_COLOR: '1'` in the environment to stabilize snapshots.
- Use helper factories like `runCLI` and `runCLIWithEnv` to capture stdout/stderr and exit codes cleanly.
- Single test files can be executed with `bun run test -- --runTestsByPath tests/<file>.test.ts` or filtered with `--filter "Partial name"`.
- Favor targeted string matches and simple state checks instead of full fixtures when verifying CLI help text.
- Simulate tmux-related environments by setting variables such as `TMUX` and `TERM` rather than spawning real sessions.
- Keep helper functions near their describe blocks to reduce duplication while maintaining clarity.

## Troubleshooting
- "Missing required dependencies"? Install `tmux` and `jq` as the CLI suggests, then rerun Harbor.
- "No harbor configuration found"? Run `harbor dock` (or `harbor moor`) and ensure you are in the correct project root.
- "Services not starting"? Verify each service's `command` and working directory by running them manually and reviewing logs.
- "Tmux not responding"? Run `tmux kill-session -t harbor` (or the socket listed in `.harbor/session.json`) and restart before launching.

## Session & Logs
- `.harbor/` houses `session.json` plus `{session}-{service}.log`; keep it in `.gitignore` and never commit its contents.
- Logs are automatically trimmed (default 1000 lines) and stripped of ANSI codes to prevent runaway files.
- Reference `.harbor/` log paths in documentation when you want reviewers or agents to follow runtime output.
- When sharing captured service output, include the `session` name and timestamp so readers can correlate entries.

## Logging & Diagnostics
- Centralize CLI logging through the `log` object (see `index.ts`). This keeps color usage uniform and eases future formatting changes.
- Avoid `console.log` outside of the `log` helper; use `log.cmd`/`log.step` for command reporting.
- When running critical sections (launch, ship logs to `.harbor/`), include step markers (`log.step('Launching services...')`).

## Release & Deploy Notes
- Keep `harbor.json` generation idempotent; editing the CLI’s output should be done through config helpers, not manual JSON reformatting.
- Before releasing, ensure `visit dist` has updated compiled JS, then run `bash release.sh` (triggered via `npm` script `release`).

## Cursor and Copilot Rules
- The repository has a Cursor rule under `test-services/web/.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`. Agents working on matching files should:
  - Prefer Bun commands for running scripts, tests, and builds (`bun`, `bunx`, `bun test`, `bun run <script>`).
  - Avoid explicit usage of `node`, `npm`, `pnpm`, `vite`, `express`, or the `dotenv` package when Bun offers a built-in alternative.
  - Use Bun-native APIs (e.g., `Bun.serve`, `Bun.file`, `Bun.redis`) when writing or modifying files that match the Cursor rule’s globs.
- There are no Copilot instruction files in `.github/`, so there are no repository-wide AI-assistant overrides beyond this AGENTS document.

## Working with Git/Worktrees
- Always respect the root-level `AGENT` rules when branching or committing.
- If you need worktrees, use the `wt` CLI (worktrunk) with the approved prefixes (`feat/`, `bug/`, etc.).
- Do not edit generated files under `dist/` unless you can rebuild them immediately via `bunx tsc`.

## Implementation Practices
- Group related helpers (tmux helpers, prompts, service discovery) together and document their contracts.
- Keep the `log` helper adjacent to other CLI abstractions so color schemes stay consistent.
- Favor `async` helper wrappers that return `Promise<void>` or typed results instead of embedding long callbacks.
- Use default arguments (e.g., `timeout = 3000`) when a reasonable fallback exists, and expose explicit `options` objects for extensibility.
- Avoid deep nesting by returning early after guard clauses and by extracting repeated logic into descriptive helpers.
- Document invariants such as `session.services[target]` near their helpers so future readers understand why the guards exist.
- Keep metadata describing tmux windows, socket names, and commands grouped with the helper that consumes them.
- When logging multi-line output, separate sections with blank lines so `picocolors` markers stay visible and output remains scannable.

## Config Files & Data
- Harbor configuration is read from `harbor.json` or the `harbor` key in `package.json`; keep parsing helpers deterministic and idempotent.
- Treat `.harbor/session.json` and service log files as transient data stores—always read them with guards (`fs.existsSync`) and bail out if corruption is detected.
- Document newly added configuration fields in this file so future agents can follow the same schema expectations.
- Keep `scripts/` utilities in sync with `harbor.schema.json` and `harbor.package-json.schema.json` when you touch configuration-related code.
- Validate `services` arrays before iterating and provide actionable errors when required fields (like `path` or `command`) are missing.
- Keep `before`/`after` scripts explicit and sequential so startup/shutdown flows stay predictable.
- When extending the config, update the schema files so type tooling and JSON editors stay accurate.

## Working Locally
- Use `bun run start` or `bun dist/index.js` to verify CLI behavior against staged changes before running full test suites.
- Run `bun run harbor` when you need to exercise the CLI as a local binary without installing globally.
- Keep `.harbor/` in `.gitignore`; it houses tmux session metadata and per-service logs that agents can inspect but should not commit.
- When debugging tmux interactions, copy relevant pane captures into fixtures under `tests/` rather than hardcoding screen output inside helpers.
- Set `NO_COLOR=1` when running the CLI inside suites or temp shells to keep log comparisons deterministic.
- Use `bun run test -- --watch` for interactive development; stop watchers before creating commits.
- When debugging flows, snapshot `.harbor/session.json` and share it with teammates instead of screenshots.

## Terminal & Tmux Interactions
- Prefer `tmux -L ${session.socket}` commands with explicit quoting to avoid ambiguous socket references.
- When sending commands to a pane, wrap them with start/end markers so captured output is predictable (`<<<HARBOR_START_...>>>`).
- Use the `sleep` helper to wait for panes to settle before capturing text or sending follow-up commands.
- Keep `execAsync` wrappers nearby to avoid repeated `spawn` boilerplate; share them across `sendToPane`, `capturePane`, and `execInPane` helpers.
- Keep tmux pane references (window numbers, targets) in the session info map and validate them before use.
- Avoid direct `shell` interpolation that could swallow user input; escape double quotes before forwarding commands to tmux.
- When capturing panes, specify `-S`/`-p` ranges so only the recent output is returned.
- Always clear timers or watchers created around `execAsync` to prevent stray subprocesses.
- Wrap long-running tmux invocations with explicit `timeout` guards before killing and reporting failure.

## Documentation & Communication
- Mention new dependencies or dev-dependencies when touching `package.json` so reviewers know about changes.
- If you introduce new scripts, document them here and in any relevant README or schema file.
- Keep docs (README, harbor.schema.json, harbor.package-json.schema.json) and `AGENTS.md` in sync when you surface new CLI options or configuration fields.
- When supporting new features, list any new tmux shortcuts, environment variables, or log formats so future agents know how to reproduce the behavior.
- Reference `.harbor/` log conventions in docs whenever you add new output or log rotation behavior.

## Communication & Logs
- When invoking `bun run test`, include the test scope/filter in the commit message or PR description so reviewers understand what was targeted.

Agents should refer back to this guide whenever they touch the CLI, tests, or tooling scripts. If future work introduces more granularity (e.g., per-subdirectory `AGENTS.md`), this document should be updated to point agents to the new scope.

## Harbor Inter-Pane Communication

When running inside a Harbor session, you can observe and interact with other service panes.

**Before doing anything else, run:**
bun run harbor context
