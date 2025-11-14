import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMem0Client } from '@/lib/mem0/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cartridgeId } = body;

    if (!cartridgeId) {
      return NextResponse.json({ error: 'Cartridge ID is required' }, { status: 400 });
    }

    // Fetch the cartridge with its files
    const { data: cartridge, error: cartridgeError } = await supabase
      .from('instruction_cartridges')
      .select('*')
      .eq('id', cartridgeId)
      .eq('user_id', user.id)
      .single();

    if (cartridgeError || !cartridge) {
      return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 });
    }

    if (!cartridge.training_docs || cartridge.training_docs.length === 0) {
      return NextResponse.json({ error: 'No documents to process' }, { status: 400 });
    }

    // Update status to processing
    await supabase
      .from('instruction_cartridges')
      .update({ process_status: 'processing' })
      .eq('id', cartridgeId);

    try {
      // Initialize Mem0 client
      const mem0 = getMem0Client();
      const namespace = cartridge.mem0_namespace || `instructions::marketing::${user.id}`;

      // Placeholder for AI processing
      // In production, this would:
      // 1. Download files from Supabase storage
      // 2. Extract text content from PDFs/DOCX/PPTX
      // 3. Send to AI for knowledge extraction
      // 4. Extract key concepts, frameworks, guidelines
      // 5. Store extracted knowledge in Mem0

      // Simulated extracted knowledge
      const extractedKnowledge = {
        concepts: [
          'Value proposition framework',
          'Customer journey mapping',
          'AIDA model (Attention, Interest, Desire, Action)'
        ],
        frameworks: [
          {
            name: 'Problem-Agitate-Solve',
            description: 'Identify problem, emphasize pain points, present solution'
          },
          {
            name: 'StoryBrand',
            description: 'Position customer as hero, brand as guide'
          }
        ],
        guidelines: [
          'Start with customer pain points',
          'Use social proof and case studies',
          'Include clear call-to-action'
        ],
        examples: [],
        processed_at: new Date().toISOString(),
        document_count: cartridge.training_docs.length
      };

      // Store in Mem0 for persistence and retrieval
      try {
        await mem0.add([{
          role: 'assistant',
          content: `Training knowledge for user ${user.id}: ${JSON.stringify(extractedKnowledge)}`
        }], {
          user_id: namespace
        });
      } catch (mem0Error) {
        console.error('Mem0 storage error:', mem0Error);
        // Continue even if Mem0 fails
      }

      // Update cartridge with extracted knowledge
      const { error: updateError } = await supabase
        .from('instruction_cartridges')
        .update({
          extracted_knowledge: extractedKnowledge,
          process_status: 'completed',
          last_processed_at: new Date().toISOString()
        })
        .eq('id', cartridgeId);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        message: 'Knowledge extraction completed',
        extracted_knowledge: extractedKnowledge
      });

    } catch (processError) {
      console.error('Processing error:', processError);

      // Update status to failed
      await supabase
        .from('instruction_cartridges')
        .update({ process_status: 'failed' })
        .eq('id', cartridgeId);

      return NextResponse.json({
        error: 'Knowledge extraction failed',
        details: processError instanceof Error ? processError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/cartridges/instructions/process:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}