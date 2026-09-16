import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      try {
        return Promise.resolve(globalThis.localStorage?.getItem(key) ?? null);
      } catch {
        return Promise.resolve(null);
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // ignore
      }
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // ignore
      }
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnon) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnon, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function authConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnon);
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  return sb.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured.');
  return sb.auth.signUp({ email, password });
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}
