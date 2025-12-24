import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/supabase.generated';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient<Database> | null = null;

if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
} else {
  console.warn(
    'Supabase n’est pas configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre environnement.',
  );
}

export const supabase = supabaseInstance;
