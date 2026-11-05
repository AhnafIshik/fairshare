# Verification and staging acceptance

Verification is reported against the code in this checkout. Nothing in this document claims an unconfigured external service passed.

## Executed locally

- `npm run typecheck`: passed.
- `npm test`: **62 tests passed** across three files, covering PostgreSQL integration/security and domain rules.
- `npm run build`: production Next.js/Webpack build passed, including all application routes and server functions.
- Local HTTP checks: homepage, login, four information pages and all nine sample application sections returned 200. The unconfigured protected page emitted Next.js’s streamed login redirect without household content; onboarding redirected, cron without its secret returned 401, export without configuration returned 503, and an unknown route returned 404.
- Package installation audit reported no known vulnerabilities at installation time. This is not a security audit or guarantee; continue dependency maintenance.
- Browser preview: desktop household dashboard, navigation, native trip/expense dialogs and responsive dashboard layout at a 390 px phone viewport were inspected. Browser interaction also confirmed $90 splits as $30/$30/$30 for selected members, a grocery search returns one record, and the mobile 63 km trip preview shows 5.250 L, $9.71 and shares of $2.43/$2.43/$2.43/$2.42. Sample records are fictional and cannot be saved. Authentication was not bypassed to fabricate a successful live workflow.

`tests/database.test.ts` applies the **actual migration** to embedded PostgreSQL via PGlite. It mocks Supabase's `auth.users`, `auth.uid`, storage tables and API roles, then changes roles and authenticated user claims to exercise SQL checks and RLS. It tests:

- Equal, custom-amount and percentage splits, remainder cents, selected participants, purchaser inclusion/exclusion, invalid allocations and duplicate submission keys/payload mismatches.
- Pending reservations, partial/full repayments, confirmation permissions, retry idempotency, rejected payments and overpayment prevention.
- 63 km / 12 km/L × $1.85/L = 5.25 L and 971 cents, plus extras, saved observations, fixed historical prices and invalid input.
- Fortnightly rent anchor generation, lead and due reminders, timezone handling, deduplication, safe reconfiguration and settled future-cycle protection.
- Ten-member cleaning rotation, assignment permissions, reassignment/history preservation and anchored month-end dates.
- Private invitation creation, email restriction, acceptance, reuse/expiry denial; unrelated-household reads/writes, role escalation, protected helper/scheduler RPCs, file registration and private-object RLS.
- Atomic expense correction/rollback, linked agreed adjustments, unchanged settled history, email outbox opt-in and lease retries, and a consistent authorised snapshot that preserves repayment privacy.

`tests/domain.test.ts` checks exact decimal inputs, allocation previews, fuel calculations, local dates/DST-related date anchoring, partial/overdue statuses, balance derivation and CSV formula escaping. File signature handling is implemented in the server action; it still needs hosted upload-path testing.

## Required after you configure a staging Supabase project

Use separate browser profiles or private windows for different accounts. Do not run these against a household with real money until you have checked the results against the SQL ledger.

1. Sign up five users, verify email, sign in/out, and reset a password. Confirm invalid/used verification or reset links fail. Confirm callback allowlists and SMTP delivery in the real environment.
2. Create a household as A. Generate four single-use invitations; B–E explicitly accept using their own accounts. Verify a restricted-email invitation fails for the wrong account. Create a second household and switch; data should stay separate.
3. A records $90 for A/B/C. Check three $30 shares, B/C each owe A $30, and D/E have no access/obligation. Try amount/percentage splits, $1 divided by three, purchaser excluded and invalid allocation totals. Retry one request with the same key.
4. B records $15 to A. The balance stays $30 while pending. A confirms; B then owes $15 and C still owes $30. Retry confirmation, test rejection and try to overpay. Inspect the original/share/repayment rows.
5. Correct an unsettled record; the original remains void and the replacement is linked. Try correcting after a pending/confirmed payment: rejection is expected. Record an explicitly agreed adjustment and verify both histories remain separate.
6. Register a 12 km/L, 60 L vehicle. Save $1.85/L, enter 63 km and four selected people. Confirm 5.25 L, $9.71 and exact shares summing to 971 cents. Add tolls/parking, then a later price observation; the old trip must stay fixed.
7. Configure Thursday fortnightly rent. Inspect consecutive dates 14 days apart and selected contributions. Exercise the scheduler on the lead, due and first-overdue days in a controlled staging environment. Retry it and confirm notification counts do not increase. Test another timezone and a DST transition. Reconfigure unpaid future cycles; try overlapping pending future payments.
8. Record an electricity bill with custom beneficiaries and attach a PDF/image. Download it as an authorised member. Try another household, another member not involved, a forged storage path, oversized file and invalid MIME/signature. Test a real signed URL expiring after 60 seconds. Report provider payment separately from household contributions.
9. Add recurring cleaning with more than five participants; complete, reassign, pause and exclude a member. Confirm completed history and already generated assignments are not silently rewritten. Test a January 31 monthly anchor.
10. Enable reminder email only for a test mailbox. Run `/api/cron` with the secret header; inspect the outbox and provider. Retry the same event and simulate a timeout/lease expiry. Verify the provider accepted at most one email and check actual mailbox delivery. No secret or correct header must produce HTTP 401; missing scheduler credentials should fail visibly.
11. Test a last-admin departure and concurrent admin departures. Remove a member: access ends, financial rows remain, future rent pauses and outstanding balances are retained. Agree a support path for departed creditors before real use.
12. Test principal workflows at 390 px and a wider tablet/desktop size, keyboard-only navigation and a screen reader. Check error/success announcements, modal focus, mobile menu, file uploads and long member names.
13. Export CSV as different users, compare visible rows to RLS, inspect formula-like descriptions in spreadsheet software, and make sure private remaining balances are blank. Totals are explicitly repeated per share and must not be naively summed as unique expenses.
14. Verify environment isolation, service-role secrecy, backup restore to another project, failed-job monitoring and support/legal configuration before production launch.

Do not enable a public signup flow merely because the build and SQL tests pass. Hosted integrations, operational configuration and the release limits remain separate acceptance work.

## Login/profile implementation checks

`tests/auth-flow.test.ts` tests the real input validation and auth orchestration with mocked Supabase Auth responses: email normalisation, password confirmation, existing-account passwords, signup verification/session handling, failed credentials, server-verified profile ownership, reset/resend, recovery-session termination, profile-storage failure, safe callback destinations and local/production origins.

`tests/database.test.ts` also applies the generated user-profiles migration to PostgreSQL. It verifies backfill, atomic profile creation from the real Auth email, owner-only access, rejection of direct writes/forged ownership, validated name/timezone changes, idempotent repair and persistence across Auth updates. These tests do not claim a live hosted signup/email/Google flow passed. Use `LOGIN_SETUP.md` to configure and exercise that flow.
