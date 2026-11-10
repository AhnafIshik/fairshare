'use client';

import { useState } from 'react';
import { ActionForm } from '@/components/action-form';

export function JoinHouseholdForm({
  token = '',
  displayName,
}: {
  token?: string;
  displayName: string;
}) {
  const [invitation, setInvitation] = useState(token);
  const [name, setName] = useState(displayName);

  return (
    <ActionForm intent="join" label="Accept invitation">
      <label className="field">
        <span>Invitation link or token</span>
        <input
          name="token"
          value={invitation}
          onChange={(event) => setInvitation(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={2048}
          required
        />
        <small>Open the private link or paste the full link or token here.</small>
      </label>
      <label className="field">
        <span>Your name in this household</span>
        <input
          name="display_name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          required
        />
      </label>
      <p className="small muted">
        Accepting adds you to the household. An email-restricted invitation must match your verified
        account email.
      </p>
    </ActionForm>
  );
}
