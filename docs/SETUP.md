# Setup and deployment

For a focused guide to account registration, login and saved profiles, see [LOGIN_SETUP.md](LOGIN_SETUP.md).

## What you need outside this project

| Service / account            | Needed for                                   | Required?                    | What to configure                                                   |
| ---------------------------- | -------------------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Node.js 22 LTS + npm         | Local development and builds                 | Yes locally                  | Install the official runtime; restart your terminal                 |
| Supabase project             | PostgreSQL, Auth and private file storage    | Yes for real records         | A dedicated project, migration, URL, publishable key, Auth settings |
| Vercel account               | Hosting the Next.js application              | Yes for this deployment path | Import the repository and set environment variables                 |
| Git repository               | Version history and Vercel deployments       | Strongly recommended         | Commit code and lockfile, keep `.env.local` ignored                 |
| Transactional email provider | Signup verification and password resets      | Yes for ordinary users       | Configure custom SMTP inside Supabase Auth                          |
| Domain + DNS access          | Verified sending domain and optional app URL | Needed for production email  | Provider DKIM/SPF records and an appropriate DMARC policy           |
| Scheduler                    | Reminders while browsers are closed          | Yes for unattended reminders | Secret-authenticated GET to `/api/cron`                             |
| Resend API account/key       | Optional household reminder emails           | Optional                     | Verified sender, API key, `EMAIL_FROM`; users opt in                |
| Operator support email       | Support/privacy/deletion requests            | Before inviting real users   | Set `NEXT_PUBLIC_SUPPORT_EMAIL` and update legal pages              |

You do **not** need an email marketing subscription, payment gateway, banking API, maps subscription or paid OCR service for the implemented workflows. A transactional email service is for application messages, not marketing. Provider plans and limits can change; check their current terms and usage pages instead of assuming a free tier covers production.

## 1. Install and preview

