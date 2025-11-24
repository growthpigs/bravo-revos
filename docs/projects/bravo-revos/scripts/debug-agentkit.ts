
import { MarketingConsole } from '../lib/console/marketing-console';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🚀 Starting AgentKit Debug Script...');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    process.exit(1);
  }

  // 1. Mock Dependencies
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { client_id: 'test-client' } }),
        }),
      }),
    }),
  } as any;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 2. Initialize Console
  console.log('📦 Initializing MarketingConsole...');
  const consoleSystem = new MarketingConsole({
    model: 'gpt-4o',
    baseInstructions: 'You are a helpful marketing assistant.',
    openai: openai,
    supabase: mockSupabase,
  });

  // 3. Simulate User Message
  const messages: any[] = [
    { role: 'user', content: 'Write a short LinkedIn post about AI agents.', name: 'User' }
  ];

  console.log('⚡️ Executing Agent...');
  
  try {
    const result = await consoleSystem.execute(
      'test-user-id',
      'test-session-id',
      messages
    );

    console.log('\n✅ SUCCESS! Response received:');
    console.log('---------------------------------------------------');
    console.log(result.response);
    console.log('---------------------------------------------------');
    
    if (result.response.includes('Error')) {
        console.log('⚠️  Warning: Response contains error text, check logs.');
    }

  } catch (error: any) {
    console.error('\n❌ CRITICAL FAILURE:');
    console.error(error);
    if (error.cause) {
        console.error('Cause:', error.cause);
    }
  }
}

main();
