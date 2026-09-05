'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/api';

export default function SignUp() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'sales_person'>('sales_person');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
          role
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Account creation failed');
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
            CREATE ACCOUNT
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Join Zion Curtains Store Management</p>
        </div>

        {/* Role Options */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200">
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
            Admin Account
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
            Sales Person
          </button>
        </div>

        <form className="space-y-3.5" onSubmit={handleSignUp}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
                placeholder="John"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
                placeholder="Doe"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
              placeholder="you@zioncurtains.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-slate-900 focus:border-[#1976d2] focus:outline-none"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white font-extrabold py-2.5 mt-2">
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs font-bold text-slate-500">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-extrabold text-[#1976d2] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
