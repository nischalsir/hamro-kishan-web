// This file has been modified to work with Capacitor mobile apps
// Original auto-generated file updated to use Capacitor Preferences instead of localStorage
import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

/**
 * Custom storage adapter for Capacitor using @capacitor/preferences
 * This replaces localStorage which doesn't work reliably in Capacitor apps
 */
const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error('Error getting item from Capacitor storage:', error);
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('Error setting item in Capacitor storage:', error);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error('Error removing item from Capacitor storage:', error);
    }
  },
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // CRITICAL FIX: Use Capacitor Preferences instead of localStorage
    storage: capacitorStorage,
    
    // Keep session persistent across app restarts
    persistSession: true,
    
    // Automatically refresh expired tokens
    autoRefreshToken: true,
    
    // CRITICAL FOR CAPACITOR: Disable URL-based session detection
    // This prevents issues with deep links and OAuth redirects in mobile apps
    detectSessionInUrl: false,
    
    // Use PKCE flow for better security
    flowType: 'pkce',
  }
});