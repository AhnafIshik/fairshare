import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Leaf, House, Users } from 'lucide-react';
import { supabase, configured } from '@/lib/supabase/server';
import { loadProfile } from '@/lib/profile';
import { ActionForm } from '@/components/action-form';
import { Field, Notes } from '@/components/fields';
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!configured()) redirect('/login?setup=1');
  const client = await supabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect('/login?mode=signup' + (token ? '&token=' + encodeURIComponent(token) : ''));
  if (!user.email_confirmed_at) redirect('/login?mode=resend');
  const profile = await loadProfile(client, user.id);
  return (
    <main className="onboarding">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Leaf size={20} />
        </span>
        fairshare.
      </Link>
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
          <ActionForm intent="join" label="Accept invitation">
            <Field
              name="token"
              label="Invitation token"
              value={token || ''}
              help="Use the private link or paste the token your administrator shared."
            />
            <Field
              name="display_name"
              label="Your name in this household"
              value={profile.display_name}
            />
            <p className="small muted">
              Accepting adds you to the household. An email-restricted invitation must match your
              verified account email.
            </p>
          </ActionForm>
          <Link className="text-link" href="/app/overview">
            Back to my household
          </Link>
        </section>
      </div>
    </main>
  );
}
