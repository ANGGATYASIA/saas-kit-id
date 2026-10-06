import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, user } from "@/lib/db/schema";
import { PLANS } from "@/lib/payments/plans";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";

function formatIdr(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  const rows = await db
    .select({ transaction: transactions, email: user.email })
    .from(transactions)
    .innerJoin(user, eq(transactions.userId, user.id))
    .where(
      and(
        eq(transactions.orderId, orderId),
        eq(transactions.userId, session.user.id),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) notFound();

  const tx = row.transaction;
  const plan = PLANS[tx.planId as keyof typeof PLANS];
  const paid = tx.status === "settlement";

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="no-print mb-8 flex items-center justify-between">
        <Link
          href="/dashboard/billing"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          ← Back to billing
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-lg border p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-semibold">saas-kit-id</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Invoice
            </h1>
          </div>
          <Badge variant={paid ? "default" : "secondary"}>
            {paid ? "Paid" : tx.status ?? "pending"}
          </Badge>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Billed to</dt>
            <dd className="mt-1">{row.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="mt-1">{formatDate(new Date(tx.createdAt))}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Order</dt>
            <dd className="mt-1 font-mono text-xs">{tx.orderId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Paid via</dt>
            <dd className="mt-1 capitalize">{tx.provider}</dd>
          </div>
        </dl>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3">
                {plan ? plan.name : tx.planId} plan — {plan?.durationDays ?? 30}{" "}
                days
              </td>
              <td className="py-3 text-right">{formatIdr(tx.amountIdr)}</td>
            </tr>
            <tr>
              <td className="py-3 font-medium">Total</td>
              <td className="py-3 text-right font-medium">
                {formatIdr(tx.amountIdr)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Amounts in Indonesian rupiah. Use your browser&apos;s print dialog to
          print or save this page as a PDF.
        </p>
      </div>
    </main>
  );
}
