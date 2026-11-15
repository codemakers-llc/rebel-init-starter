# CODEMAKERS REBEL · INIT NEW (alpha.8.17 (publication candidate))

Frontend prototype starter extracted from the **validated Genesis alpha.8.22** reference. No ROGUE backend, SQL or Swagger. Built with REBEL frontend components and a simple Node HTTP JSON demonstration adapter.

## What is included
- Full original Genesis CSS stack: `rebel-base.css`, `rebel-admin.css`, `rebel-admin-refinement.css`, `app.css`; original responsive rules preserved
- Minimal palette, Light theme default; complete Theme Studio UI
- One Demo hero card with access to every initial view; new views are editable in Designer
- Dashboard widgets and simulated browser-local telemetry (2-second samples), no recurring HTTP polling
- Request creation / review flows, catalog CRUD, View Designer, Menu Designer, and audit trail
- Persistent synthetic records/configuration via `scripts/data/runtime.json` (created from `runtime.seed.json`)

## Run locally

```sh
npm install
npm test
npm start
```

Default: http://localhost:3100 . Change `PORT` to avoid conflicts.

**Local testing with an unpacked Engine:** `npm install ../rebel` (from this starter folder).

**Security:** role selection is a frontend demo. JSON storage and these demo endpoints do not constitute authentication or production-grade server authorization.

**Distribution:** the CLI `rebel init new --local ../rebel-init-starter` imports this repository. The installed Engine also embeds a copy of this template for offline init.

To reset the demo data, stop the server and delete `scripts/data/runtime.json`; the seed is copied on next start.

## Default navigation

A fresh INIT NEW project starts with a **single Demo menu section**, containing dashboard, sample catalogs, request creation/review, View Designer, Menu Designer, Theme Studio and Audit Trail. All initial views are available to Demo. The Designer can add new views; this is prototype-only visibility, not production RBAC.

The menu configuration is seeded in `scripts/data/runtime.seed.json` and copied to the writable `scripts/data/runtime.json` at first run. Existing runtime files are not overwritten.
