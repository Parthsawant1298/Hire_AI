// Quick test of VAPI credentials
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const VAPI_PRIVATE_KEY = envVars.VAPI_PRIVATE_KEY || process.env.VAPI_PRIVATE_KEY;
const VAPI_PUBLIC_KEY = envVars.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

console.log('Testing VAPI Credentials...\n');
console.log('Private Key:', VAPI_PRIVATE_KEY ? `${VAPI_PRIVATE_KEY.substring(0, 10)}...` : 'MISSING');
console.log('Public Key:', VAPI_PUBLIC_KEY ? `${VAPI_PUBLIC_KEY.substring(0, 10)}...` : 'MISSING');

async function testVAPIConnection() {
  try {
    console.log('\n1. Testing Private Key (listing assistants)...');
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
      }
    });
    
    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error:', error);
      return;
    }
    
    const assistants = await response.json();
    console.log('✅ Private key works! Found', assistants.length, 'assistants');
    if (assistants.length > 0) {
      console.log('\nExisting assistants:');
      assistants.forEach(a => {
        console.log(`  - ${a.name} (${a.id})`);
      });
    }
    
    console.log('\n2. Testing if we can create a new assistant...');
    const createResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Assistant',
        model: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: 'You are a test assistant.' }]
        },
        voice: {
          provider: '11labs',
          voiceId: '21m00Tcm4TlvDq8ikWAM'
        },
        firstMessage: 'Hello, this is a test.'
      })
    });
    
    console.log('Create Status:', createResponse.status, createResponse.statusText);
    
    if (createResponse.ok) {
      const newAssistant = await createResponse.json();
      console.log('✅ Successfully created test assistant:', newAssistant.id);
      console.log('\nDeleting test assistant...');
      
      // Clean up
      await fetch(`https://api.vapi.ai/assistant/${newAssistant.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
        }
      });
      console.log('✅ Test assistant deleted');
    } else {
      const error = await createResponse.text();
      console.error('❌ Failed to create assistant:', error);
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testVAPIConnection();
