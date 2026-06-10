import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LayoutDashboard, Users, User, LogOut, Flame, DatabaseBackup } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, profile, signOut, isMock } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/groups', label: 'Groups', icon: Users },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="app-wrapper">
      {/* Top Warning Banner for Mock Mode */}
      {isMock && (
        <div className="mb-4 bg-brand-amber/20 border border-brand-amber/40 text-brand-amber rounded-xl px-4 py-2 text-xs flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <DatabaseBackup className="w-4 h-4" />
            <span><strong>Mock Mode Active:</strong> Supabase keys are unconfigured in `.env.local`. Using local storage sandbox.</span>
          </div>
          <span className="hidden sm:inline opacity-75 font-mono text-[10px]">LOCALSTORAGE</span>
        </div>
      )}

      {/* TOPNAV */}
      <nav className="topnav flex items-center justify-between bg-glass-bg border border-glass-border rounded-lg px-6 py-3.5 mb-10 backdrop-blur-lg">
        <div className="logo flex items-center gap-2.5 text-xl font-bold text-primary select-none cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="logo-icon w-8.5 h-8.5 rounded-lg bg-gradient-to-br from-brand-accent to-brand-accent2 flex items-center justify-center text-sm text-white font-black">
            <Flame className="w-4.5 h-4.5 fill-white" />
          </div>
          <span className="tracking-tight">SplitMate</span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden sm:flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-btn flex items-center gap-2 py-2 px-4 rounded-sm text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/70 border border-glass-border text-sky-800 font-semibold shadow-sm'
                    : 'bg-transparent border border-transparent text-secondary hover:bg-white/40 hover:border-glass-border hover:text-sky-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs text-muted">Signed in as</span>
            <span className="text-sm font-semibold text-primary">
              {profile?.display_name || user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="p-2 rounded-sm border border-glass-border text-secondary hover:text-brand-red hover:bg-glass-card transition-all"
            title="Log Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 min-h-[50vh]">
        {children}
      </main>

      {/* Bottom Nav for Mobile Screens */}
      <nav className="sm:hidden fixed bottom-4 left-4 right-4 z-40 bg-glass-card-strong border border-glass-border rounded-xl px-4 py-2.5 backdrop-blur-xl flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-1 text-xs transition-all ${
                isActive ? 'text-brand-accent2 font-semibold' : 'text-secondary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-glass-border/30 pt-8 pb-4 text-center">
        <p className="text-xs text-muted leading-relaxed">
          SplitMate &middot; Built with Supabase + Google Antigravity &middot; Glassmorphic Dark UI
        </p>
      </footer>
    </div>
  );
};
