'use client';

import { useState } from 'react';
import {
  BookOpen,
  Calculator,
  ChevronRight,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  WalletCards,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  ['overview', 'Overview', LayoutDashboard],
  ['curtains', 'Curtains', BookOpen],
  ['finance', 'Finances', Calculator],
  ['debits', 'Debit tracker', WalletCards],
  ['settings', 'Profile & settings', Settings]
] as const;

export function DashboardShell({
  children,
  onNavigate
}: {
  children: React.ReactNode;
  onNavigate?: (view: string) => void;
}) {
  const [active, setActive] = useState('overview');
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7fbfd]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-[250px] border-r border-[#dbe6ec] bg-white px-5 py-6 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <div className="font-display text-xl font-black tracking-tight text-slate-900 uppercase">zion</div>
              <div className="text-xs font-extrabold text-[#1976d2] tracking-wider uppercase">curtain</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X size={19} />
          </button>
        </div>

        <div className="mt-12">
          <p className="eyebrow mb-3 px-3">Workspace</p>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setActive(id);
                onNavigate?.(id);
                setOpen(false);
              }}
              className={cn(
                'mb-1 flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold transition',
                active === id ? 'bg-[#e3f2fd] text-[#1976d2]' : 'text-[#607d8b] hover:bg-[#f7fbfd]'
              )}
            >
              <Icon size={18} />
              {label}
              {active === id && <ChevronRight className="ml-auto" size={16} />}
            </button>
          ))}
        </div>

        <div className="absolute bottom-6 left-5 right-5 border-t border-[#dbe6ec] pt-5">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/sign-in';
            }}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-semibold text-[#607d8b] hover:text-red-600 transition"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="lg:pl-[250px]">
        <header className="flex h-[76px] items-center justify-between border-b border-[#dbe6ec] bg-white/90 px-5 backdrop-blur md:px-10">
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold">Zion Owner</div>
              <div className="text-xs text-[#607d8b]">Administrator</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#90caf9]/40 text-[#1976d2]">
              <CircleUserRound size={20} />
            </div>
          </div>
        </header>

        <div className="p-5 md:p-10">{children}</div>
      </main>
    </div>
  );
}
