# Chroma Website migration — DRY-RUN report

Date: 2026-09-17

## Safety status

No Firebase Authentication user was created. No Firestore document was written. Supabase data was not changed. Loader was not modified. Production deploy was not performed.

A final source backup was created before this dry-run:

`/home/ubuntu/work/chroma-final-pre-migration-backup.zip`

SHA-256: `0c7394620ecd6acec8605a750c8cfa7591d9fe86987983768daa655febb59897`

## Firebase Auth preflight

Firebase Console shows: **No users for this project yet**.

Expected Firebase Auth users before migration: 0.

## Supabase source inventory

The live read-only Supabase connector returned the following counts from project `rsbcqzeyiazogktztubu`:

| Entity | Planned count |
|---|---:|
| Auth users | 2 |
| Profiles | 2 |
| Subscription plans | 4 |
| Subscriptions | 2 |
| Devices | 1 |
| Client versions | 0 |
| Loader versions | 0 |
| Downloads | 0 |
| Audit logs | 9 |
| Site settings | 1 |
| Visuals | 0 |
| Visual versions | 0 |
| Supabase Storage objects | 0 |
| Auth identities | 2 |

## Conflict checks

| Check | Result |
|---|---:|
| Duplicate Supabase emails | 0 |
| Duplicate Supabase UIDs | 0 |
| Existing Firebase Auth users | 0 |
| UID/email conflict between source and target | None observed because target Auth is empty |
| Missing bcrypt hashes | 0; both users have bcrypt `$2a$10$…` hashes |

## Planned Auth import

Two real users would be imported with their existing Supabase UUIDs, email addresses, email verification state and bcrypt password hashes using Firebase Admin SDK `importUsers()` with `hash.algorithm = "BCRYPT"`.

## Planned Firestore writes

The migration would write the existing profiles, subscription plans, subscriptions, devices, audit logs, site settings and the currently empty client versions, loader versions, downloads, visuals and visual versions collections according to `firebase/migration-schema.md`. No mock or fake records are planned.

## Dry-run execution note

The guarded script `scripts/prepare-firebase-migration.ts` now supports `DRY_RUN=1` and exits before Firebase Admin initialization and before any Auth or Firestore write. It requires a private `SUPABASE_DB_URL` to read the database directly. That secret is not configured in the sandbox, so the script itself could not be executed against Postgres here without inventing or exposing credentials.

The counts and conflict checks above were independently performed through the authorized read-only Supabase MCP operation against the same live project. This is the authoritative dry-run result; it is not a simulated dataset.

## Gate

The dry-run is clean. The real migration remains unexecuted and requires a separate explicit confirmation after server-side credentials are available. Supabase fallback remains enabled, and Website build status remains: typecheck passed and production build passed before this dry-run.
