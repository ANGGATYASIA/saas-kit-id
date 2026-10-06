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

interface ExpiryReminderEmailProps {
  name: string;
  planName: string;
  /** "expiring" while the plan still has days left, "expired" once lapsed. */
  kind: "expiring" | "expired";
  daysLabel: string;
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

export default function ExpiryReminderEmail({
  name,
  planName,
  kind,
  daysLabel,
  appUrl,
}: ExpiryReminderEmailProps) {
  const subjectLine =
    kind === "expiring"
      ? `Your ${planName} plan ends in ${daysLabel}`
      : `Your ${planName} plan has lapsed`;

  return (
    <Html>
      <Head />
      <Preview>{subjectLine} — here's how to keep it going.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Hi {name}, a quick heads-up.</Text>
            {kind === "expiring" ? (
              <Text style={paragraph}>
                Your {planName} plan ends in {daysLabel}. Paying again now
                extends it from the end date — the days you have left stay
                yours.
              </Text>
            ) : (
              <Text style={paragraph}>
                Your {planName} plan lapsed {daysLabel}. Nothing was charged
                after it ended — that's the deal with pay-per-period billing.
                If you still need it, one payment starts a fresh 30 days.
              </Text>
            )}
            <Text style={paragraph}>
              <Button style={button} href={`${appUrl}/pricing`}>
                {kind === "expiring" ? "Extend my plan" : "Start a new period"}
              </Button>
            </Text>
            <Text style={paragraph}>
              Changed your mind? No action needed — lapsed plans just sit
              quietly until you decide.
            </Text>
          </Section>
          <Hr />
          <Section>
            <Text style={footer}>
              Sent by saas-kit-id. You get this because you hold (or held) a{" "}
              {planName} plan.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
