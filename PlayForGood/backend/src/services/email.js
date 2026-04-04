import { Resend } from "resend";
import { env } from "../config/env.js";

let resend;

export function getResendClient() {
  if (resend) {
    return resend;
  }

  resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

export async function sendTransactionalEmail({ to, subject, html }) {
  try {
    const client = getResendClient();
    return await client.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html
    });
  } catch (error) {
    // Keep core product flows running even if email sender verification is pending.
    console.error("[email] send failed", {
      to,
      subject,
      message: error?.message || "Unknown email error"
    });
    return {
      success: false,
      skipped: true,
      reason: error?.message || "Email send failed"
    };
  }
}
