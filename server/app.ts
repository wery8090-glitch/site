import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { registerSupabaseRegistrationRoute } from "./supabaseRegistration";
import { createContext } from "./_core/context";
import { registerLoaderRoutes } from "./loader";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  const requestBuckets = new Map<string, { count: number; resetAt: number }>();
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = requestBuckets.get(key);
    if (!current || current.resetAt <= now) requestBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    else if (current.count >= 120) return res.status(429).json({ error: "RATE_LIMITED", message: "Too many requests. Try again later." });
    else current.count += 1;
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerSupabaseRegistrationRoute(app);
  registerLoaderRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}
