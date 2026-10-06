import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { auth } from "@/lib/auth";
import { getEntitlement } from "@/lib/db/entitlements";
import { PLANS } from "@/lib/payments/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DAY_MS = 24 * 3600_000;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const record = session ? await getEntitlement(session.user.id) : null;

  const now = new Date();
  const validUntil = record ? new Date(record.entitlement.validUntil) : null;
  const daysLeft = validUntil
    ? Math.ceil((validUntil.getTime() - now.getTime()) / DAY_MS)
    : 0;
  const lapsed = validUntil !== null && validUntil <= now;
  const plan = record ? PLANS[record.plan.id as keyof typeof PLANS] : undefined;
  const features = record?.plan.features ?? plan?.features ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as {session?.user.email ?? "unknown"}.
      </p>

      {!record || !plan ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              You don&apos;t have an active plan yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Plans cost Rp49.000–Rp149.000 per 30 days and pay for themselves
              in rupiah — QRIS, bank virtual accounts, or e-wallets. Nothing
              renews on its own.
            </p>
            <div>
              <Button render={<Link href="/pricing" />}>
                See plans <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{plan.name}</CardTitle>
              <Badge variant={lapsed ? "destructive" : "default"}>
                {lapsed ? "Lapsed" : "Active"}
              </Badge>
            </div>
            <CardDescription>
              {lapsed ? (
                <>
                  Your plan lapsed on {validUntil && formatDate(validUntil)}.
                  One payment starts a fresh 30 days.
                </>
              ) : (
                <>
                  {daysLeft} day{daysLeft === 1 ? "" : "s"} left — runs until{" "}
                  {validUntil && formatDate(validUntil)}.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ul className="flex flex-col gap-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              {plan.id === "starter" && !lapsed ? (
                <Button render={<Link href="/pricing" />}>
                  Upgrade to Pro <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button render={<Link href="/pricing" />}>
                  {lapsed ? "Start a new period" : "Extend my plan"}{" "}
                  <ArrowRight className="size-4" />
                </Button>
              )}
              <Button variant="outline" render={<Link href="/dashboard/billing" />}>
                Payment history
              </Button>
            </div>
            {!lapsed && daysLeft < 7 && (
              <p className="text-sm text-muted-foreground">
                Heads-up: less than a week left. Extending now adds 30 days on
                top of what remains — no days lost.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
