import { COOKIE_NAME } from "@shared/const";
import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { consumeDeviceLinkCode, countActiveDevices, createAuditLog, createDevice, createSubscriptionKey, createVisual, ensureSupabaseProfile, extendSubscription, getAdminAuditLogs, getAdminClientVersions, getAdminDevices, getAdminPayments, getAdminStats, getAdminSubscriptionData, getAdminSubscriptionKeys, getAdminUsers, getAdminVisuals, getAvailableVersions, getDashboardSummary, getLatestVersion, getPlanBySlug, getPublicPlans, getUserDevices, getUserVisuals, getValidDeviceLinkCode, issueSubscription, publishClientVersion, redeemSubscriptionKey, revokeDevice, revokeSubscription, setClientVersionState, setVisualState, updateSubscription } from "./db";
import { PURCHASE_OFFERS, TELEGRAM_SELLER_URL } from "../shared/purchase";
import { callSupabaseSubscriptionApi, mapSubscriptionKeys } from "./supabaseSubscriptionApi";

const subscriptionInput = z.object({
  userId: z.number().int().positive(),
  planId: z.number().int().positive(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  provider: z.enum(["FunPay", "Telegram", "Manual"]),
  adminNote: z.string().trim().max(1000).optional(),
});

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    syncProfile: protectedProcedure.mutation(({ ctx }) => ensureSupabaseProfile({ openId: ctx.user.openId, email: ctx.user.email, name: ctx.user.name, username: ctx.user.username })),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),

  plans: router({
    list: publicProcedure.query(() => getPublicPlans()),
    purchaseOffers: publicProcedure.query(() => ({ offers: PURCHASE_OFFERS, telegramUrl: TELEGRAM_SELLER_URL })),
  }),

  dashboard: router({ summary: protectedProcedure.query(({ ctx }) => getDashboardSummary(ctx.user.id)), visuals: protectedProcedure.query(({ ctx }) => getUserVisuals(ctx.user.id)), versions: protectedProcedure.query(({ ctx }) => getAvailableVersions(ctx.user.id)), redeemKey: protectedProcedure.input(z.object({ key: z.string().trim().toUpperCase().regex(/^CHROMA-[A-Z0-9]{12}-[A-Z0-9]{12}-[A-Z0-9]{12}$/) })).mutation(async ({ ctx, input }) => { const result = await callSupabaseSubscriptionApi(ctx.req, "redeem_key", { key: input.key }) as any; return { success: true, plan: result?.plan?.name ?? result?.plan?.slug ?? "Subscription", durationDays: result?.duration_days ?? 0, endsAt: result?.ends_at ?? null } as const; }) }),

  devices: router({
    list: protectedProcedure.query(({ ctx }) => getUserDevices(ctx.user.id)),
    verifyLinkCode: protectedProcedure.input(z.object({ code: z.string().trim().toUpperCase().regex(/^CHRM-[A-Z0-9]{6}$/) })).mutation(async ({ ctx, input }) => {
      const codeHash = createHash("sha256").update(input.code).digest("hex");
      const pending = await getValidDeviceLinkCode(codeHash);
      if (!pending) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired link code" });
      const summary = await getDashboardSummary(ctx.user.id);
      const limit = summary?.subscription?.plan.deviceLimit ?? 1;
      const activeCount = await countActiveDevices(ctx.user.id);
      if (activeCount >= limit) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Your current plan has reached its device limit" });
      const deviceId = await createDevice({ userId: ctx.user.id, name: pending.deviceName, publicKey: pending.publicKey });
      if (!deviceId || !(await consumeDeviceLinkCode(pending.id))) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to link device" });
      await createAuditLog({ userId: ctx.user.id, action: "DEVICE_REGISTERED", metadata: { deviceId, name: pending.deviceName } });
      return { success: true, deviceId } as const;
    }),
    revoke: protectedProcedure.input(z.object({ deviceId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const success = await revokeDevice(ctx.user.id, input.deviceId); if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" }); await createAuditLog({ userId: ctx.user.id, action: "DEVICE_REMOVED", metadata: { deviceId: input.deviceId } }); return { success: true } as const; }),
  }),

  clientInfo: router({
    latest: publicProcedure.query(() => getLatestVersion()),
    downloadInfo: protectedProcedure.query(async ({ ctx }) => { const version = await getLatestVersion(); if (!version) return null; await createAuditLog({ userId: ctx.user.id, action: "DOWNLOAD_REQUESTED", metadata: { versionId: version.id } }); return { version: version.version, minecraftVersion: version.minecraftVersion, fileName: version.fileName, releaseNotes: version.releaseNotes, available: false, reason: "Storage signing is not configured in this environment." }; }),
  }),

  admin: router({
    stats: adminProcedure.query(() => getAdminStats()),
    users: adminProcedure.query(() => getAdminUsers()),
    devices: adminProcedure.query(() => getAdminDevices()),
    payments: adminProcedure.query(() => getAdminPayments()),
    auditLogs: adminProcedure.query(() => getAdminAuditLogs()),
    plans: adminProcedure.query(() => getPublicPlans()),
    subscriptionData: adminProcedure.query(() => getAdminSubscriptionData()),
    subscriptionKeys: adminProcedure.query(async ({ ctx }) => mapSubscriptionKeys(await callSupabaseSubscriptionApi(ctx.req, "admin_list_keys") as any[])),
    clientVersions: adminProcedure.query(() => getAdminClientVersions()),
    visuals: adminProcedure.query(() => getAdminVisuals()),
    publishClientVersion: adminProcedure.input(z.object({ version: z.string().trim().min(1).max(32), minecraftVersion: z.string().trim().min(1).max(32), fileKey: z.string().trim().url().max(512), fileName: z.string().trim().min(1).max(160), releaseNotes: z.string().trim().max(5000).default(""), requiredPlan: z.enum(["free", "base", "premium", "premium_beta"]).default("free"), makeLatest: z.boolean().default(true) })).mutation(async ({ ctx, input }) => { const id = await publishClientVersion(input); if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" }); await createAuditLog({ userId: ctx.user.id, action: "ADMIN_CLIENT_VERSION_PUBLISHED", metadata: { id, version: input.version, requiredPlan: input.requiredPlan, fileName: input.fileName } }); return { success: true, id } as const; }),
    setClientVersionState: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean().optional(), isLatest: z.boolean().optional() })).mutation(async ({ ctx, input }) => { const success = await setClientVersionState(input.id, { active: input.active, isLatest: input.isLatest }); if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" }); await createAuditLog({ userId: ctx.user.id, action: "ADMIN_CLIENT_VERSION_UPDATED", metadata: input }); return { success: true } as const; }),
    createVisual: adminProcedure.input(z.object({ name: z.string().trim().min(1).max(96), slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(96), description: z.string().trim().max(2000).default(""), version: z.string().trim().min(1).max(32), fileKey: z.string().trim().url().max(512), minecraftVersion: z.string().trim().min(1).max(32), featured: z.boolean().default(false) })).mutation(async ({ ctx, input }) => { const id = await createVisual(input); if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" }); await createAuditLog({ userId: ctx.user.id, action: "ADMIN_VISUAL_CREATED", metadata: { id, slug: input.slug } }); return { success: true, id } as const; }),
    setVisualState: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean().optional(), featured: z.boolean().optional() })).mutation(async ({ ctx, input }) => { const success = await setVisualState(input.id, { active: input.active, featured: input.featured }); if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Visual not found" }); await createAuditLog({ userId: ctx.user.id, action: "ADMIN_VISUAL_UPDATED", metadata: input }); return { success: true } as const; }),
    createSubscriptionKey: adminProcedure.input(z.object({ planId: z.number().int().positive(), maxActivations: z.number().int().min(1).max(100000), expiresAt: z.coerce.date() })).mutation(async ({ ctx, input }) => { if (input.expiresAt <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Дата окончания должна быть в будущем." }); const planSlug = ({ 1: "free", 2: "base", 3: "premium", 4: "premium_beta" } as Record<number, string>)[input.planId]; if (!planSlug) throw new TRPCError({ code: "BAD_REQUEST", message: "Неизвестный тариф Supabase." }); return await callSupabaseSubscriptionApi(ctx.req, "admin_create_key", { plan_slug: planSlug, max_activations: input.maxActivations, expires_at: input.expiresAt.toISOString() }) as { key: string; record: Record<string, unknown> }; }),
    issueSubscription: adminProcedure.input(subscriptionInput).mutation(async ({ ctx, input }) => { if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "End date must be after start date" }); const id = await issueSubscription(input); if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" }); await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_ISSUED", metadata: { subscriptionId: id, ...input, startsAt: input.startsAt.toISOString(), endsAt: input.endsAt.toISOString() } }); return { success: true, id } as const; }),
    updateSubscription: adminProcedure.input(subscriptionInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "End date must be after start date" }); const success = await updateSubscription(input); if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" }); await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_UPDATED", metadata: { subscriptionId: input.id } }); return { success: true } as const; }),
    extendSubscription: adminProcedure.input(z.object({ id: z.number().int().positive(), days: z.number().int().min(1).max(3650) })).mutation(async ({ ctx, input }) => { const success = await extendSubscription(input.id, input.days); if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" }); await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_EXTENDED", metadata: input }); return { success: true } as const; }),
    revokeSubscription: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const success = await revokeSubscription(input.id); if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" }); await createAuditLog({ userId: ctx.user.id, action: "ADMIN_SUBSCRIPTION_REVOKED", metadata: input }); return { success: true } as const; }),
  }),
});

export type AppRouter = typeof appRouter;
