import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { withRetry } from './errorHandling';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ofbxogymiruqwyuwxway.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mYnhvZ3ltaXJ1cXd5dXd4d2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk1MjU1MDYsImV4cCI6MjA1NTEwMTUwNn0.vS8pOSfBE4NjDXUvR8LH4ei8L2pi1szF7PAQHpQfRds';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    // Set shorter timeout for operations to fail faster
    fetch: (url, options) => {
      return fetch(url, { 
        ...options, 
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
    },
  },
});

// Enhanced Supabase client with retry capabilities
export const enhancedSupabase = {
  from: (table: string) => ({
    select: (columns: string = '*') => ({
      eq: (column: string, value: any) => 
        withRetry(() => supabase.from(table).select(columns).eq(column, value)),
      neq: (column: string, value: any) => 
        withRetry(() => supabase.from(table).select(columns).neq(column, value)),
      is: (column: string, value: any) => 
        withRetry(() => supabase.from(table).select(columns).is(column, value)),
      in: (column: string, values: any[]) => 
        withRetry(() => supabase.from(table).select(columns).in(column, values)),
      order: (column: string, options: { ascending: boolean }) => 
        withRetry(() => supabase.from(table).select(columns).order(column, options)),
      limit: (count: number) => 
        withRetry(() => supabase.from(table).select(columns).limit(count)),
      single: () => 
        withRetry(() => supabase.from(table).select(columns).single()),
    }),
    insert: (data: any) => 
      withRetry(() => supabase.from(table).insert(data)),
    update: (data: any) => ({
      eq: (column: string, value: any) => 
        withRetry(() => supabase.from(table).update(data).eq(column, value)),
    }),
    delete: () => ({
      eq: (column: string, value: any) => 
        withRetry(() => supabase.from(table).delete().eq(column, value)),
    }),
  }),
  auth: {
    signUp: (credentials: { email: string, password: string }) => 
      withRetry(() => supabase.auth.signUp(credentials)),
    signIn: (credentials: { email: string, password: string }) => 
      withRetry(() => supabase.auth.signInWithPassword(credentials)),
    signOut: () => 
      withRetry(() => supabase.auth.signOut()),
    getSession: () => 
      withRetry(() => supabase.auth.getSession()),
  },
};

export type Tables = Database['public']['Tables'];
export type Session = Tables['sessions']['Row'];
export type Player = Tables['players']['Row'];