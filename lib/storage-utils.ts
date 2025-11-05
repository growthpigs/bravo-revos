/**
 * Storage Utilities for Lead Magnet File Management
 *
 * Handles file validation, upload, and download URL generation
 * for the lead-magnets bucket in Supabase Storage.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// File validation constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
  'application/zip',
] as const;

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.pptx',
  '.zip',
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];
export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): ValidationResult {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate file MIME type
 */
export function validateMimeType(mimeType: string): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed. Allowed types: PDF, DOCX, PPTX, ZIP`,
    };
  }
  return { valid: true };
}

/**
 * Validate file extension
 */
export function validateExtension(filename: string): ValidationResult {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validate complete file
 */
export function validateFile(
  file: File | { name: string; size: number; type: string }
): ValidationResult {
  // Check size
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }

  // Check MIME type
  const mimeValidation = validateMimeType(file.type);
  if (!mimeValidation.valid) {
    return mimeValidation;
  }

  // Check extension
  const extensionValidation = validateExtension(file.name);
  if (!extensionValidation.valid) {
    return extensionValidation;
  }

  return { valid: true };
}

/**
 * Generate storage path for lead magnet
 * Format: {client_id}/{lead_magnet_id}/{filename}
 */
export function generateStoragePath(
  clientId: string,
  leadMagnetId: string,
  filename: string
): string {
  // Sanitize filename to prevent path traversal
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${clientId}/${leadMagnetId}/${sanitizedFilename}`;
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  supabase: SupabaseClient,
  file: File,
  clientId: string,
  leadMagnetId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate storage path
    const path = generateStoragePath(clientId, leadMagnetId, file.name);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('lead-magnets')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Generate signed URL for file download
 * Default expiry: 24 hours (86400 seconds)
 */
export async function generateDownloadUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn: number = 86400 // 24 hours in seconds
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from('lead-magnets')
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.signedUrl) {
      return { success: false, error: 'Failed to generate signed URL' };
    }

    return { success: true, url: data.signedUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(
  supabase: SupabaseClient,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from('lead-magnets')
      .remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get file metadata from Supabase Storage
 */
export async function getFileMetadata(
  supabase: SupabaseClient,
  path: string
): Promise<{
  success: boolean;
  metadata?: { size: number; mimetype: string; lastModified: string };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.storage
      .from('lead-magnets')
      .list(path.substring(0, path.lastIndexOf('/')), {
        limit: 1,
        search: path.substring(path.lastIndexOf('/') + 1),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'File not found' };
    }

    const file = data[0];
    return {
      success: true,
      metadata: {
        size: file.metadata?.size || 0,
        mimetype: file.metadata?.mimetype || '',
        lastModified: file.metadata?.lastModified || '',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
