import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { authenticateFirebaseRequest } from "../firebaseAuth";
import { authenticateSupabaseRequest } from "../supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }
  if (!user) {
    try { user = await authenticateFirebaseRequest(opts.req); } catch { user = null; }
  }
  if (!user) {
    try { user = await authenticateSupabaseRequest(opts.req); } catch { user = null; }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
