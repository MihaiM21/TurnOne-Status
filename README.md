# Turn One Status

Independent status page for Turn One (`https://status.t1f1.com`). It runs on its own VPS, separate from the platform it monitors, so it stays up when the platform is down. Next.js 16 (standalone output), built-in `node:sqlite` (no native deps), a probe scheduler started from `instrumentation.ts`.

Components are defined in `lib/status/components.ts`, in four groups: Sim Racing, Formula 1, Platform, Developers. Each component has one or more HTTP probes and an `expect` function that turns a response into ok / degraded / fail.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000, scheduler runs in-process
npm run probe        # run one probe tick against a temp DATA_DIR and print a summary (TICKS=2 for more)
```

Set `STATUS_DISABLE_SCHEDULER=1` to run the UI without probing. Data goes to `./data/status.db` unless `DATA_DIR` is set.

## Environment variables

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `PUBLIC_URL` | Public base URL (feed, OpenGraph, notification links). |
| `ADMIN_PASSWORD` | Password for `/admin`. |
| `SESSION_SECRET` | Signs admin cookies. `openssl rand -base64 32`. |
| `DISCORD_WEBHOOK_URL` | Optional. Posts state changes and incidents to Discord. |
| `T1API_KEY` | Optional. Standard key from turnonehub.com/dashboard, server-side only, used for the F1 calendar strip. |
| `DATA_DIR` | SQLite directory. `/data` in Docker (volume). |
| `STATUS_PROBE_OVERRIDE_<ID>` | Optional fault injection: replaces a component's probe URL. `<ID>` is the component id upper-cased, non-alphanumerics as `_` (`api-prod` becomes `API_PROD`). |
| `STATUS_DISABLE_SCHEDULER` | `1` disables probing. |

## Deploy on a fresh VPS

1. Install Docker (Engine + compose plugin): `curl -fsSL https://get.docker.com | sh`.
2. Clone the repo and enter it.
3. `cp .env.example .env`, then set `ADMIN_PASSWORD`, `SESSION_SECRET` (`openssl rand -base64 32`) and optionally `DISCORD_WEBHOOK_URL`, `T1API_KEY`.
4. `docker compose up -d --build`

The container listens on `127.0.0.1:3000` only; put a reverse proxy in front. State lives in the `status-data` named volume. Update with `git pull && docker compose up -d --build`.

`/api/health` returns `{ok, lastTickAt, dbOk}` and responds 503 when the scheduler has not ticked recently or the DB is unreachable (3 minute grace after boot). The image's `HEALTHCHECK` uses it.

### DNS

In Cloudflare, add an `A` record: name `status`, content = the VPS IP.

### HTTPS

Pick one:

- **Bundled Caddy** (automatic Let's Encrypt): `docker compose --profile caddy up -d --build`. Uses `deploy/Caddyfile` (`status.t1f1.com` to `status:3000`). Needs ports 80 and 443 open. Set the Cloudflare record to **DNS only (grey cloud)** so the HTTP challenge reaches the VPS. Proxying (orange cloud) works afterwards only if you switch to a Cloudflare Origin certificate (see the comments in `deploy/Caddyfile`) with SSL/TLS mode **Full (strict)**.
- **Cloudflare Origin cert / Full (strict)**: keep the orange cloud, generate an Origin certificate in Cloudflare, terminate TLS with your own nginx/Caddy on the VPS pointing at `127.0.0.1:3000`.
- **Existing reverse proxy** on the host: proxy to `127.0.0.1:3000`.

## Backup

The DB is SQLite in WAL mode, so do not just copy `status.db` while running. Use `VACUUM INTO`, which produces a consistent snapshot:

```bash
docker compose exec status node -e "
const {DatabaseSync}=require('node:sqlite');
const f='/data/backup-'+new Date().toISOString().slice(0,10)+'.db';
new DatabaseSync('/data/status.db').exec(\"VACUUM INTO '\"+f+\"'\");
console.log(f)"
docker compose cp status:/data/backup-$(date +%F).db ./
```

`VACUUM INTO` fails if the target exists; delete old `backup-*.db` files from the volume afterwards. To restore: stop the stack, copy the file into the volume as `status.db` (and remove any `status.db-wal` / `-shm`), start again.

## Add a component

Append an entry to `COMPONENTS` in `lib/status/components.ts`: `id`, `name`, `group` (`sim | f1 | platform | developers`), `description`, `beta`, `probes` (url, method, `degradedMs`, `expect`), and `derivedFrom` (ids, for components computed from others instead of probed). Rebuild and redeploy. Existing history is keyed by id, so do not rename ids.

## Post an incident

Open `/admin`, sign in with `ADMIN_PASSWORD`, create an incident (impact, affected components, message) and post updates through investigating, identified, monitoring, resolved. Affected components show the incident state until it resolves. Maintenance windows are created the same way. Incidents appear at `/incidents` and in the feed.

## Public API

CORS is open (`*`); responses are cached for 15 s.

- `GET /api/status` : full summary (overall, groups, components, active and recent incidents, maintenance).
- `GET /api/status/<id>` : one component (e.g. `/api/status/api-prod`).
- `GET /feed.xml` : RSS feed of incidents.
- `GET /api/health` : liveness of the status page itself.

Badge on docs.t1f1.com:

```html
<a href="https://status.t1f1.com" id="t1-status">Status: ...</a>
<script>
  fetch("https://status.t1f1.com/api/status")
    .then((r) => r.json())
    .then((s) => {
      document.getElementById("t1-status").textContent = "Status: " + s.overall;
    })
    .catch(() => {});
</script>
```

`overall` is the worst effective status across public components.

## Monitor the monitor

Point a free external uptime check (UptimeRobot, Better Stack) at `https://status.t1f1.com/api/health`. It returns 503 when the scheduler stalls or the DB fails, which is the failure a status page cannot report about itself.
