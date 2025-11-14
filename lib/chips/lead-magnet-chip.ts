import { z } from 'zod';
import { tool } from '@openai/agents';
import { BaseChip } from './base-chip';
import { AgentContext, extractAgentContext } from '@/lib/cartridges/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { openai } from '@/lib/openai-client';

interface LeadMagnet {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'checklist' | 'template' | 'guide' | 'ebook';
  content: string;
  metadata: {
    pages?: number;
    word_count?: number;
    format?: string;
    topics?: string[];
    target_audience?: string;
  };
  download_url: string;
  downloads: number;
  campaign_id?: string;
  created_at: string;
  updated_at?: string;
}

interface GenerationPrompt {
  topic: string;
  type: 'pdf' | 'checklist' | 'template' | 'guide' | 'ebook';
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  length: 'short' | 'medium' | 'long';
  target_audience: string;
  key_points?: string[];
  include_examples?: boolean;
}

export class LeadMagnetChip extends BaseChip {
  id = 'lead-magnet-chip';
  name = 'Lead Magnet Generator';
  description = 'Generate AI-powered lead magnets (PDFs, checklists, templates)';
  category = 'content' as const;

  getTool() {
    return tool({
      name: 'create_lead_magnet',
      description: 'Generate AI-powered lead magnets like PDFs, checklists, and templates. Can also list existing magnets.',
      parameters: z.object({
        action: z.enum(['generate', 'list', 'get_stats', 'update']).describe('Lead magnet action'),
        topic: z.string().optional().describe('Main topic for the lead magnet'),
        type: z.enum(['pdf', 'checklist', 'template', 'guide', 'ebook']).optional().describe('Type of lead magnet'),
        title: z.string().optional().describe('Title for the lead magnet'),
        description: z.string().optional().describe('Brief description'),
        tone: z.enum(['professional', 'casual', 'technical', 'friendly']).default('professional').describe('Writing tone'),
        length: z.enum(['short', 'medium', 'long']).default('medium').describe('Content length'),
        target_audience: z.string().optional().describe('Target audience description'),
        key_points: z.array(z.string()).optional().describe('Key points to cover'),
        include_examples: z.boolean().default(true).describe('Include practical examples'),
        campaign_id: z.string().optional().describe('Associated campaign ID'),
        magnet_id: z.string().optional().describe('Lead magnet ID for updates/stats'),
      }),
      execute: async (input, context) => {
        const agentContext = extractAgentContext(context);
        return this.execute(input, agentContext);
      }
    });
  }

  async execute(input: any, context: AgentContext): Promise<any> {
    const { action, topic, type, title, description, tone, length, target_audience, key_points, include_examples, campaign_id, magnet_id } = input;

    try {
      switch (action) {
        case 'generate':
          return await this.generateLeadMagnet(
            context,
            { topic, type, tone, length, target_audience, key_points, include_examples },
            title,
            description,
            campaign_id
          );

        case 'list':
          return await this.listLeadMagnets(context, campaign_id);

        case 'get_stats':
          return await this.getLeadMagnetStats(context, magnet_id);

        case 'update':
          return await this.updateLeadMagnet(context, magnet_id, { title, description });

        default:
          return this.formatError(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error('[LEAD_MAGNET_CHIP_ERROR]', error);
      return this.formatError(error.message);
    }
  }

  private async generateLeadMagnet(
    context: AgentContext,
    prompt: Partial<GenerationPrompt>,
    customTitle?: string,
    customDescription?: string,
    campaignId?: string
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!prompt.topic) {
      return this.formatError('Topic is required to generate lead magnet');
    }

    if (!prompt.type) {
      return this.formatError('Lead magnet type is required');
    }

    // Generate content using AI
    const systemPrompt = this.buildSystemPrompt(prompt.type);
    const userPrompt = this.buildUserPrompt(prompt);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: this.getMaxTokens(prompt.length || 'medium'),
    });

    const generatedContent = completion.choices[0].message.content || '';

    // Parse title and content from generated response
    const { extractedTitle, extractedDescription, content } = this.parseGeneratedContent(
      generatedContent,
      prompt.type
    );

    const finalTitle = customTitle || extractedTitle;
    const finalDescription = customDescription || extractedDescription;

    // Create lead magnet record
    const magnetData: Partial<LeadMagnet> = {
      title: finalTitle,
      description: finalDescription,
      type: prompt.type,
      content: content,
      metadata: {
        word_count: content.split(' ').length,
        format: this.getFormat(prompt.type),
        topics: prompt.key_points || [prompt.topic],
        target_audience: prompt.target_audience,
      },
      download_url: '', // Will be generated after storage
      downloads: 0,
      campaign_id: campaignId,
    };

