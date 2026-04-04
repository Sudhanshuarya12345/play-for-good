import { Resend } from "resend";
import { env } from "../config/env.js";

let resend;

function formatInrFromPaise(value) {
  const amount = Number(value || 0) / 100;
  return `INR ${amount.toFixed(2)}`;
}

function buildEmailLayout({ eyebrow, title, intro, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<p style="margin:20px 0 0;"><a href="${ctaUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#1EA7FF;color:#020611;text-decoration:none;font-weight:700;">${ctaLabel}</a></p>`
      : "";

  return `
    <div style="margin:0;background:#070B14;padding:28px 12px;color:#E6F1FF;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;border:1px solid rgba(142,216,255,0.28);border-radius:16px;overflow:hidden;background:linear-gradient(160deg,rgba(13,20,36,0.96),rgba(10,16,31,0.96));">
        <div style="padding:22px 22px 10px;background:linear-gradient(120deg,rgba(30,167,255,0.22),rgba(23,214,146,0.14),rgba(255,176,32,0.12));border-bottom:1px solid rgba(142,216,255,0.24);">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#8ED8FF;font-weight:700;">${eyebrow}</p>
          <h1 style="margin:0;font-size:24px;line-height:1.3;color:#F2F9FF;">${title}</h1>
        </div>
        <div style="padding:20px 22px 24px;">
          <p style="margin:0 0 14px;color:#B7CAE4;font-size:14px;line-height:1.6;">${intro}</p>
          <div style="font-size:14px;line-height:1.7;color:#DFECFF;">${bodyHtml}</div>
          ${ctaBlock}
          <p style="margin:20px 0 0;color:#8FAACB;font-size:12px;line-height:1.6;">${footerNote || "This is an automated update from PlayForGood."}</p>
        </div>
      </div>
    </div>
  `;
}

export function buildWelcomeEmailHtml({ dashboardUrl }) {
  return buildEmailLayout({
    eyebrow: "PlayForGood Access",
    title: "Welcome to PlayForGood",
    intro: "Your account is now active. Next step: start your subscription and support a cause while competing in monthly draws.",
    bodyHtml:
      "<ul style=\"margin:0;padding-left:18px;\"><li>Choose your monthly or yearly plan.</li><li>Set your charity contribution percentage.</li><li>Enter your latest 5 Stableford scores to join draws.</li></ul>",
    ctaLabel: "Open Dashboard",
    ctaUrl: dashboardUrl,
    footerNote: "Need help? Reply to this email and the support team will assist you."
  });
}

export function buildDrawPublishedEmailHtml({ drawMonth, numbers, dashboardUrl }) {
  const formattedNumbers = Array.isArray(numbers) ? numbers.join(", ") : "-";

  return buildEmailLayout({
    eyebrow: "Monthly Draw Update",
    title: `Results Published for ${drawMonth}`,
    intro: "This month\'s draw has been published. Check your personal result and payout status in your dashboard.",
    bodyHtml: `<p style="margin:0;"><strong>Draw numbers:</strong> ${formattedNumbers}</p>`,
    ctaLabel: "View My Result",
    ctaUrl: dashboardUrl
  });
}

export function buildWinnerCongratsEmailHtml({ amountPaise, dashboardUrl }) {
  return buildEmailLayout({
    eyebrow: "You Won",
    title: "Congratulations on Your Win",
    intro: `You have a winning result worth ${formatInrFromPaise(amountPaise)}.`,
    bodyHtml:
      "<p style=\"margin:0;\">Upload your score proof screenshot to start verification. Once approved, your payout status will move from pending to paid.</p>",
    ctaLabel: "Upload Proof",
    ctaUrl: dashboardUrl
  });
}

export function buildVerificationDecisionEmailHtml({ decision, dashboardUrl }) {
  const approved = decision === "approved";
  const title = approved ? "Winner Verification Approved" : "Winner Verification Requires Attention";
  const intro = approved
    ? "Your winner proof has been approved by the admin team."
    : "Your submitted winner proof was rejected. Please upload a clearer screenshot from the golf platform.";

  return buildEmailLayout({
    eyebrow: "Verification Status",
    title,
    intro,
    bodyHtml: approved
      ? "<p style=\"margin:0;\">Your payout will remain pending until marked paid by admin operations.</p>"
      : "<p style=\"margin:0;\">Open your dashboard, review the entry, and resubmit valid proof.</p>",
    ctaLabel: "Open Winnings",
    ctaUrl: dashboardUrl
  });
}

export function buildPayoutCompletedEmailHtml({ dashboardUrl }) {
  return buildEmailLayout({
    eyebrow: "Payout Update",
    title: "Your Prize Payout Is Marked Paid",
    intro: "Good news. Your winning payout has been marked as paid by the admin team.",
    bodyHtml: "<p style=\"margin:0;\">You can view the final status for this winning entry anytime in your dashboard.</p>",
    ctaLabel: "View Winnings",
    ctaUrl: dashboardUrl
  });
}

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
