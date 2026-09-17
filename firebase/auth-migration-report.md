# Chroma Website — Supabase Auth → Firebase Auth

Дата: 2026-09-17

## Scope

Проверены только два существующих Supabase Auth пользователя. Production deploy не выполнялся, существующие пользователи и данные не изменялись, а CHROMA Loader не затрагивался.

## Findings

| Email | Supabase UID | Password hash | Compatibility with Firebase importUsers |
|---|---|---|---|
| wery8090@gmail.com | `eb09e930-1d4c-406d-a0ad-da3236075441` | Present, bcrypt `$2a$10$…`, 60 chars | Compatible with Firebase `BCRYPT` import |
| speedyboom333@gmail.com | `d2163610-8d0a-43a1-9cb9-d8149d627ec9` | Present, bcrypt `$2a$10$…`, 60 chars | Compatible with Firebase `BCRYPT` import |

The hashes themselves were not printed, copied into chat, committed, or stored in the report. No password is needed from the user.

Supabase exposes the `auth.users.encrypted_password` column to the authorized database operation. The observed values are bcrypt hashes. The existing profile records provide names, usernames, emails, roles, statuses and timestamps. The owner profile is `wery8090@gmail.com`; the second profile has role `user`.

## Can current passwords be preserved?

**Yes, technically.** Firebase Admin SDK officially supports `Auth.importUsers()` with `hash.algorithm = "BCRYPT"`. For this algorithm, the import records need the existing UID, email, verification state, display name and the bcrypt password hash. No Firebase scrypt parameters are needed for BCRYPT imports.

On the first successful sign-in, Firebase can rehash the password internally with its own internal algorithm. Firebase documentation also warns that `importUsers()` does not perform duplicate checks: a UID collision replaces the user and an email collision can create an additional user. Therefore the migration must first verify that Firebase Auth is empty or that every target UID/email is an exact intended match. The prepared script does not intentionally create new records until the explicit migration flag is provided.

## Prepared but not executed migration

`scripts/prepare-firebase-migration.ts` is a server-side migration script. It:

1. refuses to run unless `MIGRATION_CONFIRM=I_UNDERSTAND_MIGRATE_CHROMA_STAGE1` is set;
2. reads the existing Supabase Auth hashes and Website data through a private database connection;
3. imports the two real users with their existing Supabase UUIDs and BCRYPT hashes;
4. writes the existing profiles, plans, subscriptions, devices, Website settings, audit logs and currently empty release/visual/download collections to Firestore;
5. never logs password hashes, private keys or service-account credentials.

The script is **not executed**. It requires server-only `SUPABASE_DB_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` values. The Firebase Admin credential must remain outside the frontend, Loader, Git and public files.

## Website transition flow

The Website now supports Firebase Auth when the Firebase Web configuration is present, with email/password registration and login, Google popup login, password reset, logout and browser-local session persistence. Server tRPC requests send a Firebase ID token. The server verifies it with Firebase Admin when configured. Supabase Auth remains as an explicit fallback while data migration and production verification are pending.

The fallback is safe during the transition because no Supabase users are removed, the existing Supabase registration route remains available, and the server still accepts Supabase bearer tokens when Firebase verification is unavailable. The Firebase path must not be considered production-ready until the Firebase Web config, provider settings, Admin credential and Firestore rules are configured and tested.

## Verification

`pnpm check` passes. `pnpm build` passes. Build output contains only pre-existing warnings for unset analytics variables and a large frontend chunk. The migration script and its Firebase dependencies are included in the typecheck.

## Sources

- [Firebase Admin SDK: Import Users](https://firebase.google.com/docs/auth/admin/import-users)
- [Firebase CLI: auth:import and auth:export](https://firebase.google.com/docs/cli/auth)
