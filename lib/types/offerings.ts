/**
 * Offerings Types
 * Type definitions and mock data for offerings system
 */

export interface Offering {
  id: string;
  user_id: string;
  name: string;
  elevator_pitch: string;
  key_benefits: string[];
  objection_handlers: Record<string, string>;
  qualification_questions: string[];
  proof_points: { metric: string; value: string }[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateOfferingData {
  name: string;
  elevator_pitch: string;
  key_benefits?: string[];
  objection_handlers?: Record<string, string>;
  qualification_questions?: string[];
  proof_points?: { metric: string; value: string }[];
}

export interface UpdateOfferingData {
  name?: string;
  elevator_pitch?: string;
  key_benefits?: string[];
  objection_handlers?: Record<string, string>;
  qualification_questions?: string[];
  proof_points?: { metric: string; value: string }[];
}

// Mock data for testing
export const mockOffering: Offering = {
  id: 'mock-1',
  user_id: 'user-1',
  name: 'Enterprise CRM Solution',
  elevator_pitch: 'Reduce sales cycle by 40% with AI-powered CRM',
  key_benefits: [
    '40% reduction in sales cycle',
    '2x improvement in lead quality',
    'Automated follow-ups',
  ],
  objection_handlers: {
    price: 'ROI typically 5x within 6 months',
    timing: 'We offer phased implementation',
    integration: 'Works with your existing stack',
  },
  qualification_questions: [
    'What is your current sales team size?',
    'Which CRM are you using today?',
    'What is your average deal size?',
  ],
  proof_points: [
    { metric: 'Customer Count', value: '500+ enterprises' },
    { metric: 'Average ROI', value: '5.2x' },
    { metric: 'Time to Value', value: '30 days' },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockOfferings: Offering[] = [
  mockOffering,
  {
    id: 'mock-2',
    user_id: 'user-1',
    name: 'LinkedIn Lead Gen Platform',
    elevator_pitch: '10x your B2B lead generation on LinkedIn',
    key_benefits: [
      '10x increase in qualified leads',
      'Automated outreach campaigns',
      'AI-powered personalization',
    ],
    objection_handlers: {
      price: 'Average customer sees 15x ROI in first quarter',
      compliance: 'Fully compliant with LinkedIn terms of service',
      setup: 'Launch your first campaign in under 10 minutes',
    },
    qualification_questions: [
      'What is your target audience?',
      'How many leads do you need per month?',
      'What is your current lead gen strategy?',
    ],
    proof_points: [
      { metric: 'Leads Generated', value: '1M+ qualified leads' },
      { metric: 'Customer Success Rate', value: '94%' },
      { metric: 'Average Response Rate', value: '23%' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
