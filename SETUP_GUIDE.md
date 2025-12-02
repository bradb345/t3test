# Quick Setup Guide - Tenant Onboarding

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install @radix-ui/react-dialog @radix-ui/react-label
```

### Step 2: Apply Database Migrations
```bash
# Using Drizzle
npm run db:push

# Or manually run the migration file
# drizzle/0008_tenant_onboarding.sql
```

### Step 3: Verify Environment Variables
Ensure these are set in your `.env` file:
```env
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Test the Flow
1. Start your dev server: `npm run dev`
2. Navigate to a property with vacant units
3. Click the dropdown (⋮) on a vacant unit
4. Select "Onboard Tenant"
5. Send an invitation to your test email
6. Check email and click the onboarding link

---

## 📁 Files Created/Modified

### New Files Created
```
src/
├── emails/
│   └── tenant-invitation.ts              # Email template
├── app/
│   ├── api/
│   │   ├── onboarding/
│   │   │   └── route.ts                  # Onboarding API
│   │   └── units/
│   │       └── [id]/
│   │           └── invite-tenant/
│   │               └── route.ts          # Invitation API
│   └── onboarding/
│       └── page.tsx                      # Onboarding page
└── components/
    ├── TenantInvitationModal.tsx        # Invitation modal
    ├── ui/
    │   └── label.tsx                     # Label component
    └── onboarding/
        └── OnboardingProgress.tsx       # Progress indicator

drizzle/
└── 0008_tenant_onboarding.sql           # Database migration

TENANT_ONBOARDING.md                      # Full documentation
SETUP_GUIDE.md                            # This file
```

### Modified Files
```
src/
├── server/
│   └── db/
│       └── schema.ts                     # Added 8 new tables
└── components/
    └── UnitCard.tsx                      # Added "Onboard Tenant" option
```

---

## ✅ Verification Checklist

After setup, verify these work:

### Database
- [ ] All 8 new tables created
- [ ] Indexes created properly
- [ ] Foreign keys working

### Landlord Features
- [ ] "Onboard Tenant" appears in unit dropdown (vacant units only)
- [ ] Modal opens when clicked
- [ ] Form validation works
- [ ] Email sends successfully
- [ ] Toast notification appears

### Tenant Features
- [ ] Onboarding link opens
- [ ] Progress loads correctly
- [ ] Can save progress
- [ ] Can navigate between steps
- [ ] Form validations work

### Email
- [ ] Email delivers to inbox (check spam folder)
- [ ] Email renders properly in Gmail/Outlook
- [ ] Onboarding link works

---

## 🔧 Troubleshooting

### Email not sending
- Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for logs
- Verify sender domain is configured

### Database errors
- Run `npm run db:push` again
- Check database connection string
- Verify PostgreSQL is running

### TypeScript errors
- Run `npm install` to ensure all deps installed
- Restart TypeScript server in VS Code
- Check for missing imports

### Modal not opening
- Clear browser cache
- Check browser console for errors
- Verify dropdown menu renders

---

## 🎯 Next Steps

### Immediate
1. Test with real email addresses
2. Customize email template branding
3. Add your logo to emails
4. Configure proper sender domain

### Short-term
1. Implement remaining onboarding steps with real forms
2. Add file upload functionality (UploadThing)
3. Create landlord review dashboard
4. Add email notifications for progress

### Long-term
1. Background check integration
2. E-signature integration
3. Payment processing
4. Mobile app development

---

## 📚 Resources

- **Full Documentation:** `TENANT_ONBOARDING.md`
- **Database Schema:** `src/server/db/schema.ts` (lines 390+)
- **API Routes:** `src/app/api/onboarding/` and `src/app/api/units/[id]/invite-tenant/`
- **Email Template:** `src/emails/tenant-invitation.ts`

---

## 🆘 Need Help?

1. Check `TENANT_ONBOARDING.md` for detailed documentation
2. Review browser console for errors
3. Check server logs for API errors
4. Test with curl/Postman for API issues

---

## 💡 Tips

- Use test email addresses during development
- Keep invitation tokens secure
- Monitor email delivery rates
- Set up error tracking (Sentry)
- Add analytics to track completion rates

---

**Setup Complete!** 🎉

You now have a fully functional tenant onboarding system. Start by sending a test invitation and walking through the complete flow.
