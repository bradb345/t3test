import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "~/lib/email";
import { escapeHtml } from "~/lib/html";
import { trackServerEvent } from "~/lib/posthog-events/server";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject is too long"),
  message: z.string().min(1, "Message is required").max(5000, "Message is too long"),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { name, email, subject, message } = contactSchema.parse(body);

    // Escape user inputs to prevent XSS
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    // Send email to support
    const result = await sendEmail({
      to: "support@rentr.com", // Replace with actual support email
      subject: `Contact Form: ${safeSubject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${safeMessage.replace(/\n/g, "<br />")}</p>
      `,
    });

    if (!result.success) {
      console.error("Failed to send contact email:", result.error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Send confirmation email to user (non-blocking, log errors but don't fail the request)
    const confirmationResult = await sendEmail({
      to: email,
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
    });

    if (!confirmationResult.success) {
      console.error("Failed to send confirmation email:", confirmationResult.error);
    }

    // Track contact form submission in PostHog (use email as distinct ID for anonymous users)
    await trackServerEvent(email, "contact_form_submitted", {
        subject_category: subject,
        source: "api",
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
