import React, { useState } from 'react';
import { Calendar as CalendarIcon, ArrowRight, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (mode === 'signup' && !cleanName) {
      setError('Please enter your name.');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      let user: User;
      if (mode === 'signup') {
        user = await api.registerUser(cleanEmail, password, cleanName);
      } else {
        user = await api.loginUser(cleanEmail, password);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#2d3139] flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 selection:bg-[#cbd5e1] selection:text-[#1e293b]">
      {/* Container Card */}
      <div className="w-full max-w-md bg-[#fdfcf9] border border-[#dedad1] rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(40,44,52,0.06)] p-6 sm:p-10 flex flex-col">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#4a545e] text-[#f7f6f2] flex items-center justify-center shadow-sm mb-4">
            <CalendarIcon className="w-6 h-6" strokeWidth={1.8} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1f242b]">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-xs sm:text-sm text-[#717a84] mt-1.5 max-w-xs">
            {mode === 'signup'
              ? 'Enter your name, email, and password to start your personalized calendar'
              : 'Log in with your email and password to access your schedule'}
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-[#f0eee9] rounded-xl mb-6 border border-[#dedad1]">
          <button
            type="button"
            id="tab-login"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#ffffff] text-[#1f242b] shadow-[0_1px_3px_rgba(40,44,52,0.08)]'
                : 'text-[#717a84] hover:text-[#2d3139]'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            id="tab-signup"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#ffffff] text-[#1f242b] shadow-[0_1px_3px_rgba(40,44,52,0.08)]'
                : 'text-[#717a84] hover:text-[#2d3139]'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            id="auth-error-message"
            className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs leading-relaxed animate-in fade-in duration-150"
          >
            {error}
          </div>
        )}

        {/* Form: Name (Signup only), Email, Password in strict order */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#4a545e] mb-1.5">
                Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c949e]">
                  <UserIcon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name (e.g. Jane Doe)"
                  className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-[#dedad1] bg-[#ffffff] text-[#2d3139] placeholder-[#a0a6af] focus:outline-hidden focus:ring-1 focus:ring-[#4a545e]/40 focus:border-[#4a545e] transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#4a545e] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c949e]">
                <Mail className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <input
                id="auth-email-input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com or any email"
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-[#dedad1] bg-[#ffffff] text-[#2d3139] placeholder-[#a0a6af] focus:outline-hidden focus:ring-1 focus:ring-[#4a545e]/40 focus:border-[#4a545e] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4a545e] mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c949e]">
                <Lock className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <input
                id="auth-password-input"
                type="password"
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-xs sm:text-sm rounded-xl border border-[#dedad1] bg-[#ffffff] text-[#2d3139] placeholder-[#a0a6af] focus:outline-hidden focus:ring-1 focus:ring-[#4a545e]/40 focus:border-[#4a545e] transition-all"
              />
            </div>
          </div>

          <button
            id="auth-submit-button"
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 min-h-[46px] rounded-xl bg-[#2d3139] hover:bg-[#1a1c20] text-[#f7f9fa] text-xs sm:text-sm font-semibold shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-[#3e444d]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account' : 'Log In'}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-6 pt-5 border-t border-[#eeebe4] text-center">
          {mode === 'signup' ? (
            <p className="text-xs text-[#717a84]">
              Already have an account?{' '}
              <button
                type="button"
                id="switch-to-login"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="font-semibold text-[#2d3139] hover:underline cursor-pointer"
              >
                Log in
              </button>
            </p>
          ) : (
            <p className="text-xs text-[#717a84]">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                id="switch-to-signup"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="font-semibold text-[#2d3139] hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
