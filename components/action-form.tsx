'use client';
import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { LoaderCircle, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { mutate, type ActionState } from '@/app/actions';
export function ActionForm({
  children,
  intent,
  householdId,
  label = 'Save',
  demo = false,
  action = mutate,
  className = '',
  confirm,
}: {
  children?: ReactNode;
  intent?: string;
  householdId?: string;
  label?: string;
  demo?: boolean;
  action?: (state: ActionState, data: FormData) => Promise<ActionState>;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [requestId, setRequestId] = useState('');
  useEffect(() => {
    setRequestId(crypto.randomUUID());
  }, []);
  useEffect(() => {
    if (state.message && !state.error) setRequestId(crypto.randomUUID());
  }, [state]);
  return (
    <form
      action={formAction}
      className={`action-form ${className}`}
      onSubmit={(e) => {
        if (demo) {
          e.preventDefault();
          return;
        }
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {intent && <input type="hidden" name="intent" value={intent} />}
      {householdId && <input type="hidden" name="household_id" value={householdId} />}
      <input type="hidden" name="request_id" value={requestId} />
      <fieldset disabled={pending}>{children}</fieldset>
      {state.error && (
        <p role="alert" className="feedback error">
          <AlertCircle size={17} />
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="feedback success">
          <CheckCircle2 size={17} />
          {state.message}
        </p>
      )}
      {state.url && (
        <div className="invite-result">
          <label>
            Private invitation link
            <input
              aria-label="Private invitation link"
              readOnly
              value={state.url}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(state.url!);
            }}
          >
            Copy invitation
          </button>
        </div>
      )}
      {demo ? (
        <Link href="/login?mode=signup" className="button secondary">
          Create an account to save
        </Link>
      ) : (
        <button type="submit" className="button" disabled={pending || !requestId}>
          {pending ? <LoaderCircle className="spin" size={16} /> : null}
          {pending ? 'Saving…' : label}
        </button>
      )}
    </form>
  );
}
export function Modal({
  title,
  trigger,
  children,
  secondary = false,
}: {
  title: string;
  trigger?: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className={`button ${secondary ? 'secondary' : ''}`}
        onClick={() => ref.current?.showModal()}
      >
        <Plus size={16} />
        {trigger || title}
      </button>
      <dialog
        ref={ref}
        className="modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) ref.current?.close();
        }}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => ref.current?.close()}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
