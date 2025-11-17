import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMem0Client } from '@/lib/mem0/client';
// REMOVED: import { OpenAI } from 'openai'; - moved to dynamic import to prevent build-time tiktoken execution
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

// Force Node.js runtime (pdf-parse requires Node APIs)
export const runtime = 'nodejs';

const LOG_PREFIX = '[STYLE_ANALYZE]';

/**
 * Extract text from various file types
 */
async function extractTextFromFile(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
): Promise<string> {
  try {
    // PDF extraction
    if (fileType === 'application/pdf') {
      const buffer = Buffer.from(fileBuffer);
      const data = await pdf(buffer);
      return data.text;
    }

    // DOCX extraction
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const buffer = Buffer.from(fileBuffer);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // TXT/MD extraction
    if (fileType === 'text/plain' || fileType === 'text/markdown') {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(fileBuffer);
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Error extracting text from ${fileName}:`, error);
    throw new Error(`Failed to extract text from ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze writing style using GPT-4
 */
async function analyzeWritingStyle(openai: any, texts: string[]): Promise<any> {
  const combinedText = texts.join('\n\n---\n\n');

  // Truncate if too long (GPT-4 context limit)
  const maxChars = 30000; // ~7500 tokens
  const textToAnalyze = combinedText.length > maxChars
    ? combinedText.substring(0, maxChars) + '...'
    : combinedText;

  const prompt = `You are a writing style analyst. Analyze the following text samples and provide a detailed breakdown of the writing style.

Text to analyze:
${textToAnalyze}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "tone": "description of overall tone (e.g., professional, casual, conversational, authoritative)",
  "sentence_structure": "analysis of sentence patterns (e.g., short and punchy, long and flowing, varied)",
  "vocabulary_level": "vocabulary sophistication (e.g., simple, intermediate, advanced, technical)",
  "common_patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "stylistic_devices": ["device 1", "device 2"],
  "paragraph_structure": "how paragraphs are organized",
  "voice": "first person, third person, etc.",
  "formality": "scale from casual to formal",
  "examples": ["quote 1", "quote 2", "quote 3"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional writing style analyst. Provide precise, actionable analysis in valid JSON format only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4');
    }

    // Parse JSON response
    const analysis = JSON.parse(content);
    return analysis;
  } catch (error) {
    console.error(`${LOG_PREFIX} GPT-4 analysis error:`, error);
    throw new Error(`Style analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize OpenAI client (dynamic import prevents build-time tiktoken execution)
    const { OpenAI } = await import('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error(`${LOG_PREFIX} OPENAI_API_KEY not configured`);
      return NextResponse.json(
        { error: 'AI service not configured', details: 'OPENAI_API_KEY environment variable is missing' },
        { status: 500 }
      );
    }
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const body = await request.json();
    const { cartridgeId } = body;

    if (!cartridgeId) {
      return NextResponse.json({ error: 'Cartridge ID is required' }, { status: 400 });
    }

    console.log(`${LOG_PREFIX} Starting analysis for cartridge ${cartridgeId}`);

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
      // Create service role client for storage access
      const storageClient = await createClient({ isServiceRole: true });

      // Extract text from all files
      const extractedTexts: string[] = [];
      console.log(`${LOG_PREFIX} Extracting text from ${cartridge.source_files.length} files`);

      for (const file of cartridge.source_files) {
        try {
          // Download file from storage
          const { data: fileData, error: downloadError } = await storageClient.storage
            .from('style-documents')
            .download(file.file_path);

          if (downloadError) {
            console.error(`${LOG_PREFIX} Failed to download ${file.file_name}:`, downloadError);
            continue; // Skip this file but continue with others
          }

          // Extract text based on file type
          const arrayBuffer = await fileData.arrayBuffer();
          const text = await extractTextFromFile(arrayBuffer, file.file_type, file.file_name);

          if (text.trim().length > 0) {
            extractedTexts.push(text);
            console.log(`${LOG_PREFIX} Extracted ${text.length} characters from ${file.file_name}`);
          }
        } catch (fileError) {
          console.error(`${LOG_PREFIX} Error processing ${file.file_name}:`, fileError);
          // Continue with other files
        }
      }

      if (extractedTexts.length === 0) {
        throw new Error('No text could be extracted from any files');
      }

      console.log(`${LOG_PREFIX} Successfully extracted text from ${extractedTexts.length} files`);

      // Analyze writing style using GPT-4
      console.log(`${LOG_PREFIX} Analyzing writing style with GPT-4`);
      const styleAnalysis = await analyzeWritingStyle(openai, extractedTexts);

      // Build learned style object
      const learnedStyle = {
        ...styleAnalysis,
        analyzed_at: new Date().toISOString(),
        file_count: extractedTexts.length,
        total_characters: extractedTexts.reduce((sum, text) => sum + text.length, 0)
      };

      // Initialize Mem0 client
      const mem0 = getMem0Client();
      const namespace = cartridge.mem0_namespace || `style::marketing::${user.id}`;

      // Store in Mem0 for long-term memory
      console.log(`${LOG_PREFIX} Storing analysis in Mem0 with namespace: ${namespace}`);
      try {
        await mem0.add([{
          role: 'user',
          content: `Writing style analysis for user ${user.id}:

Tone: ${styleAnalysis.tone}
Sentence structure: ${styleAnalysis.sentence_structure}
Vocabulary: ${styleAnalysis.vocabulary_level}
Common patterns: ${styleAnalysis.common_patterns?.join(', ')}
Stylistic devices: ${styleAnalysis.stylistic_devices?.join(', ')}
Voice: ${styleAnalysis.voice}
Formality: ${styleAnalysis.formality}

Examples from the writing:
${styleAnalysis.examples?.join('\n')}
`
        }], {
          user_id: namespace,
          metadata: {
            type: 'style_analysis',
            cartridge_id: cartridgeId,
            analyzed_at: new Date().toISOString()
          }
        });
        console.log(`${LOG_PREFIX} Successfully stored in Mem0`);
      } catch (mem0Error) {
        console.error(`${LOG_PREFIX} Mem0 storage error:`, mem0Error);
        // Continue even if Mem0 fails - we still have DB storage
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

      console.log(`${LOG_PREFIX} Analysis completed successfully`);

      return NextResponse.json({
        message: 'Style analysis completed',
        learned_style: learnedStyle
      });

    } catch (analysisError) {
      console.error(`${LOG_PREFIX} Analysis error:`, analysisError);

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
    console.error(`${LOG_PREFIX} Error in POST /api/cartridges/style/analyze:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}