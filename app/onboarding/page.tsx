import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Leaf, House, Users, LogOut } from 'lucide-react';
import { signOut } from '@/app/actions';
import { supabase, configured } from '@/lib/supabase/server';
import { loadProfile } from '@/lib/profile';
import { invitationToken } from '@/lib/validation';
import { ActionForm } from '@/components/action-form';
import { Field, Notes } from '@/components/fields';
import { JoinHouseholdForm } from '@/components/join-household-form';
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const invitation = invitationToken.safeParse((await searchParams).token);
  const token = invitation.success ? invitation.data : undefined;
  if (!configured()) redirect('/login?setup=1');
  const client = await supabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.email_confirmed_at) {
    const params = new URLSearchParams({ mode: user ? 'resend' : 'signup' });
    if (token) params.set('token', token);
    redirect(`/login?${params}`);
  }
  const profile = await loadProfile(client, user.id);
  return (
    <main className="onboarding">
      <header className="onboarding-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          fairshare.
        </Link>
        <form action={signOut}>
          {token && <input type="hidden" name="invitation" value={token} />}
          <button type="submit" className="button secondary">
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </header>
      <div className="section-intro">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>Every good home starts somewhere.</h1>
        <p>Create a space for your household, or accept an invitation to join one.</p>
      </div>
      <div className="onboarding-grid">
        <section className="panel settings-panel">
          <House size={27} />
          <h2>Create your household</h2>
          <ActionForm intent="create_household" label="Create household">
            <Field name="name" label="Household name" placeholder="The Greenhouse" />
            <Field name="display_name" label="Your name" value={profile.display_name} />
            <Notes name="description" label="About your home" />
            <Field name="timezone" label="Timezone" value={profile.timezone} />
            <p className="small muted">
              Currency: AUD. You will be the first household administrator.
            </p>
          </ActionForm>
        </section>
        <section className="panel settings-panel">
          <Users size={27} />
          <h2>Join your housemates</h2>
          <JoinHouseholdForm key={token} token={token} displayName={profile.display_name} />
          <Link className="text-link" href="/app/overview">
            Back to my household
          </Link>
        </section>
      </div>
    </main>
  );
}
