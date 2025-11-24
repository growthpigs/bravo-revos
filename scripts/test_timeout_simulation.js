async function mockUnipileCall(delay) {
  console.log(`[Test] Calling Mock API with ${delay}ms delay...`);
  await new Promise(resolve => setTimeout(resolve, delay));
  console.log(`[Test] Mock API responded.`);
  return { success: true };
}

async function executeWithTimeout(delay) {
  const SERVER_TIMEOUT = 10000; // 10 seconds strict timeout
  
  console.log(`
--- Testing with ${delay}ms delay ---
`);
  
  try {
    const result = await Promise.race([
      mockUnipileCall(delay),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gateway Timeout (504)')), SERVER_TIMEOUT)
      )
    ]);
    console.log('✅ Operation Success:', result);
  } catch (error) {
    console.log('❌ Operation Failed:', error.message);
  }
}

async function run() {
  await executeWithTimeout(2000);  // Fast case
  await executeWithTimeout(15000); // Slow case
}

run();
