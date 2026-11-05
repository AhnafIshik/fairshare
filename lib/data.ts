import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from './supabase/server';
import type { Household, Snapshot } from './types';
import { loadProfile } from './profile';
import { localDate } from './dates';
export async function loadSnapshot(): Promise<Snapshot> {
  const client = await supabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect('/login');
  if (!user.email_confirmed_at) redirect('/login?mode=resend');
  const profile = await loadProfile(client, user.id);
  const { data: houses, error } = await client.from('households').select('*').order('created_at');
  if (error)
    throw new Error(
      'Unable to load households. Check that the database migration has been applied.',
    );
  if (!houses?.length) redirect('/onboarding');
  const active = (await cookies()).get('fairshare-household')?.value;
  const household = (houses.find((h) => h.id === active) || houses[0]) as Household;
  const h = household.id;
  const generated = await client.rpc('generate_schedule', { h });
  if (generated.error)
    throw new Error(
      'Unable to generate household schedules. Ask your administrator to check the rent and rotation configuration.',
    );
  const { data: raw, error: snapshotError } = await client.rpc('household_snapshot', { h });
  if (snapshotError)
    throw new Error('Unable to load a complete household snapshot. No partial balances are shown.');
  const snapshot = raw as Omit<
    Snapshot,
    'profile' | 'userId' | 'email' | 'household' | 'households' | 'demo' | 'today'
  >;
  const { documents } = snapshot;
  const signed = await Promise.all(
    documents.map(async (d) => {
      const { data } = await client.storage.from('household-documents').createSignedUrl(d.path, 60);
      return { ...d, url: data?.signedUrl };
    }),
  );
  return {
    ...snapshot,
    profile,
    userId: user.id,
    email: user.email || '',
    household,
    households: houses,
    documents: signed,
    preferences: snapshot.preferences || { email_enabled: false, activity_enabled: true },
    demo: false,
    today: localDate(household.timezone),
  } as Snapshot;
}
