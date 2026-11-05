import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Leaf, ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthForm } from '@/components/auth-form';
import { configured, supabase } from '@/lib/supabase/server';
import { authDestination, authModes, type AuthMode } from '@/lib/auth-flow';
export const dynamic = 'force-dynamic';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const search = await searchParams;
  const mode: AuthMode = authModes.includes(search.mode as AuthMode)
    ? (search.mode as AuthMode)
    : 'signin';
  const connected = configured(),
    token = search.token?.slice(0, 128);
  let authenticated = false,
    profileReady = false;
  if (connected) {
    try {
      const client = await supabase();
      const {
        data: { user },
      } = await client.auth.getUser();
      authenticated = Boolean(user);
      if (
        user?.email_confirmed_at &&
        !search.error &&
        ['signin', 'signup', 'resend'].includes(mode)
      ) {
        const { error } = await client.rpc('ensure_profile');
        profileReady = !error;
      }
    } catch {
      /* The form reports connection failures without exposing service details. */
    }
  }
  if (profileReady) redirect(authDestination(token));
  if (mode === 'update' && !authenticated) redirect('/login?mode=reset&error=recovery');
  const title =
    mode === 'signup'
      ? 'Your home. Your account.'
      : mode === 'reset'
        ? 'Let’s get you back in.'
        : mode === 'update'
          ? 'A fresh password.'
          : mode === 'resend'
            ? 'Verify your email.'
            : 'Welcome home.';
  const description =
    mode === 'signup'
      ? 'Register with your existing email address and start saving your household records.'
      : mode === 'reset'
        ? 'Enter your account email and we’ll send you a password reset link.'
        : mode === 'update'
          ? 'Choose a new password for your Fairshare account.'
          : mode === 'resend'
            ? 'Request a new verification link for your Fairshare account.'
            : 'Sign in with your email to access your saved household.';
  return (
    <main className="auth-page">
      <div className="auth-aside">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Leaf size={21} />
          </span>
          fairshare.
        </Link>
        <div>
          <span className="eyebrow">SHARED LIVING. SORTED.</span>
          <h1>
            Less keeping tabs.
            <br />
            More making
            <br />
            <em>yourself at home.</em>
          </h1>
          <p>
            One household. Your own account.
            <br />
            Your shared life, saved in one place.
          </p>
          <div className="auth-benefits">
            <span>
              <CheckCircle2 size={17} />
              Your household data, ready when you return
            </span>
            <span>
              <CheckCircle2 size={17} />A separate account for every housemate
            </span>
            <span>
              <CheckCircle2 size={17} />
              Use an email address you already own
            </span>
          </div>
        </div>
        <span className="small">
          <ShieldCheck size={16} />
          Individual accounts. Thoughtful boundaries.
        </span>
      </div>
      <div className="auth-main">
        <Link href="/" className="text-link">
          <ArrowLeft size={15} />
          Back to Fairshare
        </Link>
        <div className="auth-card">
          <span className="eyebrow">YOUR OWN LITTLE SPACE</span>
          <h2>{title}</h2>
          <p>{description}</p>
          {!connected && (
            <div className="auth-connection-note" role="status">
              <AlertCircle size={18} />
              <p>
                <strong>Account connection pending.</strong> Sign-in and saving become available
                after the site operator connects Supabase. Details entered here are not saved yet.
                You can <Link href="/app/overview?demo=1">explore the sample household</Link>.
              </p>
            </div>
          )}
          {search.error && (
            <p role="alert" className="feedback error">
              {search.error === 'signout'
                ? 'We could not sign you out. Please try again.'
                : search.error === 'recovery'
                  ? 'That password reset session is missing or expired. Request a fresh link below.'
                  : search.error === 'profile'
                    ? 'Your account was verified, but its database profile could not be loaded. Ask the operator to apply the user-profiles migration.'
                    : 'That sign-in link could not be verified. Request a fresh link and try again.'}
            </p>
          )}
          {search.notice === 'password-updated' && (
            <p role="status" className="feedback success">
              <CheckCircle2 size={18} />
              Password updated. Sign in with your new password.
            </p>
          )}
          <AuthForm
            key={mode + String(token || '')}
            mode={mode}
            token={token}
            connected={connected}
            googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'}
          />
          <p className="auth-legal">
            By using Fairshare, you agree to the <Link href="/terms">terms</Link> and{' '}
            <Link href="/privacy">privacy notice</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
