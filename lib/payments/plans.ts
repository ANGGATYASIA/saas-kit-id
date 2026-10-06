// Single source of truth for plans and pricing.
// Checkout and webhooks always read prices from here — never trust a price
// that arrives from the client.

export type PlanId = "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  priceIdr: number;
  durationDays: number;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceIdr: 49_000,
    durationDays: 30,
    features: [
      "1 active project",
      "Checkout via QRIS, bank VA, and e-wallets",
      "Email receipts for every payment",
      "Email reminder before your plan lapses",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceIdr: 149_000,
    durationDays: 30,
    features: [
      "Unlimited projects",
      "Checkout via QRIS, bank VA, and e-wallets",
      "Email receipts for every payment",
      "Email reminder before your plan lapses",
      "Priority support",
    ],
  },
};

export function getPlan(id: string): Plan | undefined {
  return id === "starter" || id === "pro" ? PLANS[id] : undefined;
}
