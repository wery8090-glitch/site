export type PurchasePlan = "base" | "premium" | "premium_beta";
export type PurchaseDuration = "month" | "three_months" | "six_months";
export type PurchaseSource = "FunPay" | "Telegram" | "Manual";

export type PurchaseOffer = {
  plan: PurchasePlan;
  duration: PurchaseDuration;
  label: string;
  price: number | null;
  url: string;
};

export const TELEGRAM_SELLER_URL = "https://t.me/ChromaVisual";
export const TELEGRAM_SELLER = "@ChromaVisual";

export const PURCHASE_OFFERS: PurchaseOffer[] = [
  { plan: "base", duration: "month", label: "1 month", price: 118.13, url: "https://funpay.com/lots/offer?id=77351057" },
  { plan: "base", duration: "three_months", label: "3 months", price: 295.32, url: "https://funpay.com/lots/offer?id=77351126" },
  { plan: "base", duration: "six_months", label: "6 months", price: 425.25, url: "https://funpay.com/lots/offer?id=77351273" },
  { plan: "premium", duration: "month", label: "1 month", price: 236.25, url: "https://funpay.com/lots/offer?id=77351346" },
  { plan: "premium", duration: "three_months", label: "3 months", price: 472.51, url: "https://funpay.com/lots/offer?id=77351406" },
  { plan: "premium", duration: "six_months", label: "6 months", price: 590.63, url: "https://funpay.com/lots/offer?id=77351477" },
  { plan: "premium_beta", duration: "month", label: "1 month", price: 342.57, url: "https://funpay.com/lots/offer?id=77351602" },
  { plan: "premium_beta", duration: "three_months", label: "3 months", price: 531.57, url: "https://funpay.com/lots/offer?id=77351651" },
  { plan: "premium_beta", duration: "six_months", label: "6 months", price: 767.82, url: "https://funpay.com/lots/offer?id=77351694" },
];

export const PURCHASE_PLAN_LABELS: Record<PurchasePlan, string> = {
  base: "BASE",
  premium: "PREMIUM",
  premium_beta: "PREMIUM + BETA",
};

export interface PaymentProvider {
  readonly name: PurchaseSource;
  getCheckoutUrl(input: { plan: PurchasePlan; duration?: PurchaseDuration; promoCode?: string }): string | null;
}

export class FunPayProvider implements PaymentProvider {
  readonly name = "FunPay" as const;
  getCheckoutUrl(input: { plan: PurchasePlan; duration?: PurchaseDuration }) {
    return PURCHASE_OFFERS.find(offer => offer.plan === input.plan && offer.duration === input.duration)?.url ?? null;
  }
}

export class TelegramProvider implements PaymentProvider {
  readonly name = "Telegram" as const;
  getCheckoutUrl() { return TELEGRAM_SELLER_URL; }
}

export class ManualProvider implements PaymentProvider {
  readonly name = "Manual" as const;
  getCheckoutUrl() { return null; }
}

export const purchaseProviders = {
  FunPay: new FunPayProvider(),
  Telegram: new TelegramProvider(),
  Manual: new ManualProvider(),
};
