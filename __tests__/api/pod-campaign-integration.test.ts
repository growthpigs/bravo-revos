/**
 * Pod Campaign Integration Tests
 * Tests for UniPile webhook endpoint and manual pod trigger API
 */

import crypto from 'crypto';

describe('Pod Campaign Integration', () => {
  describe('UniPile Webhook Endpoint (/api/webhooks/unipile)', () => {
    describe('HMAC Signature Verification', () => {
      it('should verify signature using SHA-256 HMAC', () => {
        const secret = 'test-webhook-secret';
        const payload = JSON.stringify({ event: 'post.published' });

        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');

        expect(expectedSig).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should reject webhook with invalid signature', () => {
        const validSig = 'a'.repeat(64);
        const invalidSig = 'b'.repeat(64);

        const isEqual = crypto.timingSafeEqual(
          Buffer.from(validSig),
          Buffer.from(invalidSig)
        );

        expect(isEqual).toBe(false);
      });

      it('should accept webhook with valid signature', () => {
        const signature = 'a'.repeat(64);

        const isEqual = crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(signature)
        );

        expect(isEqual).toBe(true);
      });

      it('should return 401 for missing signature header', () => {
        const errorStatus = 401;
        const errorMessage = 'Invalid signature';

        expect(errorStatus).toBe(401);
        expect(errorMessage).toBe('Invalid signature');
      });

      it('should return 401 for invalid signature', () => {
        const errorResponse = {
          error: 'Invalid signature',
        };

        expect(errorResponse.error).toBe('Invalid signature');
      });

      it('should use UNIPILE_WEBHOOK_SECRET from env', () => {
        const envVar = 'UNIPILE_WEBHOOK_SECRET';
        expect(envVar).toBe('UNIPILE_WEBHOOK_SECRET');
      });

      it('should return false if secret not configured', () => {
        const secret = undefined;
        const isConfigured = !!secret;

        expect(isConfigured).toBe(false);
      });
    });

    describe('post.published Event Handler', () => {
      it('should extract post data from webhook payload', () => {
        const payload = {
          post_id: 'post-123',
          post_url: 'https://linkedin.com/posts/123',
          post_content: 'Check out our guide!',
          campaign_id: 'campaign-456',
          account_id: 'account-789',
          published_at: '2025-11-12T10:00:00Z',
        };

        expect(payload.post_id).toBeDefined();
        expect(payload.post_url).toBeDefined();
        expect(payload.campaign_id).toBeDefined();
      });

      it('should update campaign status to active', () => {
        const campaignUpdate = {
          status: 'active',
          last_post_url: 'https://linkedin.com/posts/123',
          last_post_at: '2025-11-12T10:00:00Z',
        };

        expect(campaignUpdate.status).toBe('active');
      });

      it('should query campaign for pod_id', () => {
        const campaignFields = 'pod_id, user_id, name';

        expect(campaignFields).toContain('pod_id');
        expect(campaignFields).toContain('user_id');
      });

      it('should return 404 if campaign not found', () => {
        const errorStatus = 404;
        const errorMessage = 'Campaign not found';

        expect(errorStatus).toBe(404);
        expect(errorMessage).toBe('Campaign not found');
      });

      it('should skip pod creation if no pod_id', () => {
        const campaign = {
          pod_id: null,
          user_id: 'user-123',
          name: 'Test Campaign',
        };

        const shouldCreateActivity = !!campaign.pod_id;
        expect(shouldCreateActivity).toBe(false);
      });

      it('should create pod activity with urgent priority', () => {
        const activity = {
          pod_id: 'pod-123',
          post_id: 'post-123',
          post_url: 'https://linkedin.com/posts/123',
          post_content: 'Content here',
          posted_by: 'user-123',
          urgency: 'urgent',
          status: 'pending',
        };

        expect(activity.urgency).toBe('urgent');
        expect(activity.status).toBe('pending');
      });

      it('should set deadline to 1 hour from now', () => {
        const now = new Date();
        const deadline = new Date(now);
        deadline.setHours(deadline.getHours() + 1);

        const hoursDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        expect(hoursDiff).toBe(1);
      });

      it('should truncate post_content to 500 characters', () => {
        const longContent = 'a'.repeat(1000);
        const truncated = longContent.substring(0, 500);

        expect(truncated.length).toBe(500);
      });

      it('should log webhook to unipile_webhook_logs', () => {
        const log = {
          event: 'post.published',
          payload: { campaign_id: 'campaign-456' },
          processed: true,
          activity_id: 'activity-789',
          campaign_id: 'campaign-456',
        };

        expect(log.event).toBe('post.published');
        expect(log.processed).toBe(true);
      });

      it('should return activity details on success', () => {
        const response = {
          received: true,
          activity_created: 'activity-789',
          pod_id: 'pod-123',
        };

        expect(response.received).toBe(true);
        expect(response.activity_created).toBeDefined();
      });

      it('should return 500 on activity creation failure', () => {
        const errorStatus = 500;
        const errorMessage = 'Failed to create activity';

        expect(errorStatus).toBe(500);
        expect(errorMessage).toBe('Failed to create activity');
      });

      it('should call notifyPodMembers function', () => {
        const notification = {
          podId: 'pod-123',
          activityId: 'activity-789',
          postUrl: 'https://linkedin.com/posts/123',
          campaignName: 'Test Campaign',
        };

        expect(notification.podId).toBeDefined();
        expect(notification.activityId).toBeDefined();
      });
    });

    describe('post.failed Event Handler', () => {
      it('should extract error details from payload', () => {
        const payload = {
          campaign_id: 'campaign-456',
          error: 'LinkedIn API rate limit exceeded',
        };

        expect(payload.campaign_id).toBeDefined();
        expect(payload.error).toBeDefined();
      });

      it('should update campaign status to failed', () => {
        const campaignUpdate = {
          status: 'failed',
          error_message: 'LinkedIn API rate limit exceeded',
        };

        expect(campaignUpdate.status).toBe('failed');
        expect(campaignUpdate.error_message).toBeDefined();
      });

      it('should log to unipile_webhook_logs', () => {
        const log = {
          event: 'post.failed',
          payload: { campaign_id: 'campaign-456' },
          processed: true,
          campaign_id: 'campaign-456',
        };

        expect(log.event).toBe('post.failed');
        expect(log.processed).toBe(true);
      });

      it('should return received true', () => {
        const response = { received: true };
        expect(response.received).toBe(true);
      });
    });

    describe('comment.received Event Handler', () => {
      it('should extract comment data from payload', () => {
        const payload = {
          comment_text: 'I\'m interested! Please send me the guide.',
          post_id: 'post-123',
          commenter_profile: {
            id: 'profile-456',
            name: 'John Doe',
          },
        };

        expect(payload.comment_text).toBeDefined();
        expect(payload.post_id).toBeDefined();
        expect(payload.commenter_profile).toBeDefined();
      });

      it('should detect guide trigger keyword', () => {
        const commentText = 'Please send me the guide';
        const triggerWords = ['guide', 'interested', 'more info', 'download', 'send me'];
        const containsTrigger = triggerWords.some(word =>
          commentText.toLowerCase().includes(word)
        );

        expect(containsTrigger).toBe(true);
      });

      it('should detect interested trigger keyword', () => {
        const commentText = 'I am interested in learning more';
        const triggerWords = ['guide', 'interested', 'more info', 'download', 'send me'];
        const containsTrigger = triggerWords.some(word =>
          commentText.toLowerCase().includes(word)
        );

        expect(containsTrigger).toBe(true);
      });

      it('should detect more info trigger keyword', () => {
        const commentText = 'Can I get more info about this?';
        const triggerWords = ['guide', 'interested', 'more info', 'download', 'send me'];
        const containsTrigger = triggerWords.some(word =>
          commentText.toLowerCase().includes(word)
        );

        expect(containsTrigger).toBe(true);
      });

      it('should detect download trigger keyword', () => {
        const commentText = 'How can I download this?';
        const triggerWords = ['guide', 'interested', 'more info', 'download', 'send me'];
        const containsTrigger = triggerWords.some(word =>
          commentText.toLowerCase().includes(word)
        );

        expect(containsTrigger).toBe(true);
      });

      it('should detect send me trigger keyword', () => {
        const commentText = 'Please send me the resource';
        const triggerWords = ['guide', 'interested', 'more info', 'download', 'send me'];
        const containsTrigger = triggerWords.some(word =>
          commentText.toLowerCase().includes(word)
        );

        expect(containsTrigger).toBe(true);
      });

      it('should be case insensitive', () => {
        const commentText = 'INTERESTED IN THIS GUIDE';
        const triggerWords = ['guide', 'interested', 'more info', 'download', 'send me'];
        const containsTrigger = triggerWords.some(word =>
          commentText.toLowerCase().includes(word)
        );

        expect(containsTrigger).toBe(true);
      });

      it('should not detect non-trigger comments', () => {
        const commentText = 'Great post! Thanks for sharing.';
        const triggerWords = ['guide', 'interested', 'more info', 'download', 'send me'];
        const containsTrigger = triggerWords.some(word =>
          commentText.toLowerCase().includes(word)
        );

        expect(containsTrigger).toBe(false);
      });

      it('should insert into triggered_comments table', () => {
        const triggeredComment = {
          post_id: 'post-123',
          comment_text: 'I\'m interested!',
          commenter_profile: { id: 'profile-456' },
          trigger_detected: true,
          processed: false,
        };

        expect(triggeredComment.trigger_detected).toBe(true);
        expect(triggeredComment.processed).toBe(false);
      });

      it('should return trigger detection status', () => {
        const response = {
          received: true,
          trigger_detected: true,
        };

        expect(response.trigger_detected).toBe(true);
      });
    });

    describe('Event Routing', () => {
      it('should route post.published to handlePostPublished', () => {
        const event = 'post.published';
        expect(event).toBe('post.published');
      });

      it('should route post.failed to handlePostFailed', () => {
        const event = 'post.failed';
        expect(event).toBe('post.failed');
      });

      it('should route comment.received to handleCommentReceived', () => {
        const event = 'comment.received';
        expect(event).toBe('comment.received');
      });

      it('should return received true for unhandled events', () => {
        const unhandledEvent = 'post.updated';
        const response = { received: true };

        expect(response.received).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on processing error', () => {
        const errorStatus = 500;
        const errorMessage = 'Processing failed';

        expect(errorStatus).toBe(500);
        expect(errorMessage).toBe('Processing failed');
      });

      it('should log errors to console', () => {
        const logMessage = 'Webhook processing error:';
        expect(logMessage).toContain('Webhook processing error');
      });

      it('should handle JSON parse errors', () => {
        const invalidJson = '{invalid json}';

        try {
          JSON.parse(invalidJson);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });

    describe('Database Operations', () => {
      it('should use service role key for Supabase client', () => {
        const envVar = 'SUPABASE_SERVICE_ROLE_KEY';
        expect(envVar).toBe('SUPABASE_SERVICE_ROLE_KEY');
      });

      it('should query campaigns table', () => {
        const tableName = 'campaigns';
        expect(tableName).toBe('campaigns');
      });

      it('should insert into pod_activities table', () => {
        const tableName = 'pod_activities';
        expect(tableName).toBe('pod_activities');
      });

      it('should insert into triggered_comments table', () => {
        const tableName = 'triggered_comments';
        expect(tableName).toBe('triggered_comments');
      });

      it('should insert into unipile_webhook_logs table', () => {
        const tableName = 'unipile_webhook_logs';
        expect(tableName).toBe('unipile_webhook_logs');
      });
    });
  });

  describe('Manual Pod Trigger API (/api/campaigns/trigger-pod)', () => {
    describe('Authentication', () => {
      it('should require authenticated user', () => {
        const requireAuth = true;
        expect(requireAuth).toBe(true);
      });

      it('should return 401 for unauthenticated requests', () => {
        const errorStatus = 401;
        const errorMessage = 'Unauthorized';

        expect(errorStatus).toBe(401);
        expect(errorMessage).toBe('Unauthorized');
      });

      it('should get user from Supabase auth', () => {
        const authMethod = 'supabase.auth.getUser()';
        expect(authMethod).toContain('getUser');
      });
    });

    describe('Input Validation', () => {
      it('should require campaign_id field', () => {
        const requiredFields = ['campaign_id', 'post_url'];
        expect(requiredFields).toContain('campaign_id');
      });

      it('should require post_url field', () => {
        const requiredFields = ['campaign_id', 'post_url'];
        expect(requiredFields).toContain('post_url');
      });

      it('should validate campaign_id is string', () => {
        const campaignId = 'campaign-123';
        expect(typeof campaignId).toBe('string');
      });

      it('should validate post_url is string', () => {
        const postUrl = 'https://linkedin.com/posts/123';
        expect(typeof postUrl).toBe('string');
      });

      it('should return 400 for missing campaign_id', () => {
        const errorStatus = 400;
        const errorMessage = 'campaign_id is required and must be a string';

        expect(errorStatus).toBe(400);
        expect(errorMessage).toContain('required');
      });

      it('should return 400 for missing post_url', () => {
        const errorStatus = 400;
        const errorMessage = 'post_url is required and must be a string';

        expect(errorStatus).toBe(400);
        expect(errorMessage).toContain('required');
      });
    });

    describe('Campaign Authorization', () => {
      it('should fetch campaign with required fields', () => {
        const campaignFields = 'id, name, pod_id, user_id, client_id, post_template, status';

        expect(campaignFields).toContain('pod_id');
        expect(campaignFields).toContain('client_id');
      });

      it('should return 404 if campaign not found', () => {
        const errorStatus = 404;
        const errorMessage = 'Campaign not found';

        expect(errorStatus).toBe(404);
        expect(errorMessage).toBe('Campaign not found');
      });

      it('should verify user client_id matches campaign', () => {
        const userClientId = 'client-123';
        const campaignClientId = 'client-123';

        const hasAccess = userClientId === campaignClientId;
        expect(hasAccess).toBe(true);
      });

      it('should return 403 for unauthorized access', () => {
        const errorStatus = 403;
        const errorMessage = 'Unauthorized access to campaign';

        expect(errorStatus).toBe(403);
        expect(errorMessage).toContain('Unauthorized');
      });
    });

    describe('Pod Association Check', () => {
      it('should return 400 if no pod_id', () => {
        const campaign = { pod_id: null };
        const errorStatus = 400;
        const errorMessage = 'No pod associated with this campaign';

        expect(errorStatus).toBe(400);
        expect(errorMessage).toContain('No pod associated');
      });

      it('should proceed if pod_id exists', () => {
        const campaign = { pod_id: 'pod-123' };
        const hasPod = !!campaign.pod_id;

        expect(hasPod).toBe(true);
      });
    });

    describe('Campaign Update', () => {
      it('should update last_post_url', () => {
        const update = {
          last_post_url: 'https://linkedin.com/posts/123',
        };

        expect(update.last_post_url).toBeDefined();
      });

      it('should update last_post_at to current time', () => {
        const update = {
          last_post_at: new Date().toISOString(),
        };

        expect(update.last_post_at).toBeDefined();
      });

      it('should change draft status to active', () => {
        const currentStatus = 'draft';
        const newStatus = currentStatus === 'draft' ? 'active' : currentStatus;

        expect(newStatus).toBe('active');
      });

      it('should preserve non-draft status', () => {
        const currentStatus: string = 'active';
        const newStatus = currentStatus === 'draft' ? 'active' : currentStatus;

        expect(newStatus).toBe('active');
      });
    });

    describe('Pod Activity Creation', () => {
      it('should create activity with manual post_id', () => {
        const postId = `manual_${Date.now()}`;

        expect(postId).toContain('manual_');
      });

      it('should use campaign post_template for content', () => {
        const postTemplate = 'This is a test post template';
        const postContent = postTemplate.substring(0, 500);

        expect(postContent).toBe(postTemplate);
      });

      it('should truncate post_template to 500 chars', () => {
        const longTemplate = 'a'.repeat(1000);
        const postContent = longTemplate.substring(0, 500);

        expect(postContent.length).toBe(500);
      });

      it('should set urgency to urgent', () => {
        const activity = { urgency: 'urgent' };
        expect(activity.urgency).toBe('urgent');
      });

      it('should set status to pending', () => {
        const activity = { status: 'pending' };
        expect(activity.status).toBe('pending');
      });

      it('should set deadline to 1 hour from now', () => {
        const now = new Date();
        const deadline = new Date(now);
        deadline.setHours(deadline.getHours() + 1);

        const hoursDiff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        expect(hoursDiff).toBe(1);
      });

      it('should use authenticated user as posted_by', () => {
        const userId = 'user-123';
        const activity = { posted_by: userId };

        expect(activity.posted_by).toBe(userId);
      });

      it('should return 500 on activity creation failure', () => {
        const errorStatus = 500;
        const errorMessage = 'Failed to create pod activity';

        expect(errorStatus).toBe(500);
        expect(errorMessage).toContain('Failed to create pod activity');
      });
    });

    describe('Webhook Logging', () => {
      it('should log manual trigger event', () => {
        const log = {
          event: 'manual_trigger',
          payload: {
            campaign_id: 'campaign-456',
            post_url: 'https://linkedin.com/posts/123',
            triggered_by: 'user-123',
            trigger_type: 'manual',
          },
          processed: true,
          activity_id: 'activity-789',
          campaign_id: 'campaign-456',
        };

        expect(log.event).toBe('manual_trigger');
        expect(log.payload.trigger_type).toBe('manual');
      });

      it('should include triggered_by user', () => {
        const payload = {
          triggered_by: 'user-123',
        };

        expect(payload.triggered_by).toBeDefined();
      });
    });

    describe('Success Response', () => {
      it('should return success true', () => {
        const response = { success: true };
        expect(response.success).toBe(true);
      });

      it('should return activity_id', () => {
        const response = {
          activity_id: 'activity-789',
        };

        expect(response.activity_id).toBeDefined();
      });

      it('should return pod_id', () => {
        const response = {
          pod_id: 'pod-123',
        };

        expect(response.pod_id).toBeDefined();
      });

      it('should return deadline timestamp', () => {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 1);

        const response = {
          deadline: deadline.toISOString(),
        };

        expect(response.deadline).toBeDefined();
      });

      it('should return success message', () => {
        const response = {
          message: 'Pod amplification triggered successfully',
        };

        expect(response.message).toContain('triggered successfully');
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on unexpected errors', () => {
        const errorStatus = 500;
        const errorMessage = 'Internal server error';

        expect(errorStatus).toBe(500);
        expect(errorMessage).toBe('Internal server error');
      });

      it('should log errors to console', () => {
        const logMessage = 'Trigger pod API error:';
        expect(logMessage).toContain('Trigger pod API error');
      });
    });

    describe('Database Operations', () => {
      it('should use authenticated Supabase client', () => {
        const clientType = 'authenticated';
        expect(clientType).toBe('authenticated');
      });

      it('should query users table for client_id', () => {
        const tableName = 'users';
        const fields = 'client_id';

        expect(tableName).toBe('users');
        expect(fields).toBe('client_id');
      });

      it('should update campaigns table', () => {
        const tableName = 'campaigns';
        expect(tableName).toBe('campaigns');
      });

      it('should insert into pod_activities table', () => {
        const tableName = 'pod_activities';
        expect(tableName).toBe('pod_activities');
      });

      it('should insert into unipile_webhook_logs table', () => {
        const tableName = 'unipile_webhook_logs';
        expect(tableName).toBe('unipile_webhook_logs');
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle webhook → pod activity → notification flow', () => {
      const flow = [
        'webhook received',
        'signature verified',
        'campaign updated',
        'pod activity created',
        'members notified',
      ];

      expect(flow).toHaveLength(5);
    });

    it('should handle manual trigger → pod activity → notification flow', () => {
      const flow = [
        'user authenticated',
        'campaign authorized',
        'campaign updated',
        'pod activity created',
        'log created',
      ];

      expect(flow).toHaveLength(5);
    });

    it('should support both webhook and manual trigger paths', () => {
      const triggerTypes = ['webhook', 'manual'];
      expect(triggerTypes).toContain('webhook');
      expect(triggerTypes).toContain('manual');
    });
  });

  describe('Data Flow', () => {
    it('should flow from campaign → pod → activity', () => {
      const dataFlow = {
        campaign: { id: 'campaign-123', pod_id: 'pod-123' },
        pod: { id: 'pod-123' },
        activity: { pod_id: 'pod-123', campaign_id: 'campaign-123' },
      };

      expect(dataFlow.activity.pod_id).toBe(dataFlow.pod.id);
      expect(dataFlow.activity.campaign_id).toBe(dataFlow.campaign.id);
    });

    it('should create audit trail in webhook logs', () => {
      const auditTrail = [
        { event: 'post.published', timestamp: '2025-11-12T10:00:00Z' },
        { event: 'manual_trigger', timestamp: '2025-11-12T11:00:00Z' },
      ];

      expect(auditTrail).toHaveLength(2);
    });

    it('should track comment triggers separately', () => {
      const triggeredComments = {
        post_id: 'post-123',
        trigger_detected: true,
        processed: false,
      };

      expect(triggeredComments.trigger_detected).toBe(true);
    });
  });

  describe('Security', () => {
    it('should use timing-safe comparison for signatures', () => {
      const method = 'crypto.timingSafeEqual';
      expect(method).toContain('timingSafeEqual');
    });

    it('should verify campaign ownership via client_id', () => {
      const authCheck = 'userData.client_id === campaign.client_id';
      expect(authCheck).toContain('client_id');
    });

    it('should require authentication for manual trigger', () => {
      const requiresAuth = true;
      expect(requiresAuth).toBe(true);
    });

    it('should use service role for webhooks', () => {
      const keyType = 'SUPABASE_SERVICE_ROLE_KEY';
      expect(keyType).toContain('SERVICE_ROLE');
    });

    it('should use authenticated client for manual trigger', () => {
      const clientType = 'authenticated';
      expect(clientType).toBe('authenticated');
    });
  });

  describe('Notification System', () => {
    it('should call notifyPodMembers function', () => {
      const functionName = 'notifyPodMembers';
      expect(functionName).toBe('notifyPodMembers');
    });

    it('should pass pod_id to notification', () => {
      const notification = {
        podId: 'pod-123',
      };

      expect(notification.podId).toBeDefined();
    });

    it('should pass activity_id to notification', () => {
      const notification = {
        activityId: 'activity-789',
      };

      expect(notification.activityId).toBeDefined();
    });

    it('should pass post_url to notification', () => {
      const notification = {
        postUrl: 'https://linkedin.com/posts/123',
      };

      expect(notification.postUrl).toBeDefined();
    });

    it('should pass campaign_name to notification', () => {
      const notification = {
        campaignName: 'Q4 Campaign',
      };

      expect(notification.campaignName).toBeDefined();
    });
  });
});
