import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function paymentReminderEmail(
  params: EmailMap["payment_reminder"]
): { subject: string; html: string } {
  const { amount, currency, dueDate } = params;
  const tenantName = escapeHtml(params.tenantName);
  const safeDueDate = escapeHtml(dueDate);

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(amount));

  return {
    subject: `Rent Payment Due Soon - ${formattedAmount}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rent Payment Due Soon</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .amount-box { background-color: #eef2ff; border: 2px solid #6366f1; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
      .amount-box .label { font-size: 14px; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
      .amount-box .amount { font-size: 32px; font-weight: 700; color: #3730a3; margin: 0; }
      .due-date { text-align: center; font-size: 16px; color: #555; margin: 24px 0; }
      .due-date strong { color: #1a1a1a; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Rent Payment Due Soon</h1>
        <p>A friendly reminder about your upcoming payment</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>
        <p class="message">
          This is a friendly reminder that your rent payment is coming up soon. Please make sure to submit your payment by the due date.
        </p>
        <div class="amount-box">
          <div class="label">Amount Due</div>
          <p class="amount">${formattedAmount}</p>
        </div>
        <p class="due-date">Due by <strong>${safeDueDate}</strong></p>
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
