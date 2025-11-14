/**
 * OfferingsChip
 * Manages product/service offerings with CRUD operations
 * Uses in-memory storage (can be switched to Supabase later)
 */

import type {
  Offering,
  CreateOfferingData,
  UpdateOfferingData,
} from '@/lib/types/offerings';
import { mockOfferings } from '@/lib/types/offerings';

export interface OfferingsChipConfig {
  action: 'create' | 'get' | 'list' | 'update' | 'delete';
  userId: string;
  offeringId?: string;
  data?: CreateOfferingData | UpdateOfferingData;
}

export interface OfferingsChipResult {
  success: boolean;
  offering?: Offering;
  offerings?: Offering[];
  error?: string;
}

export class OfferingsChip {
  readonly id = 'offerings-manager';
  readonly name = 'Offerings Manager';
  readonly description = 'Manage product/service offerings with CRUD operations';

  // In-memory storage (will be replaced with Supabase)
  private storage: Map<string, Offering>;

  constructor() {
    // Initialize with mock data
    this.storage = new Map();
    mockOfferings.forEach(offering => {
      this.storage.set(offering.id, offering);
    });
  }

  /**
   * Get AgentKit tool definition
   */
  getTool() {
    return {
      type: 'function' as const,
      function: {
        name: this.id,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['create', 'get', 'list', 'update', 'delete'],
              description: 'Action to perform',
            },
            userId: {
              type: 'string',
              description: 'User ID',
            },
            offeringId: {
              type: 'string',
              description: 'Offering ID (required for get, update, delete)',
            },
            data: {
              type: 'object',
              description: 'Offering data (required for create, update)',
            },
          },
          required: ['action', 'userId'],
        },
      },
    };
  }

  /**
   * Execute offerings operation
   */
  async execute(config: OfferingsChipConfig): Promise<OfferingsChipResult> {
    try {
      switch (config.action) {
        case 'create':
          return await this.createOffering(config.userId, config.data as CreateOfferingData);
        case 'get':
          return await this.getOffering(config.userId, config.offeringId!);
        case 'list':
          return await this.listOfferings(config.userId);
        case 'update':
          return await this.updateOffering(
            config.userId,
            config.offeringId!,
            config.data as UpdateOfferingData
          );
        case 'delete':
          return await this.deleteOffering(config.userId, config.offeringId!);
        default:
          return {
            success: false,
            error: `Unknown action: ${config.action}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create new offering
   */
  private async createOffering(
    userId: string,
    data: CreateOfferingData
  ): Promise<OfferingsChipResult> {
    const offering: Offering = {
      id: `offering-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      name: data.name,
      elevator_pitch: data.elevator_pitch,
      key_benefits: data.key_benefits || [],
      objection_handlers: data.objection_handlers || {},
      qualification_questions: data.qualification_questions || [],
      proof_points: data.proof_points || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.storage.set(offering.id, offering);

    return { success: true, offering };
  }

  /**
   * Get offering by ID
   */
  private async getOffering(userId: string, offeringId: string): Promise<OfferingsChipResult> {
    const offering = this.storage.get(offeringId);

    if (!offering) {
      return { success: false, error: 'Offering not found' };
    }

    if (offering.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    return { success: true, offering };
  }

  /**
   * List all offerings for user
   */
  private async listOfferings(userId: string): Promise<OfferingsChipResult> {
    const offerings = Array.from(this.storage.values()).filter(
      o => o.user_id === userId
    );

    return { success: true, offerings };
  }

  /**
   * Update offering
   */
  private async updateOffering(
    userId: string,
    offeringId: string,
    data: UpdateOfferingData
  ): Promise<OfferingsChipResult> {
    const offering = this.storage.get(offeringId);

    if (!offering) {
      return { success: false, error: 'Offering not found' };
    }

    if (offering.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const updated: Offering = {
      ...offering,
      ...data,
      updated_at: new Date().toISOString(),
    };

    this.storage.set(offeringId, updated);

    return { success: true, offering: updated };
  }

  /**
   * Delete offering
   */
  private async deleteOffering(userId: string, offeringId: string): Promise<OfferingsChipResult> {
    const offering = this.storage.get(offeringId);

    if (!offering) {
      return { success: false, error: 'Offering not found' };
    }

    if (offering.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    this.storage.delete(offeringId);

    return { success: true };
  }

  /**
   * Get offering by name (utility method for voice cartridge integration)
   */
  async getOfferingByName(userId: string, name: string): Promise<Offering | null> {
    const offerings = Array.from(this.storage.values()).filter(
      o => o.user_id === userId && o.name.toLowerCase().includes(name.toLowerCase())
    );

    return offerings.length > 0 ? offerings[0] : null;
  }
}

// Singleton instance
export const offeringsChip = new OfferingsChip();
