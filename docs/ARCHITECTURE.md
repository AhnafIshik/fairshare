# Architecture and data rules

The browser renders React forms. Next.js Server Actions validate inputs with Zod, verify the Supabase user and call narrowly scoped PostgreSQL RPCs using that user's cookies. The RPC repeats membership/role and financial checks so calling Supabase directly does not bypass the application. Auth refresh uses `@supabase/ssr` and the Next.js proxy; mutations independently verify the user. Server Actions supply Next.js's same-origin action protection. Read-only CSV export uses the same authenticated snapshot.

Normal household writes never use the service-role key. It is isolated in a `server-only` module for the scheduler and in a separate development seed script. Public tables allow authenticated SELECT under RLS; arbitrary client INSERT/UPDATE/DELETE is revoked. Mutation RPCs use a fixed `search_path`, explicit checks and narrowly granted execution. Internal helpers and scheduler RPCs are not executable by ordinary users.

## Ledger

`expenses` is the immutable original financial entry. `kind` distinguishes expenses, bills, rent and trips. `expense_participants` contains the selected beneficiaries' exact integer-cent allocations. A payer can be included or excluded; their own allocation creates no self-debt. Unified ledger tables avoid duplicating independent financial logic for bills/rent/trips.

`repayments` binds one debtor to one expense and its original payer/collector. There is no free-floating editable balance. The remaining obligation is the original allocation less confirmed repayments. Pending repayments reserve capacity but do not reduce debt; rejection releases that reservation. A row lock on the expense serialises repayment recording, correction and voiding. Only the recipient can confirm receipt; repeated confirmation is a no-op. Service-role/DB-owner access remains privileged and must be tightly controlled.

For $90 paid by A for A/B/C, allocations are 3,000 cents each. B and C owe A 3,000 cents each. If B records 1,500 cents, the balance stays 3,000 until A confirms; it then becomes 1,500. C's obligation is unchanged.

Equal splitting uses floor division and awards leftover cents by UUID order. Percentages are integer basis points summing to 10,000. SQL uses exact `numeric` products, floors and deterministic remainder allocation. Custom dollar allocations must sum exactly. Client preview uses integer/BigInt arithmetic and the database independently recalculates. Money is capped at 100,000,000 cents per entry.

Original expense payments and bill/rent collection obligations have different meanings. Bills and rent create contributions to a nominated collector; `external_paid` separately records an administrator's report of payment to the provider/landlord. No bank transfer is performed or independently verified. Dashboard balances include active generated rent/bill obligations, including future due dates; the upcoming-rent card is the member's original contribution, not a second debt.

## Corrections

An authorised user can correct an unsettled expense/bill. The RPC locks the original, verifies no pending/confirmed repayment, voids it and inserts its replacement in one transaction. A failure rolls everything back. Original shares and attachments remain available. The replacement links to the original in metadata and the audit trail. Trips retain their original estimates; void an unsettled trip and create its replacement.

After settlement, an administrator can record an **agreed adjustment** linked to the original. It adds a separate debt between explicitly selected active members. It does not rewrite the original, erase repayments, create a claimed bank transfer or automatically net opposing obligations. The UI calls out this meaning. The operator cannot determine whether housemates genuinely agreed; that is a social agreement outside the app.

A unique `(created_by, request_id)` prevents duplicate entries. A canonical payload fingerprint rejects using the same key for different financial values. Rent configuration also has a unique submission key and fingerprint. Recurring rent has a unique configuration/date occurrence. Repayments have a unique payer/request key and confirmation cannot apply twice.

## Consistent reads and privacy

A STABLE, security-invoker `household_snapshot` RPC returns the financial tables together under one PostgreSQL statement snapshot, with every underlying table's RLS still applied. Returning a single JSON value avoids the API's default row limit truncating allocations and corrupting displayed totals. The view refuses more than 10,000 visible expenses or 100,000 shares instead of showing partial balances. This is an initial-release guard, not a scalable reporting design.

