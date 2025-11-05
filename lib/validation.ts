/**
 * Input Validation Utilities
 * Centralized validation for all queue functions and API inputs
 */

/**
 * Validate DM job data
 */
export function validateDMJobData(data: any): void {
  if (!data) {
    throw new Error('DM job data is required');
  }

  const required = ['accountId', 'recipientId', 'recipientName', 'message', 'campaignId', 'userId'];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (typeof data.accountId !== 'string' || data.accountId.trim() === '') {
    throw new Error('accountId must be a non-empty string');
  }

  if (typeof data.recipientId !== 'string' || data.recipientId.trim() === '') {
    throw new Error('recipientId must be a non-empty string');
  }

  if (typeof data.message !== 'string' || data.message.trim() === '') {
    throw new Error('message must be a non-empty string');
  }

  if (data.message.length < 10) {
    throw new Error('message must be at least 10 characters');
  }

  if (data.message.length > 5000) {
    throw new Error('message must be less than 5000 characters');
  }
}

/**
 * Validate comment polling job data
 */
export function validateCommentPollingJobData(data: any): void {
  if (!data) {
    throw new Error('Comment polling job data is required');
  }

  const required = ['accountId', 'postId', 'triggerWords', 'campaignId', 'userId'];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(data.triggerWords) || data.triggerWords.length === 0) {
    throw new Error('triggerWords must be a non-empty array');
  }

  for (const word of data.triggerWords) {
    if (typeof word !== 'string' || word.trim() === '') {
      throw new Error('Each trigger word must be a non-empty string');
    }
  }
}

/**
 * Validate pod post job data
 */
export function validatePodPostJobData(data: any): void {
  if (!data) {
    throw new Error('Pod post job data is required');
  }

  const required = ['podId', 'accountId', 'podMemberIds', 'campaignId', 'userId'];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(data.podMemberIds) || data.podMemberIds.length === 0) {
    throw new Error('podMemberIds must be a non-empty array');
  }

  if (data.podMemberIds.length < 2) {
    throw new Error('podMemberIds must have at least 2 members');
  }

  for (const memberId of data.podMemberIds) {
    if (typeof memberId !== 'string' || memberId.trim() === '') {
      throw new Error('Each pod member ID must be a non-empty string');
    }
  }
}

/**
 * Validate comment text for processing
 */
export function validateCommentText(text: any): void {
  if (typeof text !== 'string') {
    throw new Error('Comment text must be a string');
  }

  if (text.trim() === '') {
    throw new Error('Comment text cannot be empty');
  }

  if (text.length > 10000) {
    throw new Error('Comment text must be less than 10000 characters');
  }
}

/**
 * Validate trigger words array
 */
export function validateTriggerWords(words: any): void {
  if (!Array.isArray(words)) {
    throw new Error('Trigger words must be an array');
  }

  if (words.length === 0) {
    throw new Error('Trigger words array cannot be empty');
  }

  for (const word of words) {
    if (typeof word !== 'string' || word.trim() === '') {
      throw new Error('Each trigger word must be a non-empty string');
    }

    if (word.length > 100) {
      throw new Error('Each trigger word must be less than 100 characters');
    }
  }
}

/**
 * Validate account ID
 */
export function validateAccountId(accountId: any): void {
  if (typeof accountId !== 'string' || accountId.trim() === '') {
    throw new Error('accountId must be a non-empty string');
  }
}

/**
 * Validate campaign ID
 */
export function validateCampaignId(campaignId: any): void {
  if (typeof campaignId !== 'string' || campaignId.trim() === '') {
    throw new Error('campaignId must be a non-empty string');
  }
}

/**
 * Validate post ID
 */
export function validatePostId(postId: any): void {
  if (typeof postId !== 'string' || postId.trim() === '') {
    throw new Error('postId must be a non-empty string');
  }
}

/**
 * Validate pod ID
 */
export function validatePodId(podId: any): void {
  if (typeof podId !== 'string' || podId.trim() === '') {
    throw new Error('podId must be a non-empty string');
  }
}
