"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { id: "midtrans", label: "Midtrans" },
  { id: "xendit", label: "Xendit" },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

// One plan's checkout: pick a provider, start the payment, land on the
// provider's checkout page. Prices are never sent from here — the server
// reads them from lib/payments/plans.ts.
export function CheckoutButton({ planId }: { planId: string }) {
  const [provider, setProvider] = useState<ProviderId>("midtrans");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, provider }),
      });
      const data = (await res.json().catch(() => null)) as {
        checkoutUrl?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Checkout could not be started. Try again.",
        );
        setPending(false);
        return;
      }
      if (typeof data?.checkoutUrl === "string") {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError("The payment page did not come back. Try again.");
      setPending(false);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        role="group"
        aria-label="Payment provider"
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      >
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={provider === p.id}
            disabled={pending}
            onClick={() => setProvider(p.id)}
            className={cn(
              "h-8 rounded-md text-sm font-medium transition-colors disabled:opacity-50",
              provider === p.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Button className="w-full" disabled={pending} onClick={startCheckout}>
        {pending ? "Opening checkout…" : "Pay now"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