An active member sees financial entries they created, paid for or benefited from. The shares of that shared entry are visible for transparency. Other members' repayments remain private unless the viewer is the creditor or household administrator; the UI and CSV do not manufacture their remaining balances from incomplete repayment data. Administrators see the wider household ledger and audit trail. Vehicle details, fuel observations, cleaning tasks and rent configuration are shared within the household. Notifications are per recipient.

Leaving/removal marks membership inactive, ends access and preserves financial rows. It pauses future rent generation until contributions are reconfigured. Removing a member from a rotation affects only subsequent generation; already generated assignments stay in history and can be explicitly reassigned. A household row lock protects the last-admin rule against concurrent departures. Demoting the rent-configuring administrator pauses their active rent schedule.

## Recurrence and reminders

Due dates are date-only values calculated from the household's timezone, not server timezone. Rent advances a fixed 7/14/28 days from the configured anchor. New rent configuration preserves past obligations, refuses overlap with pending/confirmed future cycles, and voids superseded unpaid future cycles with audit records. A second payment check after locking the old entry protects against racing repayments.

Cleaning stores task templates separately from immutable dated assignments. Daily/weekly/fortnightly sequences advance a fixed number of days. Monthly tasks preserve the original day-of-month, clamp to the last day in short months and return to the anchor day afterwards. Rotation is an index into the selected ordered member IDs, with no fixed five-member assumption.

Generation looks 14 days ahead and catches up at most 100 occurrences per template per invocation. Notifications use recipient/event unique keys. Lead, due-date and first-overdue reminders run on their local dates, including a separate provider/landlord reminder for the collector when needed. Completion history is never rewritten by a rotation edit. Page loads generate only the authenticated user's active household; the service scheduler covers all households.

The email outbox has a unique notification ID, leasing with `FOR UPDATE SKIP LOCKED`, five-attempt cap and a 23-hour delivery window. A stable provider idempotency key protects uncertain network retries within the provider's 24-hour window. There is no absolute exactly-once guarantee across every external failure mode; in-app deduplication is database-enforced, and email delivery still requires operational monitoring.

## Files

Documents link to exactly one expense, repayment, fuel observation or cleaning assignment. The server checks size, allowed MIME and file signature before registration. A checked RPC validates the target and records a random storage path. Storage INSERT requires this authorised metadata and uploader; SELECT requires the target's access policy. No update/delete or public listing access is granted to application users. File uploads are separate from financial creation so a failed attachment cannot roll back or duplicate the ledger entry. Failed uploads can leave metadata without an object; the UI reports an unavailable file.

The bucket is private with a 5 MB size limit. Download links expire after 60 seconds and can be forwarded until expiry. There is no malware scanning, OCR or image resizing pipeline. Administrator/owner database access bypasses RLS by design; project access is an operator responsibility.

## Saved account profiles and authentication

`auth.users` owns credentials; `public.profiles` is a private account record keyed by the Auth UUID. An Auth trigger creates profiles atomically and synchronises the authoritative email, verification and last-sign-in timestamps. Returning logins preserve the user's chosen account name/timezone. RLS allows profile SELECT only to its owner, including when another viewer is a household administrator. Updates use validated caller-owned RPCs; privileged implementations live in the unexposed `private` schema and public entry points use security-invoker wrappers. User metadata supplies an initial display name only and never grants permissions.

Login validates credentials through Supabase, verifies the returned session with `getUser`, and ensures the database profile exists before redirecting. Account verification, resend and password recovery have separate states. New passwords require confirmation and at least 12 characters; sign-in does not reject older valid passwords solely for length. Both PKCE callbacks and optional token-hash confirmation routes validate redirect destinations and synchronise the profile. Optional Google identity sign-in uses the same profile path.

All app Auth operations currently run on the server, so the SSR cookie configuration uses HttpOnly, SameSite=Lax and Secure in production. There is no browser localStorage account database. If a browser Supabase client is added for Realtime in future, review that cookie architecture instead of silently assuming it can read HttpOnly sessions.
