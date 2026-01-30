interface NoticeGivenEmailProps {
  recipientName: string;
  initiatorName: string;
  initiatedBy: "tenant" | "landlord";
  unitNumber: string;
  propertyAddress: string;
  noticeDate: Date;
  moveOutDate: Date;
  reason?: string;
  dashboardUrl: string;
}

export function getNoticeGivenEmailHtml({
  recipientName,
  initiatorName,
  initiatedBy,
  unitNumber,
  propertyAddress,
  noticeDate,
  moveOutDate,
  reason,
  dashboardUrl,
}: NoticeGivenEmailProps): string {
  const formattedNoticeDate = new Date(noticeDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedMoveOutDate = new Date(moveOutDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const initiatorLabel = initiatedBy === "tenant" ? "Your tenant" : "Your landlord";
  const headerColor = initiatedBy === "tenant" ? "#f59e0b" : "#6366f1"; // Orange for tenant, indigo for landlord

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Move-Out Notice Received</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f4f4f7;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, ${headerColor} 0%, ${initiatedBy === "tenant" ? "#d97706" : "#4f46e5"} 100%);
        padding: 40px 30px;
        text-align: center;
        color: #ffffff;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .header p {
        margin: 10px 0 0;
        font-size: 16px;
        opacity: 0.95;
      }
      .content {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 20px;
      }
      .message {
        color: #555;
        font-size: 15px;
        margin-bottom: 24px;
      }
      .notice-details {
        background-color: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .notice-details h3 {
        margin: 0 0 15px;
        color: #92400e;
        font-size: 16px;
      }
      .detail-row {
        display: flex;
        margin: 8px 0;
        font-size: 14px;
      }
      .detail-label {
        color: #78350f;
        font-weight: 600;
        min-width: 120px;
      }
      .detail-value {
        color: #555;
      }
      .moveout-highlight {
        background-color: #fee2e2;
        border: 2px solid #ef4444;
        border-radius: 8px;
        padding: 20px;
        margin: 24px 0;
        text-align: center;
      }
      .moveout-highlight h3 {
        margin: 0 0 5px;
        color: #dc2626;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .moveout-highlight .date {
        font-size: 24px;
        font-weight: 700;
        color: #b91c1c;
        margin: 0;
      }
      .reason-box {
        background-color: #f3f4f6;
        border-radius: 6px;
        padding: 15px;
        margin: 20px 0;
      }
      .reason-box h4 {
        margin: 0 0 8px;
        color: #374151;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .reason-box p {
        margin: 0;
        color: #555;
        font-size: 14px;
        font-style: italic;
      }
      .next-steps {
        background-color: #eff6ff;
        border-radius: 6px;
        padding: 20px;
        margin: 24px 0;
      }
      .next-steps h3 {
        margin: 0 0 12px;
        color: #1e40af;
        font-size: 16px;
      }
      .next-steps ul {
        margin: 0;
        padding-left: 20px;
        color: #555;
        font-size: 14px;
      }
      .next-steps li {
        margin: 8px 0;
      }
      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        margin-top: 16px;
        text-align: center;
      }
      .footer {
        padding: 30px;
        background-color: #f8f9fa;
        text-align: center;
        font-size: 13px;
        color: #666;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Move-Out Notice</h1>
        <p>2-month notice period has begun</p>
      </div>

      <div class="content">
        <p class="greeting">Hi ${recipientName},</p>

        <p class="message">
          ${initiatorLabel} <strong>${initiatorName}</strong> has given a 2-month move-out notice for the rental unit below.
          This notice period officially began on <strong>${formattedNoticeDate}</strong>.
        </p>

        <div class="notice-details">
          <h3>Property Details</h3>
          <div class="detail-row">
            <span class="detail-label">Unit:</span>
            <span class="detail-value">${unitNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Address:</span>
            <span class="detail-value">${propertyAddress}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Notice Given:</span>
            <span class="detail-value">${formattedNoticeDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Given By:</span>
            <span class="detail-value">${initiatorName} (${initiatedBy})</span>
          </div>
        </div>

        <div class="moveout-highlight">
          <h3>Move-Out Date</h3>
          <p class="date">${formattedMoveOutDate}</p>
        </div>

        ${reason ? `
        <div class="reason-box">
          <h4>Reason for Notice</h4>
          <p>"${reason}"</p>
        </div>
        ` : ''}

        <div class="next-steps">
          <h3>Next Steps</h3>
          <ul>
            ${initiatedBy === "tenant" ? `
            <li>Review the notice details in your dashboard</li>
            <li>Schedule a move-out inspection before the move-out date</li>
            <li>Prepare the security deposit return documentation</li>
            <li>Begin listing the unit for new tenants if desired</li>
            ` : `
            <li>Review the notice details in your dashboard</li>
            <li>Prepare for move-out by the specified date</li>
            <li>Coordinate with your landlord for the move-out inspection</li>
            <li>Ensure the unit is in good condition to receive your deposit</li>
            `}
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">
            View Details in Dashboard
          </a>
        </div>
      </div>

      <div class="footer">
        <p>
          This notification was sent by Rentr.<br />
          <a href="${dashboardUrl}">Manage your rental</a>
        </p>
      </div>
    </div>
  </body>
</html>
`;
}

export function getNoticeGivenEmailSubject(unitNumber: string): string {
  return `Move-Out Notice Received for Unit ${unitNumber}`;
}
