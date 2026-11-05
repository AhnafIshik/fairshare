'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="loading-screen">
      <h1>Your household couldn’t be loaded.</h1>
      <p>
        No partial balances are shown. Check your connection, Supabase migration and schedule
        configuration, then try again.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <Link href="/">Back home</Link>
    </main>
  );
}
