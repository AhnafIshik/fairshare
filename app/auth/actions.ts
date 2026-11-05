'use server';
import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabase, configured } from '@/lib/supabase/server';
import {
  authDestination,
  callbackUrl,
  configuredAuthOrigin,
  runEmailAuth,
  type AuthState,
} from '@/lib/auth-flow';

export async function authAction(_: AuthState, form: FormData): Promise<AuthState> {
  if (!configured())
    return {
      error:
        'Account saving is not connected yet. Add your Supabase project settings and apply the database migrations, then try again.',
    };
  let result: AuthState;
  try {
    const origin = configuredAuthOrigin(
      process.env.NEXT_PUBLIC_SITE_URL,
      (await headers()).get('origin'),
    );
    const token = String(form.get('token') || '').slice(0, 128);
    result = await runEmailAuth(await supabase(), Object.fromEntries(form), origin, token);
  } catch {
    return { error: 'Unable to reach the account service. Check your connection and try again.' };
  }
  if (result.redirectTo) {
    if (result.redirectTo === '/login?notice=password-updated')
      (await cookies()).delete('fairshare-household');
    revalidatePath('/app', 'layout');
    redirect(result.redirectTo);
  }
  return result;
}
export async function googleSignIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!configured() || process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'true')
    return { error: 'Google sign-in has not been enabled for this deployment.' };
  let destination: string;
  try {
    const client = await supabase();
    const origin = configuredAuthOrigin(
      process.env.NEXT_PUBLIC_SITE_URL,
      (await headers()).get('origin'),
    );
    const next = authDestination(String(form.get('token') || '').slice(0, 128));
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl(origin, next), queryParams: { prompt: 'select_account' } },
    });
    if (error || !data.url)
      return {
        error:
          'Google sign-in could not be started. Check the Google provider configuration in Supabase.',
      };
    destination = data.url;
  } catch {
    return { error: 'Unable to connect to Google sign-in right now. Please try again.' };
  }
  redirect(destination);
}
