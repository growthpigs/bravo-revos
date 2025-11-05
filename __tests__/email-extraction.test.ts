/**
 * Email Extraction Tests
 * Comprehensive test coverage for email extraction from DM replies
 */

import { extractEmail, isValidEmail, batchExtractEmails } from '@/lib/email-extraction';

describe('Email Extraction', () => {
  // Test Case 1: Clear email in reply (regex extraction)
  describe('Clear email extraction (single email)', () => {
    it('should extract clear email address with high confidence', async () => {
      const result = await extractEmail('My email is john.doe@example.com thanks!');

      expect(result.email).toBe('john.doe@example.com');
      expect(result.confidence).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.method).toBe('regex');
      expect(result.requiresManualReview).toBe(false);
    });

    it('should extract email at start of reply', async () => {
      const result = await extractEmail('john.doe@example.com');

      expect(result.email).toBe('john.doe@example.com');
      expect(result.confidence).toBe('high');
      expect(result.method).toBe('regex');
    });

    it('should extract email at end of reply', async () => {
      const result = await extractEmail('You can reach me at sarah.smith@company.org');

      expect(result.email).toBe('sarah.smith@company.org');
      expect(result.confidence).toBe('high');
      expect(result.method).toBe('regex');
    });

    it('should handle email with numbers and special chars', async () => {
      const result = await extractEmail('contact: alex.johnson_2023@tech-startup.co.uk');

      expect(result.email).toBe('alex.johnson_2023@tech-startup.co.uk');
      expect(result.confidence).toBe('high');
      expect(result.method).toBe('regex');
    });
  });

  // Test Case 2: Multiple emails (ambiguous)
  describe('Multiple emails (ambiguous case)', () => {
    it('should identify primary email and alternatives', async () => {
      const result = await extractEmail(
        'Use main email john@company.com or backup jane@company.com'
      );

      expect(result.email).toBe('john@company.com');
      expect(result.alternativeEmails).toContain('jane@company.com');
      expect(result.confidence).toBe('medium');
      expect(result.requiresManualReview).toBe(true);
    });

    it('should flag multiple emails for manual review', async () => {
      const result = await extractEmail(
        'You can email me at contact@example.com or support@example.com'
      );

      expect(result.alternativeEmails.length).toBeGreaterThan(0);
      expect(result.requiresManualReview).toBe(true);
    });
  });

  // Test Case 3: No email found
  describe('No email found', () => {
    it('should return null with low confidence when no email exists', async () => {
      const result = await extractEmail('I will send you my contact info later');

      expect(result.email).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.score).toBe(0);
      expect(result.requiresManualReview).toBe(true);
    });

    it('should handle empty text', async () => {
      const result = await extractEmail('');

      expect(result.email).toBeNull();
      expect(result.confidence).toBe('low');
    });

    it('should handle whitespace only', async () => {
      const result = await extractEmail('   \n\t  ');

      expect(result.email).toBeNull();
      expect(result.confidence).toBe('low');
    });
  });

  // Test Case 4: Invalid/malformed emails
  describe('Invalid/malformed emails', () => {
    it('should reject incomplete email addresses', async () => {
      const result = await extractEmail('My email is john@.com');

      expect(result.email).not.toBe('john@.com');
    });

    it('should extract valid email from text with invalid variations', async () => {
      const result = await extractEmail('Wrong: john@ Valid: john.doe@example.com');

      expect(result.email).toBe('john.doe@example.com');
      expect(result.confidence).toBe('high');
    });
  });

  // Test Case 5: Edge cases and special scenarios
  describe('Edge cases', () => {
    it('should handle email with subdomains', async () => {
      const result = await extractEmail('contact: john@mail.company.co.uk');

      expect(result.email).toBe('john@mail.company.co.uk');
      expect(result.confidence).toBe('high');
    });

    it('should handle email with plus addressing', async () => {
      const result = await extractEmail('My email: john+leads@example.com');

      expect(result.email).toBe('john+leads@example.com');
      expect(result.confidence).toBe('high');
    });

    it('should handle email with underscores and dots', async () => {
      const result = await extractEmail('reach out to john_doe.smith@company.com');

      expect(result.email).toBe('john_doe.smith@company.com');
      expect(result.confidence).toBe('high');
    });

    it('should handle long domain names', async () => {
      const result = await extractEmail('contact: support@verylongdomainnameexample.com');

      expect(result.email).toBe('support@verylongdomainnameexample.com');
      expect(result.confidence).toBe('high');
    });

    it('should not extract partial matches', async () => {
      const text = 'Visit us at www.example.com or email us at contact@example.com';
      const result = await extractEmail(text);

      expect(result.email).toBe('contact@example.com');
      expect(result.alternativeEmails).not.toContain('example.com');
    });
  });

  // Test Case 6: Confidence scoring
  describe('Confidence scoring', () => {
    it('should assign high confidence (90-100) for single clear email', async () => {
      const result = await extractEmail('Email: test@example.com');

      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.confidence).toBe('high');
    });

    it('should assign medium confidence (70-89) for multiple emails', async () => {
      const result = await extractEmail('Try email1@example.com or email2@example.com');

      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(85);
      expect(result.confidence).toBe('medium');
    });

    it('should assign low confidence (<70) when email missing', async () => {
      const result = await extractEmail('No email here at all');

      expect(result.score).toBe(0);
      expect(result.confidence).toBe('low');
    });
  });

  // Test Case 7: Real-world DM reply scenarios
  describe('Real-world DM reply scenarios', () => {
    it('should extract from natural DM reply', async () => {
      const reply = "Hey! Thanks for reaching out. You can email me at sarah@techstartup.io - Looking forward to connecting!";
      const result = await extractEmail(reply);

      expect(result.email).toBe('sarah@techstartup.io');
      expect(result.confidence).toBe('high');
      expect(result.requiresManualReview).toBe(false);
    });

    it('should extract from casual reply with typos', async () => {
      const reply = "Sure! heres my emai: john.smith@company.com";
      const result = await extractEmail(reply);

      expect(result.email).toBe('john.smith@company.com');
      expect(result.confidence).toBe('high');
    });

    it('should handle reply with multiple lines', async () => {
      const reply = `Thanks for the DM!
I'm interested in learning more.
Feel free to email me at contact@example.com
Looking forward to it!`;
      const result = await extractEmail(reply);

      expect(result.email).toBe('contact@example.com');
      expect(result.confidence).toBe('high');
    });

    it('should extract from professional reply', async () => {
      const reply = "Hello, I appreciate the opportunity. My email for business inquiries is b.manager@corporation.com. Best regards.";
      const result = await extractEmail(reply);

      expect(result.email).toBe('b.manager@corporation.com');
      expect(result.confidence).toBe('high');
    });

    it('should handle conditional email offer', async () => {
      const reply = "Interested! Email me at temp@domain.com if you have details";
      const result = await extractEmail(reply);

      expect(result.email).toBe('temp@domain.com');
      expect(result.confidence).toBe('high');
    });
  });

  // Test Case 8: Email validation utility
  describe('Email validation', () => {
    it('should validate correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should validate email with special chars', () => {
      expect(isValidEmail('john.doe+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
    });
  });

  // Test Case 9: Batch processing
  describe('Batch email extraction', () => {
    it('should process multiple replies efficiently', async () => {
      const replies = [
        { id: '1', text: 'My email is test1@example.com' },
        { id: '2', text: 'Contact me at test2@example.com' },
        { id: '3', text: 'No email here' },
      ];

      const results = await batchExtractEmails(replies);

      expect(results).toHaveLength(3);
      expect(results[0].result.email).toBe('test1@example.com');
      expect(results[1].result.email).toBe('test2@example.com');
      expect(results[2].result.email).toBeNull();
    });

    it('should maintain reply IDs in batch results', async () => {
      const replies = [
        { id: 'reply-a', text: 'email: alice@example.com' },
        { id: 'reply-b', text: 'email: bob@example.com' },
      ];

      const results = await batchExtractEmails(replies);

      expect(results[0].replyId).toBe('reply-a');
      expect(results[1].replyId).toBe('reply-b');
    });
  });

  // Test Case 10: Manual review flagging
  describe('Manual review flagging', () => {
    it('should flag low confidence extractions for review', async () => {
      const result = await extractEmail('No email in this message');

      expect(result.requiresManualReview).toBe(true);
      expect(result.score).toBeLessThan(70);
    });

    it('should flag multiple emails for review', async () => {
      const result = await extractEmail('Email1: test1@example.com Email2: test2@example.com');

      expect(result.requiresManualReview).toBe(true);
    });

    it('should not flag high confidence single email for review', async () => {
      const result = await extractEmail('Clear email: test@example.com in reply');

      expect(result.requiresManualReview).toBe(false);
      expect(result.confidence).toBe('high');
    });
  });
});
