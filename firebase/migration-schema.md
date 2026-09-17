# Firestore migration schema — Website only

This schema is derived from the live Supabase tables. It does not create mock users, subscriptions, releases, visuals, or Storage files.

## Collections

- `profiles/{firebaseUid}`: source fields from `profiles`, using Firebase Auth UID as the document key.
- `subscriptionPlans/{slug}`: source fields from `subscription_plans`, using stable plan slug.
- `subscriptions/{sourceId}`: source subscription fields with `userUid` and `planSlug` references.
- `devices/{sourceId}`: source device fields with `userUid` reference.
- `clientVersions/{sourceId}`: source `client_versions` fields.
- `loaderVersions/{sourceId}`: source `loader_versions` fields; reserved for Stage 2 and not used by Website cutover.
- `downloads/{sourceId}`: source download history.
- `auditLogs/{sourceId}`: source audit records, server-write only.
- `siteSettings/{key}`: source `site_settings` JSON, admin-write only.
- `visuals/{sourceId}`: source `visuals` fields; nested `versions/{versionId}` mirrors `visual_versions` only when records exist.

## Access rules intent

Users may read their own profile, subscriptions, devices, and downloads. Public users may read active plans and published website content. Only trusted server code may write profiles, subscriptions, devices, downloads, audit logs, releases and visuals. Admin role claims must be assigned server-side and never trusted from the browser.

## Authentication migration

Supabase currently has two real email/password users and Firebase Auth has zero users. Password hashes were not available through the current export interface. No duplicate accounts are created. The Website uses Firebase Auth when Firebase client configuration is present and retains Supabase as a fallback until a supported password-hash import or first-login bridge is configured.
