import Link from 'next/link';
import { notFound } from 'next/navigation';
const content: Record<string, { title: string; intro: string; paragraphs: string[] }> = {
  privacy: {
    title: 'Your home. Your information.',
    intro:
      'Privacy notice for the initial Fairshare release. The deployment operator must complete this notice before inviting real users.',
    paragraphs: [
      'Fairshare stores your account email and name, household membership, financial allocations, recorded repayments, vehicle information, cleaning assignments and uploaded documents in the configured Supabase project. Avoid putting bank details, identity documents or unrelated personal information in notes or uploads.',
      'Household administrators can view household financial records. Members can view expenses they created, paid for or benefited from, including the other shares on those expenses. Vehicle records and cleaning schedules are visible to active household members. Email addresses are not published in the member directory.',
      'Documents are stored in a private bucket. Authorised requests receive links valid for 60 seconds. Anyone who receives such a link may use it until it expires. Leaving ends database access; downloaded copies cannot be recalled. Historical obligations and repayments remain for recordkeeping.',
      'Optional email reminders are sent through the operator’s configured email provider only when enabled in your preferences. The operator must document the provider, project region, subprocessors, retention schedule, backup arrangements and support contact before production use.',
      'Account erasure is handled by the operator. Financial history may require retention or anonymisation rather than deletion. Automated account erasure is not available in this release. Contact the deployment operator to request access, correction, export or deletion.',
    ],
  },
  terms: {
    title: 'A clear starting point.',
    intro:
      'Initial product terms. These need review and completion by the deployment operator before a public launch.',
    paragraphs: [
      'Fairshare records household agreements, estimated trip costs, responsibilities and reported repayments. It does not move money, connect to your bank, pay a landlord or utility provider, verify evidence or guarantee that another member will pay.',
      'You are responsible for choosing the right beneficiaries, checking contributions and agreeing corrections with your housemates. Trip fuel consumption and range are estimates based on entered values. The app does not determine whether an arrangement is objectively fair.',
      'Record only information you are entitled to share. Keep your account and invitation links secure. Administrators have additional access and responsibility for household membership and settings.',
      'The operator must add its legal identity, contact details, applicable jurisdiction, fees if any, dispute process, service commitments and retention policy. This starter text does not replace a review of the operator’s obligations.',
    ],
  },
  support: {
    title: 'A little help at home.',
    intro: 'Support for your Fairshare household.',
    paragraphs: [
      'For invitations, member permissions, rent configuration and outstanding contributions, contact your household administrator first. Invitations expire after seven days and can be accepted only once. Verify your email before accepting.',
      'If an expense looks wrong, open it to inspect the shares. An authorised user can correct an unsettled expense or bill while retaining the original. Records with pending or confirmed repayments are protected. Your administrator can record a separate agreed adjustment linked to the original; it does not erase financial history.',
      'For a password reset, use the link on the sign-in page. If messages do not arrive, the deployment operator should check Supabase authentication mail settings, sender-domain verification, redirects and delivery logs.',
      'The project README and docs/SETUP.md explain configuration and deployment. docs/LIMITATIONS.md records release gaps and the remaining production checks.',
    ],
  },
  contact: {
    title: 'Keep the conversation open.',
    intro: 'Contact the person or organisation operating this Fairshare deployment.',
    paragraphs: [
      'A public support address has not been configured in this starter deployment. The operator must set NEXT_PUBLIC_SUPPORT_EMAIL and complete the privacy notice and terms before inviting real households.',
      'Household-specific questions should go to your administrator. For account access, privacy or deletion requests, use the configured operator support address below.',
    ],
  },
};
export default async function Info({ params }: { params: Promise<{ info: string }> }) {
  const { info } = await params;
  const c = content[info];
  if (!c) notFound();
  return (
    <main className="legal-page">
      <Link href="/" className="brand">
        fairshare.
      </Link>
      <span className="eyebrow">A LITTLE CLARITY</span>
      <h1>{c.title}</h1>
      <p className="lead">{c.intro}</p>
      {c.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
        <p>
          <a className="button" href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}>
            Contact support
          </a>
        </p>
      )}
      <div className="button-row">
        <Link href="/">Home</Link>
        <Link href="/login">Sign in</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
    </main>
  );
}
