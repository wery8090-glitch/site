import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { authenticateSupabaseRequest } from "../supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authSource: "supabase" | "legacy" | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authSource: "supabase" | "legacy" | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) authSource = "legacy";
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }
  if (!user) {
    try { user = await authenticateSupabaseRequest(opts.req); if (user) authSource = "supabase"; } catch { user = null; }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    authSource,
  };
}
