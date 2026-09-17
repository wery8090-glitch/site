// server/app.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/mysql-core";
var id = () => int("id").autoincrement().primaryKey();
var createdAt = () => timestamp("createdAt").defaultNow().notNull();
var users = mysqlTable(
  "users",
  {
    id: id(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    username: varchar("username", { length: 48 }),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "moderator", "admin"]).default("user").notNull(),
    status: mysqlEnum("status", ["active", "suspended", "banned"]).default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
    lastLoginAt: timestamp("lastLoginAt")
  },
  (table) => ({ emailIdx: index("users_email_idx").on(table.email), statusIdx: index("users_status_idx").on(table.status) })
);
var subscriptionPlans = mysqlTable(
  "subscription_plans",
  {
    id: id(),
    name: varchar("name", { length: 64 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    description: text("description").notNull(),
    price: int("price").notNull(),
    currency: varchar("currency", { length: 8 }).default("RUB").notNull(),
    durationDays: int("durationDays").notNull(),
    deviceLimit: int("deviceLimit").default(1).notNull(),
    features: text("features").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (table) => ({ slugUnique: uniqueIndex("subscription_plans_slug_unique").on(table.slug), activeIdx: index("subscription_plans_active_idx").on(table.active) })
);
var subscriptions = mysqlTable(
  "subscriptions",
  {
    id: id(),
    userId: int("userId").notNull(),
    planId: int("planId").notNull(),
    status: mysqlEnum("status", ["active", "expired", "cancelled", "pending"]).default("pending").notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    provider: mysqlEnum("provider", ["FunPay", "Telegram", "Manual"]),
    providerSubscriptionId: varchar("providerSubscriptionId", { length: 160 }),
    adminNote: text("adminNote"),
    createdAt: createdAt(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (table) => ({ userStatusIdx: index("subscriptions_user_status_idx").on(table.userId, table.status), endsAtIdx: index("subscriptions_ends_at_idx").on(table.endsAt) })
);
var subscriptionKeys = mysqlTable(
  "subscription_keys",
  {
    id: id(),
    keyHash: varchar("keyHash", { length: 128 }).notNull(),
    planId: int("planId").notNull(),
    durationDays: int("durationDays").notNull(),
    status: mysqlEnum("status", ["available", "redeemed", "revoked"]).default("available").notNull(),
    redeemedByUserId: int("redeemedByUserId"),
    redeemedAt: timestamp("redeemedAt"),
    createdByUserId: int("createdByUserId"),
    createdAt: createdAt()
  },
  (table) => ({ keyHashUnique: uniqueIndex("subscription_keys_hash_unique").on(table.keyHash), statusIdx: index("subscription_keys_status_idx").on(table.status), planIdx: index("subscription_keys_plan_idx").on(table.planId) })
);
var devices = mysqlTable(
  "devices",
  {
    id: id(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    publicKey: varchar("publicKey", { length: 512 }).notNull(),
    status: mysqlEnum("status", ["active", "disabled", "revoked"]).default("active").notNull(),
    createdAt: createdAt(),
    lastSeenAt: timestamp("lastSeenAt"),
    revokedAt: timestamp("revokedAt")
  },
  (table) => ({ userIdx: index("devices_user_idx").on(table.userId), publicKeyUnique: uniqueIndex("devices_public_key_unique").on(table.publicKey), statusIdx: index("devices_status_idx").on(table.status) })
);
var deviceLinkCodes = mysqlTable(
  "device_link_codes",
  {
    id: id(),
    codeHash: varchar("codeHash", { length: 128 }).notNull(),
    deviceName: varchar("deviceName", { length: 120 }).notNull(),
    publicKey: varchar("publicKey", { length: 512 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: createdAt()
  },
  (table) => ({ codeHashUnique: uniqueIndex("device_link_codes_hash_unique").on(table.codeHash), expiresIdx: index("device_link_codes_expires_idx").on(table.expiresAt) })
);
var loaderChallenges = mysqlTable(
  "loader_challenges",
  {
    id: id(),
    deviceId: int("deviceId").notNull(),
    nonce: varchar("nonce", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: createdAt()
  },
  (table) => ({ deviceIdx: index("loader_challenges_device_idx").on(table.deviceId), expiresIdx: index("loader_challenges_expires_idx").on(table.expiresAt) })
);
var loaderSessions = mysqlTable(
  "loader_sessions",
  {
    id: id(),
    userId: int("userId").notNull(),
    deviceId: int("deviceId").notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    lastSeenAt: timestamp("lastSeenAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: createdAt()
  },
  (table) => ({ tokenUnique: uniqueIndex("loader_sessions_token_unique").on(table.tokenHash), deviceIdx: index("loader_sessions_device_idx").on(table.deviceId), expiresIdx: index("loader_sessions_expires_idx").on(table.expiresAt) })
);
var clientVersions = mysqlTable(
  "client_versions",
  {
    id: id(),
    version: varchar("version", { length: 32 }).notNull(),
    minecraftVersion: varchar("minecraftVersion", { length: 32 }).notNull(),
    fileKey: varchar("fileKey", { length: 512 }).notNull(),
    fileName: varchar("fileName", { length: 160 }).notNull(),
    releaseNotes: text("releaseNotes").notNull(),
    isLatest: boolean("isLatest").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt()
  },
  (table) => ({ versionUnique: uniqueIndex("client_versions_version_unique").on(table.version), latestIdx: index("client_versions_latest_idx").on(table.isLatest, table.active) })
);
var downloads = mysqlTable("downloads", { id: id(), userId: int("userId").notNull(), deviceId: int("deviceId"), versionId: int("versionId").notNull(), createdAt: createdAt(), ipHash: varchar("ipHash", { length: 128 }) }, (table) => ({ userIdx: index("downloads_user_idx").on(table.userId), versionIdx: index("downloads_version_idx").on(table.versionId) }));
var payments = mysqlTable("payments", { id: id(), userId: int("userId").notNull(), subscriptionId: int("subscriptionId"), provider: varchar("provider", { length: 48 }).notNull(), providerPaymentId: varchar("providerPaymentId", { length: 160 }), amount: int("amount").notNull(), currency: varchar("currency", { length: 8 }).default("RUB").notNull(), status: mysqlEnum("status", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(), createdAt: createdAt(), paidAt: timestamp("paidAt") }, (table) => ({ userIdx: index("payments_user_idx").on(table.userId), providerIdx: index("payments_provider_idx").on(table.providerPaymentId) }));
var auditLogs = mysqlTable("audit_logs", { id: id(), userId: int("userId"), action: varchar("action", { length: 96 }).notNull(), metadata: text("metadata"), ipHash: varchar("ipHash", { length: 128 }), createdAt: createdAt() }, (table) => ({ userIdx: index("audit_logs_user_idx").on(table.userId), actionIdx: index("audit_logs_action_idx").on(table.action), createdIdx: index("audit_logs_created_idx").on(table.createdAt) }));
var passwordResets = mysqlTable("password_resets", { id: id(), userId: int("userId").notNull(), tokenHash: varchar("tokenHash", { length: 128 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), usedAt: timestamp("usedAt"), createdAt: createdAt() }, (table) => ({ tokenUnique: uniqueIndex("password_resets_token_unique").on(table.tokenHash), userIdx: index("password_resets_user_idx").on(table.userId) }));

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date() };
  const updateSet = { lastSignedIn: values.lastSignedIn };
  const textFields = ["name", "email", "loginMethod", "username"];
  for (const field of textFields) if (user[field] !== void 0) {
    values[field] = user[field] ?? null;
    updateSet[field] = user[field] ?? null;
  }
  if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (user.status !== void 0) {
    values.status = user.status;
    updateSet.status = user.status;
  }
  updateSet.lastLoginAt = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getPublicPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true)).orderBy(subscriptionPlans.price);
}
async function getDashboardSummary(userId) {
  const db = await getDb();
  if (!db) return null;
  const [user, activeSubscription, latestSubscription, deviceRows, latestVersion, downloadRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gt(subscriptions.endsAt, /* @__PURE__ */ new Date()))).orderBy(desc(subscriptions.endsAt)).limit(1),
    db.select({ subscription: subscriptions, plan: subscriptionPlans }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.endsAt)).limit(1),
    db.select().from(devices).where(and(eq(devices.userId, userId), eq(devices.status, "active"))).orderBy(desc(devices.lastSeenAt)),
    db.select().from(clientVersions).where(and(eq(clientVersions.isLatest, true), eq(clientVersions.active, true))).limit(1),
    db.select({ id: downloads.id, createdAt: downloads.createdAt }).from(downloads).where(eq(downloads.userId, userId)).orderBy(desc(downloads.createdAt)).limit(5)
  ]);
  return { user: user[0] ?? null, subscription: activeSubscription[0] ?? null, latestSubscription: latestSubscription[0] ?? null, devices: deviceRows, latestVersion: latestVersion[0] ?? null, downloads: downloadRows };
}
async function getAdminSubscriptionData() {
  const db = await getDb();
  if (!db) return { users: [], plans: [], subscriptions: [] };
  const [userRows, planRows, subscriptionRows] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, username: users.username, role: users.role, status: users.status }).from(users).orderBy(desc(users.createdAt)),
    db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true)).orderBy(subscriptionPlans.price),
    db.select({ subscription: subscriptions, plan: subscriptionPlans, user: users }).from(subscriptions).innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id)).innerJoin(users, eq(subscriptions.userId, users.id)).orderBy(desc(subscriptions.createdAt)).limit(100)
  ]);
  return { users: userRows, plans: planRows, subscriptions: subscriptionRows };
}
async function issueSubscription(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(subscriptions).values({ ...input, status: "active" });
  return Number(result[0].insertId);
}
async function updateSubscription(input) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(subscriptions).set({ planId: input.planId, startsAt: input.startsAt, endsAt: input.endsAt, provider: input.provider, adminNote: input.adminNote ?? null, status: "active" }).where(eq(subscriptions.id, input.id));
  return result[0].affectedRows > 0;
}
async function extendSubscription(id2, days) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ endsAt: subscriptions.endsAt }).from(subscriptions).where(eq(subscriptions.id, id2)).limit(1);
  const current = rows[0];
  if (!current) return false;
  const nextEnd = new Date(Math.max(current.endsAt.getTime(), Date.now()) + days * 864e5);
  const result = await db.update(subscriptions).set({ endsAt: nextEnd, status: "active" }).where(eq(subscriptions.id, id2));
  return result[0].affectedRows > 0;
}
async function revokeSubscription(id2) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(subscriptions).set({ status: "cancelled" }).where(eq(subscriptions.id, id2));
  return result[0].affectedRows > 0;
}
function formatSubscriptionKey() {
  const part = (size) => randomBytes(size).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, size);
  return `CHROMA-${part(8)}-${part(4)}-${part(6)}`;
}
var keyDigest = (key) => createHash("sha256").update(key.trim().toUpperCase()).digest("hex");
async function createSubscriptionKey(input) {
  const db = await getDb();
  if (!db) return null;
  const plain = formatSubscriptionKey();
  const result = await db.insert(subscriptionKeys).values({ keyHash: keyDigest(plain), planId: input.planId, durationDays: input.durationDays, createdByUserId: input.createdByUserId, status: "available" });
  return { id: Number(result[0].insertId), key: plain, planId: input.planId, durationDays: input.durationDays };
}
async function redeemSubscriptionKey(input) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ key: subscriptionKeys, plan: subscriptionPlans }).from(subscriptionKeys).innerJoin(subscriptionPlans, eq(subscriptionKeys.planId, subscriptionPlans.id)).where(and(eq(subscriptionKeys.keyHash, keyDigest(input.key)), eq(subscriptionKeys.status, "available"))).limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = /* @__PURE__ */ new Date();
  const result = await db.update(subscriptionKeys).set({ status: "redeemed", redeemedByUserId: input.userId, redeemedAt: now }).where(and(eq(subscriptionKeys.id, row.key.id), eq(subscriptionKeys.status, "available")));
  if (result[0].affectedRows === 0) return null;
  const subscriptionId = await issueSubscription({ userId: input.userId, planId: row.plan.id, startsAt: now, endsAt: new Date(now.getTime() + row.key.durationDays * 864e5), provider: "Manual", adminNote: `Redeemed subscription key ${row.key.id}` });
  return subscriptionId ? { subscriptionId, plan: row.plan, durationDays: row.key.durationDays } : null;
}
async function getAdminSubscriptionKeys() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ key: subscriptionKeys, plan: subscriptionPlans, user: users }).from(subscriptionKeys).innerJoin(subscriptionPlans, eq(subscriptionKeys.planId, subscriptionPlans.id)).leftJoin(users, eq(subscriptionKeys.redeemedByUserId, users.id)).orderBy(desc(subscriptionKeys.createdAt)).limit(200);
}
async function getUserDevices(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.createdAt));
}
async function createDeviceLinkCode(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(deviceLinkCodes).values(input);
  return Number(result[0].insertId);
}
async function getValidDeviceLinkCode(codeHash) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(deviceLinkCodes).where(and(eq(deviceLinkCodes.codeHash, codeHash), isNull(deviceLinkCodes.usedAt), gt(deviceLinkCodes.expiresAt, /* @__PURE__ */ new Date()))).limit(1);
  return rows[0] ?? null;
}
async function consumeDeviceLinkCode(id2) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(deviceLinkCodes).set({ usedAt: /* @__PURE__ */ new Date() }).where(and(eq(deviceLinkCodes.id, id2), isNull(deviceLinkCodes.usedAt)));
  return result[0].affectedRows > 0;
}
async function createDevice(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(devices).values({ ...input, status: "active" });
  return Number(result[0].insertId);
}
async function getDeviceByPublicKey(publicKey) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(devices).where(eq(devices.publicKey, publicKey)).limit(1);
  return rows[0] ?? null;
}
async function countActiveDevices(userId) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql`count(*)` }).from(devices).where(and(eq(devices.userId, userId), eq(devices.status, "active")));
  return Number(rows[0]?.count ?? 0);
}
async function createLoaderChallenge(input) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(loaderChallenges).values(input);
  return true;
}
async function getValidLoaderChallenge(deviceId, nonce) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(loaderChallenges).where(and(eq(loaderChallenges.deviceId, deviceId), eq(loaderChallenges.nonce, nonce), isNull(loaderChallenges.usedAt), gt(loaderChallenges.expiresAt, /* @__PURE__ */ new Date()))).limit(1);
  return rows[0] ?? null;
}
async function consumeLoaderChallenge(id2) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(loaderChallenges).set({ usedAt: /* @__PURE__ */ new Date() }).where(and(eq(loaderChallenges.id, id2), isNull(loaderChallenges.usedAt)));
  return result[0].affectedRows > 0;
}
async function createLoaderSession(input) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(loaderSessions).values(input);
  return Number(result[0].insertId);
}
async function revokeDevice(userId, deviceId) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(devices).set({ status: "revoked", revokedAt: /* @__PURE__ */ new Date() }).where(and(eq(devices.id, deviceId), eq(devices.userId, userId)));
  return result[0].affectedRows > 0;
}
async function getLatestVersion() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(clientVersions).where(and(eq(clientVersions.isLatest, true), eq(clientVersions.active, true))).limit(1);
  return rows[0] ?? null;
}
async function createAuditLog(input) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ userId: input.userId, action: input.action, metadata: input.metadata ? JSON.stringify(input.metadata) : null, ipHash: input.ipHash });
}
async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;
  const [userCount, activeSubs, deviceCount, downloadCount, latest] = await Promise.all([
    db.select({ count: sql`count(*)` }).from(users),
    db.select({ count: sql`count(*)` }).from(subscriptions).where(and(eq(subscriptions.status, "active"), gt(subscriptions.endsAt, /* @__PURE__ */ new Date()))),
    db.select({ count: sql`count(*)` }).from(devices).where(eq(devices.status, "active")),
    db.select({ count: sql`count(*)` }).from(downloads),
    getLatestVersion()
  ]);
  return { users: Number(userCount[0]?.count ?? 0), activeSubscriptions: Number(activeSubs[0]?.count ?? 0), devices: Number(deviceCount[0]?.count ?? 0), downloads: Number(downloadCount[0]?.count ?? 0), latestVersion: latest?.version ?? "\u2014" };
}
async function getLoaderSession(tokenHash2) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ session: loaderSessions, device: devices, user: users }).from(loaderSessions).innerJoin(devices, eq(loaderSessions.deviceId, devices.id)).innerJoin(users, eq(loaderSessions.userId, users.id)).where(and(eq(loaderSessions.tokenHash, tokenHash2), isNull(loaderSessions.revokedAt), gt(loaderSessions.expiresAt, /* @__PURE__ */ new Date()), eq(devices.status, "active"), eq(users.status, "active"))).limit(1);
  return rows[0] ?? null;
}
async function revokeLoaderSession(tokenHash2) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(loaderSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq(loaderSessions.tokenHash, tokenHash2));
  return result[0].affectedRows > 0;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { createHash as createHash2 } from "node:crypto";
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// shared/purchase.ts
var TELEGRAM_SELLER_URL = "https://t.me/cupsov";
var PURCHASE_OFFERS = [
  { plan: "base", duration: "month", label: "1 month", price: 100, url: "https://funpay.com/lots/offer?id=77264646" },
  { plan: "base", duration: "three_months", label: "3 months", price: 250, url: "https://funpay.com/lots/offer?id=77264807" },
  { plan: "base", duration: "lifetime", label: "Lifetime", price: 390, url: "https://funpay.com/lots/offer?id=77264834" },
  { plan: "premium", duration: "month", label: "1 month", price: 200, url: "https://funpay.com/lots/offer?id=77264864" },
  { plan: "premium", duration: "three_months", label: "3 months", price: 400, url: "https://funpay.com/lots/offer?id=77264889" },
  { plan: "premium", duration: "lifetime", label: "Lifetime", price: 500, url: "https://funpay.com/lots/offer?id=77264917" },
  { plan: "premium_beta", duration: "month", label: "1 month", price: 290, url: "https://funpay.com/lots/offer?id=77264949" },
  { plan: "premium_beta", duration: "three_months", label: "3 months", price: 450, url: "https://funpay.com/lots/offer?id=77265002" },
  { plan: "premium_beta", duration: "lifetime", label: "Lifetime", price: 650, url: "https://funpay.com/lots/offer?id=77265043" }
];
var FunPayProvider = class {
  name = "FunPay";
  getCheckoutUrl(input) {
    return PURCHASE_OFFERS.find((offer) => offer.plan === input.plan && offer.duration === input.duration)?.url ?? null;
  }
};
var TelegramProvider = class {
  name = "Telegram";
  getCheckoutUrl() {
    return TELEGRAM_SELLER_URL;
  }
};
var ManualProvider = class {
  name = "Manual";
  getCheckoutUrl() {
    return null;
  }
};
var purchaseProviders = {
  FunPay: new FunPayProvider(),
  Telegram: new TelegramProvider(),
  Manual: new ManualProvider()
};

