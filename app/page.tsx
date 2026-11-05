import Link from 'next/link';
import {
  Leaf,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ArrowLeftRight,
  ReceiptText,
  CarFront,
  Sparkles,
  ShieldCheck,
  House,
  Users,
  Wallet,
  Plus,
} from 'lucide-react';
export default function Home() {
  return (
    <div className="marketing">
      <main>
        <div className="landing-intro">
          <nav className="public-nav">
            <Link href="/" className="brand">
              <span className="brand-mark">
                <Leaf size={20} />
              </span>
              fairshare<span className="brand-dot">.</span>
            </Link>
            <div className="public-links">
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#questions">FAQs</a>
            </div>
            <div className="button-row">
              <Link href="/login" className="text-link">
                Sign in
              </Link>
              <Link href="/login?mode=signup" className="button">
                Get started <ArrowUpRight size={16} />
              </Link>
            </div>
          </nav>
          <div>
            <section className="hero">
              <div className="hero-copy">
                <span className="pill">
                  <span /> A LITTLE FAIRER. A LOT EASIER.
                </span>
                <h1>
                  Shared living.
                  <br />
                  <em>Sorted.</em>
                </h1>
                <p>
                  Manage household expenses, split bills, track car costs, and keep cleaning
                  responsibilities fair, all in one place.
                </p>
                <div className="button-row">
                  <Link href="/login?mode=signup" className="button large">
                    Get started <ArrowRight size={17} />
                  </Link>
                  <a href="#how-it-works" className="button secondary large">
                    See how it works
                  </a>
                </div>
                <div className="hero-note">
                  <Check size={15} />
                  Your own account. Your shared home. A clearer picture.
                </div>
              </div>
              <div className="hero-preview" aria-label="Fictional Fairshare household preview">
                <div className="floating-split">
                  <CheckCircle2 size={17} />
                  Split to the cent
                </div>
                <div className="preview-top">
                  <span className="mini-mark">
                    <Leaf size={15} />
                  </span>
                  <span>The Greenhouse</span>
                  <small>SAMPLE HOUSEHOLD</small>
                </div>
                <div className="preview-content">
                  <span className="eyebrow">A PLACE FOR EVERYTHING</span>
                  <h2>
                    Home feels better
                    <br />
                    when it’s shared fairly.
                  </h2>
                  <div className="preview-balance">
                    <span>
                      <small>You’re owed</small>
                      <strong>$60.00</strong>
                    </span>
                    <span className="preview-arrow">
                      <ArrowDownLeftIcon />
                    </span>
                  </div>
                  <div className="preview-receipt">
                    <span className="transaction-icon">
                      <ReceiptText size={18} />
                    </span>
                    <span>
                      <strong>The weekly grocery run</strong>
                      <small>$90.00 · shared by three</small>
                    </span>
                    <BadgeText>Split equally</BadgeText>
                  </div>
                  <div className="preview-people">
                    {['A', 'J', 'S'].map((p, i) => (
                      <div key={p}>
                        <span className={`avatar tone-${i}`}>{p}</span>
                        <strong>$30.00</strong>
                        <small>{['Alex paid', 'Jamie’s share', 'Sam’s share'][i]}</small>
                      </div>
                    ))}
                  </div>
                  <div className="preview-bottom">
                    <Check size={16} />
                    Everyone’s share. Down to the cent.
                  </div>
                </div>
                <div className="floating-note">
                  <Sparkles size={20} />
                  <div>
                    <strong>A little home care</strong>
                    <small>Kitchen reset · Alex · Today</small>
                  </div>
                  <span className="task-check checked">
                    <Check size={13} />
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="values-strip">
          <span>
            <ArrowLeftRight size={18} />
            Expenses, without the guesswork
          </span>
          <span>
            <Users size={18} />
            Every housemate included
          </span>
          <span>
            <Leaf size={18} />
            Made for everyday shared living
          </span>
        </div>
        <section className="marketing-section" id="features">
          <div className="section-intro">
            <span className="eyebrow">LESS LIFE ADMIN. MORE LIVING.</span>
            <h2>
              Everything you share.
              <br />
              One place to sort it.
            </h2>
            <p>
              From the weekly grocery run to the big bills, make the everyday a little easier on
              everyone.
            </p>
          </div>
          <div className="feature-grid">
            {[
              [
                ArrowLeftRight,
                'Split it. Sort it.',
                'Choose who benefited, split equally or set custom shares, and keep every cent accounted for.',
              ],
              [
                ReceiptText,
                'Bills with a heads-up.',
                'Keep rent and utilities on the radar with clear due dates and individual contributions.',
              ],
              [
                CarFront,
                'Share the journey.',
                'Record trips, estimate fuel costs and divide the cost among the people who came along.',
              ],
              [
                Sparkles,
                'A home everyone cares for.',
                'Rotate cleaning jobs, see who’s up next, and keep a record of the little things done.',
              ],
              [
                Wallet,
                'Know where you stand.',
                'See what you owe and what you’re owed, with repayments confirmed by the person receiving them.',
              ],
              [
                House,
                'Your home, your people.',
                'Individual accounts, secure invitations and separate households, all organised in one space.',
              ],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Leaf;
              return (
                <article className="feature-card" key={String(title)}>
                  <span>
                    <I size={23} />
                  </span>
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="section-intro">
            <span className="eyebrow">MAKE YOURSELF AT HOME</span>
            <h2>Three steps to a little more calm.</h2>
          </div>
          <div className="steps">
            {[
              ['01', 'Create your household.', 'Give your home a name and set your timezone.'],
              [
                '02',
                'Invite your housemates.',
                'Share a private invitation. Everyone has their own account.',
              ],
              [
                '03',
                'Share the everyday.',
                'Record expenses, agree contributions and rotate responsibilities.',
              ],
            ].map(([n, t, p]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
          <Link className="button" href="/app/overview?demo=1">
            Explore a sample household <ArrowUpRight size={16} />
          </Link>
        </section>
        <section className="privacy-strip">
          <ShieldCheck size={42} strokeWidth={1.4} />
          <div>
            <span className="eyebrow">A SHARED HOME. THOUGHTFUL BOUNDARIES.</span>
            <h2>Clarity, with privacy in mind.</h2>
            <p>
              Access is checked at the database. Documents stay in private storage. Relevant members
              can see their shared expenses, while household administrators have a wider view.
            </p>
            <Link className="text-link" href="/privacy">
              Read about privacy <ArrowRight size={14} />
            </Link>
          </div>
        </section>
        <section className="faq-section" id="questions">
          <div className="section-intro">
            <span className="eyebrow">A FEW GOOD QUESTIONS</span>
            <h2>Before you move in.</h2>
          </div>
          <div>
            {[
              [
                'Does Fairshare move money?',
                'No. Make payments outside the app, then record them. A repayment only reduces your outstanding contribution when the recipient confirms it.',
              ],
              [
                'Can we split expenses between just some housemates?',
                'Yes. Select exactly who benefited. Use equal shares, custom dollar amounts or percentages; everyone else stays out of that expense.',
              ],
              [
                'Is there a limit of five housemates?',
                'No. The membership and rotation model supports larger households. This first release limits a financial view to 10,000 visible expenses and 100,000 shares; larger-scale use needs paginated reporting.',
              ],
              [
                'Will reminders arrive by email?',
                'In-app reminders are implemented. Email is optional and requires the operator to configure a verified sending domain, provider and reliable scheduler.',
              ],
              [
                'Can I try it without an account?',
                'Yes. Open the sample household for a read-only preview with clearly labelled fictional records.',
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={17} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="cta-section">
          <Leaf size={30} />
          <h2>
            A little less “who owes what?”
            <br />A little more feeling at home.
          </h2>
          <Link href="/login?mode=signup" className="button">
            Create your household <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Leaf size={20} />
            </span>
            fairshare<span className="brand-dot">.</span>
          </Link>
          <p>
            A fairer way to share your home. Bring expenses, housemates and everyday life together.
          </p>
        </div>
        <nav aria-label="Product">
          <strong>Your shared home</strong>
          <Link href="/app/expenses?demo=1">Expense splitting</Link>
          <Link href="/app/rent?demo=1">Rent & bills</Link>
          <Link href="/app/vehicles?demo=1">Vehicles & trips</Link>
          <Link href="/app/cleaning?demo=1">Cleaning rotations</Link>
        </nav>
        <nav aria-label="Explore">
          <strong>Explore Fairshare</strong>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#questions">Common questions</a>
          <Link href="/app/overview?demo=1">Try the sample</Link>
        </nav>
        <nav aria-label="Support and policies">
          <strong>Here to help</strong>
          <Link href="/support">Support</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <div className="footer-bottom">
          <small>© {new Date().getFullYear()} Fairshare</small>
          <small>Shared living. Sorted.</small>
        </div>
      </footer>
    </div>
  );
}
function BadgeText({ children }: { children: React.ReactNode }) {
  return <span className="badge positive">{children}</span>;
}
function ArrowDownLeftIcon() {
  return <ArrowUpRight size={27} style={{ transform: 'rotate(180deg)' }} />;
}
