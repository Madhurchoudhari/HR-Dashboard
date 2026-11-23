import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Eye, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@recruitment.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to authenticate. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-8 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/30">
            HR
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            TalentMetrics AI
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            HR Recruitment Analytics & Pipeline Operations Dashboard
          </p>
        </div>

        {/* Quick Demo Login Preset Buttons */}
        <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3.5 space-y-2">
          <p className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-center">
            ⚡ Quick Demo Logins (1-Click)
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => quickLogin('admin@recruitment.com')}
              className="flex flex-col items-center py-2 px-1 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 transition-all text-xs font-semibold shadow-xs hover:scale-[1.02]"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600 mb-1" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('sarah.recruiter@recruitment.com')}
              className="flex flex-col items-center py-2 px-1 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-emerald-500 transition-all text-xs font-semibold shadow-xs hover:scale-[1.02]"
            >
              <UserCheck className="w-4 h-4 text-emerald-600 mb-1" />
              <span>Recruiter</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('manager.viewer@recruitment.com')}
              className="flex flex-col items-center py-2 px-1 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-slate-500 transition-all text-xs font-semibold shadow-xs hover:scale-[1.02]"
            >
              <Eye className="w-4 h-4 text-slate-500 mb-1" />
              <span>Viewer</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 p-3 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm transition-all duration-150 disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[11px] text-gray-400">
            Default Password for all seed accounts: <span className="font-mono text-gray-600 dark:text-gray-300">password</span>
          </p>
        </div>
      </div>
    </div>
  );
};
