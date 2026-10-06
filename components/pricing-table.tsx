import { headers } from "next/headers";
import Link from "next/link";
import { Check } from "lucide-react";
import { auth } from "@/lib/auth";
import { PLANS } from "@/lib/payments/plans";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckoutButton } from "@/components/checkout-button";

function formatIdr(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export async function PricingTable() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Object.values(PLANS).map((plan) => {
        const highlighted = plan.id === "pro";
        return (
          <Card
            key={plan.id}
            className={cn(highlighted && "border-foreground/40")}
          >
            <CardHeader>
              <div className="flex items-baseline justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {highlighted && (
                  <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs text-background">
                    Most picked
                  </span>
                )}
              </div>
              <CardDescription>
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {formatIdr(plan.priceIdr)}
                </span>{" "}
                / {plan.durationDays} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {session ? (
                <CheckoutButton planId={plan.id} />
              ) : (
                <Button
                  variant={highlighted ? "default" : "outline"}
                  className="w-full"
                  render={<Link href={`/auth/login?plan=${plan.id}`} />}
                >
                  Choose {plan.name}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
