import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PaymentSuccessEmailProps {
  name: string;
  planName: string;
  amountLabel: string;
  validUntilLabel: string;
  orderId: string;
  appUrl: string;
}

const body = {
  backgroundColor: "#ffffff",
  fontFamily: "system-ui, -apple-system, sans-serif",
  color: "#171717",
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 24px",
};

const heading = {
  fontSize: "20px",
  fontWeight: 600,
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

const receiptBox = {
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0",
};

const receiptRow = {
  fontSize: "14px",
  lineHeight: "1.8",
  margin: 0,
};

const label = { color: "#737373" };

const button = {
  backgroundColor: "#171717",
  color: "#fafafa",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
};

const footer = {
  fontSize: "13px",
  color: "#737373",
  lineHeight: "1.6",
};

export default function PaymentSuccessEmail({
  name,
  planName,
  amountLabel,
  validUntilLabel,
  orderId,
  appUrl,
}: PaymentSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Payment received — your {planName} plan is active until{" "}
        {validUntilLabel}.
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Hi {name}, payment received.</Text>
            <Text style={paragraph}>
              Your {planName} plan is active until {validUntilLabel}. Here's the
              receipt for your records:
            </Text>
            <Section style={receiptBox}>
              <Text style={receiptRow}>
                <span style={label}>Plan</span> — {planName} (30 days)
              </Text>
              <Text style={receiptRow}>
                <span style={label}>Paid</span> — {amountLabel}
              </Text>
              <Text style={receiptRow}>
                <span style={label}>Active until</span> — {validUntilLabel}
              </Text>
              <Text style={receiptRow}>
                <span style={label}>Order</span> — {orderId}
              </Text>
            </Section>
            <Text style={paragraph}>
              <Button style={button} href={`${appUrl}/dashboard`}>
                Open your dashboard
              </Button>
            </Text>
            <Text style={paragraph}>
              We'll remind you a week before the plan lapses. Paying again
              extends it — you never lose days you've already paid for.
            </Text>
          </Section>
          <Hr />
          <Section>
            <Text style={footer}>
              Sent by saas-kit-id. Questions about this payment? Reply to this
              email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
