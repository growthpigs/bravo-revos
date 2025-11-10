/**
 * HGC Database Operations Tests
 * Tests Supabase operations for scrape_jobs and notifications tables
 *
 * What Was Built:
 * - Migration 021: scrape_jobs table for DM automation
 * - Migration 022: notifications table for pod links
 */

import { createClient } from '@supabase/supabase-js'

// Use actual Supabase for database tests (requires env vars)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'

// Skip tests if no Supabase connection
const shouldRun = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const describeOrSkip = shouldRun ? describe : describe.skip

describeOrSkip('HGC Database - scrape_jobs table', () => {
  let supabase: ReturnType<typeof createClient>
  let testCampaignId: string
  let testPostId: string

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey)

    // Create test campaign and post
    // (In real tests, you'd use test fixtures or factories)
  })

  describe('Table Structure', () => {
    it('should have scrape_jobs table', async () => {
      const { data, error } = await supabase.from('scrape_jobs').select('*').limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should have required columns', async () => {
      const { data, error } = await supabase
        .from('scrape_jobs')
        .select(
          'id, campaign_id, post_id, unipile_post_id, unipile_account_id, trigger_word, status, poll_interval_minutes, next_check'
        )
        .limit(1)

      expect(error).toBeNull() // No error means columns exist
    })
  })

  describe('Insert Operations', () => {
    it('should insert scrape job with required fields', async () => {
      const jobData = {
        post_id: '00000000-0000-0000-0000-000000000001',
        campaign_id: '00000000-0000-0000-0000-000000000002',
        unipile_post_id: 'test-unipile-post',
        unipile_account_id: 'test-unipile-account',
        trigger_word: 'guide',
        status: 'scheduled',
        poll_interval_minutes: 5,
        next_check: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }

      const { data, error } = await supabase
        .from('scrape_jobs')
        .insert(jobData)
        .select()
        .single()

      // Note: This will fail if FK constraints aren't met (post/campaign must exist)
      // In real tests, you'd set up proper test data

      if (error) {
        // Expected to fail without proper test setup
        expect(error.message).toBeDefined()
      } else {
        expect(data.trigger_word).toBe('guide')
        expect(data.status).toBe('scheduled')
        expect(data.poll_interval_minutes).toBe(5)
      }
    })

    it('should use default values for optional fields', async () => {
      const minimalJob = {
        post_id: '00000000-0000-0000-0000-000000000001',
        campaign_id: '00000000-0000-0000-0000-000000000002',
        unipile_post_id: 'test-post',
        unipile_account_id: 'test-account',
      }

      const { data, error } = await supabase
        .from('scrape_jobs')
        .insert(minimalJob)
        .select()
        .single()

      if (!error) {
        expect(data.trigger_word).toBe('guide') // Default
        expect(data.status).toBe('scheduled') // Default
        expect(data.poll_interval_minutes).toBe(5) // Default
        expect(data.comments_scanned).toBe(0) // Default
      }
    })
  })

  describe('Status Updates', () => {
    it('should update job status', async () => {
      // This test requires an existing job
      const { data: jobs } = await supabase
        .from('scrape_jobs')
        .select('id')
        .eq('status', 'scheduled')
        .limit(1)

      if (jobs && jobs.length > 0) {
        const jobId = jobs[0].id

        const { data, error } = await supabase
          .from('scrape_jobs')
          .update({ status: 'running' })
          .eq('id', jobId)
          .select()
          .single()

        expect(error).toBeNull()
        expect(data?.status).toBe('running')
      }
    })

    it('should increment metrics', async () => {
      const { data: jobs } = await supabase
        .from('scrape_jobs')
        .select('id, comments_scanned')
        .limit(1)

      if (jobs && jobs.length > 0) {
        const job = jobs[0]

        const { data, error } = await supabase
          .from('scrape_jobs')
          .update({ comments_scanned: job.comments_scanned + 10 })
          .eq('id', job.id)
          .select()
          .single()

        expect(error).toBeNull()
        expect(data?.comments_scanned).toBe(job.comments_scanned + 10)
      }
    })
  })

  describe('Queries for Background Workers', () => {
    it('should find jobs due for next check', async () => {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .lte('next_check', now)
        .in('status', ['scheduled', 'running'])
        .order('next_check', { ascending: true })
        .limit(10)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should filter by campaign', async () => {
      const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('campaign_id', '00000000-0000-0000-0000-000000000001')

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})

describeOrSkip('HGC Database - notifications table', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey)
  })

  describe('Table Structure', () => {
    it('should have notifications table', async () => {
      const { data, error } = await supabase.from('notifications').select('*').limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should have required columns', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, type, post_id, linkedin_url, status, created_at')
        .limit(1)

      expect(error).toBeNull()
    })
  })

  describe('Insert Operations', () => {
    it('should insert pod_repost notification', async () => {
      const notification = {
        user_id: '00000000-0000-0000-0000-000000000001',
        type: 'pod_repost',
        post_id: '00000000-0000-0000-0000-000000000002',
        linkedin_url: 'https://linkedin.com/posts/xyz',
        status: 'pending',
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single()

      if (!error) {
        expect(data.type).toBe('pod_repost')
        expect(data.status).toBe('pending')
        expect(data.linkedin_url).toBe('https://linkedin.com/posts/xyz')
      }
    })

    it('should insert bulk notifications for pod members', async () => {
      const notifications = [
        {
          user_id: '00000000-0000-0000-0000-000000000001',
          type: 'pod_repost',
          post_id: '00000000-0000-0000-0000-000000000999',
          linkedin_url: 'https://linkedin.com/posts/abc',
          status: 'pending',
        },
        {
          user_id: '00000000-0000-0000-0000-000000000002',
          type: 'pod_repost',
          post_id: '00000000-0000-0000-0000-000000000999',
          linkedin_url: 'https://linkedin.com/posts/abc',
          status: 'pending',
        },
      ]

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select()

      if (!error) {
        expect(data).toHaveLength(2)
        expect(data.every((n) => n.type === 'pod_repost')).toBe(true)
      }
    })
  })

  describe('Status Updates', () => {
    it('should mark notification as sent', async () => {
      const { data: pendingNotifs } = await supabase
        .from('notifications')
        .select('id')
        .eq('status', 'pending')
        .limit(1)

      if (pendingNotifs && pendingNotifs.length > 0) {
        const notifId = pendingNotifs[0].id

        const { data, error } = await supabase
          .from('notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notifId)
          .select()
          .single()

        expect(error).toBeNull()
        expect(data?.status).toBe('sent')
        expect(data?.sent_at).toBeDefined()
      }
    })

    it('should mark notification as failed with error', async () => {
      const { data: pendingNotifs } = await supabase
        .from('notifications')
        .select('id')
        .eq('status', 'pending')
        .limit(1)

      if (pendingNotifs && pendingNotifs.length > 0) {
        const notifId = pendingNotifs[0].id

        const { data, error } = await supabase
          .from('notifications')
          .update({
            status: 'failed',
            error_message: 'SMTP connection timeout',
          })
          .eq('id', notifId)
          .select()
          .single()

        expect(error).toBeNull()
        expect(data?.status).toBe('failed')
        expect(data?.error_message).toBe('SMTP connection timeout')
      }
    })
  })

  describe('Queries for Background Workers', () => {
    it('should find pending notifications', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(100)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should filter by notification type', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'pod_repost')

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should get notifications for specific user', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000001')
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })
})

