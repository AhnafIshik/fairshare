import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from './types';
export async function loadProfile(client: SupabaseClient, userId: string): Promise<UserProfile> {
  const { data, error } = await client
    .from('profiles')
    .select(
      'id,email,display_name,timezone,email_verified_at,last_sign_in_at,created_at,updated_at',
    )
    .eq('id', userId)
    .single();
  if (error || !data)
    throw new Error(
      'Your account profile could not be loaded. Apply the user-profiles migration and sign in again.',
    );
  return data as UserProfile;
}
