import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMem0Client } from '@/lib/mem0/client';
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

// Force Node.js runtime (pdf-parse requires Node APIs)
export const runtime = 'nodejs';

const LOG_PREFIX = '[INSTR_PROCESS]';

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

    // PPTX extraction (basic - just text content)
    if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      // For PPTX, we'll use mammoth as well - it can extract some text
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instructionId = params.id;
    console.log(`${LOG_PREFIX} Starting processing for instruction cartridge ${instructionId}`);

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the instruction cartridge
    const { data: cartridge, error: cartridgeError } = await supabase
      .from('instruction_cartridges')
      .select('*')
      .eq('id', instructionId)
      .eq('user_id', user.id)
      .single();

    if (cartridgeError || !cartridge) {
      return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 });
    }

    console.log(`${LOG_PREFIX} Found cartridge: ${cartridge.name}`);

    // Update status to processing
    await supabase
      .from('instruction_cartridges')
      .update({ process_status: 'processing' })
      .eq('id', instructionId);

    try {
      // Initialize Mem0 client
      const mem0 = getMem0Client();
      const namespace = cartridge.mem0_namespace || `instructions::marketing::${user.id}`;

      // Build content for Mem0 storage
      let content = `Content generation instructions for user ${user.id}:\n\n`;
      content += `Instruction Set: ${cartridge.name}\n`;

      if (cartridge.description) {
        content += `Description: ${cartridge.description}\n\n`;
      }

      // Extract text from training docs if they exist
      let trainingDocsText = '';
      if (cartridge.training_docs && Array.isArray(cartridge.training_docs) && cartridge.training_docs.length > 0) {
        console.log(`${LOG_PREFIX} Extracting text from ${cartridge.training_docs.length} training documents`);

        // Create service role client for storage access
        const storageClient = await createClient({ isServiceRole: true });

        const extractedTexts: string[] = [];

        for (const doc of cartridge.training_docs) {
          try {
            // Download file from storage
            const { data: fileData, error: downloadError } = await storageClient.storage
              .from('instruction-documents')
              .download(doc.file_path);

            if (downloadError) {
              console.error(`${LOG_PREFIX} Failed to download ${doc.file_name}:`, downloadError);
              continue; // Skip this file but continue with others
            }

            // Extract text based on file type
            const arrayBuffer = await fileData.arrayBuffer();
            const text = await extractTextFromFile(arrayBuffer, doc.file_type, doc.file_name);

            if (text.trim().length > 0) {
              extractedTexts.push(`--- ${doc.file_name} ---\n${text}`);
              console.log(`${LOG_PREFIX} Extracted ${text.length} characters from ${doc.file_name}`);
            }
          } catch (fileError) {
            console.error(`${LOG_PREFIX} Error processing ${doc.file_name}:`, fileError);
            // Continue with other files
          }
        }

        if (extractedTexts.length > 0) {
          trainingDocsText = '\n\nTraining Documents:\n' + extractedTexts.join('\n\n');
          console.log(`${LOG_PREFIX} Successfully extracted text from ${extractedTexts.length} documents`);
        } else {
          console.log(`${LOG_PREFIX} No text could be extracted from training documents`);
        }
      } else {
        console.log(`${LOG_PREFIX} No training documents to process`);
      }

      // Add training docs text to content
      content += trainingDocsText;

      // Store in Mem0 for long-term memory
      console.log(`${LOG_PREFIX} Storing instructions in Mem0 with namespace: ${namespace}`);
      try {
        await mem0.add([{
          role: 'user',
          content: content
        }], {
          user_id: namespace,
          metadata: {
            type: 'instructions',
            cartridge_id: instructionId,
            processed_at: new Date().toISOString()
          }
        });
        console.log(`${LOG_PREFIX} Successfully stored in Mem0`);
      } catch (mem0Error) {
        console.error(`${LOG_PREFIX} Mem0 storage error:`, mem0Error);
        // Continue even if Mem0 fails - we still update status
      }

      // Build extracted knowledge summary
      const extractedKnowledge = {
        cartridge_name: cartridge.name,
        description: cartridge.description || '',
        training_doc_count: cartridge.training_docs?.length || 0,
        has_training_docs: (cartridge.training_docs?.length || 0) > 0,
        processed_at: new Date().toISOString(),
        mem0_namespace: namespace
      };

      // Update cartridge with processed status
      const { error: updateError } = await supabase
        .from('instruction_cartridges')
        .update({
          extracted_knowledge: extractedKnowledge,
          process_status: 'completed',
          last_processed_at: new Date().toISOString()
        })
        .eq('id', instructionId);

      if (updateError) {
        throw updateError;
      }

      console.log(`${LOG_PREFIX} Processing completed successfully`);

      return NextResponse.json({
        message: 'Instructions processed successfully',
        extracted_knowledge: extractedKnowledge
      });

    } catch (processError) {
      console.error(`${LOG_PREFIX} Processing error:`, processError);

      // Update status to failed
      await supabase
        .from('instruction_cartridges')
        .update({ process_status: 'failed' })
        .eq('id', instructionId);

      return NextResponse.json({
        error: 'Processing failed',
        details: processError instanceof Error ? processError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in POST /api/cartridges/instructions/[id]/process:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
