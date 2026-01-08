// DEPRECATED: Firebase Auth synchronization is no longer needed
// Supabase Auth (OTP) is now the primary authentication method
// This file is kept for reference but is no longer used

// Placeholder exports to avoid breaking imports during transition
export async function syncSupabaseSession(): Promise<void> {
  console.warn('[supabaseSession] syncSupabaseSession is deprecated');
}

export async function clearSupabaseSession(): Promise<void> {
  console.warn('[supabaseSession] clearSupabaseSession is deprecated');
}
