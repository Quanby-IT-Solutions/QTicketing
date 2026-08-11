import "server-only";

import { env } from "@/lib/env";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function notifyTicketDone({ recipient, ticketId, ticketNumber, title }: { recipient: string; ticketId: string; ticketNumber: number; title: string }) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return;
  const sender = env.RESEND_FROM_NAME ? `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>` : env.RESEND_FROM_EMAIL;
  const ticketUrl = `${(env.FRONTEND_URL ?? "https://ticketing.quanbyit.com").replace(/\/$/, "")}/tickets/detail/${ticketId}`;
  const safeTitle = escapeHtml(title);
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        subject: `Resolved: Ticket #${ticketNumber} — ${title}`,
        html: `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Ticketing request has been marked as resolved.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7fb;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e9f1;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:26px 32px;background:#102a63;">
        <div style="font-size:20px;line-height:28px;font-weight:700;color:#ffffff;">Ticketing System</div>
        <div style="margin-top:3px;font-size:13px;line-height:20px;color:#c9d7f2;">Quanby IT Support</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#e8f8ef;color:#087443;font-size:12px;line-height:16px;font-weight:700;letter-spacing:.03em;">✓ RESOLVED</div>
        <h1 style="margin:18px 0 8px;font-size:24px;line-height:32px;color:#172033;">Your ticket is done</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#526079;">The support team has marked your request as resolved.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e4e9f1;border-radius:10px;background:#f9fbfd;"><tr><td style="padding:18px 20px;">
          <div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:.05em;color:#71809a;">TICKET #${ticketNumber}</div>
          <div style="margin-top:5px;font-size:16px;line-height:24px;font-weight:700;color:#172033;">${safeTitle}</div>
        </td></tr></table>
        <p style="margin:24px 0;font-size:14px;line-height:22px;color:#526079;">Please review the resolution. If you still need help, you can reopen the ticket from the ticket page.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:8px;background:#2563eb;"><a href="${ticketUrl}" style="display:inline-block;padding:12px 18px;font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;">View ticket</a></td></tr></table>
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #e4e9f1;background:#f9fbfd;font-size:12px;line-height:18px;color:#71809a;">This notification was sent by Ticketing System. Please do not reply to this email.</td></tr>
    </table>
  </td></tr></table>
</body></html>`,
      }),
    });
    if (!result.ok) console.error("Ticket completion email failed.", result.status);
  } catch (error) {
    console.error("Ticket completion email failed.", error);
  }
}
