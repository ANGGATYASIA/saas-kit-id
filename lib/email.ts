import type { ReactNode } from "react";
import { Resend } from "resend";

interface SendEmailArgs {
  to: string;
  subject: string;
  react: ReactNode;
}
// One transactional email via Resend. Never throws: a missing key, a missing
// sender, or a failed send degrades to a logged warning and `false`, so
// signup and webhook handlers keep working when email is not configured.
export async function sendEmail({
  to,
  subject,
  react,
}: SendEmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(
      "sendEmail skipped: RESEND_API_KEY or EMAIL_FROM is not set.",
    );
    return false;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, react });
    if (error) {
      console.error("sendEmail failed:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "sendEmail failed:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