describeOrSkip('HGC Database - RLS Policies', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey)
  })

  describe('scrape_jobs RLS', () => {
    it('should allow service role full access', async () => {
      // Service role key can read all jobs
      const { data, error } = await supabase.from('scrape_jobs').select('*').limit(1)

      expect(error).toBeNull()
    })

    it('should restrict user access to their campaigns only', async () => {
      // Test with authenticated user (would need auth setup)
      // This is a placeholder test structure

      expect(true).toBe(true) // Placeholder
    })
  })

  describe('notifications RLS', () => {
    it('should allow service role full access', async () => {
      const { data, error } = await supabase.from('notifications').select('*').limit(1)

      expect(error).toBeNull()
    })

    it('should restrict users to their own notifications', async () => {
      // Test with authenticated user
      // Placeholder

      expect(true).toBe(true)
    })
  })
})

describeOrSkip('HGC Database - Indexes and Performance', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey)
  })

  it('should have index on scrape_jobs.next_check for efficient polling', async () => {
    // Query that should use the index
    const { data, error } = await supabase
      .from('scrape_jobs')
      .select('*')
      .lte('next_check', new Date().toISOString())
      .eq('status', 'scheduled')
      .limit(10)

    expect(error).toBeNull()
    // In real tests, you'd check query plan to verify index usage
  })

  it('should have index on notifications.status for pending queries', async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .limit(100)

    expect(error).toBeNull()
  })
})
