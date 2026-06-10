import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent relative z-10 px-4">
        <div className="glass-card p-8 text-center max-w-sm w-full border border-glass-border">
          <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-primary mb-2">Connecting to SplitMate</h2>
          <p className="text-secondary text-sm">Please wait while we sync your secure session...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};
