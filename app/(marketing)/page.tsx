import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CreditCard,
  Mail,
  Search,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingTable } from "@/components/pricing-table";

const features = [
  {
    icon: ShieldCheck,
    title: "Auth that lives in your database",
    body: "Better Auth with email + password and Google sign-in. Sessions, accounts, and verification rows sit in your own Postgres — no auth vendor to migrate away from later.",
  },
  {
    icon: CreditCard,
    title: "One checkout interface, two providers",
    body: "Midtrans Snap and Xendit invoices both implement the same PaymentProvider interface. Offer one provider, the other, or both, without touching your checkout code.",
  },
  {
    icon: CalendarClock,
    title: "Pay-per-period billing, honestly",
    body: "Customers pay for 30 days at a time, then get reminded before it lapses: H-7, H-1, H+3. No fake auto-debit on credit cards most Indonesians don't have.",
  },
  {
    icon: Webhook,
    title: "Webhooks you can trust",
    body: "Every notification is signature-verified before it touches the database. Deliveries are deduped on (provider, event_id), and payment status only ever moves forward.",
  },
  {
    icon: Mail,
    title: "Email as React components",
    body: "Welcome, payment success, and expiry reminders ship as React Email templates sent through Resend. Change copy like you'd change any other component.",
  },
  {
    icon: Search,
    title: "SEO groundwork, keyword-aware",
    body: "Metadata, sitemap, robots.txt, and copy hooks around what people actually search: nextjs saas boilerplate, midtrans nextjs, xendit nextjs, qris payment.",
  },
];

const checkoutSteps = [
  {
    title: "Customer picks a plan",
    body: "Pricing sends a plan id — starter or pro — to POST /api/checkout. The server reads the price from lib/payments/plans.ts, never from the request.",
  },
  {
    title: "Server opens a checkout",
    body: "The route creates a pending transaction with a unique order_id, then asks Midtrans or Xendit for a payment page and returns its URL.",
  },
  {
    title: "Customer pays where they're comfortable",
    body: "QRIS, bank virtual accounts, e-wallets, retail outlets, or cards — on the provider's page, in rupiah, without leaving the flow confused.",
  },
  {
    title: "Webhook grants access",
    body: "The provider calls back. The app verifies the signature, records the payment, and extends the entitlement's valid_until. Receipt email follows.",
  },
];

const faqs = [
  {
    question: "Do subscriptions renew automatically?",
    answer:
      "Not by default. Credit-card penetration in Indonesia is low, so reliable auto-debit mostly doesn't exist here. The kit models billing as pay-per-period: a customer pays for 30 days, the plan lapses, and email reminders bring them back. Card recurring via the Midtrans Subscription API is a separate, optional module.",
  },
  {
    question: "Which payment methods do customers get?",
    answer:
      "Through Midtrans: QRIS, bank virtual accounts, GoPay, OVO, DANA, ShopeePay, retail outlets like Indomaret and Alfamart, and cards. Xendit invoices cover the same rails with its own fee structure. Both are live from the start — you choose which to offer.",
  },
  {
    question: "Can I use only Midtrans, or only Xendit?",
    answer:
      "Yes. Both providers implement one PaymentProvider interface with the same three jobs: open a checkout, verify a webhook, normalize a status. Turning one off is a configuration choice, not a rewrite.",
  },
  {
    question: "What happens when a plan expires?",
    answer:
      "Access ends at valid_until. Reminders go out 7 days before, 1 day before, and 3 days after expiry. Paying again starts a fresh period. An expired or cancelled payment never takes away time that was already paid for — status only moves forward.",
  },
  {
    question: "Where does my data live?",
    answer:
      "In your own Postgres — Neon, Supabase (database only), a VPS, or local Docker. Users, sessions, plans, entitlements, and transactions are plain Drizzle tables you can inspect, back up, and take anywhere.",
  },
  {
    question: "Is this production-ready?",
    answer:
      "It's a starting point with the hard parts done: signature verification, webhook dedupe, and a forward-only status machine. Before real money, walk the production checklist in the README: webhook URLs, key rotation, and sandbox-to-production switches.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "saas-kit-id",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "A Next.js SaaS starter kit with Indonesian payments built in: Midtrans and Xendit checkout (QRIS, bank VA, e-wallets), pay-per-period billing in rupiah.",
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "49000",
      priceCurrency: "IDR",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "149000",
      priceCurrency: "IDR",
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto w-full max-w-5xl px-6 pb-20 pt-24">
        <p className="text-sm text-muted-foreground">
          Next.js SaaS starter kit · Indonesia-first
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          The Next.js SaaS boilerplate with Indonesian payments built in.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          saas-kit-id ships auth, billing, and email wired to Midtrans and
          Xendit — so your customers pay with QRIS, bank virtual accounts, and
          e-wallets from day one. No Stripe workarounds, no entity abroad.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" render={<Link href="/pricing" />}>
            See pricing <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href="#checkout" />}>
            How checkout works
          </Button>
        </div>
        <dl className="mt-12 grid max-w-2xl grid-cols-3 gap-6 border-t pt-8">
          <div>
            <dt className="text-sm text-muted-foreground">Providers</dt>
            <dd className="mt-1 font-medium">Midtrans + Xendit</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Currency</dt>
            <dd className="mt-1 font-medium">IDR, native</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Billing model</dt>
            <dd className="mt-1 font-medium">Pay per 30 days</dd>
          </div>
        </dl>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">
            What's inside
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Six pieces, each one doing a concrete job. Nothing decorative.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3">
                <feature.icon className="size-6" strokeWidth={1.75} />
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="checkout" className="border-t">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">
            How checkout works
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            One flow, both providers. Prices come from a single constant —
            the client never decides what something costs.
          </p>
          <pre className="mt-8 overflow-x-auto rounded-lg border bg-muted/40 p-5 font-mono text-sm leading-relaxed">
{`// lib/payments/plans.ts — the single source of truth
export const PLANS = {
  starter: { priceIdr: 49_000,  durationDays: 30, /* … */ },
  pro:     { priceIdr: 149_000, durationDays: 30, /* … */ },
};`}
          </pre>
          <ol className="mt-10 grid gap-8 md:grid-cols-2">
            {checkoutSteps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="font-mono text-sm text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Two plans, both per 30 days, both in rupiah. Pay when you need
            it; nothing renews behind your back.
          </p>
          <div className="mt-10 max-w-3xl">
            <PricingTable />
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto w-full max-w-3xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">
            Questions people actually ask
          </h2>
          <div className="mt-10 flex flex-col gap-8">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-medium">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-6 py-20">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight">
            Start with a free account. Add billing when you're ready to charge.
          </h2>
          <Button size="lg" render={<Link href="/auth/login" />}>
            Get started <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}
