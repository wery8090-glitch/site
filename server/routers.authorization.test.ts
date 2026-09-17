import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Chroma authorization boundaries", () => {
  it("rejects dashboard summary for anonymous callers", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.dashboard.summary()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects admin metrics for anonymous callers", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects admin metrics when the persisted role is user", async () => {
    const caller = appRouter.createCaller({
      ...anonymousContext(),
      user: {
        id: 42,
        openId: "role-test",
        name: "Role Test",
        email: "role@example.com",
        loginMethod: "test",
        role: "user",
        status: "active",
        username: "role-test",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        lastLoginAt: new Date(),
      },
    });
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
