import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PostHogProvider } from "@/components/posthog-provider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PostHogProvider>
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
            saas-kit-id
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/pricing" />}>
              Pricing
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/auth/login" />}>
              Sign in
            </Button>
            <Button size="sm" render={<Link href="/auth/login" />}>
              Get started
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="font-mono text-sm font-semibold">saas-kit-id</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A Next.js SaaS starter kit with Indonesian payments: Midtrans and
              Xendit checkout, pay-per-period billing, and your data in your
              own Postgres.
            </p>
          </div>
          <nav className="flex gap-12 text-sm">
            <div className="flex flex-col gap-2">
              <p className="font-medium">Product</p>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
                Pricing
              </Link>
              <Link href="/auth/login" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium">Payments</p>
              <a
                href="https://docs.midtrans.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                Midtrans docs
              </a>
              <a
                href="https://docs.xendit.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                Xendit docs
              </a>
            </div>
          </nav>
        </div>
      </footer>
    </div>
    </PostHogProvider>
  );
}
