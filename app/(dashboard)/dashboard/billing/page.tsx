import { headers } from "next/headers";
import Link from "next/link";
import { CheckCircle2, Printer, XCircle } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { PLANS } from "@/lib/payments/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatIdr(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function providerLabel(provider: string) {
  return provider === "midtrans"
    ? "Midtrans"
    : provider === "xendit"
      ? "Xendit"
      : provider;
}

function planLabel(planId: string) {
  const plan = PLANS[planId as keyof typeof PLANS];
  return plan ? plan.name : planId;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "settlement":
      return <Badge>Paid</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "expired":
      return <Badge variant="outline">Expired</Badge>;
    default:
      return <Badge variant="destructive">Failed</Badge>;
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const status = (await searchParams).status;

  const history = session
    ? await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, session.user.id))
        .orderBy(desc(transactions.createdAt))
    : [];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-2 text-muted-foreground">
        Every payment you&apos;ve made, with a printable invoice for each.
      </p>

      {status === "success" && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-green-600/30 bg-green-600/10 px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-700 dark:text-green-400" />
          <p className="text-sm">
            Payment received — your plan is active. The receipt below is also
            on its way to your inbox.
          </p>
        </div>
      )}
      {status === "failed" && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p className="text-sm">
            That payment didn&apos;t go through — nothing was charged. You can{" "}
            <Link href="/pricing" className="underline underline-offset-4">
              try again
            </Link>{" "}
            whenever you&apos;re ready.
          </p>
        </div>
      )}

      <div className="mt-8">
        {history.length === 0 ? (
          <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
            No payments yet. When you pay for a plan, it shows up here.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Invoice</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDateTime(new Date(tx.createdAt))}</TableCell>
                  <TableCell>{planLabel(tx.planId)}</TableCell>
                  <TableCell>{providerLabel(tx.provider)}</TableCell>
                  <TableCell className="text-right">
                    {formatIdr(tx.amountIdr)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={tx.status ?? "pending"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <Link href={`/dashboard/billing/invoice/${tx.orderId}`} />
                      }
                    >
                      <Printer className="size-4" />
                      Print invoice
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </main>
  );
}
