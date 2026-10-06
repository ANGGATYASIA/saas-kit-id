import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  ),
  title: {
    default: "saas-kit-id — Next.js SaaS boilerplate with Midtrans & Xendit payments",
    template: "%s · saas-kit-id",
  },
  description:
    "A Next.js SaaS starter kit with Indonesian payments built in: Midtrans and Xendit checkout (QRIS, bank VA, e-wallets), honest pay-per-period billing, and your data in your own Postgres.",
  keywords: [
    "nextjs saas boilerplate",
    "next.js saas starter kit",
    "midtrans nextjs",
    "xendit nextjs",
    "indonesia payment gateway nextjs",
    "qris payment nextjs",
    "saas boilerplate with midtrans",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "saas-kit-id — Next.js SaaS boilerplate with Midtrans & Xendit payments",
    description:
      "Auth, billing, and email wired to Midtrans and Xendit. Customers pay with QRIS, bank virtual accounts, and e-wallets from day one.",
    images: [{ url: "/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "saas-kit-id — Next.js SaaS boilerplate with Midtrans & Xendit payments",
    description:
      "A Next.js SaaS starter kit with Indonesian payments built in: Midtrans and Xendit checkout, pay-per-period billing in rupiah.",
    images: ["/og"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
