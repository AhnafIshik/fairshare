# What to learn next

You do not need to learn everything before trying the app. Learn in the order that lets you run, inspect and safely maintain this project.

1. **Terminal, Node and Git.** Learn `cd`, environment variables, `npm ci`, the dev/build/test scripts, branches, commits and `.gitignore`. Your first milestone is starting the sample app, changing a label and passing the build without committing `.env.local`.
2. **TypeScript and React.** Understand objects/arrays, types, async/await, React props/state, controlled form inputs and client/server components. Trace `ExpenseForm` → Server Action → PostgreSQL RPC → refreshed UI.
3. **SQL and data modelling.** Learn primary/foreign keys, joins, constraints, transactions and row locks. Reproduce the $90/three-person example and a partial repayment. Understand why an original share and a payment are separate rows.
4. **Supabase Auth and RLS.** Learn the difference between authentication and authorisation, publishable and service-role keys, cookie sessions, expiring invitations and database policies. Test with two separate browser profiles and try reading an unrelated household. Hiding a button is not a security boundary.
5. **Money and date logic.** Learn integer cents, percentage basis points, deterministic rounding, date-only obligations and IANA timezones/DST. Read the financial and recurrence tests before changing calculations. Never change a stored trip's price because today's fuel price changed.
6. **Email and DNS.** Understand transactional email versus marketing email; SMTP for Auth versus the reminder API; sender verification, SPF, DKIM, DMARC, quotas, bounces and spam filtering. Verify one real signup email and one password reset before inviting people.
7. **Deployment and scheduling.** Learn Vercel environments, production/preview isolation, HTTPS, domains, server secrets, cron's UTC schedules and function limits. Prove a reminder runs with every browser closed, and a retry does not duplicate it.
8. **Testing and operations.** Learn unit versus integration/end-to-end tests, logs without secrets, dependency updates, staging releases, backup restore, support/deletion requests and incident handling. Monitor failed reminders and preserve financial evidence during corrections.

Useful official starting points: [Next.js learning](https://nextjs.org/learn), [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html), [React learning](https://react.dev/learn), [Supabase guides](https://supabase.com/docs), [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html), [Vercel deployment documentation](https://vercel.com/docs).

A useful first week: get the sample running; connect a development Supabase project; create two accounts; record $90 for three people; confirm one partial repayment; inspect the original SQL records; test a denied cross-household request; configure email; then deploy a private staging version. The point is being able to explain why a number is correct and why a user is allowed to see it.

Before operating a public service, plan for support, retention/deletion, backups, abuse prevention, accessibility, monitored delivery and ongoing maintenance. If you are still learning RLS and transactions, keep testing with fictional records until an experienced reviewer has checked your deployment and financial/security paths.
