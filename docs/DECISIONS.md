# Architecture Decision Records (ADRs)

Format: context → options tried → decision → consequences. Every spike outcome and every default
taken from `implementation.md` Section 14 is recorded here.

---

## ADR-0001: Local repo bootstrap (GitHub repo creation blocked)

- **Context:** `implementation.md` requires a new private GitHub repo
  `agni-007/certificate-generator-mobile`. The execution environment has `git` but **no `gh` CLI
  and no GitHub token**, and no non-interactive way to create a remote repo.
- **Options tried:** `gh repo create` (command not available); GitHub REST API (no token).
- **Decision:** initialise a **local** git repository on branch `main` with the project scaffold,
  and hand the owner exact push commands. Repo visibility: **private** (default per Section 14).
- **Consequences:** CI workflows are authored and committed but only run once the owner pushes to
  GitHub. Owner must run `git remote add` + `git push` (commands recorded in `docs/SPIKES.md`).

---

## ADR-0002: Node version pinned to 24.3.0

- **Context:** React Native 0.87.1 (Expo SDK 57) declares `engines.node = ^22.13.0 || ^24.3.0 || >=26.0.0`.
  The build machine shipped with Node 18.19.1.
- **Options tried:** Node 18 (fails RN engine range), Node 22 (also valid), Node 24 (current LTS line).
- **Decision:** pin `.nvmrc` to `24.3.0` — the minimum of the 24 line, valid for RN 0.87 and a
  long-term-support release. Core/spike code remains source-compatible with Node 18 so tests can
  run on the build machine too.
- **Consequences:** contributors need Node 24 for the full Expo toolchain; `test:core` and spikes
  also run on Node 18.
