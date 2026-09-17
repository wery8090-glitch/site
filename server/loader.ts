import { createHash, randomBytes, verify } from "node:crypto";
import type { Express, Request, Response } from "express";
import { createAuditLog, createDeviceLinkCode, createLoaderChallenge, createLoaderSession, getDashboardSummary, getDeviceByPublicKey, getLatestVersion, getAvailableVersions, getLoaderSession, getValidLoaderChallenge, revokeLoaderSession, consumeLoaderChallenge, getUserVisuals } from "./db";
import { authenticateSupabaseRequest } from "./supabaseAuth";

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function bearer(req: Request) { const value = req.header("authorization"); return value?.startsWith("Bearer ") ? value.slice(7).trim() : null; }
function bodyString(value: unknown, max = 4096) { return typeof value === "string" && value.length > 0 && value.length <= max ? value : null; }
function issueCode() { return `CHRM-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`; }
function bad(res: Response, message: string) { return res.status(400).json({ error: "INVALID_REQUEST", message }); }
export function verifyLoaderSignature(publicKey: string, nonce: string, signature: string) {
  try { return verify(null, Buffer.from(nonce, "utf8"), publicKey, Buffer.from(signature, "base64")); } catch { return false; }
}

export function registerLoaderRoutes(app: Express) {
  app.get("/api/loader/health", (_req, res) => res.json({ ok: true, service: "chroma-api", time: new Date().toISOString() }));
  app.get("/api/loader/account", async (req, res) => {
    const user = await authenticateSupabaseRequest(req);
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED", message: "Supabase session required." });
    if (!user.id) return res.json({ user, subscription: null, latestSubscription: null, devices: [], latestVersion: null });
    const summary = await getDashboardSummary(user.id);
    if (!summary?.user || summary.user.status !== "active") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account is not active." });
    return res.json({ user: summary.user, subscription: summary.subscription, latestSubscription: summary.latestSubscription, devices: summary.devices, latestVersion: summary.latestVersion });
  });

  app.post("/api/loader/register-device", async (req, res) => {
    const deviceName = bodyString(req.body?.deviceName, 120);
    const publicKey = bodyString(req.body?.publicKey, 2048);
    if (!deviceName || !publicKey) return bad(res, "deviceName and publicKey are required.");
    const code = issueCode();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const created = await createDeviceLinkCode({ codeHash: tokenHash(code), deviceName, publicKey, expiresAt });
    if (!created) return res.status(503).json({ error: "DATABASE_UNAVAILABLE", message: "Device registration is temporarily unavailable." });
    await createAuditLog({ action: "DEVICE_LINK_REQUESTED", metadata: { deviceName } });
    return res.status(201).json({ code, expiresAt });
  });

  app.post("/api/loader/challenge", async (req, res) => {
    const publicKey = bodyString(req.body?.publicKey, 2048);
    if (!publicKey) return bad(res, "publicKey is required.");
    const device = await getDeviceByPublicKey(publicKey);
    if (!device || device.status !== "active") return res.status(404).json({ error: "DEVICE_NOT_FOUND", message: "Device is not linked or has been revoked." });
    const nonce = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 60_000);
    await createLoaderChallenge({ deviceId: device.id, nonce, expiresAt });
    return res.json({ nonce, expiresAt, algorithm: "Ed25519" });
  });

  app.post("/api/loader/authenticate", async (req, res) => {
    const publicKey = bodyString(req.body?.publicKey, 2048);
    const nonce = bodyString(req.body?.nonce, 256);
    const signature = bodyString(req.body?.signature, 2048);
    if (!publicKey || !nonce || !signature) return bad(res, "publicKey, nonce, and signature are required.");
    const device = await getDeviceByPublicKey(publicKey);
    if (!device || device.status !== "active") return res.status(401).json({ error: "INVALID_DEVICE", message: "Device is not active." });
    const challenge = await getValidLoaderChallenge(device.id, nonce);
    if (!challenge) return res.status(401).json({ error: "INVALID_CHALLENGE", message: "Challenge is invalid or expired." });
    const valid = verifyLoaderSignature(publicKey, nonce, signature);
    if (!valid || !(await consumeLoaderChallenge(challenge.id))) return res.status(401).json({ error: "INVALID_SIGNATURE", message: "Signature verification failed." });
    const summary = await getDashboardSummary(device.userId);
    if (!summary?.user || summary.user.status !== "active") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account is not active." });
    if (!summary.subscription) return res.status(403).json({ error: "SUBSCRIPTION_REQUIRED", message: "No active subscription." });
    const accessToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await createLoaderSession({ userId: device.userId, deviceId: device.id, tokenHash: tokenHash(accessToken), expiresAt, lastSeenAt: new Date() });
    await createAuditLog({ userId: device.userId, action: "LOADER_AUTHENTICATED", metadata: { deviceId: device.id } });
    return res.json({ accessToken, tokenType: "Bearer", expiresAt, deviceId: device.id, subscription: { plan: summary.subscription.plan.slug, endsAt: summary.subscription.subscription.endsAt } });
  });

  app.get("/api/loader/version", async (_req, res) => {
    const version = await getLatestVersion();
    if (!version) return res.status(404).json({ error: "NO_RELEASE", message: "No active client version is published." });
    return res.json({ version: version.version, minecraftVersion: version.minecraftVersion, fileName: version.fileName, downloadUrl: version.fileKey, releaseNotes: version.releaseNotes });
  });
  app.get("/api/loader/visuals", async (req, res) => {
    const user = await authenticateSupabaseRequest(req);
    if (!user?.id) return res.status(401).json({ error: "AUTH_ERROR", message: "Session expired." });
    const visuals = await getUserVisuals(user.id);
    return res.json({ visuals });
  });
  app.get("/api/loader/versions", async (req, res) => {
    const user = await authenticateSupabaseRequest(req);
    if (!user?.id) return res.status(401).json({ error: "AUTH_ERROR", message: "Session expired." });
    const summary = await getDashboardSummary(user.id);
    if (!summary?.user || summary.user.status !== "active") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Account is not active." });
    return res.json({ versions: await getAvailableVersions(user.id) });
  });

  app.get("/api/loader/subscription", async (req, res) => {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: "UNAUTHORIZED", message: "Bearer session required." });
    const session = await getLoaderSession(tokenHash(token));
    if (!session) return res.status(401).json({ error: "INVALID_SESSION", message: "Loader session is invalid or expired." });
    return res.json({ userId: session.user.id, deviceId: session.device.id, deviceStatus: session.device.status, validUntil: session.session.expiresAt });
  });

  app.post("/api/loader/logout", async (req, res) => {
    const token = bearer(req);
    if (token) await revokeLoaderSession(tokenHash(token));
    return res.status(204).send();
  });

  app.post("/api/loader/create-link-code", (_req, res) => res.status(410).json({ error: "USE_REGISTER_DEVICE", message: "Use /register-device to issue a one-time code." }));
  app.post("/api/loader/verify-link-code", (_req, res) => res.status(410).json({ error: "USE_DASHBOARD", message: "Link codes are approved from the authenticated dashboard." }));
  app.post("/api/loader/session", (_req, res) => res.status(410).json({ error: "USE_AUTHENTICATE", message: "Use /authenticate to issue a short-lived session." }));
  app.post("/api/loader/refresh", (_req, res) => res.status(501).json({ error: "NOT_CONFIGURED", message: "Refresh rotation will be enabled with the next Loader contract revision." }));
  app.get("/api/loader/download", (_req, res) => res.status(501).json({ error: "NOT_CONFIGURED", message: "Downloads require configured private storage and signed URL generation." }));
}
