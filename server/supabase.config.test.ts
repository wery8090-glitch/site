import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("accepts the configured server secret for a lightweight settings request", async () => {
    const url = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    expect(url).toBeTruthy();
    expect(secret).toBeTruthy();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: secret!,
        Authorization: `Bearer ${secret}`,
      },
    });
    expect(response.ok).toBe(true);
    const body = await response.json() as { external?: Record<string, unknown> };
    expect(body).toHaveProperty("external");
  }, 15000);
});
