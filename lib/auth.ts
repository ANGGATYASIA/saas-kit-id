import { createElement } from "react";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { sendEmail } from "./email";
import WelcomeEmail from "@/emails/welcome";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Welcome email on signup. Fire-and-forget: sendEmail never throws,
        // so a missing RESEND_API_KEY cannot break account creation.
        after: async (user) => {
          const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(
            /\/$/,
            "",
          );
          void sendEmail({
            to: user.email,
            subject: "Welcome to saas-kit-id",
            react: createElement(WelcomeEmail, {
              name: user.name || user.email,
              appUrl,
            }),
          });
        },
      },
    },
  },
});
