# Release limits and unfinished work

This file is part of the deliverable. The application must not be described as fully production-ready or as passing every original acceptance scenario end to end.

## External configuration still required

No real Supabase project, SMTP sender, email API or Vercel account was configured during this build. There are no invented credentials. Live account verification/reset, invitation acceptance across real browsers, Storage uploads/signed links, the seed script, deployment and email delivery need staging verification. The automated database tests emulate Supabase's Auth/Storage schemas and exercise real PostgreSQL functions/RLS; they do not test Supabase's hosted Auth/Storage HTTP implementations.

The optional Resend delivery code has not sent any emails. In-app reminders need the configured backend scheduler to run without an open browser. Hourly `vercel.json` cron is incompatible with Vercel Hobby; choose the plan/external-scheduler/daily option documented in SETUP.md. No public deployment has been made.

## Financial and product boundaries

- AUD only. No exchange rates, refunds as negative expenses, bank feeds, transfers, payment processing, landlord/provider integrations or reconciliation against bank statements.
- Repayments are manually reported and require recipient confirmation. A departed creditor cannot sign in to that household to confirm; resolve outstanding contributions before departure or have the operator review the retained records. The app never cancels these debts silently.
- Administrators can record a linked agreed adjustment after settlement. This adds an independent obligation; it does not automatically net or reverse an entire ledger/payment history. Unsettled expenses and bills can be atomically corrected; unsettled trips are voided and re-entered. There is no general ledger reversal engine.
- No split between different beneficiary groups for fuel, tolls and parking in one trip. All three use the selected trip group; enter separate expenses if groups differ.
- Trip distance is manual. Efficiency is stored to three decimal places; fuel observations to four. No route/map data, odometer tracking or automatic fuel-price verification.
- Rent supports 7-, 14- and 28-day cycles. There is no true calendar-month rent mode or pro-rata calculation when someone moves in/out mid-cycle. Contributions require an explicit household agreement and reconfiguration.
- Bills are one-off arrivals with reminders. There is no recurring bill template, automatic provider bill import or OCR. Documents are uploaded after the financial record is saved.
- Rent reconfiguration keeps earlier cycles and protects pending/settled future cycles. It voids unpaid cycles from the new anchor and regenerates them. Review the new anchor carefully; changing weekdays changes the due weekday by design.
- Cleaning supports daily, weekly, fortnightly and anchored monthly recurrence; no arbitrary RRULE editor, effort weighting, multiple assignees or custom day interval. Excluding someone or pausing affects future generation. Reassign already generated tasks explicitly. Rotation order follows the selected member list; there is no drag-and-drop sequence editor.
- Member restoration/rejoining the same historical household is not exposed in the UI. An operator needs to review and deliberately restore the existing membership rather than create a duplicate. No household deletion or autonomous account-erasure workflow is included. The operator must handle privacy/deletion requests and retention conflicts through the support process.
- No mobile push, SMS or marketing automation. Invitation links are shared manually; the app does not automatically send invitation emails.
- No Supabase Realtime subscription. Your own mutations refresh the app; other users' changes appear on navigation or refresh. There is no offline mode or native mobile app.

## Capacity and operations

- A consistent financial snapshot refuses more than 10,000 visible expense entries or 100,000 shares instead of calculating partial balances. Add paginated reports/server-side summaries for larger use. Notifications display the latest 100 and the audit UI the latest 30; those limits do not delete older database rows.
- Snapshot rendering, per-expense in-memory lookups and signing document links are designed for small households. There is no load test, large-data benchmark, connection-pool tuning or archival/reporting subsystem yet.
- Schedule generation catches up at most 100 occurrences per template per invocation and looks 14 days ahead. The current per-household scheduler loop is not a distributed queue. One invalid template causing a database error can fail that invocation; monitoring and operator repair are needed.
- Reminder events are deduplicated by recipient/event key. If the scheduler misses an entire local reminder day, that reminder is not backfilled. Generated obligations/assignments do catch up. Long outages need explicit operator review.
- Optional emails are batched eight at a time, leased, limited to five attempts and 23 hours. Email older than that is not automatically retried; review it. No delivery/bounce/suppression webhooks, administrative outbox UI or provider-failover strategy is implemented.
- Successful database mutations have basic per-user hourly limits for selected operations. Failed transactions roll back their rate-limit increment. There is no shared IP/WAF limiter or CAPTCHA UI. Configure Supabase Auth limits and add public-facing abuse protection before broad signup.
- Failed uploads can leave document metadata without a file. No orphan-repair, antivirus, image compression, redaction or automated retention/deletion job is included. File signatures and MIME checks do not guarantee a document is harmless.
- Security headers are present, but the initial CSP allows inline scripts/styles and `unsafe-eval` for framework compatibility. Add nonce-based CSP and production-only tightening after validating your deployment. HSTS should be configured at the HTTPS hosting layer. Supabase self-hosted/custom domains may require updating CSP origins.
- No automated encrypted backup/restore procedure has been executed. Supabase plan selection, backups, monitoring, provider accounts and key rotation belong to the deployment operator.
- The privacy/terms pages describe the initial implementation and are intentionally marked incomplete. Add operator identity, contact, retention, region, subprocessors and applicable policies before a public launch. The learning/setup notes do not establish legal compliance.
- Desktop/mobile preview and basic keyboard/accessibility structure are provided. There is no independent WCAG audit or testing on a physical phone, assistive technology or all browsers.

## What the original acceptance scenarios currently prove

| Scenario                         | Implemented path                                              | Verified here                                                                     | Still required                                                      |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| A: five accounts, same household | Auth, invitations, separate memberships; seed uses those APIs | SQL invite accept/expiry/reuse and arbitrary membership counts                    | Hosted signup/verification and five-browser/account test            |
| B: $90 for three                 | Atomic cent allocations and obligations                       | Actual SQL returns 3,000/3,000/3,000; purchaser included/excluded tested          | Submit through configured UI                                        |
| C: 63 km example                 | SQL trip estimate with historical snapshot                    | 5.25 L and 971 fuel cents, extras and selected shares tested                      | Configured UI/Storage workflow                                      |
| D: fortnightly rent              | Anchor/date/timezone generation and deduplicated reminders    | 14-day SQL recurrence, lead/due reminders, timezone tests                         | Deployed scheduler over real Wednesday/Thursday cycles              |
| E: electricity bill + document   | Custom shares and private document upload                     | SQL allocations and Storage-style RLS checked                                     | Actual Supabase upload, signed URL and browser access               |
| F: recurring cleaning            | Rotation, completion and history                              | Ten-member rotation, month end, completion authorisation/history                  | Configured multi-user UI test                                       |
| G: repayment                     | Partial/full confirmation and reservation                     | SQL confirmation, retries, overpayment rejection, unrelated obligations preserved | Configured two-account UI test                                      |
| H: unrelated household rejected  | Server checks and RLS                                         | Real PostgreSQL role/RLS and RPC rejection tests                                  | Repeat against hosted Supabase REST endpoints                       |
| I: mobile workflows              | Responsive navigation, cards, forms and dialogs               | Browser layout preview at 390 px                                                  | Real authenticated workflows and physical-device testing            |
| J: one reminder on retry         | Unique events, outbox leasing and provider idempotency        | Database deduplication and lease retry tests                                      | Real scheduled in-app delivery and optional email provider delivery |
