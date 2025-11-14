/**
 * Mock responses for chips that don't have database tables yet
 * These allow UI orchestration to work while database migrations are pending
 */

export const mockPodResponse = {
  session_id: 'mock-session-123',
  pod_id: 'mock-pod-456',
  members_alerted: 5,
  post_url: 'https://linkedin.com/posts/example',
  message: '✅ Pod coordinated! 5 members alerted for immediate engagement.'
};

export const mockMonitorResponse = {
  job_id: 'mock-job-789',
  post_id: 'post-123',
  monitoring_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  trigger_word: 'interested',
  duration_hours: 24,
  message: '🔍 Comment monitoring started! Watching for "interested" for 24 hours.'
};

export const mockDMResponse = {
  dm_id: 'mock-dm-456',
  recipient_id: 'user-789',
  status: 'sent',
  message: '✉️ DM sent successfully with lead magnet'
};

export const mockWebhookResponse = {
  delivery_id: 'mock-delivery-123',
  status: 'delivered',
  status_code: 200,
  esp_response: '{"success": true}',
  message: '✅ Lead sent to ESP successfully (test@example.com)'
};

export const mockLeadMagnetResponse = {
  magnet_id: 'mock-magnet-789',
  title: '10 LinkedIn Marketing Tips',
  description: 'Essential tips for LinkedIn success',
  type: 'pdf',
  download_url: 'https://example.com/lead-magnets/mock.pdf',
  word_count: 2500,
  message: '✨ Lead magnet "10 LinkedIn Marketing Tips" generated successfully! 📄'
};

export const mockLeadResponse = {
  lead_id: 'mock-lead-123',
  email: 'test@example.com',
  name: 'Test User',
  source: 'linkedin_dm',
  status: 'new',
  message: '✅ Lead created: test@example.com'
};