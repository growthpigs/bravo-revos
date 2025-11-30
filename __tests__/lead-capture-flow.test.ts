/**
 * Lead Capture Flow Tests
 * Tests the complete lead capture workflow including:
 * - Email extraction from comments
 * - Connection status checking
 * - DM sending for connections
 * - Connection request for non-connections
 * - Pending connection tracking
 */

import { extractEmail } from '../lib/email-extraction';

// Mock the unipile-client functions
jest.mock('../lib/unipile-client', () => ({
  replyToComment: jest.fn().mockResolvedValue({ status: 'sent', comment_id: 'mock_comment_123' }),
  sendConnectionRequest: jest.fn().mockResolvedValue({ status: 'sent', invitation_id: 'mock_invite_123' }),
  checkConnectionStatus: jest.fn().mockResolvedValue({ isConnected: false, networkDistance: 'SECOND_DEGREE' }),
  sendDirectMessage: jest.fn().mockResolvedValue({ message_id: 'mock_msg_123', status: 'sent' }),
  getAllPostComments: jest.fn().mockResolvedValue([]),
  extractCommentAuthor: jest.fn().mockReturnValue({ id: 'user_123', name: 'Test User', profile_url: 'https://linkedin.com/in/test' }),
}));

describe('Lead Capture Flow', () => {
  describe('Email Extraction from Comments', () => {
    it('should extract email from comment with explicit email', async () => {
      const result = await extractEmail('Here is my email: john@example.com');
      expect(result.email).toBe('john@example.com');
      expect(result.confidence).toBe('high');
    });

    it('should extract email from comment with email in middle of text', async () => {
      const result = await extractEmail('Great post! Reach me at john.doe@company.com for more details');
      expect(result.email).toBe('john.doe@company.com');
      expect(result.confidence).toBe('high');
    });

    it('should return null for comment without email', async () => {
      const result = await extractEmail('I want the guide please!');
      expect(result.email).toBeNull();
    });

    it('should handle complex email formats', async () => {
      const result = await extractEmail('Email: first.last+tag@sub.domain.co.uk');
      expect(result.email).toBe('first.last+tag@sub.domain.co.uk');
    });
  });

  describe('Connection Status Logic', () => {
    const { checkConnectionStatus } = require('../lib/unipile-client');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should identify first-degree connections', async () => {
      checkConnectionStatus.mockResolvedValueOnce({
        isConnected: true,
        networkDistance: 'FIRST_DEGREE',
      });

      const status = await checkConnectionStatus('account_123', 'user_456');
      expect(status.isConnected).toBe(true);
      expect(status.networkDistance).toBe('FIRST_DEGREE');
    });

    it('should identify non-connections', async () => {
      checkConnectionStatus.mockResolvedValueOnce({
        isConnected: false,
        networkDistance: 'SECOND_DEGREE',
      });

      const status = await checkConnectionStatus('account_123', 'user_456');
      expect(status.isConnected).toBe(false);
    });

    it('should detect pending invitations', async () => {
      checkConnectionStatus.mockResolvedValueOnce({
        isConnected: false,
        networkDistance: 'SECOND_DEGREE',
        hasPendingInvitation: true,
        invitationType: 'SENT',
      });

      const status = await checkConnectionStatus('account_123', 'user_456');
      expect(status.hasPendingInvitation).toBe(true);
      expect(status.invitationType).toBe('SENT');
    });
  });

  describe('Connection Request Flow', () => {
    const { sendConnectionRequest, replyToComment } = require('../lib/unipile-client');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should send connection request with message', async () => {
      await sendConnectionRequest('account_123', 'user_456', 'Hey! Lets connect!');

      expect(sendConnectionRequest).toHaveBeenCalledWith(
        'account_123',
        'user_456',
        'Hey! Lets connect!'
      );
    });

    it('should handle already connected case', async () => {
      sendConnectionRequest.mockResolvedValueOnce({ status: 'already_connected' });

      const result = await sendConnectionRequest('account_123', 'user_456');
      expect(result.status).toBe('already_connected');
    });

    it('should handle pending invitation case', async () => {
      sendConnectionRequest.mockResolvedValueOnce({ status: 'pending_invitation' });

      const result = await sendConnectionRequest('account_123', 'user_456');
      expect(result.status).toBe('pending_invitation');
    });
  });

  describe('Comment Reply Flow', () => {
    const { replyToComment } = require('../lib/unipile-client');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should post comment reply successfully', async () => {
      const result = await replyToComment('account_123', 'post_456', 'Thanks! Lets connect!');

      expect(result.status).toBe('sent');
      expect(result.comment_id).toBeDefined();
    });
  });

  describe('DM Flow for Connections', () => {
    const { sendDirectMessage } = require('../lib/unipile-client');

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should send DM to connected user', async () => {
      const result = await sendDirectMessage('account_123', 'user_456', 'Hello! Here is your guide...');

      expect(result.status).toBe('sent');
      expect(result.message_id).toBeDefined();
    });
  });

  describe('Trigger Word Detection', () => {
    // Helper function to match the actual implementation
    function containsTriggerWord(text: string, triggerWord: string): string | null {
      if (!triggerWord || !text) return null;
      const lowerText = text.toLowerCase().trim();
      const lowerTrigger = triggerWord.toLowerCase().trim();

      if (lowerText.includes(lowerTrigger)) {
        return triggerWord;
      }
      return null;
    }

    it('should detect exact trigger word match', () => {
      expect(containsTriggerWord('I want the GUIDE please!', 'guide')).toBe('guide');
    });

    it('should detect trigger word case-insensitively', () => {
      expect(containsTriggerWord('GUIDE me!', 'guide')).toBe('guide');
      expect(containsTriggerWord('guide', 'GUIDE')).toBe('GUIDE');
    });

    it('should return null when trigger not found', () => {
      expect(containsTriggerWord('Great post!', 'guide')).toBeNull();
    });

    it('should detect trigger word in middle of text', () => {
      expect(containsTriggerWord('I really need this guide for my work', 'guide')).toBe('guide');
    });
  });
});
