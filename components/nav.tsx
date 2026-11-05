'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ReceiptText,
  House,
  CarFront,
  Sparkles,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  Plus,
  ArrowUpRight,
  Leaf,
} from 'lucide-react';
import type { Snapshot } from '@/lib/types';
import { switchHousehold, signOut } from '@/app/actions';
const items = [
  ['overview', 'Overview', LayoutDashboard],
  ['expenses', 'Expenses', ArrowLeftRight],
  ['balances', 'Balances', Wallet],
  ['bills', 'Bills', ReceiptText],
  ['rent', 'Rent', House],
  ['vehicles', 'Vehicles & trips', CarFront],
  ['cleaning', 'Cleaning', Sparkles],
  ['notifications', 'Notifications', Bell],
  ['settings', 'Household settings', Settings],
] as const;
export function Sidebar({ s, section }: { s: Snapshot; section: string }) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(max-width:760px)');
    const update = () => setMobile(q.matches);
    update();
    q.addEventListener('change', update);
    return () => q.removeEventListener('change', update);
  }, []);
  const suffix = s.demo ? '?demo=1' : '';
  const unread = s.notifications.filter((n) => !n.read_at).length;
  return (
    <>
      <div className="mobile-top">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Leaf size={18} />
          </span>
          fairshare<span className="brand-dot">.</span>
        </Link>
        <button
          className="icon-button"
          aria-expanded={open}
          aria-label="Toggle navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <aside inert={mobile && !open} className={`sidebar ${open ? 'is-open' : ''}`}>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          fairshare<span className="brand-dot">.</span>
        </Link>
        <form action={switchHousehold} className="house-switch">
          <label>
            <span className="eyebrow">YOUR HOUSEHOLD</span>
            {s.demo ? (
              <strong>{s.household.name}</strong>
            ) : (
              <select
                aria-label="Active household"
                name="household_id"
                defaultValue={s.household.id}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
              >
                {s.households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <span className="small muted">
            {s.members.filter((m) => !m.left_at).length} housemates · AUD
          </span>
        </form>
        <span className="nav-label">YOUR SPACE</span>
        <nav aria-label="Main navigation">
          {items.map(([id, label, Icon]) => (
            <Link
              key={id}
              href={`/app/${id}${suffix}`}
              className={`nav-item ${section === id ? 'active' : ''}`}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'notifications' && unread > 0 && <small className="count">{unread}</small>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/onboarding" className="nav-item">
            <Plus size={17} />
            Add a household
          </Link>
          <div className="home-note">
            <span className="eyebrow">A LITTLE LESS ADMIN</span>
            <p>
              A little more feeling
              <br />
              at home.
            </p>
            <Leaf size={27} />
          </div>
          <div className="profile">
            <span className="avatar">
              {s.members.find((m) => m.user_id === s.userId)?.display_name.charAt(0)}
            </span>
            <div>
              <strong>
                {s.members.find((m) => m.user_id === s.userId)?.display_name.split(' ')[0]}
              </strong>
              <small>
                {s.demo
                  ? 'Sample account'
                  : s.members.find((m) => m.user_id === s.userId)?.role === 'admin'
                    ? 'Household admin'
                    : 'Household member'}
              </small>
            </div>
            {!s.demo && (
              <form action={signOut}>
                <button className="icon-button" aria-label="Sign out">
                  <LogOut size={17} />
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