// server/routers.ts
var subscriptionInput = z.object({
  userId: z.number().int().positive(),
  planId: z.number().int().positive(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  provider: z.enum(["FunPay", "Telegram", "Manual"]),
  adminNote: z.string().trim().max(1e3).optional()
});
var appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  plans: router({
    list: publicProcedure.query(() => getPublicPlans()),
    purchaseOffers: publicProcedure.query(() => ({ offers: PURCHASE_OFFERS, telegramUrl: TELEGRAM_SELLER_URL }))
  }),
  dashboard: router({ summary: protectedProcedure.query(({ ctx }) => getDashboardSummary(ctx.user.id)), redeemKey: protectedProcedure.input(z.object({ key: z.string().trim().toUpperCase().regex(/^CHROMA-[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{6}$/) })).mutation(async ({ ctx, input }) => {
    const result = await redeemSubscriptionKey({ key: input.key, userId: ctx.user.id });
    if (!result) throw new TRPCError2({ code: "BAD_REQUEST", message: "\u041A\u043B\u044E\u0447 \u043D\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u0435\u043D, \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D \u0438\u043B\u0438 \u043E\u0442\u043E\u0437\u0432\u0430\u043D." });
    await createAuditLog({ userId: ctx.user.id, action: "SUBSCRIPTION_KEY_REDEEMED", metadata: { subscriptionId: result.subscriptionId, plan: result.plan.slug, durationDays: result.durationDays } });
    return { success: true, plan: result.plan.name, durationDays: result.durationDays };
  }) }),
  devices: router({
    list: protectedProcedure.query(({ ctx }) => getUserDevices(ctx.user.id)),
    verifyLinkCode: protectedProcedure.input(z.object({ code: z.string().trim().toUpperCase().regex(/^CHRM-[A-Z0-9]{6}$/) })).mutation(async ({ ctx, input }) => {
      const codeHash = createHash2("sha256").update(input.code).digest("hex");
      const pending = await getValidDeviceLinkCode(codeHash);
      if (!pending) throw new TRPCError2({ code: "NOT_FOUND", message: "Invalid or expired link code" });
      const summary = await getDashboardSummary(ctx.user.id);
      const limit = summary?.subscription?.plan.deviceLimit ?? 1;
      const activeCount = await countActiveDevices(ctx.user.id);
      if (activeCount >= limit) throw new TRPCError2({ code: "PRECONDITION_FAILED", message: "Your current plan has reached its device limit" });
      const deviceId = await createDevice({ userId: ctx.user.id, name: pending.deviceName, publicKey: pending.publicKey });
      if (!deviceId || !await consumeDeviceLinkCode(pending.id)) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Unable to link device" });
      await createAuditLog({ userId: ctx.user.id, action: "DEVICE_REGISTERED", metadata: { deviceId, name: pending.deviceName } });
      return { success: true, deviceId };
    }),
    revoke: protectedProcedure.input(z.object({ deviceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const success = await revokeDevice(ctx.user.id, input.deviceId);
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Device not found" });
      await createAuditLog({ userId: ctx.user.id, action: "DEVICE_REMOVED", metadata: { deviceId: input.deviceId } });
      return { success: true };
    })
  }),
  clientInfo: router({
    latest: publicProcedure.query(() => getLatestVersion()),
    downloadInfo: protectedProcedure.query(async ({ ctx }) => {
      const version = await getLatestVersion();
      if (!version) return null;
      await createAuditLog({ userId: ctx.user.id, action: "DOWNLOAD_REQUESTED", metadata: { versionId: version.id } });
      return { version: version.version, minecraftVersion: version.minecraftVersion, fileName: version.fileName, releaseNotes: version.releaseNotes, available: false, reason: "Storage signing is not configured in this environment." };
    })
  }),
  admin: router({
    stats: adminProcedure.query(() => getAdminStats()),
    plans: adminProcedure.query(() => getPublicPlans()),
    subscriptionData: adminProcedure.query(() => getAdminSubscriptionData()),
    subscriptionKeys: adminProcedure.query(() => getAdminSubscriptionKeys()),
    createSubscriptionKey: adminProcedure.input(z.object({ planId: z.number().int().positive(), durationDays: z.number().int().min(1).max(36500) })).mutation(async ({ ctx, input }) => {
      const result = await createSubscriptionKey({ ...input, createdByUserId: ctx.user.id });
      if (!result) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_KEY_CREATED", metadata: { keyId: result.id, planId: input.planId, durationDays: input.durationDays } });
      return result;
    }),
    issueSubscription: adminProcedure.input(subscriptionInput).mutation(async ({ ctx, input }) => {
      if (input.endsAt <= input.startsAt) throw new TRPCError2({ code: "BAD_REQUEST", message: "End date must be after start date" });
      const id2 = await issueSubscription(input);
      if (!id2) throw new TRPCError2({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_ISSUED", metadata: { subscriptionId: id2, ...input, startsAt: input.startsAt.toISOString(), endsAt: input.endsAt.toISOString() } });
      return { success: true, id: id2 };
    }),
    updateSubscription: adminProcedure.input(subscriptionInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (input.endsAt <= input.startsAt) throw new TRPCError2({ code: "BAD_REQUEST", message: "End date must be after start date" });
      const success = await updateSubscription(input);
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Subscription not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_UPDATED", metadata: { subscriptionId: input.id } });
      return { success: true };
    }),
    extendSubscription: adminProcedure.input(z.object({ id: z.number().int().positive(), days: z.number().int().min(1).max(3650) })).mutation(async ({ ctx, input }) => {
      const success = await extendSubscription(input.id, input.days);
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Subscription not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_EXTENDED", metadata: input });
      return { success: true };
    }),
    revokeSubscription: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const success = await revokeSubscription(input.id);
      if (!success) throw new TRPCError2({ code: "NOT_FOUND", message: "Subscription not found" });
      await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_REVOKED", metadata: input });
      return { success: true };
    })
  })
});

