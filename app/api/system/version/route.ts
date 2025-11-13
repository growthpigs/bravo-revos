/**
 * System Version API
 * Returns app version from package.json (server-side only)
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Read version from package.json
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

    // Fallback to env var or default
    const version = packageJson.version || process.env.npm_package_version || '1.0.0';

    return NextResponse.json({
      version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Version API] Error reading version:', error);
    return NextResponse.json(
      { version: '1.0.0', error: 'Failed to read version' },
      { status: 500 }
    );
  }
}
