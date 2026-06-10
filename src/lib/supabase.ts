import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your_supabase_') || 
  supabaseAnonKey.includes('your_supabase_');

if (isPlaceholder) {
  console.warn(
    'Supabase credentials are missing or default placeholders. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

// Export a flag to know if we are in config warning mode
export const isSupabaseConfigured = !isPlaceholder;

export const supabase = createClient(
  isPlaceholder ? 'https://placeholder-project.supabase.co' : supabaseUrl,
  isPlaceholder ? 'placeholder-anon-key' : supabaseAnonKey
);
