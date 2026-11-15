# Genesis dashboard widgets

Every `widget-*.js` exports a renderer that receives `(host, { data, navigate, api })`.
`frontend/features/dashboard.js` imports these client modules and passes them to the reusable `createWidgetDashboardView` from the REBEL Engine.

Widgets supplied: Request Portfolio, Processing Pipeline, API Telemetry, Submission Trend, Configured Modules, educational Event Hash Chain, and Recent Workflow Activity. The data is read from existing Genesis REST endpoints every 8 seconds, **not invented**. The chain is a client-side hash-linked illustration, not a blockchain and not a tamper-proof audit ledger.

Add a new widget by creating a file here, importing its renderer in `features/dashboard.js` and including an entry in `widgets`. No engine modifications required.
