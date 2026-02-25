import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function applicationRejectedEmail(
  params: EmailMap["application_rejected"]
): { subject: string; html: string } {
  const applicantName = escapeHtml(params.applicantName);
  const unitNumber = escapeHtml(params.unitNumber);
  const propertyName = escapeHtml(params.propertyName);
  const decisionNotes = params.decisionNotes ? escapeHtml(params.decisionNotes) : undefined;

  return {
    subject: `Application Update - Unit ${unitNumber} at ${propertyName}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Update</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .notes { background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
      .notes h4 { margin: 0 0 8px; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .notes p { margin: 0; color: #555; font-size: 14px; font-style: italic; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Application Update</h1>
        <p>Regarding your rental application</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${applicantName},</p>
        <p class="message">
          Thank you for your interest in <strong>Unit ${unitNumber}</strong> at
          <strong>${propertyName}</strong>. Unfortunately, your application has not been approved at this time.
        </p>
        ${decisionNotes ? `
        <div class="notes">
          <h4>Feedback</h4>
          <p>"${decisionNotes}"</p>
        </div>
        ` : ''}
        <p class="message">
          We encourage you to continue exploring other available listings on Rentr.
          We wish you the best in your housing search.
        </p>
      </div>
      <div class="footer">
        <p>This notification was sent by Rentr.</p>
      </div>
    </div>
  </body>
</html>
`,
  };
}
