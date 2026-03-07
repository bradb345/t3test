import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function viewingRequestResponseEmail(
  params: EmailMap["viewing_request_response"]
): { subject: string; html: string } {
  const requesterName = escapeHtml(params.requesterName);
  const unitNumber = escapeHtml(params.unitNumber);
  const propertyName = escapeHtml(params.propertyName);
  const landlordNotes = params.landlordNotes ? escapeHtml(params.landlordNotes) : undefined;
  const listingUrl = escapeHtml(params.listingUrl);

  const isApproved = params.status === "approved";
  const headerGradient = isApproved
    ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
    : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)";
  const statusText = isApproved ? "Approved" : "Declined";
  const statusMessage = isApproved
    ? `Great news! Your viewing request for <strong>Unit ${unitNumber}</strong> at <strong>${propertyName}</strong> has been approved.`
    : `Thank you for your interest in <strong>Unit ${unitNumber}</strong> at <strong>${propertyName}</strong>. Unfortunately, your viewing request has been declined.`;

  return {
    subject: `Viewing Request ${statusText} - Unit ${unitNumber} at ${propertyName}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Viewing Request ${statusText}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: ${headerGradient}; padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .notes { background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
      .notes h4 { margin: 0 0 8px; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .notes p { margin: 0; color: #555; font-size: 14px; font-style: italic; }
      .cta { text-align: center; margin: 30px 0; }
      .cta a { display: inline-block; padding: 14px 28px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Viewing Request ${statusText}</h1>
        <p>Unit ${unitNumber} at ${propertyName}</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${requesterName},</p>
        <p class="message">${statusMessage}</p>
        ${landlordNotes ? `
        <div class="notes">
          <h4>Notes from Landlord</h4>
          <p>"${landlordNotes}"</p>
        </div>
        ` : ''}
        ${isApproved ? `
        <p class="message">
          The landlord will be in touch with further details about the viewing.
        </p>
        ` : `
        <p class="message">
          We encourage you to continue exploring other available listings on Rentr.
        </p>
        `}
        <div class="cta">
          <a href="${listingUrl}">View Listing</a>
        </div>
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
