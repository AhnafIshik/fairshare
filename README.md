# Fairshare

A Next.js / TypeScript application for shared household expenses, bills, rent, vehicles and cleaning. Australian English, integer-cent AUD accounting, configurable IANA timezones, and Supabase PostgreSQL as the source of truth.

**This is an implemented initial release, not a production-ready service or a claim that every item in the original brief is complete.** It builds and has automated database/security tests. Real authentication, storage, hosted deployment and email delivery still require your own configured services and acceptance testing. Read [the release limits](docs/LIMITATIONS.md) before using real financial data.

## Start locally

Install **Node.js 22 LTS** (includes npm), then open this project in a terminal:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open [the homepage](http://localhost:3000) or [the sample household](http://localhost:3000/app/overview?demo=1). The sample works without credentials: its fictional records are read-only; form inputs can be explored but never saved. It never writes localStorage or mixes sample records with live data. Real application routes require sign-in and a configured database.

## Connect real accounts and records

For the login feature, start with [LOGIN_SETUP.md](docs/LOGIN_SETUP.md). It covers email registration, saved private profiles, verification/reset and optional Google sign-in.

Follow [SETUP.md](docs/SETUP.md) for Supabase, email, cron and Vercel. Set the two public Supabase variables in `.env.local`, apply both migrations in `supabase/migrations/` in filename order to a **new dedicated Supabase project**, configure Auth URLs and SMTP, restart Next.js, then create your own account.

No service credentials are included. The service-role key is server-only and is needed for scheduled reminders/optional email and the development seed, not ordinary household actions. Never put secrets in a `NEXT_PUBLIC_` variable.

## Implemented

- Public website, FAQs, sign-in / signup / reset / verification callback, protected routes, and multi-household selection.
- Household creation, admin roles, single-use hashed expiring invitations, explicit acceptance, membership departure/removal with preserved history and a last-admin safeguard.
- Atomic expense/share writes; equal, custom amount and basis-point percentage splits, deterministic remainder cents, participant validation, transaction filters, share calculations, atomic corrections, linked agreed adjustments and voiding unsettled entries with audit records.
- Per-expense obligations, partial manual repayments, pending reservations, recipient confirmation/rejection, duplicate-submission keys and derived balances.
- Bills, custom contributions, reminders, documents and separately reported external provider payments.
- Rent configuration, weekly/fortnightly/28-day anchors, configurable lead reminder, timezone-aware occurrences and overdue reminders.
- Vehicles, fuel-price history, immutable trip calculation snapshots, estimated consumption, tolls/parking and participant cost allocation.
- Daily/weekly/fortnightly/monthly cleaning rotations, arbitrary household sizes, completion, reassignment, future exclusions and pauses without rewriting history.
- In-app notifications, preferences, a secret-protected backend scheduler, and an optional leased email outbox using Resend idempotency keys.
- Private PDF/image storage, server-side file signatures and size validation, short-lived authorised links, RLS, audit log and CSV export with spreadsheet formula escaping.

## Verify

```sh
npm run typecheck
npm test
npm run build
```

Build/dev use Next.js's supported Webpack mode for compatibility with restricted local environments. Package versions are pinned and `package-lock.json` is committed. PGlite runs the actual PostgreSQL migration with mocked Supabase `auth` and `storage` schemas, real SQL roles and RLS. This verifies database rules; it does **not** substitute for testing Supabase Auth/Storage/SMTP over the network.

See [TESTING.md](docs/TESTING.md) for executed checks and the remaining staging acceptance steps. See [LEARNING.md](docs/LEARNING.md) for what to learn, and [ARCHITECTURE.md](docs/ARCHITECTURE.md) for design decisions.

## Code map

- `app/`: App Router pages, checked server actions, auth callback, cron and CSV endpoints.
- `components/`: responsive workspace, forms, accessible native dialogs and navigation.
- `lib/`: money, balance reconstruction, dates, validation, demo records and Supabase clients.
- `supabase/migrations/`: normalised ledger, membership and scheduling schema, checked RPCs and read/storage policies.
- `scripts/seed.mjs`: explicit opt-in development seed using real Auth accounts and application RPCs.
- `tests/`: unit and PostgreSQL integration/security tests.
- `docs/PROJECT_BRIEF.md`: your original brief, preserved for comparison with the implemented scope.

No payment integration, bank feed, OCR, push delivery, live electricity-provider integration or email marketing subscription is required to use the core ledger. Fairshare records agreements and transfers made elsewhere; it never moves money.