Install Node.js 22 LTS from [nodejs.org](https://nodejs.org/). Run `node --version` and `npm --version` in a fresh terminal. In the project directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Visit [localhost:3000](http://localhost:3000). The sample household works before any accounts are configured. Real records require the next steps.

## 2. Create a dedicated Supabase project

1. Create a new development project in [Supabase](https://supabase.com/). Choose the region deliberately; assess where your household data, backups and email processing will occur.
2. In the SQL Editor, run `supabase/migrations/202611050001_fairshare.sql` once, then `supabase/migrations/20261105164125_user_profiles.sql`. If the base migration is already applied, run only the new profile migration. Alternatively use the Supabase CLI migration workflow, linked to this dedicated project.
3. Verify the `household-documents` bucket exists and is **private**. The migration sets a 5 MB limit and PDF/JPEG/PNG/WebP types. Do not make the bucket public.
4. Copy the project URL and **publishable key** to `.env.local`. Legacy anon keys can be used as the publishable value when appropriate for your project; never use the service-role key in that field.
5. The migration deliberately restricts table mutations and function execution in the `public` schema. Do not run it in a project containing unrelated applications without adapting and reviewing those grants.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Do not paste service-role keys, SMTP passwords or API keys into chat or commit them. Configure them directly in local/deployment secret settings.

## 3. Configure authentication and its email delivery

In Supabase Auth:

- Enable email/password authentication and email confirmation. Set a minimum password length of 12 or more to match this app.
- Set Site URL to your application origin.
- Allow the exact local and deployed callback URLs, including `http://localhost:3000/auth/callback` and `https://your-domain/auth/callback`. Permit the `next` query parameters used by signup and password reset, using the provider's documented URL pattern rules. Avoid broad wildcards on unrelated domains.
- Configure a transactional provider's **SMTP credentials in Supabase**, including host, port, username, password and verified From address. These SMTP values do not belong in the app's public environment.
- Disable link tracking for authentication emails when the provider supports it; rewriting can break single-use links. Test verification and reset from the same browser that requested them because this release uses the SSR PKCE callback.
- Configure Auth rate limits; consider CAPTCHA and MFA before public signup. CAPTCHA/MFA UI is not implemented here.

The default Supabase mail service is restricted to project-team addresses and heavily rate-limited; it is not a general-production sender. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and [its production guide](https://supabase.com/docs/guides/deployment/going-into-prod).

Restart the server after editing `.env.local`. Create a real account, verify it, sign in and create your household. Invite people through Household settings; invitation links are generated but **not automatically emailed**.

## 4. Set up scheduled in-app reminders

The scheduler must run whether a browser is open or not. `GET /api/cron` requires `Authorization: Bearer <CRON_SECRET>` and the server-only Supabase service-role key.

Generate a random secret locally, for example with `openssl rand -hex 32`, then place it directly in the deployment secret settings. Do not put it in a URL or log it.

```dotenv
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
CRON_SECRET=your-long-random-secret
```

The supplied `vercel.json` runs hourly at minute 15. **Hourly Vercel cron needs a suitable paid plan; Vercel Hobby only allows daily cron and rejects this configuration.** Choose one path:

- Keep hourly scheduling on a supported Vercel plan.
- Change the expression to `15 21 * * *` for one daily run. That is morning in Sydney in both standard/daylight time, with the platform's timing variance. Test your chosen household timezones; one daily UTC run is not an accurate local-morning schedule for every timezone.
- Remove Vercel's cron declaration and use a trusted external scheduler that sends the same secret header hourly. Keep its credentials in that scheduler's secret settings. Do not create two independent production schedules unnecessarily.

See [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) and [managing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs). A logged-in page load also generates its own household schedule, but that is a convenience, not a replacement for the scheduler.

Rent due dates are DATE values derived in the household's IANA timezone. A Thursday anchor and one-day lead give Wednesday and Thursday reminders every 14 days, plus one overdue reminder on Friday. Other anchors move the lead/due days accordingly. Due reminders are not repeated throughout an overdue period. The current release does not backfill a missed reminder day after a scheduler outage; it does generate missing financial/cleaning occurrences in bounded batches.

## 5. Optional reminder email via Resend

This is separate from Supabase's Auth SMTP configuration. You may use one email vendor for both, but you must configure both channels.

1. Create the provider account and verify your sending domain. Add the exact DNS records the provider supplies. See [Resend domain verification](https://resend.com/changelog/domain-verification-events).
2. Set server-only `RESEND_API_KEY` and a valid `EMAIL_FROM`, such as `Fairshare <notifications@your-verified-domain>`.
3. Users enable email reminders in Household settings. Only notifications generated after opting in are queued.
4. Confirm the hourly scheduler works and inspect outbox/provider delivery results using a dedicated test mailbox.

The worker leases up to eight emails per invocation, uses a stable provider idempotency key, tries at most five times, and stops automatic delivery of messages older than 23 hours. This stays inside the provider's documented [24-hour idempotency window](https://github.com/resend/resend-skills/blob/main/skills/resend/references/sending/best-practices.md). This avoids late retries sending duplicates, but older failures require operator review. Provider acceptance is not proof of inbox delivery. There is no bounce/suppression webhook implementation in this release.

## 6. Seed a separate development project

The sample UI needs no seed. To test real multi-account workflows in your development Supabase project, set:

```dotenv
SEED_CONFIRM_DEVELOPMENT=true
SEED_PASSWORD=choose-a-unique-development-password-at-least-12-characters
```

Then run `npm run seed`. It creates five verified `fairshare.member1@example.test` through `fairshare.member5@example.test` accounts, one clearly named sample household, invitations, groceries, a bill, vehicle/fuel/trip, rent and cleaning. Use your configured seed password to sign in. It never prints the password. The `.test` addresses do not receive email; these accounts are for development only. Do not enable seed variables on production. A partial failed seed requires inspection or a fresh development project; the script does not delete accounts or real records for you.

## 7. Deploy on Vercel

1. Create a private repository and commit the source, migration and lockfile. Check that no `.env` files or service secrets are staged.
2. Import into Vercel with the Next.js preset; use `npm ci`, `npm run build`, and Node 22.
3. Choose the scheduler path above before deploying to avoid a Hobby-plan cron rejection.
4. Set the public Supabase values, `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin, and `NEXT_PUBLIC_SUPPORT_EMAIL`. Set the server-only scheduler and optional email variables only where needed.
5. Use a separate Supabase project for preview/staging and production. Keep production service-role access out of untrusted PR previews.
6. Apply the migration to production, configure Auth URLs and custom SMTP there, and deploy.
7. Complete the staging checklist in `TESTING.md` with five separate accounts before inviting real households.
8. Configure monitoring for scheduler failures, failed/expired outbox records and database/storage usage. Decide backup retention and practise restoring to a separate project.
9. Complete the operator identity, privacy terms, support contact and retention/deletion process. The bundled text is an initial draft, not finished legal policy.

## Environment reference

| Variable                               | Browser-visible? | Used for                                                    |
| -------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes              | Project endpoint                                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes              | Low-privilege API access governed by RLS                    |
| `NEXT_PUBLIC_SITE_URL`                 | Yes              | Email callback and reminder link origin                     |
| `NEXT_PUBLIC_SUPPORT_EMAIL`            | Yes              | Operator contact link                                       |
| `SUPABASE_SERVICE_ROLE_KEY`            | **No**           | Scheduler/outbox and development account seed; bypasses RLS |
| `CRON_SECRET`                          | **No**           | Scheduler endpoint authentication                           |
| `RESEND_API_KEY`                       | **No**           | Optional reminder email API                                 |
| `EMAIL_FROM`                           | Server config    | Verified reminder sender                                    |
| `SEED_CONFIRM_DEVELOPMENT`             | **No**           | Explicit development-only seed opt-in                       |
| `SEED_PASSWORD`                        | **No**           | Development-only account password                           |
