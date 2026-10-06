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

interface WelcomeEmailProps {
  name: string;
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

export default function WelcomeEmail({ name, appUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your account is ready — here's what happens next.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Text style={heading}>Hi {name}, your account is ready.</Text>
            <Text style={paragraph}>
              You can now pick a plan and pay with QRIS, a bank virtual
              account, or an e-wallet. Each payment buys 30 days — nothing
              renews on its own, and you get a reminder before the plan lapses.
            </Text>
            <Text style={paragraph}>
              <Button style={button} href={`${appUrl}/pricing`}>
                See the plans
              </Button>
            </Text>
            <Text style={paragraph}>
              If you didn't create this account, just ignore this email.
            </Text>
          </Section>
          <Hr />
          <Section>
            <Text style={footer}>
              Sent by saas-kit-id, the Next.js SaaS starter kit with Indonesian
              payments built in.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
