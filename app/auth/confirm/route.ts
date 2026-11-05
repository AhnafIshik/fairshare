import { NextResponse, type NextRequest } from 'next/server';
import { supabase, configured } from '@/lib/supabase/server';
import { emailConfirmationNext, syncSignedInProfile } from '@/lib/auth-flow';
/** Optional server-side email template route, including opening mail on another browser. */
export async function GET(request: NextRequest) {
  const failure = (error = 'link') =>
    NextResponse.redirect(new URL('/login?error=' + error, request.url));
  const hash = request.nextUrl.searchParams.get('token_hash'),
    type = request.nextUrl.searchParams.get('type');
  if (!configured() || !hash || !['email', 'signup', 'recovery'].includes(type || ''))
    return failure();
  try {
    const client = await supabase();
    const { error } = await client.auth.verifyOtp({
      token_hash: hash,
      type: type as 'email' | 'signup' | 'recovery',
    });
    if (error) return failure();
    const saved = await syncSignedInProfile(client);
    if (saved.error) return failure('profile');
    const next =
      type === 'recovery'
        ? '/login?mode=update'
        : emailConfirmationNext(
            request.nextUrl.searchParams.get('redirect_to'),
            request.nextUrl.origin,
            request.nextUrl.searchParams.get('next'),
          );
    const response = NextResponse.redirect(new URL(next, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    return failure();
  }
}
