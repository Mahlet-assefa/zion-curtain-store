'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/api';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@zioncurtains.com');
  const [password, setPassword] = useState('zion-demo-password');
  const [role, setRole] = useState<'admin' | 'sales_person'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Sign in failed');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7fbfd] p-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_16px_50px_rgba(38,50,56,.08)] border border-slate-200/80 md:p-10">
        {/* Header Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1976d2] text-white shadow-md">
            <BookOpen size={28} />
          </div>
          <h2 className="mt-3 font-display text-2xl font-black uppercase tracking-tight text-slate-900">
            ZION CURTAINS
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Sign in to access your store portal</p>
        </div>

        {/* Role Toggle Selection: Admin vs Sales Person */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition ${
              role === 'admin'
                ? 'bg-[#1976d2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={14} />
            Admin Sign In
          </button>
          <button
            type="button"
            onClick={() => setRole('sales_person')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black transition ${
              role === 'sales_person'
                ? 'bg-[#1976d2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck size={14} />
            Sales Person Sign In
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSignIn}>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Email Address
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@zioncurtains.com"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Password
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold py-2.5">
            {loading ? 'Signing in...' : `Sign In as ${role === 'admin' ? 'Admin' : 'Sales Person'}`}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-slate-500">
          New to Zion Curtains?{' '}
          <Link href="/sign-up" className="font-extrabold text-[#1976d2] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
