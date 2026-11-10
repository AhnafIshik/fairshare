# Enable real email login and saved user accounts

The login feature is implemented. Until the Supabase connection settings are present, the app shows the forms with an **Account connection pending** notice and disables submission. It does not pretend to save an account.

## 1. Create a development Supabase project

Create a project at [Supabase](https://supabase.com/dashboard). Save its database password somewhere private. Use a dedicated development project while testing this application.

In the project's SQL Editor, run these files **in order**:

1. `supabase/migrations/202611050001_fairshare.sql`
2. `supabase/migrations/20261105164125_user_profiles.sql`

If you already applied the first file, run only the second. Do not rerun the base migration against existing tables. The second migration adds private user profiles, backfills existing accounts and installs the account-creation/synchronisation trigger. Keep the `private` schema out of the Data API's exposed schemas.

If you ran the profiles file first and the base file failed with a syntax error, use the current base file after confirming that its household tables do not exist yet. Its permission statements preserve the existing profile permissions. Copy the entire file directly from VS Code; `references` must remain one word. Once the base file succeeds, do not rerun it.

The project uses Supabase Auth to handle passwords and sessions. The `public.profiles` table contains the account ID, email, chosen name, timezone, verification timestamp and sign-in timestamps. **There is no password column in the application profile.** Other housemates, including household administrators, cannot read your private profile/email through the profile table. Household names and memberships are separate records.

## 2. Add two connection settings locally

Copy `.env.example` to `.env.local` if you have not already created that file. In VS Code, replace these values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
```

Find the URL and publishable key in the Supabase project's connection/API settings. The publishable key is designed for the user-facing API; database permissions and RLS restrict access. **Do not put a service-role/secret key in the publishable-key field.** Ordinary login and profile saving do not require a service-role key.

Stop your VS Code dev server with Ctrl+C and run `npm run dev` again after editing the environment file. Use one consistent local origin, preferably [http://localhost:3000](http://localhost:3000), when testing verification and password reset. Development actions also recognise the loopback origin used by the browser to avoid losing PKCE cookies between `localhost` and `127.0.0.1`.

## 3. Configure Supabase Auth and email

In Supabase Auth settings:

- Enable **Email / password** sign-in and email confirmation.
- Set Site URL to `http://localhost:3000` for development, and your HTTPS application origin in production.
- Add your local and production `/auth/callback` URLs to the redirect allowlist. The redirect URL must also permit the `next` query values used by the app; follow the provider's documented pattern matching. Keep production allowlists restricted to your own origins. If testing with `127.0.0.1`, allow that origin explicitly too.
- Set the minimum password length to 12 to match new Fairshare accounts. Sign-in accepts older existing account passwords if the Auth service still accepts them.
- Configure your own transactional SMTP provider for general user registration, verification and password reset. Its SMTP credentials go in **Supabase Auth settings**, not in a `NEXT_PUBLIC_` variable.

Supabase's default email service is restricted and rate-limited. It is for initial testing with permitted project-team addresses, not for sending signup emails to arbitrary housemates. See [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Default verification/reset templates work with the `/auth/callback` PKCE flow. Open the link in the browser that requested it. For verification in a different browser/device, configure the optional server-side token-hash templates below when your plan/SMTP configuration allows template customisation.

## 4. Try the real workflow

1. Open `/login?mode=signup`, enter your name and an email you already own, choose a **Fairshare password**, and confirm that password. This is a new Fairshare account; it does not ask for your Gmail/Outlook mailbox password.
2. Open the verification email. The account/profile is persisted by the database trigger, and verified sign-in loads that same account.
3. Create or join a household. Household expenses, shares, bills, trips and chores are stored against that household in PostgreSQL.
4. Sign out, close the browser and sign in again using the same Fairshare account. The saved household data should reappear.
5. In Household settings → Your account, change your name/default timezone. Sign out and back in; those preferences should be preserved.
6. Use Forgot password to request a reset email. After updating the password, the recovery session ends and you sign in with the new password.
7. Use Verify your email / Resend verification when a confirmation link expires.

A Gmail, Outlook or other existing email address can be used for registration. Simply knowing someone's email is not enough to access their account. They must authenticate with their Fairshare password or an enabled external provider.

## Optional: direct Google sign-in

Email/password registration works without Google Cloud configuration. To offer **Continue with Google**:

1. Create a Google OAuth web client in Google Cloud and configure the consent screen for your application.
2. Use the exact Supabase Auth callback URL shown in the project's Google-provider settings as the Google client's authorised redirect URI. It is the Supabase `/auth/v1/callback` endpoint, not the Next.js `/auth/callback` endpoint.
3. Enable Google in Supabase Auth and add the client ID/secret there. Do not commit the client secret or put it in the app's public environment.
4. Add the application's callback URL to Supabase's redirect allowlist.
5. Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in `.env.local` and restart the app.

The app requests a normal Google identity sign-in and saves the same private account profile after the server validates the session. No Gmail inbox integration is needed. See [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Optional: cross-browser email verification/reset

With custom SMTP or a plan that supports template customisation, the app also supports `/auth/confirm`. In the **Confirm signup** template, use an HTML link such as:

```html
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;redirect_to={{ .RedirectTo }}"
  >Verify your Fairshare email</a
>
```

For **Reset password**:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery"
  >Reset your Fairshare password</a
>
```

The server verifies the single-use token, establishes the session and validates the account profile. Recovery always opens the password-update screen. The signup template preserves an invitation only when its original callback matches this application's origin; external redirect destinations are rejected. Keep the Site URL correct for each environment, do not publish tokens, and disable email-provider link tracking that rewrites authentication URLs.

New free-tier projects using Supabase's default SMTP cannot customise these templates; custom SMTP or an appropriate plan is required. See [the template restriction](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## What has and has not been verified

Automated tests exercise auth validation/flow orchestration with a mocked Auth client and execute the actual profile migration against embedded PostgreSQL with real SQL roles and RLS. They check account creation/backfill, private profile reads, validated owner updates, email/sign-in synchronisation, safe redirects and session-dependent profile saving.

Automated tests do not establish that live email, Google OAuth, real Auth cookies, hosted Storage or deployment work. These require a configured development Supabase project and end-to-end testing. Connecting the Supabase chat integration alone does not set this app's `.env.local` values. The operator should run Supabase security advisors after applying migrations to the actual project.

On 6 November 2026, the base migration was applied to the connected Fairshare development project after its profiles migration. Live checks confirmed 18 public tables with RLS enabled, preserved profile/RPC permissions, and denied anonymous household creation. The local suite passed 63 tests, including both migration orders. Email login has not yet been tested against that project.

The hosted security advisor reports 24 [authenticated SECURITY DEFINER RPC warnings](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). These functions intentionally mediate signed-in writes and membership checks, but their privileged design still warrants review before production; a longer-term improvement is moving their implementations into the private schema behind invoker wrappers. It also reports two [RLS-without-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) for `email_outbox` and `rate_limits`: client table access is deliberately revoked, and only privileged functions/service-role operations access them. Do not add permissive policies just to silence those notices.
