import { MidtransProvider } from "./midtrans";
import type { PaymentProvider } from "./types";
import { XenditProvider } from "./xendit";

export type ProviderName = "midtrans" | "xendit";

const PROVIDERS: Record<ProviderName, () => PaymentProvider> = {
  midtrans: () => new MidtransProvider(),
  xendit: () => new XenditProvider(),
};

export function getProvider(name: string): PaymentProvider {
  if (name === "midtrans" || name === "xendit") {
    return PROVIDERS[name]();
  }
  throw new Error(
    `Unknown payment provider "${name}". Supported: midtrans, xendit.`,
  );
}

export function isProviderName(name: string): name is ProviderName {
  return name === "midtrans" || name === "xendit";
}
