import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function documentRejectedEmail(
  params: EmailMap["document_rejected"]
): { subject: string; html: string } {
  const { dashboardUrl } = params;

  const tenantName = escapeHtml(params.tenantName);
  const documentType = escapeHtml(params.documentType);
  const propertyName = escapeHtml(params.propertyName);
  const rejectionNotes = params.rejectionNotes ? escapeHtml(params.rejectionNotes) : undefined;

  return {
    subject: `Document Needs Attention - ${documentType}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Needs Attention</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .details { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 24px 0; border-radius: 4px; }
      .details h3 { margin: 0 0 10px; color: #1a1a1a; font-size: 16px; }
      .details p { margin: 5px 0; color: #555; font-size: 14px; }
      .notes { background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
      .notes h4 { margin: 0 0 8px; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .notes p { margin: 0; color: #555; font-size: 14px; font-style: italic; }
      .cta-button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 16px; text-align: center; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Document Needs Attention</h1>
        <p>Action required for your document</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>
        <p class="message">
          Your document has been reviewed and requires attention. Please review the feedback below and re-upload an updated document.
        </p>
        <div class="details">
          <h3>Document Details</h3>
          <p><strong>Document Type:</strong> ${documentType}</p>
          <p><strong>Property:</strong> ${propertyName}</p>
          <p><strong>Status:</strong> Rejected</p>
        </div>
        ${rejectionNotes ? `
        <div class="notes">
          <h4>Feedback</h4>
          <p>"${rejectionNotes}"</p>
        </div>
        ` : ''}
        <p class="message">
          Please log in to your dashboard to re-upload an updated version of this document.
        </p>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">Go to Dashboard</a>
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
