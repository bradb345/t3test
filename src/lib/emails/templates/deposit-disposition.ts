import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function depositDispositionEmail(
  params: EmailMap["deposit_disposition"]
): { subject: string; html: string } {
  const { depositAmount, returnAmount, currency, disposition, dashboardUrl } = params;
  const tenantName = escapeHtml(params.tenantName);

  const fmt = (amount: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      parseFloat(amount)
    );

  const formattedDeposit = fmt(depositAmount);
  const formattedReturn = fmt(returnAmount);

  let deductions: { description: string; amount: number }[] = [];
  if (params.deductions) {
    try {
      deductions = JSON.parse(params.deductions) as { description: string; amount: number }[];
    } catch {
      // ignore parse errors
    }
  }

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const formattedTotalDeductions = fmt(String(totalDeductions));

  const subjectText =
    disposition === "returned"
      ? `Security Deposit Returned - ${formattedDeposit}`
      : disposition === "partial"
        ? `Partial Security Deposit Return - ${formattedReturn}`
        : `Security Deposit Withheld`;

  const headerColor =
    disposition === "returned" ? "#10b981" : disposition === "partial" ? "#f59e0b" : "#ef4444";
  const headerGradientEnd =
    disposition === "returned" ? "#059669" : disposition === "partial" ? "#d97706" : "#dc2626";

  return {
    subject: subjectText,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Deposit Disposition</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, ${headerColor} 0%, ${headerGradientEnd} 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .summary-table td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e5e7eb; }
      .summary-table .label { color: #6b7280; }
      .summary-table .value { text-align: right; font-weight: 600; color: #1a1a1a; }
      .summary-table .total td { border-top: 2px solid #1a1a1a; border-bottom: none; font-weight: 700; font-size: 16px; }
      .deductions-header { font-size: 14px; font-weight: 600; color: #374151; margin: 20px 0 8px; }
      .deduction-item { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 14px; color: #555; background-color: #fef2f2; border-radius: 4px; margin: 4px 0; }
      .cta-button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 16px; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Security Deposit ${disposition === "returned" ? "Returned" : disposition === "partial" ? "Partial Return" : "Withheld"}</h1>
        <p>Your security deposit disposition is ready</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>
        <p class="message">
          ${disposition === "returned"
            ? "Your landlord is returning your full security deposit. Please confirm receipt in your dashboard."
            : disposition === "partial"
              ? "Your landlord is returning a portion of your security deposit. Some deductions have been applied as detailed below."
              : "Your landlord has withheld your security deposit. The deductions are detailed below."}
        </p>

        <table class="summary-table">
          <tr>
            <td class="label">Original Deposit</td>
            <td class="value">${formattedDeposit}</td>
          </tr>
          ${deductions.length > 0 ? `
          <tr>
            <td class="label">Total Deductions</td>
            <td class="value" style="color: #dc2626;">-${formattedTotalDeductions}</td>
          </tr>
          ` : ""}
          <tr class="total">
            <td class="label">${disposition === "withheld" ? "Amount Withheld" : "Amount to Return"}</td>
            <td class="value" style="color: ${disposition === "withheld" ? "#dc2626" : "#059669"};">${formattedReturn}</td>
          </tr>
        </table>

        ${deductions.length > 0 ? `
        <p class="deductions-header">Itemized Deductions</p>
        ${deductions.map((d) => `
        <div class="deduction-item">
          <span>${escapeHtml(d.description)}</span>
          <span style="font-weight: 600;">-${fmt(String(d.amount))}</span>
        </div>
        `).join("")}
        ` : ""}

        ${disposition !== "withheld" ? `
        <div style="text-align: center; margin-top: 24px;">
          <a href="${dashboardUrl}" class="cta-button">
            Confirm & Receive Funds
          </a>
        </div>
        ` : `
        <div style="text-align: center; margin-top: 24px;">
          <a href="${dashboardUrl}" class="cta-button">
            View Details
          </a>
        </div>
        `}
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
