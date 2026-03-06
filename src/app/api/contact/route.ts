import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAppEmail } from "~/lib/emails/server";
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

    // Send email to support
    const result = await sendAppEmail("support@rentr.com", "contact_support", {
      name,
      email,
      subject,
      message,
    });

    if (!result.success) {
      console.error("Failed to send contact email:", result.error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Send confirmation email to user (non-blocking, log errors but don't fail the request)
    const confirmationResult = await sendAppEmail(email, "contact_confirmation", {
      name,
      subject,
      message,
    });

    if (!confirmationResult.success) {
      console.error("Failed to send confirmation email:", confirmationResult.error);
    }

    // Track contact form submission in PostHog (use email as distinct ID for anonymous users)
    await trackServerEvent(email, "contact_form_submitted", {
        subject_category: subject,
        message_length: (message as string).length,
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
