import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function refundInitiatedEmail(
  params: EmailMap["refund_initiated"]
): { subject: string; html: string } {
  const { amount, currency, deadline } = params;
  const tenantName = escapeHtml(params.tenantName);
  const reason = params.reason ? escapeHtml(params.reason) : undefined;
  const dashboardUrl = params.dashboardUrl;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(amount));

  const formattedDeadline = new Date(deadline).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return {
    subject: `Refund of ${formattedAmount} Initiated`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Initiated</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .amount-box { background-color: #eef2ff; border: 2px solid #6366f1; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
      .amount-box .label { font-size: 14px; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
      .amount-box .amount { font-size: 32px; font-weight: 700; color: #312e81; margin: 0; }
      .reason-box { background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
      .reason-box h4 { margin: 0 0 8px; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .reason-box p { margin: 0; color: #555; font-size: 14px; font-style: italic; }
      .deadline-notice { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px; font-size: 14px; color: #92400e; }
      .cta-button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 16px; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Refund Initiated</h1>
        <p>Your landlord has initiated a refund</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>
        <p class="message">
          Your landlord has initiated a refund for you. Please log in to your dashboard to confirm and receive the funds.
        </p>
        <div class="amount-box">
          <div class="label">Refund Amount</div>
          <p class="amount">${formattedAmount}</p>
        </div>
        ${reason ? `
        <div class="reason-box">
          <h4>Reason</h4>
          <p>"${reason}"</p>
        </div>
        ` : ""}
        <div class="deadline-notice">
          Please confirm by <strong>${formattedDeadline}</strong> to receive this refund.
        </div>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">
            View Refund Details
          </a>
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
