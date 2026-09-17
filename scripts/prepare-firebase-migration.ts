import "dotenv/config";
import { Client } from "pg";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type UserImportRecord } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const CONFIRM = "I_UNDERSTAND_MIGRATE_CHROMA_STAGE1";
const DRY_RUN = process.env.DRY_RUN === "1";
if (!DRY_RUN && process.env.MIGRATION_CONFIRM !== CONFIRM) {
  console.error(`Refusing to write migration data. Set MIGRATION_CONFIRM=${CONFIRM} only after reviewing the backup and plan.`);
  process.exit(2);
}

const required = DRY_RUN ? ["SUPABASE_DB_URL"] : ["SUPABASE_DB_URL", "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required server-side and must never be committed or logged.`);

const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: true } });

const toTimestamp = (value: string | Date | null | undefined) => value ? Timestamp.fromDate(new Date(value)) : null;
const json = (value: unknown) => value == null ? null : value;

async function main() {
  await pg.connect();
  const authUsers = await pg.query<{ id: string; email: string; encrypted_password: string; confirmed_at: Date | null; created_at: Date; last_sign_in_at: Date | null; raw_user_meta_data: Record<string, unknown> | null }>(`SELECT id, email, encrypted_password, confirmed_at, created_at, last_sign_in_at, raw_user_meta_data FROM auth.users ORDER BY created_at LIMIT 1000`);
  const profiles = await pg.query<Record<string, unknown>>(`SELECT id, open_id, username, name, email, role, status, created_at, updated_at, last_signed_in, last_login_at, avatar_url FROM public.profiles ORDER BY id LIMIT 10000`);
  const plans = await pg.query<Record<string, unknown>>(`SELECT id, name, slug, description, price, currency, duration_days, device_limit, features, active, created_at, updated_at FROM public.subscription_plans ORDER BY id LIMIT 10000`);
  const subscriptions = await pg.query<Record<string, unknown>>(`SELECT id, user_id, plan_id, status, starts_at, ends_at, provider, admin_note, created_at, updated_at FROM public.subscriptions ORDER BY id LIMIT 10000`);
  const devices = await pg.query<Record<string, unknown>>(`SELECT id, user_id, name, public_key, status, created_at, last_seen_at, revoked_at, installed_version, installed_at, last_verified_at, key_algorithm, public_key_version FROM public.devices ORDER BY id LIMIT 10000`);
  const versions = await pg.query<Record<string, unknown>>(`SELECT id, version, minecraft_version, file_key, file_name, release_notes, is_latest, active, fabric_version, sha256, size_bytes, required_update, published, published_at, signature, required_subscription, beta FROM public.client_versions ORDER BY id LIMIT 10000`);
  const loaderVersions = await pg.query<Record<string, unknown>>(`SELECT id, version, file_key, file_name, sha256, size_bytes, release_notes, required_update, active, published, is_latest, created_at, published_at, signature FROM public.loader_versions ORDER BY id LIMIT 10000`);
  const downloads = await pg.query<Record<string, unknown>>(`SELECT id, user_id, version_id, created_at, device_id FROM public.downloads ORDER BY id LIMIT 10000`);
  const auditLogs = await pg.query<Record<string, unknown>>(`SELECT id, user_id, action, metadata, created_at FROM public.audit_logs ORDER BY id LIMIT 10000`);
  const settings = await pg.query<Record<string, unknown>>(`SELECT key, value, updated_at FROM public.site_settings ORDER BY key LIMIT 10000`);
  const visuals = await pg.query<Record<string, unknown>>(`SELECT id, name, description, icon_key, preview_key, published, created_at, updated_at, published_at FROM public.visuals ORDER BY id LIMIT 10000`);
  const visualVersions = await pg.query<Record<string, unknown>>(`SELECT id, visual_id, version, minecraft_version, required_subscription, beta, file_key, file_name, sha256, size_bytes, changelog, published, active, created_at, published_at FROM public.visual_versions ORDER BY id LIMIT 10000`);

  if (DRY_RUN) {
    const duplicateEmails = await pg.query<{ count: string }>(`SELECT count(*)::text AS count FROM (SELECT lower(email) FROM auth.users WHERE email IS NOT NULL GROUP BY lower(email) HAVING count(*) > 1) duplicates`);
    const duplicateUids = await pg.query<{ count: string }>(`SELECT count(*)::text AS count FROM (SELECT id FROM auth.users GROUP BY id HAVING count(*) > 1) duplicates`);
    console.log(JSON.stringify({ mode: "DRY_RUN", writes: false, authUsers: authUsers.rowCount, profiles: profiles.rowCount, subscriptionPlans: plans.rowCount, subscriptions: subscriptions.rowCount, devices: devices.rowCount, clientVersions: versions.rowCount, loaderVersions: loaderVersions.rowCount, downloads: downloads.rowCount, auditLogs: auditLogs.rowCount, siteSettings: settings.rowCount, visuals: visuals.rowCount, visualVersions: visualVersions.rowCount, storageObjects: "not queried by migration script; prior inventory: 0", duplicateEmails: Number(duplicateEmails.rows[0]?.count ?? 0), duplicateUids: Number(duplicateUids.rows[0]?.count ?? 0), possibleErrors: [] }, null, 2));
    await pg.end();
    return;
  }

  const firebaseApp = getApps()[0] ?? initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID!, clientEmail: process.env.FIREBASE_CLIENT_EMAIL!, privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n") }) });
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  const profileByUid = new Map(profiles.rows.map(row => [String(row.open_id), row]));
  const records: UserImportRecord[] = authUsers.rows.map(user => ({ uid: user.id, email: user.email, emailVerified: Boolean(user.confirmed_at), displayName: String(profileByUid.get(user.id)?.name ?? user.raw_user_meta_data?.name ?? user.email.split("@")[0]), passwordHash: Buffer.from(user.encrypted_password, "utf8"), disabled: false }));
  const importResult = await auth.importUsers(records, { hash: { algorithm: "BCRYPT" } });
  console.log(`Imported Auth users: ${importResult.successCount}; failed: ${importResult.failureCount}`);

  const batch = firestore.batch();
  for (const user of authUsers.rows) {
    const profile = profileByUid.get(user.id);
    if (profile) batch.set(firestore.collection("profiles").doc(user.id), { ...profile, sourceId: profile.id, created_at: toTimestamp(profile.created_at as string), updated_at: toTimestamp(profile.updated_at as string), last_signed_in: toTimestamp(profile.last_signed_in as string), last_login_at: toTimestamp(profile.last_login_at as string) });
  }
  for (const row of plans.rows) batch.set(firestore.collection("subscriptionPlans").doc(String(row.slug)), { ...row, sourceId: row.id, features: json(row.features), created_at: toTimestamp(row.created_at as string), updated_at: toTimestamp(row.updated_at as string) });
  const uidByProfileId = new Map(profiles.rows.map(row => [String(row.id), String(row.open_id)]));
  const slugByPlanId = new Map(plans.rows.map(row => [String(row.id), String(row.slug)]));
  for (const row of subscriptions.rows) batch.set(firestore.collection("subscriptions").doc(String(row.id)), { ...row, sourceId: row.id, userUid: uidByProfileId.get(String(row.user_id)) ?? null, planSlug: slugByPlanId.get(String(row.plan_id)) ?? null, starts_at: toTimestamp(row.starts_at as string), ends_at: toTimestamp(row.ends_at as string), created_at: toTimestamp(row.created_at as string), updated_at: toTimestamp(row.updated_at as string) });
  for (const row of devices.rows) batch.set(firestore.collection("devices").doc(String(row.id)), { ...row, sourceId: row.id, userUid: uidByProfileId.get(String(row.user_id)) ?? null, created_at: toTimestamp(row.created_at as string), last_seen_at: toTimestamp(row.last_seen_at as string), revoked_at: toTimestamp(row.revoked_at as string), installed_at: toTimestamp(row.installed_at as string), last_verified_at: toTimestamp(row.last_verified_at as string) });
  for (const [collection, result] of [["clientVersions", versions], ["loaderVersions", loaderVersions], ["downloads", downloads], ["auditLogs", auditLogs], ["visuals", visuals], ["visualVersions", visualVersions]] as const) for (const row of result.rows) batch.set(firestore.collection(collection).doc(String(row.id)), { ...row, sourceId: row.id, created_at: toTimestamp(row.created_at as string), updated_at: toTimestamp(row.updated_at as string), published_at: toTimestamp(row.published_at as string) });
  for (const row of settings.rows) batch.set(firestore.collection("siteSettings").doc(String(row.key)), { ...row, updated_at: toTimestamp(row.updated_at as string) });
  await batch.commit();
  console.log(`Firestore migration committed. Profiles: ${profiles.rowCount}; subscriptions: ${subscriptions.rowCount}; devices: ${devices.rowCount}; plans: ${plans.rowCount}; audit logs: ${auditLogs.rowCount}.`);
  await pg.end();
}

main().catch(async error => { console.error("Migration failed:", error instanceof Error ? error.message : "unknown error"); await pg.end().catch(() => undefined); process.exit(1); });
