# Email Templates

This directory contains all email HTML templates used throughout the application.

## Available Templates

### `welcome.ts`
Welcome email sent to new users when they sign up.

**Usage:**
```typescript
import { sendEmail } from "~/lib/email";
import { welcomeEmail } from "~/emails/welcome";

await sendEmail({
  to: "user@example.com",
  subject: "Welcome to Rentr!",
  html: welcomeEmail("John Doe"),
});
```

### `property-inquiry.ts`
Email sent to property owners when they receive an inquiry.

**Usage:**
```typescript
import { sendEmail } from "~/lib/email";
import { propertyInquiryEmail } from "~/emails/property-inquiry";

await sendEmail({
  to: "owner@example.com",
  subject: "New Property Inquiry",
  html: propertyInquiryEmail(
    "Property Owner",
    "123 Main St, City, State",
    "John Doe",
    "inquirer@example.com",
    "I'm interested in viewing this property..."
  ),
});
```

## Creating New Email Templates

When creating a new email template:

1. Create a new `.ts` file in this directory
2. Export a function that returns an HTML string
3. Use inline styles (many email clients don't support external CSS)
4. Test across different email clients
5. Keep it responsive and mobile-friendly

## Email Sender Function

The `sendEmail` function is located in `src/lib/email.ts` and accepts:
- `to`: Email address(es) to send to
- `subject`: Email subject line
- `html`: HTML content of the email
- `from`: (Optional) Sender email address

## Testing

Before sending emails in production, test them using a service like:
- [Litmus](https://www.litmus.com/)
- [Email on Acid](https://www.emailonacid.com/)
- Or send test emails to yourself
