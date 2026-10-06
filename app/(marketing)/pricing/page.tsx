import { PricingTable } from "@/components/pricing-table";

const billingNotes = [
  {
    title: "Pay per period, not per seat surprise",
    body: "Each payment buys exactly 30 days on one plan. When it lapses, you get three reminders — 7 days before, 1 day before, 3 days after — then you decide whether to pay again.",
  },
  {
    title: "Both providers from day one",
    body: "Midtrans and Xendit sit behind the same checkout interface. Offer QRIS, bank virtual accounts, e-wallets, retail outlets, or cards without changing your code.",
  },
  {
    title: "Receipts and history included",
    body: "Every successful payment writes a transaction row and sends a receipt by email. Your dashboard keeps the full history, and expired payments never revoke time already paid for.",
  },
];

export default function PricingPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-20 pt-16">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Pricing
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Two plans, both in Indonesian rupiah, both per 30 days. Pick one when
        you're ready to charge — nothing renews on its own.
      </p>
      <div className="mt-10 max-w-3xl">
        <PricingTable />
      </div>
      <div className="mt-16 grid gap-8 border-t pt-12 md:grid-cols-3">
        {billingNotes.map((note) => (
          <div key={note.title}>
            <h2 className="font-medium">{note.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {note.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
