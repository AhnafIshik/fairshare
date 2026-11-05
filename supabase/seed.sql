-- Development seeding uses scripts/seed.mjs, not raw auth.users inserts.
-- This creates verified test accounts through Supabase Admin Auth, then uses the
-- same invitations and checked financial RPCs as the application.
-- Run `npm run seed` against a separate development project with the explicit
-- opt-in and password described in .env.example. Never seed production.
select 'Use npm run seed; see docs/SETUP.md' as seed_instructions;
