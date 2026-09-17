import { describe, expect, it } from "vitest";
import { FunPayProvider, PURCHASE_OFFERS, TelegramProvider, TELEGRAM_SELLER_URL } from "../shared/purchase";

describe("purchase providers", () => {
  it("returns the exact FunPay listing for each plan and term", () => {
    const provider = new FunPayProvider();
    for (const offer of PURCHASE_OFFERS) {
      expect(provider.getCheckoutUrl({ plan: offer.plan, duration: offer.duration })).toBe(offer.url);
    }
    expect(provider.getCheckoutUrl({ plan: "base", duration: "lifetime" })).toBe("https://funpay.com/lots/offer?id=77264834");
  });

  it("uses the requested Telegram seller without simulating checkout", () => {
    expect(new TelegramProvider().getCheckoutUrl({ plan: "premium" })).toBe(TELEGRAM_SELLER_URL);
  });
});
