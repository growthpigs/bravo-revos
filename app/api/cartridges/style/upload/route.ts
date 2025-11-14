import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const cartridgeId = formData.get('cartridgeId') as string;
    const files = formData.getAll('files') as File[];

    if (!cartridgeId) {
      return NextResponse.json({ error: 'Cartridge ID is required' }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    // Verify the cartridge belongs to the user
    const { data: cartridge, error: cartridgeError } = await supabase
      .from('style_cartridges')
      .select('id, source_files')
      .eq('id', cartridgeId)
      .eq('user_id', user.id)
      .single();

    if (cartridgeError || !cartridge) {
      return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 });
    }

    const uploadedFiles = [];
    const currentFiles = cartridge.source_files || [];

    // Upload each file to Supabase storage
    for (const file of files) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown'
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({
          error: `Invalid file type: ${file.type}. Allowed types: PDF, TXT, DOCX, MD`
        }, { status: 400 });
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({
          error: `File ${file.name} exceeds 10MB limit`
        }, { status: 400 });
      }

      // Generate file path
      const timestamp = Date.now();
      const filePath = `${user.id}/${cartridgeId}/${timestamp}-${file.name}`;

      // Convert File to Blob for upload
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('style-documents')
        .upload(filePath, blob, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json({
          error: `Failed to upload ${file.name}: ${uploadError.message}`
        }, { status: 500 });
      }

      uploadedFiles.push({
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_at: new Date().toISOString()
      });
    }

    // Update cartridge with new files
    const updatedFiles = [...currentFiles, ...uploadedFiles];

    const { error: updateError } = await supabase
      .from('style_cartridges')
      .update({
        source_files: updatedFiles,
        analysis_status: 'pending' // Reset status to trigger re-analysis
      })
      .eq('id', cartridgeId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating cartridge:', updateError);
      // Try to clean up uploaded files
      for (const file of uploadedFiles) {
        await supabase.storage.from('style-documents').remove([file.file_path]);
      }
      return NextResponse.json({ error: 'Failed to update cartridge' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Files uploaded successfully',
      uploaded: uploadedFiles.map(f => ({
        name: f.file_name,
        type: f.file_type,
        size: f.file_size
      }))
    });
  } catch (error) {
    console.error('Error in POST /api/cartridges/style/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete uploaded files
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cartridgeId, filePath } = body;

    if (!cartridgeId || !filePath) {
      return NextResponse.json({
        error: 'Cartridge ID and file path are required'
      }, { status: 400 });
    }

    // Verify the cartridge belongs to the user
    const { data: cartridge, error: cartridgeError } = await supabase
      .from('style_cartridges')
      .select('id, source_files')
      .eq('id', cartridgeId)
      .eq('user_id', user.id)
      .single();

    if (cartridgeError || !cartridge) {
      return NextResponse.json({ error: 'Cartridge not found' }, { status: 404 });
    }

    // Remove from storage
    const { error: deleteError } = await supabase.storage
      .from('style-documents')
      .remove([filePath]);

    if (deleteError) {
      console.error('Error deleting file:', deleteError);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    // Update cartridge to remove file reference
    const updatedFiles = (cartridge.source_files || []).filter(
      (f: any) => f.file_path !== filePath
    );

    const { error: updateError } = await supabase
      .from('style_cartridges')
      .update({ source_files: updatedFiles })
      .eq('id', cartridgeId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating cartridge:', updateError);
      return NextResponse.json({ error: 'Failed to update cartridge' }, { status: 500 });
    }

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/cartridges/style/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}