import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Fairshare — Shared living. Sorted.', template: '%s · Fairshare' },
  description:
    'Manage household expenses, split bills, track car costs and keep cleaning responsibilities fair.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
