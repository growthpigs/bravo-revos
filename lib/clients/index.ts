/**
 * Lazy Client Factories
 *
 * These factory functions create clients only at request time,
 * preventing build-time execution and environment variable requirements
 * during Next.js build phase.
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import OpenAI from 'openai';

/**
 * Create Supabase client (anon key)
 * Use for client-side operations with RLS
 */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  return createClient(url, key);
}

/**
 * Create Supabase client (service role)
 * Use for server-side operations bypassing RLS
 */
export function getSupabaseServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create Redis client
 * Use for queue operations (BullMQ)
 */
export function getRedis() {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error('Missing Redis URL (REDIS_URL)');
  }

  return new Redis(url);
}

/**
 * Create OpenAI client
 * Use for AI completions
 */
export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OpenAI API key (OPENAI_API_KEY)');
  }

  return new OpenAI({ apiKey });
}
