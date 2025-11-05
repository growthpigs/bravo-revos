/**
 * Comment Processor Tests
 * Comprehensive tests for bot detection, generic filtering, and trigger word matching
 */

import {
  detectBot,
  isGenericComment,
  detectTriggerWords,
  processComment,
  processComments,
  filterNewComments,
} from '../lib/comment-processor';
import { UnipileComment } from '../lib/unipile-client';

describe('Comment Processor', () => {
  describe('detectBot', () => {
    it('should detect bot with "bot" in headline', () => {
      const comment: UnipileComment = {
        id: '1',
        text: 'Great post!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author1',
          name: 'Test User',
          headline: 'Marketing Bot',
          connections_count: 500,
        },
      };

      const result = detectBot(comment);

      expect(result.isBot).toBe(true);
      expect(result.botScore).toBeGreaterThanOrEqual(50);
      expect(result.reasons).toContain('Headline contains bot keyword: "Marketing Bot"');
    });

    it('should detect bot with "automation" in headline', () => {
      const comment: UnipileComment = {
        id: '2',
        text: 'Nice content',
        created_at: new Date().toISOString(),
        author: {
          id: 'author2',
          name: 'Auto User',
          headline: 'Social Media Automation Expert',
          connections_count: 100,
        },
      };

      const result = detectBot(comment);

      expect(result.isBot).toBe(true);
      expect(result.botScore).toBeGreaterThanOrEqual(50);
    });

    it('should detect bot with low connection count (<10)', () => {
      const comment: UnipileComment = {
        id: '3',
        text: 'Great post!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author3',
          name: 'New User',
          headline: 'Professional',
          connections_count: 5,
        },
      };

      const result = detectBot(comment);

      expect(result.botScore).toBeGreaterThanOrEqual(30);
      expect(result.reasons).toContain('Low connections: 5');
    });

    it('should detect emoji-only comments as bot-like', () => {
      const comment: UnipileComment = {
        id: '4',
        text: '👍👍👍',
        created_at: new Date().toISOString(),
        author: {
          id: 'author4',
          name: 'User',
          headline: 'Professional',
          connections_count: 100,
        },
      };

      const result = detectBot(comment);

      expect(result.botScore).toBeGreaterThanOrEqual(25);
      expect(result.reasons).toContain('Comment is only emojis');
    });

    it('should detect very short comments with no substance', () => {
      const comment: UnipileComment = {
        id: '5',
        text: 'Nice!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author5',
          name: 'User',
          headline: 'Professional',
          connections_count: 100,
        },
      };

      const result = detectBot(comment);

      expect(result.botScore).toBeGreaterThanOrEqual(15);
      expect(result.reasons).toContain('Very short comment with no substance');
    });

    it('should accumulate bot score for multiple red flags', () => {
      const comment: UnipileComment = {
        id: '6',
        text: '👍',
        created_at: new Date().toISOString(),
        author: {
          id: 'author6',
          name: 'Bot User',
          headline: 'Automated Marketing Bot',
          connections_count: 3,
        },
      };

      const result = detectBot(comment);

      // Should have: headline (50) + low connections (30) + short (15) + emojis (25) = 120 (capped at 100)
      expect(result.isBot).toBe(true);
      expect(result.botScore).toBe(100);
      expect(result.reasons.length).toBeGreaterThan(1);
    });

    it('should NOT flag legitimate users', () => {
      const comment: UnipileComment = {
        id: '7',
        text: 'I would love to learn more about scaling my business. Do you have any resources on this topic?',
        created_at: new Date().toISOString(),
        author: {
          id: 'author7',
          name: 'John Doe',
          headline: 'CEO at Tech Startup',
          connections_count: 500,
        },
      };

      const result = detectBot(comment);

      expect(result.isBot).toBe(false);
      expect(result.botScore).toBeLessThan(50);
    });

    it('should handle missing headline', () => {
      const comment: UnipileComment = {
        id: '8',
        text: 'Great content!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author8',
          name: 'User',
          connections_count: 200,
        },
      };

      const result = detectBot(comment);

      // Should not crash, should not add bot score for missing headline
      expect(result).toBeDefined();
      expect(result.botScore).toBeLessThan(50);
    });

    it('should handle missing connections_count', () => {
      const comment: UnipileComment = {
        id: '9',
        text: 'Great content!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author9',
          name: 'User',
          headline: 'Professional',
        },
      };

      const result = detectBot(comment);

      // Should not crash, should not add bot score for missing connections
      expect(result).toBeDefined();
      expect(result.botScore).toBeLessThan(30);
    });
  });

  describe('isGenericComment', () => {
    it('should detect "Great post!" as generic', () => {
      const comment: UnipileComment = {
        id: '10',
        text: 'Great post!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author10',
          name: 'User',
          connections_count: 100,
        },
      };

      expect(isGenericComment(comment)).toBe(true);
    });

    it('should detect "Thanks for sharing!" as generic', () => {
      const comment: UnipileComment = {
        id: '11',
        text: 'Thanks for sharing!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author11',
          name: 'User',
          connections_count: 100,
        },
      };

      expect(isGenericComment(comment)).toBe(true);
    });

    it('should detect emoji-only comments as generic', () => {
      const comment: UnipileComment = {
        id: '12',
        text: '👍',
        created_at: new Date().toISOString(),
        author: {
          id: 'author12',
          name: 'User',
          connections_count: 100,
        },
      };

      expect(isGenericComment(comment)).toBe(true);
    });

    it('should detect "Love this!" as generic', () => {
      const comment: UnipileComment = {
        id: '13',
        text: 'Love this!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author13',
          name: 'User',
          connections_count: 100,
        },
      };

      expect(isGenericComment(comment)).toBe(true);
    });

    it('should NOT flag substantive comments as generic', () => {
      const comment: UnipileComment = {
        id: '14',
        text: 'I really appreciate your insights on scaling. Could you elaborate on the automation tools you mentioned?',
        created_at: new Date().toISOString(),
        author: {
          id: 'author14',
          name: 'User',
          connections_count: 100,
        },
      };

      expect(isGenericComment(comment)).toBe(false);
    });

    it('should handle case variations', () => {
      const comment: UnipileComment = {
        id: '15',
        text: 'GREAT POST!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author15',
          name: 'User',
          connections_count: 100,
        },
      };

      expect(isGenericComment(comment)).toBe(true);
    });

    it('should handle extra whitespace', () => {
      const comment: UnipileComment = {
        id: '16',
        text: '  Great post!  ',
        created_at: new Date().toISOString(),
        author: {
          id: 'author16',
          name: 'User',
          connections_count: 100,
        },
      };

      expect(isGenericComment(comment)).toBe(true);
    });
  });

  describe('detectTriggerWords', () => {
    const triggerWords = ['SCALE', 'automation', 'growth'];

    it('should detect trigger word (case-insensitive)', () => {
      const result = detectTriggerWords('I want to SCALE my business', triggerWords);

      expect(result.hasTrigger).toBe(true);
      expect(result.matchedWords).toContain('SCALE');
    });

    it('should detect trigger word in lowercase', () => {
      const result = detectTriggerWords('looking for automation tools', triggerWords);

      expect(result.hasTrigger).toBe(true);
      expect(result.matchedWords).toContain('automation');
    });

    it('should detect multiple trigger words', () => {
      const result = detectTriggerWords('Need automation for growth and scale', triggerWords);

      expect(result.hasTrigger).toBe(true);
      expect(result.matchedWords.length).toBeGreaterThanOrEqual(2);
    });

    it('should match whole words only (not substrings)', () => {
      const result = detectTriggerWords('I escalate issues quickly', triggerWords);

      // Should NOT match "SCALE" in "escalate"
      expect(result.hasTrigger).toBe(false);
      expect(result.matchedWords).not.toContain('SCALE');
    });

    it('should NOT match partial words', () => {
      const result = detectTriggerWords('automation123', triggerWords);

      // Should NOT match because it's not a whole word
      expect(result.hasTrigger).toBe(false);
    });

    it('should handle empty text', () => {
      const result = detectTriggerWords('', triggerWords);

      expect(result.hasTrigger).toBe(false);
      expect(result.matchedWords).toHaveLength(0);
    });

    it('should handle empty trigger words array', () => {
      const result = detectTriggerWords('SCALE automation growth', []);

      expect(result.hasTrigger).toBe(false);
      expect(result.matchedWords).toHaveLength(0);
    });

    it('should handle text with punctuation', () => {
      const result = detectTriggerWords('I need SCALE, automation, and growth!', triggerWords);

      expect(result.hasTrigger).toBe(true);
      expect(result.matchedWords.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle mixed case trigger words', () => {
      const mixedCaseTriggers = ['ScAlE', 'AuToMaTiOn'];
      const result = detectTriggerWords('I want to scale and use automation', mixedCaseTriggers);

      expect(result.hasTrigger).toBe(true);
    });
  });

  describe('processComment', () => {
    const triggerWords = ['SCALE', 'automation'];

    it('should queue comment with trigger word from legitimate user', () => {
      const comment: UnipileComment = {
        id: '20',
        text: 'I would love to learn more about SCALE strategies',
        created_at: new Date().toISOString(),
        author: {
          id: 'author20',
          name: 'John Doe',
          headline: 'CEO at Tech Startup',
          connections_count: 500,
        },
      };

      const result = processComment(comment, triggerWords);

      expect(result.shouldQueue).toBe(true);
      expect(result.hasTriggerWord).toBe(true);
      expect(result.isBot).toBe(false);
      expect(result.isGeneric).toBe(false);
    });

    it('should NOT queue bot comment even with trigger word', () => {
      const comment: UnipileComment = {
        id: '21',
        text: 'SCALE your business with automation',
        created_at: new Date().toISOString(),
        author: {
          id: 'author21',
          name: 'Bot User',
          headline: 'Marketing Bot',
          connections_count: 3,
        },
      };

      const result = processComment(comment, triggerWords);

      expect(result.shouldQueue).toBe(false);
      expect(result.hasTriggerWord).toBe(true);
      expect(result.isBot).toBe(true);
    });

    it('should NOT queue generic comment even with trigger word', () => {
      const comment: UnipileComment = {
        id: '22',
        text: 'Great post!',
        created_at: new Date().toISOString(),
        author: {
          id: 'author22',
          name: 'User',
          headline: 'Professional',
          connections_count: 500,
        },
      };

      const result = processComment(comment, triggerWords);

      expect(result.shouldQueue).toBe(false);
      expect(result.isGeneric).toBe(true);
    });

    it('should NOT queue comment without trigger word', () => {
      const comment: UnipileComment = {
        id: '23',
        text: 'Very interesting perspective on business growth',
        created_at: new Date().toISOString(),
        author: {
          id: 'author23',
          name: 'Jane Smith',
          headline: 'Marketing Director',
          connections_count: 800,
        },
      };

      const result = processComment(comment, triggerWords);

      expect(result.shouldQueue).toBe(false);
      expect(result.hasTriggerWord).toBe(false);
      expect(result.isBot).toBe(false);
      expect(result.isGeneric).toBe(false);
    });
  });

  describe('processComments', () => {
    const triggerWords = ['SCALE', 'automation'];

    it('should filter and return only valid comments', () => {
      const comments: UnipileComment[] = [
        {
          id: '30',
          text: 'I want to SCALE my business',
          created_at: new Date().toISOString(),
          author: {
            id: 'author30',
            name: 'John Doe',
            headline: 'CEO',
            connections_count: 500,
          },
        },
        {
          id: '31',
          text: 'Great post!',
          created_at: new Date().toISOString(),
          author: {
            id: 'author31',
            name: 'User',
            headline: 'Professional',
            connections_count: 300,
          },
        },
        {
          id: '32',
          text: 'Need automation tools',
          created_at: new Date().toISOString(),
          author: {
            id: 'author32',
            name: 'Bot',
            headline: 'Marketing Bot',
            connections_count: 5,
          },
        },
        {
          id: '33',
          text: 'Looking for SCALE solutions',
          created_at: new Date().toISOString(),
          author: {
            id: 'author33',
            name: 'Jane Smith',
            headline: 'CTO',
            connections_count: 700,
          },
        },
      ];

      const result = processComments(comments, triggerWords);

      expect(result).toHaveLength(2);
      expect(result[0].comment.id).toBe('30');
      expect(result[1].comment.id).toBe('33');
    });

    it('should return empty array when no valid comments', () => {
      const comments: UnipileComment[] = [
        {
          id: '40',
          text: 'Nice post!',
          created_at: new Date().toISOString(),
          author: {
            id: 'author40',
            name: 'User',
            connections_count: 300,
          },
        },
      ];

      const result = processComments(comments, triggerWords);

      expect(result).toHaveLength(0);
    });

    it('should handle empty comments array', () => {
      const result = processComments([], triggerWords);

      expect(result).toHaveLength(0);
    });
  });

  describe('filterNewComments', () => {
    it('should filter out previously seen comments', () => {
      const commentIds = ['c1', 'c2', 'c3', 'c4'];
      const previouslySeenIds = new Set(['c1', 'c3']);

      const result = filterNewComments(commentIds, previouslySeenIds);

      expect(result).toHaveLength(2);
      expect(result).toContain('c2');
      expect(result).toContain('c4');
      expect(result).not.toContain('c1');
      expect(result).not.toContain('c3');
    });

    it('should return all IDs when none previously seen', () => {
      const commentIds = ['c1', 'c2', 'c3'];
      const previouslySeenIds = new Set<string>();

      const result = filterNewComments(commentIds, previouslySeenIds);

      expect(result).toHaveLength(3);
      expect(result).toEqual(commentIds);
    });

    it('should return empty array when all previously seen', () => {
      const commentIds = ['c1', 'c2'];
      const previouslySeenIds = new Set(['c1', 'c2', 'c3']);

      const result = filterNewComments(commentIds, previouslySeenIds);

      expect(result).toHaveLength(0);
    });

    it('should handle empty input array', () => {
      const previouslySeenIds = new Set(['c1']);

      const result = filterNewComments([], previouslySeenIds);

      expect(result).toHaveLength(0);
    });
  });
});
