import nodemailer, { type Transporter } from "nodemailer";

type SendEmailInput = { to: string; subject: string; html: string };

let cachedTransporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  if (process.env.DISABLE_OUTBOUND_EMAIL === "true") {
    cachedTransporter = null;
    return cachedTransporter;
  }

  const host = process.env.MAIL_HOST;
  const port = process.env.MAIL_PORT;
  const username = process.env.MAIL_USERNAME;
  const password = process.env.MAIL_PASSWORD;

  if (!host || !port || !username || !password) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: process.env.MAIL_ENCRYPTION === "ssl",
    auth: { user: username, pass: password },
  });
  return cachedTransporter;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  const from = process.env.EMAIL_FROM ?? "Gray Jay Care <bookings@grayjaycare.ca>";
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[email:dev] to=${to} subject="${subject}"`);
    return false;
  }

  try {
    await transporter.sendMail({ from, to, subject, html });
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

export async function verifyEmailTransport(): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
    return entities[character];
  });
}

function formatTripDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Toronto",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function emailLayout(title: string, content: string): string {
  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;background:#f8f1fb;font-family:Arial,sans-serif;color:#3d3043">
        <div style="max-width:620px;margin:0 auto;padding:32px 16px">
          <div style="background:linear-gradient(135deg,#5a177a,#922bea);padding:24px 28px;border-radius:18px 18px 0 0;color:white">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#ebc9ff">Gray Jay Care</p>
            <h1 style="margin:8px 0 0;font-family:Georgia,serif;font-size:28px;font-weight:400">${escapeHtml(title)}</h1>
          </div>
          <div style="padding:28px;background:white;border:1px solid #eadff0;border-top:0;border-radius:0 0 18px 18px;line-height:1.6">
            ${content}
            <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eee5f2;color:#817486;font-size:12px">
              Need help? Call <a href="tel:+15199335090" style="color:#8424c5;font-weight:700">(519) 933-5090</a>.<br>
              Safe journeys, caring hands.
            </p>
          </div>
        </div>
      </body>
    </html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#922bea;color:white;text-decoration:none;font-weight:700">${escapeHtml(label)}</a></p>`;
}

export function bookingConfirmationEmail(params: {
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: Date;
  estimatedFare: number | null;
  portalUrl?: string;
}): { subject: string; html: string } {
  const { referenceCode, pickupAddress, dropoffAddress, scheduledAt, estimatedFare, portalUrl } = params;
  const details = `
    <p style="margin-top:0">Thank you for requesting transportation with Gray Jay Care. Your booking is now awaiting dispatcher confirmation.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#817486">Reference</td><td style="padding:8px 0;font-weight:700">${escapeHtml(referenceCode)}</td></tr>
      <tr><td style="padding:8px 0;color:#817486">Pickup</td><td style="padding:8px 0">${escapeHtml(pickupAddress)}</td></tr>
      <tr><td style="padding:8px 0;color:#817486">Drop-off</td><td style="padding:8px 0">${escapeHtml(dropoffAddress)}</td></tr>
      <tr><td style="padding:8px 0;color:#817486">Scheduled</td><td style="padding:8px 0">${escapeHtml(formatTripDate(scheduledAt))}</td></tr>
      ${estimatedFare != null ? `<tr><td style="padding:8px 0;color:#817486">Estimated fare</td><td style="padding:8px 0;font-weight:700;color:#8424c5">$${estimatedFare.toFixed(2)}</td></tr>` : ""}
    </table>
    <p>A dispatcher will contact you to confirm availability and final details.</p>
    ${portalUrl ? button(portalUrl, "View booking status") : ""}`;
  return {
    subject: `Gray Jay Care — Booking request received (${referenceCode})`,
    html: emailLayout("Booking request received", details),
  };
}

export function customerAccountEmail(params: { firstName: string; setupUrl: string; portalUrl: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: "Your Gray Jay Care portal is ready",
    html: emailLayout(
      "Your care portal is ready",
      `<p style="margin-top:0">Hello ${escapeHtml(params.firstName)},</p>
       <p>We created a secure customer portal with your booking so you can follow its status without completing another registration form.</p>
       ${button(params.setupUrl, "Create your password")}
       <p style="font-size:13px;color:#817486">This secure link expires in one hour. We never send passwords by email.</p>
       <p>You can also return to your portal any time after creating your password:</p>
       <p><a href="${escapeHtml(params.portalUrl)}" style="color:#8424c5;font-weight:700">Open customer portal</a></p>`,
    ),
  };
}

export function accountInviteEmail(params: { firstName: string; roleLabel: string; setupUrl: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: "Your Gray Jay Care account is ready",
    html: emailLayout(
      "Your secure account is ready",
      `<p style="margin-top:0">Hello ${escapeHtml(params.firstName)},</p>
       <p>A Gray Jay Care administrator created your <strong>${escapeHtml(params.roleLabel)}</strong> portal account.</p>
       ${button(params.setupUrl, "Create your password")}
       <p style="font-size:13px;color:#817486">This secure link expires in one hour. Passwords are never included in email messages.</p>`,
    ),
  };
}

export function passwordResetEmail(params: { firstName: string; resetUrl: string }): { subject: string; html: string } {
  return {
    subject: "Reset your Gray Jay Care password",
    html: emailLayout(
      "Reset your password",
      `<p style="margin-top:0">Hello ${escapeHtml(params.firstName)},</p>
       <p>Use the secure button below to create a new portal password.</p>
       ${button(params.resetUrl, "Reset password")}
       <p style="font-size:13px;color:#817486">This link expires in one hour and stops working after your password changes. If you did not request it, you can ignore this email.</p>`,
    ),
  };
}

export function driverAssignedEmail(params: { referenceCode: string; driverName: string; scheduledAt: Date; portalUrl?: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: `Gray Jay Care — Driver assigned (${params.referenceCode})`,
    html: emailLayout(
      "Your driver is assigned",
      `<p>Your trip <strong>${escapeHtml(params.referenceCode)}</strong> is confirmed and a driver has been assigned.</p>
       <p><strong>Driver:</strong> ${escapeHtml(params.driverName)}<br><strong>Scheduled:</strong> ${escapeHtml(formatTripDate(params.scheduledAt))}</p>
       ${params.portalUrl ? button(params.portalUrl, "View trip details") : ""}`,
    ),
  };
}

export function tripStatusEmail(params: { referenceCode: string; statusLabel: string; note?: string | null; portalUrl?: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: `Gray Jay Care — ${params.statusLabel} (${params.referenceCode})`,
    html: emailLayout(
      params.statusLabel,
      `<p>Your trip <strong>${escapeHtml(params.referenceCode)}</strong> is now <strong>${escapeHtml(params.statusLabel.toLowerCase())}</strong>.</p>
       ${params.note ? `<p>${escapeHtml(params.note)}</p>` : ""}
       ${params.portalUrl ? button(params.portalUrl, "View live trip status") : ""}`,
    ),
  };
}

export function tripCancelledEmail(params: { referenceCode: string; reason?: string | null; portalUrl?: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: `Gray Jay Care — Trip cancelled (${params.referenceCode})`,
    html: emailLayout(
      "Trip cancelled",
      `<p>Your trip <strong>${escapeHtml(params.referenceCode)}</strong> has been cancelled.</p>
       ${params.reason ? `<p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>` : ""}
       <p>Please contact us if you would like help rebooking.</p>
       ${params.portalUrl ? button(params.portalUrl, "View trip details") : ""}`,
    ),
  };
}
