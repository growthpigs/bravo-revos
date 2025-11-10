// Mock cn utility for testing
export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
