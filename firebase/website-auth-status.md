# Website Firebase Auth status

## Implemented

The Website now uses Firebase Web Auth as the primary client authentication path when the Firebase Web SDK is configured. The existing Firebase Web app configuration for project `chroma-b209d` is present with env-variable overrides and public client defaults.

Implemented flows include Email/Password registration with confirm-password validation, immediate session navigation, Google popup login, passwordless Email Link with same-device local email recovery, password reset, Firebase auth observer state, browser-local persistence, logout, and a legacy-account message when a Supabase account has not yet been imported.

After Firebase authentication, the browser sends an ID token to the server. The server verifies the token with Firebase Admin, resolves the Firebase UID to the server profile, preserves database-controlled role/status, and creates a FREE subscription only when a new authenticated profile has no subscription. The same UID contract is suitable for the future Loader; Loader code was not changed.

## Firebase console settings verified

Email/Password: enabled.

Google: enabled.

Email Link/passwordless: enabled in the Email/Password provider configuration.

Authorized domains include `chroma-client-pozetiv.vercel.app`, in addition to the Firebase defaults and the previous `chroma-client.vercel.app` entry.

## Verification

`pnpm check`: PASS.

`pnpm build`: PASS.

Build warnings are limited to pre-existing unset analytics placeholders and a large frontend chunk.

Runtime login, Google OAuth, Email Link completion, profile creation and FREE subscription creation were not executed against production because no deployment was performed and no disposable test account/email was supplied. No external test users were created.

## Existing users

The Supabase-to-Firebase migration adapter remains available with DRY_RUN support, BCRYPT import support, UID preservation and explicit migration confirmation protection. Existing Supabase users and data remain untouched. The old-user import remains blocked only by unavailable server-side Supabase database and Firebase Admin credentials; this does not block the new-user Firebase Website Auth implementation.

## Security

No passwords, password hashes, access tokens, refresh tokens, database connection strings or Firebase Admin private keys were logged or added to frontend code. Firebase Web config is public client configuration; Admin credentials remain server-side only.
