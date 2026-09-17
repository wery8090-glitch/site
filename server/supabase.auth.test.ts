import { describe, expect, it } from "vitest";

describe("Supabase public auth configuration", () => {
  it("reaches the configured Supabase Auth service with the publishable key", async () => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toMatch(/^https:\/\//);
    expect(key).toMatch(/^sb_publishable_/);
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key! } });
    expect(response.status).toBeLessThan(500);
  }, 15000);
});
