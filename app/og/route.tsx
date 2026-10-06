import { ImageResponse } from "next/og";

// Flat, type-led OG card: product name, one-line thesis, payment rails.
// Deliberately no gradients — they read as generated.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: 64,
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 30, color: "#a1a1a1" }}>saas-kit-id</div>
        <div>
          <div
            style={{
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.15,
              fontFamily: "sans-serif",
            }}
          >
            The Next.js SaaS boilerplate with Indonesian payments built in.
          </div>
          <div style={{ marginTop: 28, fontSize: 26, color: "#a1a1a1" }}>
            Midtrans · Xendit · QRIS · Bank VA · E-wallets
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#737373",
          }}
        >
          <span>nextjs saas boilerplate</span>
          <span>pay per 30 days, in rupiah</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
