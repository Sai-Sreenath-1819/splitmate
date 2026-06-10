import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Flame, Sparkles } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, resetPassword, loading, error, clearError, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    clearError();

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (path) {
          errors[path as string] = issue.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    const success = await signIn(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async () => {
    setResetSent(false);
    setResetError(null);
    clearError();

    if (!email) {
      setFormErrors({ email: 'Please enter your email first to reset password' });
      return;
    }

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message || 'Failed to send password reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 px-4 py-12">
      <div className="auth-card max-w-md w-full glass-card border border-glass-border p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow Element */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-brand-accent/25 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-accent2 flex items-center justify-center text-white">
              <Flame className="w-4.5 h-4.5 fill-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-primary">SplitMate</span>
          </div>

          <h1 className="text-2xl font-bold text-primary mb-1">Welcome back</h1>
          <p className="text-secondary text-sm mb-6 flex items-center gap-1.5">
            Log in to manage your shared expenses <Sparkles className="w-4 h-4 text-brand-accent2" />
          </p>

          {error && (
            <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs rounded-lg p-3 mb-4">
              Password reset link sent to your email. Check your inbox!
            </div>
          )}

          {resetError && (
            <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs rounded-lg p-3 mb-4">
              {resetError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form flex flex-col gap-4">
            <div className="auth-field">
              <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                placeholder="arjun@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormErrors({});
                }}
                className="auth-input w-full glass-input px-4 py-3 text-sm"
                required
              />
              {formErrors.email && (
                <span className="text-[11px] text-brand-red mt-1 block">{formErrors.email}</span>
              )}
            </div>

            <div className="auth-field">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wide">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-brand-accent2 hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormErrors({});
                }}
                className="auth-input w-full glass-input px-4 py-3 text-sm"
                required
              />
              {formErrors.password && (
                <span className="text-[11px] text-brand-red mt-1 block">{formErrors.password}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-lg text-sm mt-2 flex items-center justify-center font-bold"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            Don't have an account?{' '}
            <Link 
              to="/auth/signup" 
              state={{ email, password }} 
              className="text-brand-accent2 hover:underline font-semibold"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
