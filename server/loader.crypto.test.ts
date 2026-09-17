import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyLoaderSignature } from "./loader";

describe("Loader Ed25519 contract", () => {
  it("accepts a valid signature and rejects a changed nonce", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const nonce = "chroma-test-nonce";
    const signature = sign(null, Buffer.from(nonce, "utf8"), privateKey).toString("base64");
    expect(verifyLoaderSignature(publicKey.export({ type: "spki", format: "pem" }).toString(), nonce, signature)).toBe(true);
    expect(verifyLoaderSignature(publicKey.export({ type: "spki", format: "pem" }).toString(), `${nonce}-changed`, signature)).toBe(false);
  });
});
