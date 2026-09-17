import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("Loader account authorization", () => {
  it("rejects unauthenticated account requests", async () => {
    const server = createServer(createApp());
    await new Promise<void>(resolve => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/api/loader/account`);
    expect(response.status).toBe(401);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }, 15000);
});
