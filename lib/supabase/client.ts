import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
const isSupabaseConfigured = SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('your-project') &&
    !SUPABASE_ANON_KEY.includes('your-anon-key')

export function createClient() {
    if (!isSupabaseConfigured) {
        // Return a mock client when Supabase is not configured
        // This allows the app to run without auth
        return {
            auth: {
                getSession: async () => ({ data: { session: null }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                signUp: async () => ({ data: null, error: { message: 'Auth not configured' } }),
                signInWithPassword: async () => ({ data: null, error: { message: 'Auth not configured' } }),
                signInWithOAuth: async () => ({ error: { message: 'Auth not configured' } }),
                signOut: async () => ({ error: null }),
            }
        } as any
    }

    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export { isSupabaseConfigured }
