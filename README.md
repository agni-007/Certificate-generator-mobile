# Certificate Generator (Mobile)

A **fully offline** Android + iOS app that turns a certificate template (PDF/PNG/JPG) plus a list
of names into individual personalised certificates — on-device, with no server and no network calls.

This project implements the specification in [`implementation.md`](./implementation.md).

## Status

See [`PROGRESS.md`](./PROGRESS.md) for the current phase and task. Implementation follows the
phased plan in `implementation.md` Section 11, starting with Phase 0 (de-risking spikes).

## Principles

- **Offline by construction.** No `fetch`, XHR, WebSocket, analytics, crash reporters, remote
  fonts/images, or OTA updates. A CI "offline audit" enforces this, and production Android builds
  block the `INTERNET` and `ACCESS_NETWORK_STATE` permissions.
- **Pure core.** `src/core` is pure TypeScript (no `react-native`/`expo-*` imports) and
  unit-tested in Node. Platform code lives behind ports in `src/platform`.
- **One renderer for preview and export.** Position parity is covered by automated tests.

## Develop

```bash
nvm use              # Node version pinned in .nvmrc
npm install
npm run lint
npm run typecheck
npm run test
npm run offline-audit
```

### Phase 0 spikes

```bash
cd spikes
npm install
npm run s2           # pdf-lib timings/memory/file size
npm run s3           # Skia/HarfBuzz shaping check + PNG screenshots
npm run s4           # ZIP (fflate fallback)
npm run s5           # spreadsheet parsing
```

Results live in [`docs/SPIKES.md`](./docs/SPIKES.md); decisions in
[`docs/DECISIONS.md`](./docs/DECISIONS.md); dependencies in
[`docs/DEPENDENCIES.md`](./docs/DEPENDENCIES.md).

## Licence

Not yet chosen — see [`LICENSE_DECISION.md`](./LICENSE_DECISION.md).
