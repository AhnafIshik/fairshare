import { NextResponse, type NextRequest } from 'next/server';
import { supabase, configured } from '@/lib/supabase/server';
import { safeAuthNext, syncSignedInProfile } from '@/lib/auth-flow';
export async function GET(request: NextRequest) {
  const failure = (error = 'link') =>
    NextResponse.redirect(new URL('/login?error=' + error, request.url));
  if (!configured()) return failure();
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return failure();
  try {
    const client = await supabase();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return failure();
    const saved = await syncSignedInProfile(client);
    if (saved.error) return failure('profile');
    const response = NextResponse.redirect(
      new URL(safeAuthNext(request.nextUrl.searchParams.get('next')), request.url),
    );
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    return failure();
  }
}
