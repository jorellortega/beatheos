import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isBrowser = typeof window !== 'undefined';

const options: any = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'beatheos-auth-token',
  }
};

if (isBrowser) {
  options.auth.storage = {
    getItem: (key: string) => {
      try {
        const value = localStorage.getItem(key);
        console.debug(`[Supabase Storage] getItem: key=${key}, value=${value}`);
        return value;
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
        console.debug(`[Supabase Storage] setItem: key=${key}, value=${value}`);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
        console.debug(`[Supabase Storage] removeItem: key=${key}`);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    }
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options); 