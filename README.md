# Chroma Client

Chroma Client is a premium dark UI and full-stack control plane for a visual Minecraft client. This project is built as a working foundation rather than a static mockup: public marketing pages, database-backed pricing, managed account authentication, protected dashboard routes, device records, audit-aware server procedures, and a Loader-oriented REST API surface are included.

## Stack

The WebDev runtime uses **React 19 + TypeScript + Vite + Tailwind CSS 4 + Express + tRPC 11 + Drizzle ORM + MySQL/TiDB**. The scaffold's managed OAuth flow provides the browser session and stores it in a secure cookie path. This environment uses MySQL/TiDB rather than PostgreSQL because that is the database provisioned by the full-stack runtime.

## Run locally

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

The project runs through the managed WebDev server. Production verification uses:

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

## Environment

Use [`ENV.example.md`](./ENV.example.md) as the non-secret template for deployment configuration. The managed runtime protects `.env` and `.env.example` from direct edits; never commit real secrets.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL/TiDB connection string supplied by the runtime. |
| `JWT_SECRET` | Server-side session signing secret. |
| `VITE_APP_ID` | Managed OAuth application id. |
| `OAUTH_SERVER_URL` | OAuth backend base URL. |
| `VITE_OAUTH_PORTAL_URL` | Browser OAuth portal URL. |
| `OWNER_OPEN_ID` / `OWNER_NAME` | Owner identity; owner is promoted to admin by server-side upsert. |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Server-side managed integrations. |
| `STORAGE_URL` | Private artifact storage endpoint to configure before downloads. |
| `PAYMENT_PROVIDER_KEY` | Sandbox/live provider secret; no live checkout is simulated. |
| `PAYMENT_WEBHOOK_SECRET` | Provider webhook verification secret. |
| `APP_URL` | Canonical public URL for callbacks and signed links. |

## Database

The schema is in `drizzle/schema.ts`; the generated migration is in `drizzle/0001_regular_santa_claus.sql`. The core tables are `users`, `subscription_plans`, `subscriptions`, `devices`, `device_link_codes`, `loader_sessions`, `client_versions`, `downloads`, `payments`, `audit_logs`, and `password_resets`. Common access paths have indexes for user status, active subscriptions, device ownership, release selection, token expiry, and audit filtering.

The seed creates three plan records, a demo user record, a sandbox subscription, and an inactive placeholder release. It does not create a password or bypass managed OAuth. The demo row is for database development only.

## Authentication and authorization

Browser authentication uses the managed OAuth flow already wired into the runtime. `useAuth()` reads the server-backed session; it does not store auth tokens in localStorage. Dashboard access is guarded by `protectedProcedure`, and admin statistics are guarded by `adminProcedure`, which checks the role on the server. Suspended or banned account states can be enforced in the same middleware layer.

## Device binding model

The intended Loader flow is public-key based. A future Windows Loader generates an Ed25519 key pair locally, retains the private key locally, sends only the public key to Chroma, signs a server-issued nonce, and receives a short-lived session after the server verifies the signature, account state, subscription state, device state, and permissions. No MAC address, serial number, database credential, or permanent API key belongs in the Loader.

The dashboard device list, revocation mutation, one-time link-code approval, durable challenge persistence, Ed25519 verification, and short-lived Loader session issuance are implemented. Refresh rotation and private artifact signing remain explicitly unavailable until their provider/storage contracts are configured.

## Loader API surface

The server exposes these paths under `/api/loader`:

| Method | Path | Current behavior |
| --- | --- | --- |
| `POST` | `/register-device` | Creates a one-time `CHRM-XXXXXX` code, stores only its hash, and expires it after ten minutes. |
| `POST` | `/create-link-code` | Deprecated alias; returns a clear `410` directing callers to `/register-device`. |
| `POST` | `/verify-link-code` | Deprecated alias; returns a clear `410` directing approval to the authenticated dashboard. |
| `POST` | `/challenge` | Issues a durable 60-second nonce for an active public-key-bound device. |
| `POST` | `/authenticate` | Verifies the Ed25519 signature, checks account/subscription/device state, and issues a 15-minute bearer session. |
| `POST` | `/session` | Deprecated alias; returns a clear `410` directing callers to `/authenticate`. |
| `POST` | `/refresh` | Explicitly unavailable until refresh rotation is configured. |
| `POST` | `/logout` | Revokes a bearer-backed Loader session when one exists. |
| `GET` | `/subscription` | Validates an unexpired bearer-backed Loader session and returns scoped state. |
| `GET` | `/version` | Returns the latest active published version, or `404` if none exists. |
| `GET` | `/download` | Explicitly unavailable until private storage and signed URLs are configured. |

## Payments and downloads

Pricing is read from the database. Checkout buttons are disabled until a real provider and webhook verification path are configured. The project intentionally does not mark a payment as successful in production and does not expose closed files through public URLs. When storage is configured, the download procedure should check the user, subscription expiration, device/session, version status, write an audit record, and return a short-lived signed URL.

## Routes

Public routes include `/`, `/features`, `/pricing`, `/download`, `/status`, `/login`, `/register`, `/forgot-password`, `/terms`, and `/privacy`. Authenticated routes include `/dashboard`, `/dashboard/profile`, `/dashboard/subscription`, `/dashboard/devices`, `/dashboard/downloads`, `/dashboard/security`, and `/dashboard/settings`. Admin route shells are available under `/admin/*`; only `/admin` currently exposes live metrics, while the remaining modules are clearly marked for server mutation implementation.

## Security baseline

The Express entrypoint adds baseline security headers, disables the Express signature, and applies a bounded per-IP/per-path request limit. Server procedures use Drizzle parameterization, zod input validation, protected/admin middleware, and audit logging for device revocation and download requests. Secrets are server-side only. Production deployment must use HTTPS, secure cookies, provider webhook verification, private storage, and a durable distributed rate limiter if the app is scaled beyond one process.

## Next implementation phase

The next high-value phase is the full Loader contract: a durable nonce table, Ed25519 signature verification, one-time link-code hashing and approval, session rotation, provider-backed checkout/webhook handling, private artifact uploads, and admin mutations with pagination and audit trails. These are intentionally left as explicit unavailable paths rather than fake UI.