// server/loader.ts
import { createHash as createHash3, randomBytes as randomBytes2, verify } from "node:crypto";

// server/supabaseAuth.ts
import { createRemoteJWKSet, jwtVerify as jwtVerify2 } from "jose";
var supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
var jwksUrl = process.env.SUPABASE_JWKS_URL ?? `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
var jwks = createRemoteJWKSet(new URL(jwksUrl));
function bearer(req) {
  const value = req.header("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}
async function authenticateSupabaseRequest(req) {
  const token = bearer(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify2(token, jwks, { issuer: `${supabaseUrl}/auth/v1`, audience: "authenticated" });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const metadata = payload.user_metadata && typeof payload.user_metadata === "object" ? payload.user_metadata : {};
    const username = typeof metadata.username === "string" ? metadata.username : email?.split("@")[0] ?? "Chroma User";
    await upsertUser({ openId: payload.sub, email, username, name: username, loginMethod: "supabase", lastSignedIn: /* @__PURE__ */ new Date() });
    return await getUserByOpenId(payload.sub) ?? { id: 0, openId: payload.sub, username, name: username, email, loginMethod: "supabase", role: "user", status: "active", createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), lastSignedIn: /* @__PURE__ */ new Date(), lastLoginAt: /* @__PURE__ */ new Date() };
  } catch {
    return null;
  }
}

// server/loader.ts
function tokenHash(token) {
  return createHash3("sha256").update(token).digest("hex");
}
function bearer2(req) {
  const value = req.header("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : null;
}
function bodyString(value, max = 4096) {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}
function issueCode() {
  return `CHRM-${randomBytes2(4).toString("hex").toUpperCase().slice(0, 6)}`;
}
function bad(res, message) {
  return res.status(400).json({ error: "INVALID_REQUEST", message });
}
function verifyLoaderSignature(publicKey, nonce, signature) {
  try {
    return verify(null, Buffer.from(nonce, "utf8"), publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}
function registerLoaderRoutes(app2) {
  app2.get("/api/loader/account", async (req, res) => {
    const user = await authenticateSupabaseRequest(req);
    if (!user || !user.id) return res.status(401).json({ error: "UNAUTHORIZED", message: "Supabase session required." });
    const summary = await getDashboardSummary(user.id);
    if (!summary?.user || summary.user.status !== "active") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account is not active." });
    return res.json({ user: summary.user, subscription: summary.subscription, latestSubscription: summary.latestSubscription, devices: summary.devices, latestVersion: summary.latestVersion });
  });
  app2.post("/api/loader/register-device", async (req, res) => {
    const deviceName = bodyString(req.body?.deviceName, 120);
    const publicKey = bodyString(req.body?.publicKey, 2048);
    if (!deviceName || !publicKey) return bad(res, "deviceName and publicKey are required.");
    const code = issueCode();
    const expiresAt = new Date(Date.now() + 10 * 6e4);
    const created = await createDeviceLinkCode({ codeHash: tokenHash(code), deviceName, publicKey, expiresAt });
    if (!created) return res.status(503).json({ error: "DATABASE_UNAVAILABLE", message: "Device registration is temporarily unavailable." });
    await createAuditLog({ action: "DEVICE_LINK_REQUESTED", metadata: { deviceName } });
    return res.status(201).json({ code, expiresAt });
  });
  app2.post("/api/loader/challenge", async (req, res) => {
    const publicKey = bodyString(req.body?.publicKey, 2048);
    if (!publicKey) return bad(res, "publicKey is required.");
    const device = await getDeviceByPublicKey(publicKey);
    if (!device || device.status !== "active") return res.status(404).json({ error: "DEVICE_NOT_FOUND", message: "Device is not linked or has been revoked." });
    const nonce = randomBytes2(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 6e4);
    await createLoaderChallenge({ deviceId: device.id, nonce, expiresAt });
    return res.json({ nonce, expiresAt, algorithm: "Ed25519" });
  });
  app2.post("/api/loader/authenticate", async (req, res) => {
    const publicKey = bodyString(req.body?.publicKey, 2048);
    const nonce = bodyString(req.body?.nonce, 256);
    const signature = bodyString(req.body?.signature, 2048);
    if (!publicKey || !nonce || !signature) return bad(res, "publicKey, nonce, and signature are required.");
    const device = await getDeviceByPublicKey(publicKey);
    if (!device || device.status !== "active") return res.status(401).json({ error: "INVALID_DEVICE", message: "Device is not active." });
    const challenge = await getValidLoaderChallenge(device.id, nonce);
    if (!challenge) return res.status(401).json({ error: "INVALID_CHALLENGE", message: "Challenge is invalid or expired." });
    const valid = verifyLoaderSignature(publicKey, nonce, signature);
    if (!valid || !await consumeLoaderChallenge(challenge.id)) return res.status(401).json({ error: "INVALID_SIGNATURE", message: "Signature verification failed." });
    const summary = await getDashboardSummary(device.userId);
    if (!summary?.user || summary.user.status !== "active") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account is not active." });
    if (!summary.subscription) return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: "No active subscription." });
    const accessToken = randomBytes2(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 15 * 6e4);
    await createLoaderSession({ userId: device.userId, deviceId: device.id, tokenHash: tokenHash(accessToken), expiresAt, lastSeenAt: /* @__PURE__ */ new Date() });
    await createAuditLog({ userId: device.userId, action: "LOADER_AUTHENTICATED", metadata: { deviceId: device.id } });
    return res.json({ accessToken, tokenType: "Bearer", expiresAt, deviceId: device.id, subscription: { plan: summary.subscription.plan.slug, endsAt: summary.subscription.subscription.endsAt } });
  });
  app2.get("/api/loader/version", async (_req, res) => {
    const version = await getLatestVersion();
    if (!version) return res.status(404).json({ error: "NO_RELEASE", message: "No active client version is published." });
    return res.json({ version: version.version, minecraftVersion: version.minecraftVersion, releaseNotes: version.releaseNotes });
  });
  app2.get("/api/loader/subscription", async (req, res) => {
    const token = bearer2(req);
    if (!token) return res.status(401).json({ error: "UNAUTHORIZED", message: "Bearer session required." });
    const session = await getLoaderSession(tokenHash(token));
    if (!session) return res.status(401).json({ error: "INVALID_SESSION", message: "Loader session is invalid or expired." });
    return res.json({ userId: session.user.id, deviceId: session.device.id, deviceStatus: session.device.status, validUntil: session.session.expiresAt });
  });
  app2.post("/api/loader/logout", async (req, res) => {
    const token = bearer2(req);
    if (token) await revokeLoaderSession(tokenHash(token));
    return res.status(204).send();
  });
  app2.post("/api/loader/create-link-code", (_req, res) => res.status(410).json({ error: "USE_REGISTER_DEVICE", message: "Use /register-device to issue a one-time code." }));
  app2.post("/api/loader/verify-link-code", (_req, res) => res.status(410).json({ error: "USE_DASHBOARD", message: "Link codes are approved from the authenticated dashboard." }));
  app2.post("/api/loader/session", (_req, res) => res.status(410).json({ error: "USE_AUTHENTICATE", message: "Use /authenticate to issue a short-lived session." }));
  app2.post("/api/loader/refresh", (_req, res) => res.status(501).json({ error: "NOT_CONFIGURED", message: "Refresh rotation will be enabled with the next Loader contract revision." }));
  app2.get("/api/loader/download", (_req, res) => res.status(501).json({ error: "NOT_CONFIGURED", message: "Downloads require configured private storage and signed URL generation." }));
}

// server/supabaseRegistration.ts
var supabaseUrl2 = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co";
var publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
function text2(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : null;
}
function errorMessage(value) {
  return typeof value === "object" && value !== null && "msg" in value && typeof value.msg === "string" ? value.msg : "Registration failed.";
}
function registerSupabaseRegistrationRoute(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    const email = text2(req.body?.email, 320)?.toLowerCase();
    const password = typeof req.body?.password === "string" && req.body.password.length >= 6 ? req.body.password : null;
    const username = text2(req.body?.username, 48);
    if (!email || !password || !username) return res.status(400).json({ error: "INVALID_REQUEST", message: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 username, email \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C \u0438\u0437 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432." });
    const serviceKey = process.env.SUPABASE_SECRET_KEY;
    if (!serviceKey || !publishableKey) return res.status(503).json({ error: "AUTH_NOT_CONFIGURED", message: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430: \u0441\u0435\u0440\u0432\u0435\u0440\u043D\u0430\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0430." });
    try {
      const createResponse = await fetch(`${supabaseUrl2}/auth/v1/admin/users`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username, name: username } })
      });
      const createdBody = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok && !(createResponse.status === 422 && JSON.stringify(createdBody).toLowerCase().includes("already"))) return res.status(createResponse.status === 422 ? 409 : 502).json({ error: "REGISTRATION_FAILED", message: errorMessage(createdBody) });
      const loginResponse = await fetch(`${supabaseUrl2}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const loginBody = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok) return res.status(502).json({ error: "SESSION_FAILED", message: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u0441\u043E\u0437\u0434\u0430\u043D, \u043D\u043E \u0441\u0435\u0441\u0441\u0438\u044E \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0432\u043E\u0439\u0442\u0438." });
      return res.status(201).json(loginBody);
    } catch {
      return res.status(503).json({ error: "AUTH_UNAVAILABLE", message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A \u0441\u0435\u0440\u0432\u0438\u0441\u0443 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438." });
    }
  });
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  if (!user) {
    try {
      user = await authenticateSupabaseRequest(opts.req);
    } catch {
      user = null;
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/app.ts
function createApp() {
  const app2 = express();
  app2.disable("x-powered-by");
  const requestBuckets = /* @__PURE__ */ new Map();
  app2.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = requestBuckets.get(key);
    if (!current || current.resetAt <= now) requestBuckets.set(key, { count: 1, resetAt: now + 6e4 });
    else if (current.count >= 120) return res.status(429).json({ error: "RATE_LIMITED", message: "Too many requests. Try again later." });
    else current.count += 1;
    next();
  });
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  registerSupabaseRegistrationRoute(app2);
  registerLoaderRoutes(app2);
  app2.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app2;
}

// .api-index-entry.ts
var app = createApp();
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
