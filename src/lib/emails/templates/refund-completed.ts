import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function refundCompletedEmail(
  params: EmailMap["refund_completed"]
): { subject: string; html: string } {
  const { amount, currency } = params;
  const recipientName = escapeHtml(params.recipientName);

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(amount));

  return {
    subject: `Refund of ${formattedAmount} Processed`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Processed</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .amount-box { background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
      .amount-box .label { font-size: 14px; color: #059669; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
      .amount-box .amount { font-size: 32px; font-weight: 700; color: #065f46; margin: 0; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Refund Processed</h1>
        <p>Your refund has been completed</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${recipientName},</p>
        <p class="message">
          A refund has been successfully processed. The funds should appear in the original payment method shortly.
        </p>
        <div class="amount-box">
          <div class="label">Amount Refunded</div>
          <p class="amount">${formattedAmount}</p>
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
