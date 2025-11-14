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

    const styleId = params.id;

    // First check if the style belongs to the user
    const { data: style, error: checkError } = await supabase
      .from('style_cartridges')
      .select('id, source_files')
      .eq('id', styleId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !style) {
      return NextResponse.json({ error: 'Style guide not found' }, { status: 404 });
    }

    // Delete any uploaded files from storage if they exist
    if (style.source_files && style.source_files.length > 0) {
      const filePaths = style.source_files.map(
        (file: any) => `${user.id}/style/${styleId}/${file.file_name}`
      );

      await supabase.storage
        .from('style-documents')
        .remove(filePaths);
    }

    // Delete the style cartridge
    const { error: deleteError } = await supabase
      .from('style_cartridges')
      .delete()
      .eq('id', styleId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting style:', deleteError);
      return NextResponse.json({ error: 'Failed to delete style guide' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Style guide deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cartridges/style/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}