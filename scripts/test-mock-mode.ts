#!/usr/bin/env tsx

/**
 * Test Mock Mode Logic
 * Verifies that the isMockMode() function handles different env var values correctly
 */

function isMockMode(): boolean {
  const envValue = process.env.UNIPILE_MOCK_MODE?.toLowerCase() || '';
  return envValue === 'true' || envValue === '1';
}

// Test cases
const testCases = [
  { value: 'true', expected: true },
  { value: 'TRUE', expected: true },
  { value: 'True', expected: true },
  { value: '1', expected: true },
  { value: 'false', expected: false },
  { value: 'FALSE', expected: false },
  { value: 'False', expected: false },
  { value: '0', expected: false },
  { value: '', expected: false },
  { value: undefined, expected: false },
];

console.log('🧪 Testing Mock Mode Logic\n');
console.log('Current .env value:', process.env.UNIPILE_MOCK_MODE || '(not set)');
console.log('Current result:', isMockMode() ? '✅ Mock Mode ON' : '❌ Mock Mode OFF');
console.log('\n📋 Test Cases:\n');

let passed = 0;
let failed = 0;

for (const { value, expected } of testCases) {
  const original = process.env.UNIPILE_MOCK_MODE;

  if (value === undefined) {
    delete process.env.UNIPILE_MOCK_MODE;
  } else {
    process.env.UNIPILE_MOCK_MODE = value;
  }

  const result = isMockMode();
  const success = result === expected;

  if (success) {
    passed++;
    console.log(`✅ PASS: "${value || '(undefined)'}" → ${result} (expected ${expected})`);
  } else {
    failed++;
    console.log(`❌ FAIL: "${value || '(undefined)'}" → ${result} (expected ${expected})`);
  }

  // Restore original value
  if (original === undefined) {
    delete process.env.UNIPILE_MOCK_MODE;
  } else {
    process.env.UNIPILE_MOCK_MODE = original;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Mock mode logic is working correctly.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the logic.\n');
  process.exit(1);
}
