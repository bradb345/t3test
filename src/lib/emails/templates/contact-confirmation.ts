import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function contactConfirmationEmail(
  params: EmailMap["contact_confirmation"]
): { subject: string; html: string } {
  const { name, subject, message } = params;

  const safeName = escapeHtml(name);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);

  return {
    subject: "We received your message - Rentr",
    html: `
        <h2>Thank you for contacting us!</h2>
        <p>Hi ${safeName},</p>
        <p>We've received your message and will get back to you within 1-2 business days.</p>
        <hr />
        <p><strong>Your message:</strong></p>
        <p><em>${safeSubject}</em></p>
        <p>${safeMessage.replace(/\n/g, "<br />")}</p>
        <hr />
        <p>Best regards,<br />The Rentr Team</p>
    `,
  };
}
