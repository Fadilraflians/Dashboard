# Logging & Tracing (MFE System)

Centralized, structured logging to trace **API calls** (server-side) and
**micro-frontend / shared-remote load problems** (client-side) across the
shell and MFEs. Useful during development and deployment.

## Where logs go

| Source | Logger | File |
|---|---|---|
| Shell server (requests, client events) | `rnd-template-shell/log.js` (winston) | `rnd-template-shell/logs/template-shell_<DATE>.log` |
| MFE BFF (API fetch to gateway) | `rnd-template-mfe-a/src/api/log.mjs` | `rnd-template-mfe-a/logs/*.log` |
| MFE-b BFF | `rnd-template-mfe-b/src/api/log.mjs` | `rnd-template-mfe-b/logs/*.log` |

Client-side events (browser) are **shipped to the shell** via `POST /api/client-log`
and written through the shell's winston logger, so everything shares one format.

## Categories (`[CAT:...]`)

Every log line is tagged with a category as the first token, so you can filter
by concern with a single grep:

| Category | What it covers |
|---|---|
| `FETCH_API` | API calls: shell gateway → backend, and MFE BFF → shell gateway. Includes **base URL + full target URL** so you can verify pointing. |
| `LOAD_MFE` | Loading/mounting an MFE remote (remoteEntry, init, get, mount). |
| `LOAD_SHARED` | Loading a component from the shared remote (`sharedUi`). |
| `SHELL` | Shell server requests + shell-internal events (config, nav). |

```bash
grep "CAT:FETCH_API"   logs/template-shell_*.log   # all API calls (+ URLs)
grep "CAT:LOAD_MFE"    logs/template-shell_*.log   # MFE load/mount lifecycle
grep "CAT:LOAD_SHARED" logs/template-shell_*.log   # shared card loads
grep "CAT:SHELL"       logs/template-shell_*.log   # shell requests/events
```

## Format (9 brackets)

```
[CAT:<category>] [timestamp] [LEVEL] [user] [flow] [method] [service] [status] [message] [duration]
```

- **user** — `@<id>` (authenticated) / `?anon` (no session)
- **flow** — `incoming` for client→server reports; `request/response/outgoing` for API
- **service** — origin tag: `MFE:dashboardBok`, `SHARED:sharedUi`, `SHELL`, `Server`
- **status** — the event code for client events (e.g. `MFE_LOAD_FAIL`), or HTTP status for API
- **message** — detail, includes `app=<key>`, the `<remoteEntry URL>`, and `env=<dev|prod>`
- **duration** — operation time in `ms`

## Client event catalog

| Event | Level | Service | When |
|---|---|---|---|
| `MFE_LOAD_START` | info | `MFE:<scope>` | Shell starts loading an MFE remote |
| `MFE_MOUNT_OK` | info | `MFE:<scope>` | MFE mounted successfully (has duration) |
| `MFE_LOAD_FAIL` | error | `MFE:<scope>` | MFE remoteEntry/init/get/mount failed (has url + duration) |
| `MFE_URL_MISSING` | error | `MFE:<scope>` | No remote URL configured (env missing) |
| `MFE_CONFIG_MISSING` | error | `MFE:<app>` | `/api/config` has no descriptor/URL for the app |
| `CONFIG_FAIL` | error | `SHELL` | `/api/config` fetch itself failed |
| `SHARED_CARD_OK` | info | `SHARED:sharedUi` | A shared card loaded (has duration) |
| `SHARED_CARD_FAIL` | error | `SHARED:sharedUi` | Shared remote down / card unavailable |

## Verifying backend pointing (FETCH_API)

`CAT:FETCH_API` lines include where the base URL came from and the full target,
so you can confirm an MFE is pointing at the right backend:

```
[CAT:FETCH_API] [request] [GET] [GATEWAY:dashboardBok] base=MFE_DASHBOARDBOK_BACKEND_URL=<http://host> target=<http://host/api/dashboard/summary>
[CAT:FETCH_API] [response] [GET] [GATEWAY:dashboardBok] [404] target=<http://host/api/dashboard/summary> [812ms]
```

- `base=<ENV_KEY>=<url>` tells you which env var supplied the base and its value.
- `target=<...>` is the exact URL hit. A 404 here means the backend has no such
  path — check whether the pointing (env) and the endpoint path (ServerUrlMap)
  are correct.
- If `base=(none)` / status `501`, no backend is configured for that app → the
  BFF falls back to mock data.

## Reading logs for deployment troubleshooting

The common deployment failures and how they show up:

- **MFE remote URL wrong / not deployed / CORS** → look for `MFE_LOAD_FAIL`.
  The `<url>` in the message is the exact `remoteEntry.js` the browser tried.
  Verify that URL is reachable and sends `Access-Control-Allow-Origin`.
- **Shared remote down** → `SHARED_CARD_FAIL` with `SHARED:sharedUi`. The two
  dashboard cards degrade to a fallback; everything else keeps working.
- **Env/config not wired** → `MFE_CONFIG_MISSING` (descriptor absent) or
  `MFE_URL_MISSING` (URL empty). Check `MFE_<APP>_URL` and `/api/config`.
- **Slow remotes** → compare `MFE_MOUNT_OK` / `SHARED_CARD_OK` durations.

### Quick greps

```bash
# All client-reported MFE/Shared events
grep -E "MFE_|SHARED_|CONFIG_" logs/template-shell_*.log

# Only failures
grep -E "\[ERROR\].*(MFE_LOAD_FAIL|SHARED_CARD_FAIL|CONFIG_FAIL)" logs/template-shell_*.log

# Everything about one remote URL
grep "localhost:9000/remoteEntry.js" logs/template-shell_*.log

# One user's session
grep "@<userId>" logs/template-shell_*.log
```

## Notes

- Client logging is **fire-and-forget**: it never blocks or breaks the UI.
  Failures to log are swallowed.
- Events are de-duped within a 2s window to avoid spam from re-renders.
- In standalone MFE dev (its own port, not inside the shell), `/api/client-log`
  does not exist, so client events are simply dropped — expected.
- `LOG_LEVEL` env controls verbosity (`info` default; set `warn`/`error` in prod
  to reduce noise, keeping failures).
