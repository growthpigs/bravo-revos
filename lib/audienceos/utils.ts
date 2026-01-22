import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID using UUID v4
 */
export function generateId(): string {
  return uuidv4()
}
