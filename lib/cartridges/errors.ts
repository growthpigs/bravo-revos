/**
 * Cartridge Error Handling
 *
 * Custom error classes and utilities for cartridge operations
 */

import { NextResponse } from 'next/server';

export class CartridgeError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'CARTRIDGE_ERROR'
  ) {
    super(message);
    this.name = 'CartridgeError';
  }

  toResponse() {
    return NextResponse.json(
      { error: this.message, code: this.code },
      { status: this.statusCode }
    );
  }
}

export class CartridgeValidationError extends CartridgeError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'CartridgeValidationError';
  }
}

export class CartridgeNotFoundError extends CartridgeError {
  constructor(id: string) {
    super(`Cartridge not found: ${id}`, 404, 'NOT_FOUND');
    this.name = 'CartridgeNotFoundError';
  }
}

export class CartridgePermissionError extends CartridgeError {
  constructor(message: string = 'Permission denied') {
    super(message, 403, 'PERMISSION_DENIED');
    this.name = 'CartridgePermissionError';
  }
}

export class CartridgeConflictError extends CartridgeError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'CartridgeConflictError';
  }
}

export class AuthenticationError extends CartridgeError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'AuthenticationError';
  }
}

export class DatabaseError extends CartridgeError {
  constructor(message: string = 'Database error', originalError?: unknown) {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
    if (originalError instanceof Error) {
      console.error('Database error details:', originalError);
    }
  }
}

/**
 * Map Supabase errors to appropriate HTTP status codes and messages
 */
export function mapSupabaseError(error: any): CartridgeError {
  const message = error?.message || String(error);

  // RLS policy violation
  if (message.includes('policy') || message.includes('RLS')) {
    return new CartridgePermissionError('You do not have permission to perform this action');
  }

  // Not found
  if (message.includes('no rows') || message.includes('not found')) {
    return new CartridgeNotFoundError('unknown');
  }

  // Duplicate/conflict
  if (message.includes('duplicate') || message.includes('unique')) {
    return new CartridgeConflictError('A cartridge with this name already exists');
  }

  // Constraint violation
  if (message.includes('constraint') || message.includes('violates')) {
    return new CartridgeValidationError('Invalid cartridge configuration');
  }

  // Default to database error
  return new DatabaseError(message, error);
}

/**
 * Safely execute async cartridge operations
 * Wraps errors in proper HTTP responses
 */
export async function handleCartridgeOperation<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: unknown) => CartridgeError
): Promise<{ data?: T; error?: CartridgeError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    if (error instanceof CartridgeError) {
      return { error };
    }

    if (errorHandler) {
      const customError = errorHandler(error);
      return { error: customError };
    }

    // Try to map Supabase error
    if (error && typeof error === 'object' && 'message' in error) {
      return { error: mapSupabaseError(error) };
    }

    const unknownError = new CartridgeError(
      'An unexpected error occurred',
      500,
      'UNKNOWN_ERROR'
    );
    console.error('Unknown error:', error);
    return { error: unknownError };
  }
}
