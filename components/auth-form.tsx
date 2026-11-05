'use client';
import Link from 'next/link';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import { authAction, googleSignIn } from '@/app/auth/actions';
import type { AuthMode } from '@/lib/auth-flow';

function PasswordField({
  label,
  name,
  value,
  onChange,
  isNew = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  isNew?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={isNew ? 12 : 1}
          maxLength={128}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          required
        />
        <button
          type="button"
          className="icon-button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {isNew && name === 'password' && (
        <small>Use at least 12 characters for your Fairshare password.</small>
      )}
    </div>
  );
}
function GoogleButton({ token, connected }: { token?: string; connected: boolean }) {
  const [state, action, pending] = useActionState(googleSignIn, {});
  return (
    <>
      <form action={action}>
        <input type="hidden" name="token" value={token || ''} />
        <button className="button secondary google-button" disabled={!connected || pending}>
          {pending ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <span className="google-mark" aria-hidden="true">
              G
            </span>
          )}
          Continue with Google
        </button>
        {state.error && (
          <p className="feedback error" role="alert">
            {state.error}
          </p>
        )}
      </form>
      <div className="auth-divider">
        <span>or use your email</span>
      </div>
    </>
  );
}
export function AuthForm({
  mode,
  token,
  connected,
  googleEnabled,
}: {
  mode: AuthMode;
  token?: string;
  connected: boolean;
  googleEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(authAction, {});
  const [email, setEmail] = useState(''),
    [name, setName] = useState(''),
    [password, setPassword] = useState(''),
    [confirmPassword, setConfirmPassword] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error) errorRef.current?.focus();
    if (state.message) {
      setPassword('');
      setConfirmPassword('');
    }
  }, [state]);
  const carry = token ? '&token=' + encodeURIComponent(token) : '';
  const label =
    mode === 'signup'
      ? 'Create account'
      : mode === 'reset'
        ? 'Send reset link'
        : mode === 'resend'
          ? 'Resend verification email'
          : mode === 'update'
            ? 'Save new password'
            : 'Sign in';
  return (
    <div className="auth-form-area">
      {(mode === 'signin' || mode === 'signup') && (
        <nav className="auth-tabs" aria-label="Account access">
          <Link
            href={'/login?mode=signin' + carry}
            className={mode === 'signin' ? 'selected' : ''}
            aria-current={mode === 'signin' ? 'page' : undefined}
          >
            Sign in
          </Link>
          <Link
            href={'/login?mode=signup' + carry}
            className={mode === 'signup' ? 'selected' : ''}
            aria-current={mode === 'signup' ? 'page' : undefined}
          >
            Create account
          </Link>
        </nav>
      )}
      {googleEnabled && (mode === 'signin' || mode === 'signup') && (
        <GoogleButton token={token} connected={connected} />
      )}
      {state.message ? (
        <div className="auth-delivery" role="status">
          <span>
            <Mail size={27} />
          </span>
          <h3>Check your inbox</h3>
          <p>{state.message}</p>
          <p className="small muted">
            Household data stays connected to this account when you sign in again.
          </p>
          <div className="button-row">
            <Link className="button secondary" href={'/login?mode=signin' + carry}>
              Back to sign in
            </Link>
            {state.needsVerification && (
              <Link className="text-link" href={'/login?mode=resend' + carry}>
                Resend verification
              </Link>
            )}
          </div>
        </div>
      ) : (
        <form
          action={action}
          className="auth-login-form"
          onSubmit={(e) => {
            if (!connected) e.preventDefault();
          }}
        >
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="token" value={token || ''} />
          <fieldset disabled={pending}>
            {mode === 'signup' && (
              <label className="field">
                <span>Your name</span>
                <input
                  name="display_name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            {mode !== 'update' && (
              <label className="field">
                <span>Email address</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  required
                  placeholder="you@example.com"
                />
              </label>
            )}
            {(mode === 'signin' || mode === 'signup' || mode === 'update') && (
              <PasswordField
                name="password"
                label={mode === 'update' ? 'New password' : 'Fairshare password'}
                value={password}
                onChange={setPassword}
                isNew={mode !== 'signin'}
              />
            )}
            {(mode === 'signup' || mode === 'update') && (
              <PasswordField
                name="confirm_password"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                isNew
              />
            )}
            {mode === 'signin' && (
              <div className="auth-form-links">
                <Link href={'/login?mode=resend' + carry}>Verify your email</Link>
                <Link href={'/login?mode=reset' + carry}>Forgot password?</Link>
              </div>
            )}
            {mode === 'signup' && (
              <p className="auth-email-note">
                Use an email address you already own. Choose a password specifically for Fairshare.
              </p>
            )}
          </fieldset>
          {state.error && (
            <div ref={errorRef} role="alert" tabIndex={-1} className="feedback error">
              <AlertCircle size={18} />
              <div>
                <p>{state.error}</p>
                {state.needsVerification && (
                  <Link href={'/login?mode=resend' + carry}>Resend verification email</Link>
                )}
              </div>
            </div>
          )}
          <button className="button auth-submit" disabled={!connected || pending}>
            {pending ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <>
                {label}
                <ArrowRight size={17} />
              </>
            )}
            {pending ? 'Please wait…' : null}
          </button>
          {mode !== 'signin' && mode !== 'signup' && (
            <p className="small auth-back-link">
              <Link href={'/login?mode=signin' + carry}>Back to sign in</Link>
            </p>
          )}
          <p className="auth-storage-note">
            <LockKeyhole size={14} />
            {connected
              ? 'Your account and household records are saved to the connected database.'
              : 'Account saving will start after Supabase is connected.'}
          </p>
        </form>
      )}
    </div>
  );
}
