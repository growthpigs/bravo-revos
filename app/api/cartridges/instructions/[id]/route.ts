import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructionId = params.id;

    // First check if the instruction belongs to the user
    const { data: instruction, error: checkError } = await supabase
      .from('instruction_cartridges')
      .select('id, training_docs')
      .eq('id', instructionId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !instruction) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 });
    }

    // Delete any uploaded files from storage if they exist
    if (instruction.training_docs && instruction.training_docs.length > 0) {
      const filePaths = instruction.training_docs.map(
        (doc: any) => `${user.id}/${instructionId}/${doc.filename}`
      );

      await supabase.storage
        .from('instruction-documents')
        .remove(filePaths);
    }

    // Delete the instruction cartridge
    const { error: deleteError } = await supabase
      .from('instruction_cartridges')
      .delete()
      .eq('id', instructionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting instruction:', deleteError);
      return NextResponse.json({ error: 'Failed to delete instruction' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Instruction deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cartridges/instructions/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}