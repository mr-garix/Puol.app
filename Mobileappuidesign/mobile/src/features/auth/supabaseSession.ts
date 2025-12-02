import { supabase } from '@/src/supabaseClient';
import type { User } from 'firebase/auth';

/**
 * Synchronise la session Supabase avec l'utilisateur Firebase.
 * À appeler après chaque login/refresh Firebase.
 */
export async function syncSupabaseSession(firebaseUser: User): Promise<void> {
  try {
    const idToken = await firebaseUser.getIdToken(true);
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'firebase',
      token: idToken,
    });

    if (error) {
      console.warn('[supabaseSession] signInWithIdToken error:', error);
      // On ne lève pas d’erreur pour ne pas bloquer le reste de l’app
      return;
    }

    if (!data.session) {
      console.warn('[supabaseSession] signInWithIdToken returned no session for user', firebaseUser.uid);
      return;
    }

    console.log('[supabaseSession] session synced for user', firebaseUser.uid);
  } catch (e) {
    console.warn('[supabaseSession] sync failed', e);
  }
}

/**
 * Termine la session Supabase (à appeler lors du logout).
 */
export async function clearSupabaseSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
    console.log('[supabaseSession] session cleared');
  } catch (e) {
    console.warn('[supabaseSession] clear failed', e);
  }
}
