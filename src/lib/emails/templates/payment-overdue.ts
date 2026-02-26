import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function paymentOverdueEmail(
  params: EmailMap["payment_overdue"]
): { subject: string; html: string } {
  const { amount, currency, gracePeriodDays } = params;
  const tenantName = escapeHtml(params.tenantName);
  const safeDueDate = escapeHtml(params.dueDate);

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(amount));

  return {
    subject: `Overdue Rent Payment — Action Required`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Overdue Rent Payment</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .amount-box { background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
      .amount-box .label { font-size: 14px; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
      .amount-box .amount { font-size: 32px; font-weight: 700; color: #991b1b; margin: 0; }
      .due-date { text-align: center; font-size: 16px; color: #555; margin: 24px 0; }
      .due-date strong { color: #1a1a1a; }
      .warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
      .warning p { margin: 0; color: #92400e; font-size: 14px; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Overdue Rent Payment</h1>
        <p>Immediate action required</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>
        <p class="message">
          Your rent payment was due on <strong>${safeDueDate}</strong> and is now more than ${gracePeriodDays} days overdue. Please make your payment as soon as possible.
        </p>
        <div class="amount-box">
          <div class="label">Overdue Amount</div>
          <p class="amount">${formattedAmount}</p>
        </div>
        <div class="warning">
          <p><strong>Dashboard Access Restricted:</strong> Your dashboard access has been limited to payments only until your overdue balance is resolved. Please log in and complete your payment to restore full access.</p>
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
