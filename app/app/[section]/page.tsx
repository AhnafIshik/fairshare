import { notFound, redirect } from 'next/navigation';
import { Workspace } from '@/components/workspace';
import { loadSnapshot } from '@/lib/data';
import { demoSnapshot } from '@/lib/demo';
import { configured } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  const search = await searchParams;
  if (
    ![
      'overview',
      'expenses',
      'balances',
      'bills',
      'rent',
      'vehicles',
      'cleaning',
      'notifications',
      'settings',
    ].includes(section)
  )
    notFound();
  const demo = search.demo === '1';
  if (!demo && !configured()) redirect('/login?setup=1');
  const s = demo ? demoSnapshot() : await loadSnapshot();
  return <Workspace s={s} section={section} search={search} />;
}
