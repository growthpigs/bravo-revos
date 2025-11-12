/**
 * Email Extraction Engine
 *
 * Extracts email addresses from DM text with confidence scoring.
 * Handles standard emails, obfuscated formats (at/dot), and context-based detection.
 */

export interface ExtractedEmail {
  email: string;
  confidence: number; // 0.0 to 1.0
  source: string; // Original text where email was found
  context?: string; // Surrounding text for validation
}

export class EmailExtractor {
  // Pattern library for reliability
  private patterns = [
    {
      // Standard email format
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
      confidence: 0.9,
      name: 'standard',
    },
    {
      // Email with context keywords
      regex: /(?:email|contact|reach|send|write).*?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
      confidence: 0.95,
      name: 'contextual',
    },
    {
      // Obfuscated with [at] and [dot]
      regex: /([a-zA-Z0-9._-]+)\s*(?:\[at\]|@)\s*([a-zA-Z0-9.-]+)\s*(?:\[dot\]|\.)\s*([a-zA-Z]{2,})/gi,
      confidence: 0.85,
      name: 'obfuscated',
    },
    {
      // Obfuscated with "at" and "dot" words
      regex: /([a-zA-Z0-9._-]+)\s+at\s+([a-zA-Z0-9.-]+)\s+dot\s+([a-zA-Z]{2,})/gi,
      confidence: 0.8,
      name: 'obfuscated_words',
    },
  ];

  /**
   * Extract emails from text with confidence scoring
   */
  extract(text: string): ExtractedEmail[] {
    const found: Map<string, ExtractedEmail> = new Map();

    for (const pattern of this.patterns) {
      const matches = this.findMatches(text, pattern);

      for (const match of matches) {
        // Use highest confidence if email already found
        const existing = found.get(match.email);
        if (!existing || match.confidence > existing.confidence) {
          found.set(match.email, match);
        }
      }
    }

    // Return array sorted by confidence (highest first)
    return Array.from(found.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract emails from multiple messages
   */
  extractFromMessages(messages: Array<{ text: string; id: string }>): ExtractedEmail[] {
    const allEmails: ExtractedEmail[] = [];

    for (const message of messages) {
      const emails = this.extract(message.text);
      allEmails.push(...emails);
    }

    // Deduplicate across all messages
    return this.deduplicate(allEmails);
  }

  /**
   * Find matches for a specific pattern
   */
  private findMatches(text: string, pattern: { regex: RegExp; confidence: number; name: string }): ExtractedEmail[] {
    const matches: ExtractedEmail[] = [];
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    let match;
    while ((match = regex.exec(text)) !== null) {
      let email: string;
      let confidence = pattern.confidence;

      if (pattern.name === 'obfuscated' || pattern.name === 'obfuscated_words') {
        // Reconstruct email from obfuscated parts
        email = this.reconstructEmail(match);
      } else if (pattern.name === 'contextual') {
        // Extract email from capture group
        email = match[1];
      } else {
        // Standard email
        email = match[0];
      }

      // Normalize email
      email = email.toLowerCase().trim();

      // Validate email format
      if (!this.isValidEmail(email)) {
        continue;
      }

      // Get context (surrounding text)
      const contextStart = Math.max(0, match.index - 30);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 30);
      const context = text.substring(contextStart, contextEnd).trim();

      // Adjust confidence based on context
      confidence = this.adjustConfidenceByContext(confidence, context);

      matches.push({
        email,
        confidence,
        source: match[0],
        context,
      });
    }

    return matches;
  }

  /**
   * Reconstruct email from obfuscated format
   */
  private reconstructEmail(match: RegExpExecArray): string {
    const [, localPart, domain, tld] = match;
    return `${localPart}@${domain}.${tld}`.replace(/\s+/g, '');
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    // Basic validation
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Check for common invalid patterns
    if (email.includes('..')) return false;
    if (email.startsWith('.') || email.startsWith('@')) return false;
    if (email.endsWith('.') || email.endsWith('@')) return false;

    // Domain validation
    const domain = email.split('@')[1];
    if (!domain || domain.split('.').length < 2) return false;

    return true;
  }

  /**
   * Adjust confidence based on surrounding context
   */
  private adjustConfidenceByContext(baseConfidence: number, context: string): number {
    let confidence = baseConfidence;

    // Boost confidence for explicit email sharing
    const positiveKeywords = [
      'email', 'contact', 'reach', 'send', 'write',
      'address', 'mail', 'inbox', 'send me', 'contact me',
    ];

    // Lower confidence for potential false positives
    const negativeKeywords = [
      'not my email', "isn't my", "don't use", 'old email',
      'wrong', 'spam', 'fake', 'test',
    ];

    const lowerContext = context.toLowerCase();

    // Check positive keywords
    for (const keyword of positiveKeywords) {
      if (lowerContext.includes(keyword)) {
        confidence = Math.min(1.0, confidence + 0.05);
      }
    }

    // Check negative keywords
    for (const keyword of negativeKeywords) {
      if (lowerContext.includes(keyword)) {
        confidence = Math.max(0.0, confidence - 0.3);
      }
    }

    return confidence;
  }

  /**
   * Deduplicate emails (keep highest confidence)
   */
  private deduplicate(emails: ExtractedEmail[]): ExtractedEmail[] {
    const unique = new Map<string, ExtractedEmail>();

    for (const email of emails) {
      const existing = unique.get(email.email);
      if (!existing || email.confidence > existing.confidence) {
        unique.set(email.email, email);
      }
    }

    return Array.from(unique.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if text likely contains an email
   */
  hasEmail(text: string): boolean {
    return this.extract(text).length > 0;
  }

  /**
   * Get best email from text (highest confidence)
   */
  getBestEmail(text: string): ExtractedEmail | null {
    const emails = this.extract(text);
    return emails.length > 0 ? emails[0] : null;
  }
}

// Singleton instance for easy import
export const emailExtractor = new EmailExtractor();
