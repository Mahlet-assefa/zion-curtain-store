'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { Overview, Finance, Debits, SettingsView } from '@/components/dashboard-view';
import { CurtainsInventory } from '@/components/curtains-inventory';

export default function Home() {
  const [view, setView] = useState('overview');

  return (
    <DashboardShell onNavigate={setView}>
      <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
        {['overview', 'curtains', 'finance', 'debits', 'settings'].map(item => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`whitespace-nowrap px-3 py-2 text-xs font-bold uppercase transition ${
              view === item ? 'bg-[#1976d2] text-white' : 'bg-white text-slate-600'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {view === 'overview' && <Overview onNavigate={setView} />}
      {view === 'curtains' && <CurtainsInventory />}
      {view === 'finance' && <Finance />}
      {view === 'debits' && <Debits />}
      {view === 'settings' && <SettingsView />}
    </DashboardShell>
  );
}
