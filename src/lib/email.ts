import { Resend } from "resend";
import { env } from "../env";

const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using Resend
 * @param to - Email address(es) to send to
 * @param subject - Email subject line
 * @param html - HTML content of the email
 * @param from - Optional sender email (defaults to onboarding@resend.dev)
 * @returns Promise with the result of the email send operation
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = "onboarding@resend.dev",
}: SendEmailParams) {
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}
