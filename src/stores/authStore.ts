import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  display_name: string;
  user_code: string;
  created_at: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isMock: boolean;
  initialize: () => Promise<void>;
  signUp: (email: string, display_name: string, password: string) => Promise<Profile | null>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (display_name: string) => Promise<boolean>;
  clearError: () => void;
}

const generateMockUserCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SM-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Retrieve mock data from localStorage if needed
const getMockData = () => {
  const user = localStorage.getItem('sm_mock_user');
  const profile = localStorage.getItem('sm_mock_profile');
  return {
    user: user ? JSON.parse(user) : null,
    profile: profile ? JSON.parse(profile) : null,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
  isMock: !isSupabaseConfigured,

  initialize: async () => {
    set({ loading: true, error: null });

    if (!isSupabaseConfigured) {
      // Load mock session from local storage
      const mock = getMockData();
      set({
        user: mock.user,
        profile: mock.profile,
        session: mock.user ? ({ user: mock.user } as Session) : null,
        isMock: true,
        loading: false,
      });
      return;
    }

    try {
      // 1. Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (session?.user) {
        // 2. Get profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        set({
          session,
          user: session.user,
          profile: profileData || null,
          isMock: false,
        });
      } else {
        set({ session: null, user: null, profile: null, isMock: false });
      }

      // 3. Listen to auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          set({
            session,
            user: session.user,
            profile: profileData || null,
          });
        } else {
          set({ session: null, user: null, profile: null });
        }
      });
    } catch (err: any) {
      console.error('Auth initialization error, falling back to mock:', err);
      // Fallback to mock on connection errors
      const mock = getMockData();
      set({
        user: mock.user,
        profile: mock.profile,
        session: mock.user ? ({ user: mock.user } as Session) : null,
        isMock: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, display_name, password) => {
    set({ loading: true, error: null });

    if (get().isMock) {
      // Handle mock registration
      const mockId = crypto.randomUUID();
      const mockCode = generateMockUserCode();
      const mockUser = { id: mockId, email } as User;
      const mockProfile: Profile = {
        id: mockId,
        display_name,
        user_code: mockCode,
        created_at: new Date().toISOString(),
        email,
      };

      // Save to mock storage
      localStorage.setItem('sm_mock_user', JSON.stringify(mockUser));
      localStorage.setItem('sm_mock_profile', JSON.stringify(mockProfile));

      // Mock database of all profiles
      const allProfiles = JSON.parse(localStorage.getItem('sm_mock_all_profiles') || '[]');
      allProfiles.push(mockProfile);
      localStorage.setItem('sm_mock_all_profiles', JSON.stringify(allProfiles));

      set({
        user: mockUser,
        profile: mockProfile,
        session: { user: mockUser } as Session,
        loading: false,
      });
      return mockProfile;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed');

      // Query profiles until trigger creates it (poll up to 5 times)
      let profile: Profile | null = null;
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        if (pData) {
          profile = pData;
          break;
        }
      }

      set({ user: data.user, session: data.session, profile });
      return profile;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });

    if (get().isMock) {
      // Mock login check
      const allProfiles = JSON.parse(localStorage.getItem('sm_mock_all_profiles') || '[]');
      const found = allProfiles.find((p: Profile) => p.email === email);

      if (found) {
        const mockUser = { id: found.id, email } as User;
        localStorage.setItem('sm_mock_user', JSON.stringify(mockUser));
        localStorage.setItem('sm_mock_profile', JSON.stringify(found));

        set({
          user: mockUser,
          profile: found,
          session: { user: mockUser } as Session,
          loading: false,
        });
        return true;
      } else {
        // Auto-create user for frictionless mock testing if not found!
        const mockId = crypto.randomUUID();
        const mockCode = generateMockUserCode();
        const mockUser = { id: mockId, email } as User;
        const mockProfile: Profile = {
          id: mockId,
          display_name: email.split('@')[0],
          user_code: mockCode,
          created_at: new Date().toISOString(),
          email,
        };

        localStorage.setItem('sm_mock_user', JSON.stringify(mockUser));
        localStorage.setItem('sm_mock_profile', JSON.stringify(mockProfile));

        allProfiles.push(mockProfile);
        localStorage.setItem('sm_mock_all_profiles', JSON.stringify(allProfiles));

        set({
          user: mockUser,
          profile: mockProfile,
          session: { user: mockUser } as Session,
          loading: false,
        });
        return true;
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      set({ user: data.user, session: data.session, profile });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    if (get().isMock) {
      localStorage.removeItem('sm_mock_user');
      localStorage.removeItem('sm_mock_profile');
      set({ user: null, session: null, profile: null, loading: false });
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    } finally {
      set({ user: null, session: null, profile: null, loading: false });
    }
  },

  resetPassword: async (email) => {
    set({ loading: true, error: null });
    if (get().isMock) {
      alert(`[Mock Mode] Password reset email simulated to: ${email}`);
      set({ loading: false });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (display_name) => {
    const { user, profile, isMock } = get();
    if (!user || !profile) return false;

    set({ loading: true, error: null });

    if (isMock) {
      const updatedProfile = { ...profile, display_name };
      localStorage.setItem('sm_mock_profile', JSON.stringify(updatedProfile));

      // Update in profiles db
      const allProfiles = JSON.parse(localStorage.getItem('sm_mock_all_profiles') || '[]');
      const idx = allProfiles.findIndex((p: Profile) => p.id === profile.id);
      if (idx !== -1) {
        allProfiles[idx] = updatedProfile;
        localStorage.setItem('sm_mock_all_profiles', JSON.stringify(allProfiles));
      }

      set({ profile: updatedProfile, loading: false });
      return true;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name })
        .eq('id', user.id);

      if (error) throw error;

      set({ profile: { ...profile, display_name }, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
