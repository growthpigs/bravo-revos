/**
 * Tests for workflow-validation.ts utilities
 */

import {
  validateWorkflowId,
  generateWorkflowId,
  extractWorkflowName,
  isWorkflowIdFormat,
} from '@/lib/utils/workflow-validation';

describe('validateWorkflowId', () => {
  // Generate a valid timestamp for testing (current time)
  const validTimestamp = Date.now().toString();
  const validWorkflowId = `test-workflow-${validTimestamp}`;

  describe('valid workflow IDs', () => {
    it('should validate correct format', () => {
      const result = validateWorkflowId(validWorkflowId);
      expect(result.success).toBe(true);
      expect(result.data?.baseName).toBe('test-workflow');
      expect(result.data?.timestamp).toBe(validTimestamp);
    });

    it('should validate workflow with single word name', () => {
      const id = `workflow-${validTimestamp}`;
      const result = validateWorkflowId(id);
      expect(result.success).toBe(true);
      expect(result.data?.baseName).toBe('workflow');
    });

    it('should validate linkedin-dm-pod format', () => {
      const id = `linkedin-dm-pod-${validTimestamp}`;
      const result = validateWorkflowId(id);
      expect(result.success).toBe(true);
      expect(result.data?.baseName).toBe('linkedin-dm-pod');
    });

    it('should validate workflow with numbers in name', () => {
      const id = `workflow123-${validTimestamp}`;
      const result = validateWorkflowId(id);
      expect(result.success).toBe(true);
      expect(result.data?.baseName).toBe('workflow123');
    });
  });

  describe('null and undefined handling', () => {
    it('should return error for null', () => {
      const result = validateWorkflowId(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow ID is required');
    });

    it('should return error for undefined', () => {
      const result = validateWorkflowId(undefined);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow ID is required');
    });

    it('should return error for empty string', () => {
      const result = validateWorkflowId('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow ID is required');
    });
  });

  describe('length validation', () => {
    it('should reject ID that is too short', () => {
      const result = validateWorkflowId('short-123');
      expect(result.success).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should reject ID that is too long', () => {
      const longName = 'a'.repeat(100);
      const result = validateWorkflowId(`${longName}-${validTimestamp}`);
      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('format validation', () => {
    it('should reject ID without timestamp', () => {
      const result = validateWorkflowId('workflow-name-only');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid workflow ID format');
    });

    it('should reject ID with short timestamp', () => {
      const result = validateWorkflowId('workflow-123456');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid workflow ID format');
    });

    it('should reject ID without hyphen separator', () => {
      const result = validateWorkflowId(`workflow${validTimestamp}`);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid workflow ID format');
    });

    it('should reject ID starting with number', () => {
      const result = validateWorkflowId(`123workflow-${validTimestamp}`);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid workflow ID format');
    });
  });

  describe('timestamp validation', () => {
    it('should reject future timestamps', () => {
      const futureTimestamp = (Date.now() + 2 * 60 * 1000).toString(); // 2 minutes in future
      const result = validateWorkflowId(`workflow-${futureTimestamp}`);
      expect(result.success).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should reject very old timestamps', () => {
      const oldTimestamp = (Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toString(); // 2 years ago
      const result = validateWorkflowId(`workflow-${oldTimestamp}`);
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should accept timestamps from 6 months ago', () => {
      const sixMonthsAgo = (Date.now() - 180 * 24 * 60 * 60 * 1000).toString();
      const result = validateWorkflowId(`workflow-${sixMonthsAgo}`);
      expect(result.success).toBe(true);
    });
  });

  describe('security - XSS prevention', () => {
    it('should reject workflow ID with HTML tags', () => {
      const result = validateWorkflowId(`<script>alert-${validTimestamp}`);
      expect(result.success).toBe(false);
    });

    it('should reject workflow ID with special characters', () => {
      const result = validateWorkflowId(`work$flow-${validTimestamp}`);
      expect(result.success).toBe(false);
    });

    it('should reject workflow ID with unicode', () => {
      const result = validateWorkflowId(`wörkflöw-${validTimestamp}`);
      expect(result.success).toBe(false);
    });
  });
});

describe('generateWorkflowId', () => {
  it('should generate valid workflow ID', () => {
    const id = generateWorkflowId('test-workflow');
    expect(isWorkflowIdFormat(id)).toBe(true);
  });

  it('should sanitize unsafe characters', () => {
    const id = generateWorkflowId('test@workflow$name');
    expect(id).toMatch(/^[a-z][a-z0-9-]*-\d{13}$/);
    expect(id).not.toContain('@');
    expect(id).not.toContain('$');
  });

  it('should handle spaces in name', () => {
    const id = generateWorkflowId('test workflow name');
    expect(isWorkflowIdFormat(id)).toBe(true);
    expect(id).not.toContain(' ');
  });

  it('should convert to lowercase', () => {
    const id = generateWorkflowId('TEST-WORKFLOW');
    expect(id).toMatch(/^[a-z]/);
  });

  it('should truncate long names', () => {
    const longName = 'a'.repeat(100);
    const id = generateWorkflowId(longName);
    const result = validateWorkflowId(id);
    expect(result.success).toBe(true);
  });

  it('should prefix numeric-starting names', () => {
    const id = generateWorkflowId('123workflow');
    expect(id.startsWith('workflow-')).toBe(true);
  });
});

describe('extractWorkflowName', () => {
  const validTimestamp = Date.now().toString();

  it('should extract name from valid workflow ID', () => {
    const name = extractWorkflowName(`linkedin-dm-pod-${validTimestamp}`);
    expect(name).toBe('linkedin-dm-pod');
  });

  it('should return null for invalid workflow ID', () => {
    const name = extractWorkflowName('invalid');
    expect(name).toBeNull();
  });

  it('should return null for null input', () => {
    const name = extractWorkflowName(null);
    expect(name).toBeNull();
  });

  it('should return null for undefined input', () => {
    const name = extractWorkflowName(undefined);
    expect(name).toBeNull();
  });
});

describe('isWorkflowIdFormat', () => {
  const validTimestamp = Date.now().toString();

  it('should return true for valid format', () => {
    expect(isWorkflowIdFormat(`workflow-${validTimestamp}`)).toBe(true);
  });

  it('should return false for invalid format', () => {
    expect(isWorkflowIdFormat('invalid')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isWorkflowIdFormat(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isWorkflowIdFormat(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isWorkflowIdFormat('')).toBe(false);
  });
});
