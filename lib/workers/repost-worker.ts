import { Worker, Job } from 'bullmq';
import { chromium } from 'playwright';
import Redis from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-loaded to allow dotenv to run first
let _connection: Redis | null = null;
let _supabase: SupabaseClient | null = null;

function getConnection(): Redis {
  if (!_connection) {
    _connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
  }
  return _connection;
}

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

interface RepostJobData {
  member_id: string;
  post_url: string;
  unipile_account_id: string;
  pod_id: string;
}

export class RepostWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('pod-amplification', async (job: Job<RepostJobData>) => this.processRepost(job), { connection: getConnection(), concurrency: 2 });
    this.worker.on('completed', (job) => console.log(`✅ [REPOST_WORKER] Job completed: ${job.id}`));
    this.worker.on('failed', (job, err) => console.error(`❌ [REPOST_WORKER] Job failed: ${job?.id}`, err.message));
    console.log('🤖 [REPOST_WORKER] Started and listening');
  }

  private async processRepost(job: Job<RepostJobData>) {
    const { member_id, post_url, unipile_account_id } = job.data;
    console.log(`[REPOST_WORKER] Processing for member ${member_id}`);

    const supabase = getSupabase();
    const { data: activity } = await supabase.from('pod_activities').insert({
      pod_member_id: member_id, post_url, activity_type: 'repost', status: 'processing'
    }).select().single();

    let browser;
    try {
      const cookies = await this.getUnipileCookies(unipile_account_id);
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' });
      await context.addCookies(cookies);
      const page = await context.newPage();

      await page.goto(post_url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const repostButton = await page.$('button[aria-label*="Repost"]') || await page.$('button[aria-label*="repost"]');
      if (!repostButton) throw new Error('Could not find repost button');
      await repostButton.click();
      await page.waitForTimeout(1500);

      const confirmButton = await page.$('button:has-text("Repost")');
      if (confirmButton) await confirmButton.click();
      await page.waitForTimeout(3000);
      await browser.close();

      if (activity) await supabase.from('pod_activities').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', activity.id);
      console.log(`✅ [REPOST_WORKER] Success for member ${member_id}`);
      return { success: true };
    } catch (error: any) {
      if (browser) await browser.close();
      if (activity) await supabase.from('pod_activities').update({ status: 'failed', error_message: error.message }).eq('id', activity.id);
      throw error;
    }
  }

  private async getUnipileCookies(unipileAccountId: string): Promise<any[]> {
    const apiUrl = process.env.UNIPILE_DSN || 'https://api3.unipile.com:13344';
    const apiKey = process.env.UNIPILE_API_KEY;
    if (!apiKey) throw new Error('UNIPILE_API_KEY not configured');

    const response = await fetch(`${apiUrl}/api/v1/accounts/${unipileAccountId}`, { headers: { 'X-API-KEY': apiKey } });
    if (!response.ok) throw new Error(`Unipile API error: ${response.status}`);
    const data = await response.json();

    if (data.cookies) return data.cookies.map((c: any) => ({ name: c.name, value: c.value, domain: '.linkedin.com', path: '/', secure: true, httpOnly: c.httpOnly || false }));
    return [{ name: 'li_at', value: data.session_token || data.li_at, domain: '.linkedin.com', path: '/', secure: true, httpOnly: true }];
  }

  stop() { this.worker.close(); }
}
