import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('admin@stratum.dev');
  const [password, setPassword] = useState('admin123456');
  const [name, setName] = useState('Cloud Architect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('admin@stratum.dev');
    setPassword('admin123456');
    setLoading(true);
    try {
      await login('admin@stratum.dev', 'admin123456');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stratum-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyanGlow/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-500 p-0.5 shadow-xl shadow-cyan-500/20 mb-2">
            <div className="w-full h-full bg-stratum-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Stratum Cloud Platform
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {isRegister ? 'Provision your developer account' : 'Developer Console Sign-In'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-stratum-900 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isRegister && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Developer Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stratum.dev"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-slate-100 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-slate-100 focus:outline-none focus:border-cyan-400 font-mono text-xs"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={loading}
              className="w-full justify-center mt-2"
              icon={ArrowRight}
            >
              {isRegister ? 'Create Account' : 'Authenticate Console'}
            </Button>
          </form>

          {/* Quick Demo Button */}
          <div className="pt-4 mt-4 border-t border-white/5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2 text-cyan-300 border-cyan-400/20 hover:bg-cyan-500/10"
              onClick={handleDemoLogin}
              loading={loading}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>One-Click Admin Demo Login</span>
            </Button>
          </div>

          <div className="text-center mt-4 text-[11px] text-slate-500">
            {isRegister ? 'Already have an account? ' : "Don't have an account yet? "}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-cyan-400 hover:underline font-semibold"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

