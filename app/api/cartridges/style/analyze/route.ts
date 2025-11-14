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
      .from('style_cartridges')
      .select('*')
      .eq('id', cartridgeId)
      .eq('user_id', user.id)
      .single();

    if (cartridgeError || !cartridge) {
      return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 });
    }

    if (!cartridge.source_files || cartridge.source_files.length === 0) {
      return NextResponse.json({ error: 'No files to analyze' }, { status: 400 });
    }

    // Update status to analyzing
    await supabase
      .from('style_cartridges')
      .update({ analysis_status: 'analyzing' })
      .eq('id', cartridgeId);

    try {
      // Initialize Mem0 client
      const mem0 = getMem0Client();
      const namespace = cartridge.mem0_namespace || `style::marketing::${user.id}`;

      // Placeholder for AI analysis
      // In production, this would:
      // 1. Download files from Supabase storage
      // 2. Extract text content from PDFs/DOCX
      // 3. Send to AI for style analysis
      // 4. Extract patterns like vocabulary, sentence structure, tone
      // 5. Store learned patterns in Mem0

      // Simulated learned style
      const learnedStyle = {
        vocabulary_level: 'professional',
        average_sentence_length: 18,
        tone_patterns: ['confident', 'informative', 'approachable'],
        common_phrases: [],
        paragraph_structure: 'medium',
        stylistic_devices: ['metaphors', 'statistics', 'storytelling'],
        analyzed_at: new Date().toISOString(),
        file_count: cartridge.source_files.length
      };

      // Store in Mem0 for persistence
      try {
        await mem0.add([{
          role: 'assistant',
          content: `Writing style analysis for user ${user.id}: ${JSON.stringify(learnedStyle)}`
        }], {
          user_id: namespace
        });
      } catch (mem0Error) {
        console.error('Mem0 storage error:', mem0Error);
        // Continue even if Mem0 fails
      }

      // Update cartridge with learned style
      const { error: updateError } = await supabase
        .from('style_cartridges')
        .update({
          learned_style: learnedStyle,
          analysis_status: 'completed',
          last_analyzed_at: new Date().toISOString()
        })
        .eq('id', cartridgeId);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        message: 'Style analysis completed',
        learned_style: learnedStyle
      });

    } catch (analysisError) {
      console.error('Analysis error:', analysisError);

      // Update status to failed
      await supabase
        .from('style_cartridges')
        .update({ analysis_status: 'failed' })
        .eq('id', cartridgeId);

      return NextResponse.json({
        error: 'Style analysis failed',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/cartridges/style/analyze:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}