import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { UserIdBadge } from '../components/UserIdBadge';
import { Flame, Sparkles } from 'lucide-react';
import { z } from 'zod';

const signupSchema = z.object({
  displayName: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { email?: string; password?: string }) || {};

  const { signUp, loading, error, clearError, user } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(prefill.email || '');
  const [password, setPassword] = useState(prefill.password || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [createdProfile, setCreatedProfile] = useState<{ user_code: string } | null>(null);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    // If user is already logged in and we didn't just sign up, go to dashboard
    if (user && !createdProfile) {
      navigate('/dashboard');
    }
  }, [user, navigate, createdProfile]);

  useEffect(() => {
    let timer: any;
    if (createdProfile && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (createdProfile && countdown === 0) {
      navigate('/dashboard');
    }
    return () => clearTimeout(timer);
  }, [createdProfile, countdown, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    clearError();

    const result = signupSchema.safeParse({
      displayName,
      email,
      password,
      confirmPassword,
    });

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

    const profile = await signUp(email, displayName, password);
    if (profile) {
      setCreatedProfile(profile);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 px-4 py-12">
      <div className="auth-card max-w-md w-full glass-card border border-glass-border p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow Element */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-brand-accent/25 rounded-full blur-2xl pointer-events-none"></div>

        {createdProfile ? (
          <div className="text-center animate-fade-in py-4">
            <div className="w-16 h-16 bg-brand-green/20 border border-brand-green/30 text-brand-green rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
              🎉
            </div>
            <h2 className="text-2xl font-bold text-primary mb-3">Welcome to SplitMate!</h2>
            <p className="text-secondary text-sm mb-6">
              Your account has been created successfully. Here is your unique Split ID:
            </p>

            <div className="mb-6">
              <UserIdBadge code={createdProfile.user_code} size="lg" />
            </div>

            <p className="text-muted text-xs leading-relaxed max-w-xs mx-auto mb-8">
              Share this ID with friends so they can add you to expense groups. No phone numbers or emails required!
            </p>

            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full py-3 rounded-lg text-sm transition-all"
            >
              Go to Dashboard ({countdown}s)
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-accent2 flex items-center justify-center text-white">
                <Flame className="w-4.5 h-4.5 fill-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-primary">SplitMate</span>
            </div>

            <h1 className="text-2xl font-bold text-primary mb-1">Create account</h1>
            <p className="text-secondary text-sm mb-6 flex items-center gap-1.5">
              Join SplitMate and start splitting bills <Sparkles className="w-4 h-4 text-brand-accent2" />
            </p>

            {error && (
              <div className="bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form flex flex-col gap-4">
              <div className="auth-field">
                <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  placeholder="Arjun Mehta"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="auth-input w-full glass-input px-4 py-3 text-sm"
                  required
                />
                {formErrors.displayName && (
                  <span className="text-[11px] text-brand-red mt-1 block">{formErrors.displayName}</span>
                )}
              </div>

              <div className="auth-field">
                <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  placeholder="arjun@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input w-full glass-input px-4 py-3 text-sm"
                  required
                />
                {formErrors.email && (
                  <span className="text-[11px] text-brand-red mt-1 block">{formErrors.email}</span>
                )}
              </div>

              <div className="auth-field">
                <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wide">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input w-full glass-input px-4 py-3 text-sm"
                  required
                />
                {formErrors.password && (
                  <span className="text-[11px] text-brand-red mt-1 block">{formErrors.password}</span>
                )}
              </div>

              <div className="auth-field">
                <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wide">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input w-full glass-input px-4 py-3 text-sm"
                  required
                />
                {formErrors.confirmPassword && (
                  <span className="text-[11px] text-brand-red mt-1 block">{formErrors.confirmPassword}</span>
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
                  'Create my account →'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-muted">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-brand-accent2 hover:underline font-semibold">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
