# Fix Supabase email verification

Follow these steps so signup and password-reset emails are sent and the links work.

## 1. Turn on email confirmation

1. **Supabase Dashboard** → your project.
2. **Authentication** → **Providers** → **Email**.
3. Ensure **“Confirm email”** is **ON** (enable it if you want verification).
4. Save.

## 2. Set redirect URLs (required)

Supabase only sends the verification email if the redirect URL is in the allow list. Add **every** URL your app runs on:

1. **Authentication** → **URL Configuration**.
2. **Site URL**: set to your main app URL, e.g.  
   `https://nortstar-ai.vercel.app`
3. **Redirect URLs**: add these **exactly** (one per line):
   - `https://nortstar-ai.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
   - If you use another domain, add `https://your-domain.com/auth/callback` as well.
4. Save.

The app uses **NEXT_PUBLIC_SITE_URL** (if set in env) or the current origin + `/auth/callback`. Set **NEXT_PUBLIC_SITE_URL** in Vercel to your production URL (e.g. `https://nortstar-ai.vercel.app`) so the link in the email always matches what you put in Redirect URLs.

## 3. Make sure emails are sent (Supabase mail or SMTP)

By default Supabase sends mail via its own service (rate-limited, sometimes delayed or blocked). To improve delivery:

**Option A – Use Supabase default mail (quick test)**  
- Do nothing; Supabase will try to send.  
- Check spam. If nothing arrives, use Option B.

**Option B – Custom SMTP (recommended for production)**  
1. **Project Settings** → **Authentication** (or **Authentication** → **SMTP**).
2. Enable **Custom SMTP**.
3. Fill in your provider’s SMTP details (e.g. Gmail/Workspace, Microsoft 365, SendGrid, Resend).  
   - Sender email can be e.g. `it@influenxers.com` or your app’s noreply address.  
   - Use an app password if the provider requires it (e.g. Gmail).
4. Save.

After this, verification and password-reset emails are sent via your SMTP and are more reliable.

## 4. Check email templates (optional)

1. **Authentication** → **Email Templates**.
2. Open **“Confirm signup”** (and **“Reset password”** if you use it).
3. Ensure the template uses `{{ .ConfirmationURL }}` (or the correct variable) so the link points to your app and Supabase can append the token/code.

## Quick checklist

- [ ] **Confirm email** is ON (Authentication → Providers → Email).
- [ ] **Site URL** = your app’s main URL (e.g. `https://nortstar-ai.vercel.app`).
- [ ] **Redirect URLs** include `https://nortstar-ai.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`.
- [ ] Custom SMTP is configured if default Supabase mail is not delivering.
- [ ] User opens the email link in the **same browser** where they signed up (PKCE requirement).
