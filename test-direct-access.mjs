// Test if we can access workflow metadata directly
import { config } from 'dotenv';
config({ path: '.env.local' });

const apiKey = process.env.OPENAI_API_KEY;
const workflowId = 'wf_691add48a50881908ddb38929e401e7e0c39f3da1d1ca993';

console.log('🧪 Testing different API endpoints for workflow access...\n');

// Test 1: Try to list workflows (if such endpoint exists)
console.log('Test 1: Attempting to list workflows...');
try {
  const response = await fetch('https://api.openai.com/v1/agents/workflows', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'chatkit_beta=v1'
    }
  });
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
} catch (err) {
  console.log('Error:', err.message);
}

console.log('\n---\n');

// Test 2: Try to get specific workflow details
console.log('Test 2: Attempting to get workflow details...');
try {
  const response = await fetch(`https://api.openai.com/v1/agents/workflows/${workflowId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'chatkit_beta=v1'
    }
  });
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
} catch (err) {
  console.log('Error:', err.message);
}

console.log('\n---\n');

// Test 3: Try ChatKit sessions API again with verbose logging
console.log('Test 3: ChatKit sessions with verbose logging...');
try {
  const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'chatkit_beta=v1'
    },
    body: JSON.stringify({
      workflow: { id: workflowId },
      user: 'test-final-check'
    })
  });
  
  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  
  const text = await response.text();
  console.log('Raw response:', text.substring(0, 500));
  
  if (response.ok) {
    const data = JSON.parse(text);
    console.log('\n🎉 SUCCESS! Session created!');
    console.log('Client secret length:', data.client_secret?.length);
  } else {
    console.log('\n❌ Failed - same error persists');
  }
} catch (err) {
  console.log('Error:', err.message);
}
