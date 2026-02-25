import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function contactSupportEmail(
  params: EmailMap["contact_support"]
): { subject: string; html: string } {
  const { name, email, subject, message } = params;

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);

  return {
    subject: `Contact Form: ${safeSubject}`,
    html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${safeMessage.replace(/\n/g, "<br />")}</p>
    `,
  };
}
