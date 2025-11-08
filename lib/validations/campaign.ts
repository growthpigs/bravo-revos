import { z } from 'zod'

/**
 * Validation schema for campaign creation
 * Covers all wizard steps data
 */
export const campaignCreateSchema = z.object({
  // Step 2: Campaign Details
  name: z.string()
    .min(3, 'Campaign name must be at least 3 characters')
    .max(100, 'Campaign name must be less than 100 characters')
    .trim(),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),

  // Step 1: Lead Magnet Selection
  leadMagnetSource: z.enum(['library', 'custom', 'none']).default('none'),

  // If library magnet selected
  libraryId: z.string().uuid().optional().nullable(),
  libraryMagnetTitle: z.string().optional().nullable(),
  libraryMagnetUrl: z.string().url().optional().nullable(),
  libraryMagnetCategory: z.string().optional().nullable(),

  // If custom magnet created
  isCustom: z.boolean().optional(),
  leadMagnetTitle: z.string().optional().nullable(),
  deliveryMethod: z.enum(['upload', 'link', 'text']).optional().nullable(),
  leadMagnetLink: z.string().url().optional().nullable(),
  leadMagnetText: z.string().optional().nullable(),
  // Note: leadMagnetFile handled separately (multipart/form-data)

  // Step 3: Post Content
  postContent: z.string()
    .min(10, 'Post content must be at least 10 characters')
    .max(3000, 'Post content must be less than 3000 characters'),

  // Step 4: Trigger Words
  triggerWords: z.array(z.string())
    .min(1, 'At least one trigger word is required')
    .max(10, 'Maximum 10 trigger words allowed'),

  // Step 5: DM Sequence
  dm1: z.string()
    .min(10, 'DM step 1 must be at least 10 characters')
    .max(2000, 'DM step 1 must be less than 2000 characters'),

  dm2: z.string()
    .min(10, 'DM step 2 must be at least 10 characters')
    .max(2000, 'DM step 2 must be less than 2000 characters')
    .optional()
    .nullable(),

  // Step 6: Webhook Configuration
  webhookEnabled: z.boolean().default(false),
  webhookUrl: z.string().url().optional().nullable(),
  webhookType: z.enum(['zapier', 'makecom', 'convertkit', 'custom']).optional().nullable(),

  // Campaign status
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
})
  .refine((data) => {
    // If library source, libraryId must be provided
    if (data.leadMagnetSource === 'library' && !data.libraryId) {
      return false
    }
    return true
  }, {
    message: 'Library magnet ID is required when source is library',
    path: ['libraryId'],
  })
  .refine((data) => {
    // If custom source, leadMagnetTitle must be provided
    if (data.leadMagnetSource === 'custom' && !data.leadMagnetTitle) {
      return false
    }
    return true
  }, {
    message: 'Lead magnet title is required for custom magnets',
    path: ['leadMagnetTitle'],
  })
  .refine((data) => {
    // If webhook enabled, webhookUrl must be provided
    if (data.webhookEnabled && !data.webhookUrl) {
      return false
    }
    return true
  }, {
    message: 'Webhook URL is required when webhook is enabled',
    path: ['webhookUrl'],
  })

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>