    const { data: magnet, error: magnetError } = await supabase
      .from('lead_magnets')
      .insert(magnetData)
      .select()
      .single();

    if (magnetError) {
      return this.formatError(magnetError.message);
    }

    // Generate and store file (PDF, etc.)
    const fileUrl = await this.generateAndStoreFile(magnet.id, finalTitle, content, prompt.type);

    // Update with download URL
    await supabase
      .from('lead_magnets')
      .update({ download_url: fileUrl })
      .eq('id', magnet.id);

    return this.formatSuccess({
      magnet_id: magnet.id,
      title: finalTitle,
      description: finalDescription,
      type: prompt.type,
      download_url: fileUrl,
      word_count: magnet.metadata?.word_count,
      message: `✨ Lead magnet "${finalTitle}" generated successfully! ${this.getTypeEmoji(prompt.type)}`
    });
  }

  private async listLeadMagnets(context: AgentContext, campaignId?: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    let query = supabase
      .from('lead_magnets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: magnets, error } = await query;

    if (error) {
      return this.formatError(error.message);
    }

    if (!magnets || magnets.length === 0) {
      return this.formatSuccess({
        total_magnets: 0,
        magnets: [],
        message: campaignId ? 'No lead magnets for this campaign' : 'No lead magnets created yet'
      });
    }

    return this.formatSuccess({
      total_magnets: magnets.length,
      magnets: magnets.map(m => ({
        id: m.id,
        title: m.title,
        type: m.type,
        downloads: m.downloads,
        created_at: m.created_at,
        download_url: m.download_url,
      })),
      message: `📚 ${magnets.length} lead magnet${magnets.length !== 1 ? 's' : ''} found`
    });
  }

  private async getLeadMagnetStats(context: AgentContext, magnetId?: string): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!magnetId) {
      // Get overall stats
      const { data: stats } = await supabase
        .from('lead_magnets')
        .select('type, downloads')
        .order('downloads', { ascending: false });

      if (!stats) {
        return this.formatSuccess({
          message: 'No lead magnet statistics available',
          total_downloads: 0
        });
      }

      const totalDownloads = stats.reduce((sum, m) => sum + m.downloads, 0);
      const byType = stats.reduce((acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return this.formatSuccess({
        total_magnets: stats.length,
        total_downloads: totalDownloads,
        average_downloads: Math.round(totalDownloads / stats.length),
        by_type: byType,
        top_performers: stats.slice(0, 5),
        message: `📊 Total: ${totalDownloads} downloads across ${stats.length} lead magnets`
      });
    }

    // Get specific magnet stats
    const { data: magnet, error } = await supabase
      .from('lead_magnets')
      .select('*')
      .eq('id', magnetId)
      .single();

    if (error || !magnet) {
      return this.formatError(`Lead magnet ${magnetId} not found`);
    }

    // Get download history
    const { data: downloads } = await supabase
      .from('lead_magnet_downloads')
      .select('downloaded_at, lead_id')
      .eq('magnet_id', magnetId)
      .order('downloaded_at', { ascending: false })
      .limit(10);

    return this.formatSuccess({
      magnet_id: magnet.id,
      title: magnet.title,
      type: magnet.type,
      total_downloads: magnet.downloads,
      created_at: magnet.created_at,
      recent_downloads: downloads || [],
      metadata: magnet.metadata,
      message: `📈 "${magnet.title}": ${magnet.downloads} downloads`
    });
  }

  private async updateLeadMagnet(
    context: AgentContext,
    magnetId?: string,
    updates?: { title?: string; description?: string }
  ): Promise<any> {
    const supabase = context.supabase as SupabaseClient<Database>;

    if (!magnetId) {
      return this.formatError('Lead magnet ID is required for updates');
    }

    if (!updates || (!updates.title && !updates.description)) {
      return this.formatError('No updates provided');
    }

    const { data: updated, error } = await supabase
      .from('lead_magnets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', magnetId)
      .select()
      .single();

    if (error) {
      return this.formatError(error.message);
    }

    return this.formatSuccess({
      magnet_id: updated.id,
      title: updated.title,
      description: updated.description,
      message: `✏️ Lead magnet updated successfully`
    });
  }

  private buildSystemPrompt(type: string): string {
    const basePrompt = `You are an expert content creator specializing in high-converting lead magnets.
Create compelling, value-packed content that provides immediate actionable value to readers.`;

    const typePrompts: Record<string, string> = {
      pdf: 'Create a comprehensive PDF guide with clear sections, practical advice, and actionable takeaways.',
      checklist: 'Create a detailed, actionable checklist that readers can immediately use to achieve specific outcomes.',
      template: 'Create a ready-to-use template with clear instructions and customizable sections.',
      guide: 'Create a step-by-step guide with detailed instructions, examples, and best practices.',
      ebook: 'Create an engaging ebook with multiple chapters, storytelling elements, and comprehensive coverage.',
    };

    return `${basePrompt}\n\n${typePrompts[type] || typePrompts.guide}`;
  }

  private buildUserPrompt(prompt: Partial<GenerationPrompt>): string {
    const parts = [
      `Create a ${prompt.type} about: ${prompt.topic}`,
      `Target audience: ${prompt.target_audience || 'professionals and entrepreneurs'}`,
      `Tone: ${prompt.tone || 'professional'}`,
      `Length: ${prompt.length || 'medium'} (${this.getLengthDescription(prompt.length || 'medium')})`,
    ];

    if (prompt.key_points && prompt.key_points.length > 0) {
      parts.push(`Key points to cover:\n${prompt.key_points.map(p => `- ${p}`).join('\n')}`);
    }

    if (prompt.include_examples) {
      parts.push('Include practical examples and real-world scenarios.');
    }

    parts.push('\nFormat the response with:\n1. A compelling title\n2. A brief description (1-2 sentences)\n3. The main content with clear sections');

    return parts.join('\n\n');
  }

  private parseGeneratedContent(
    generated: string,
    type: string
  ): { extractedTitle: string; extractedDescription: string; content: string } {
    // Try to extract title from first line or heading
    const lines = generated.split('\n');
    let extractedTitle = 'Untitled Lead Magnet';
    let extractedDescription = '';
    let content = generated;

    // Look for title pattern
    const titleMatch = generated.match(/^#?\s*(.+?)$/m);
    if (titleMatch) {
      extractedTitle = titleMatch[1].replace(/^#+\s*/, '').trim();
    }

    // Look for description pattern
    const descMatch = generated.match(/Description:\s*(.+?)(?:\n|$)/i);
    if (descMatch) {
      extractedDescription = descMatch[1].trim();
    }

    // Clean up content
    content = generated
      .replace(/^#?\s*.+?$/m, '') // Remove title
      .replace(/Description:\s*.+?(?:\n|$)/i, '') // Remove description line
      .trim();

    return { extractedTitle, extractedDescription, content };
  }

  private async generateAndStoreFile(
    magnetId: string,
    title: string,
    content: string,
    type: string
  ): Promise<string> {
    // TODO: Implement actual file generation (PDF, etc.)
    // For now, return a placeholder URL
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const fileName = `${magnetId}-${title.toLowerCase().replace(/\s+/g, '-')}.${this.getFileExtension(type)}`;

    // In production, this would:
    // 1. Generate actual PDF/file using libraries like jsPDF, PDFKit, etc.
    // 2. Upload to Supabase Storage or S3
    // 3. Return the public URL

    return `${baseUrl}/storage/v1/object/public/lead-magnets/${fileName}`;
  }

  private getMaxTokens(length: 'short' | 'medium' | 'long'): number {
    const tokens: Record<string, number> = {
      short: 500,
      medium: 1500,
      long: 3000,
    };
    return tokens[length] || tokens.medium;
  }

  private getLengthDescription(length: 'short' | 'medium' | 'long'): string {
    const descriptions: Record<string, string> = {
      short: '1-2 pages, 300-500 words',
      medium: '3-5 pages, 1000-2000 words',
      long: '8-12 pages, 3000-5000 words',
    };
    return descriptions[length] || descriptions.medium;
  }

  private getFormat(type: string): string {
    const formats: Record<string, string> = {
      pdf: 'PDF Document',
      checklist: 'Interactive Checklist',
      template: 'Customizable Template',
      guide: 'Step-by-Step Guide',
      ebook: 'Digital Book',
    };
    return formats[type] || 'Document';
  }

  private getFileExtension(type: string): string {
    const extensions: Record<string, string> = {
      pdf: 'pdf',
      checklist: 'pdf',
      template: 'docx',
      guide: 'pdf',
      ebook: 'epub',
    };
    return extensions[type] || 'pdf';
  }

  private getTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      pdf: '📄',
      checklist: '✅',
      template: '📋',
      guide: '📖',
      ebook: '📚',
    };
    return emojis[type] || '📄';
  }
}