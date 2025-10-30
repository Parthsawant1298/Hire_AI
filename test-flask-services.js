// Test if Flask services are running and responding
const http = require('http');

function testService(port, name) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ ${name} Service is RUNNING`);
          console.log('   Status:', json.status);
          console.log('   Service:', json.service);
          if (json.insightface_available !== undefined) {
            console.log('   InsightFace Available:', json.insightface_available);
          }
          if (json.speechbrain_available !== undefined) {
            console.log('   SpeechBrain Available:', json.speechbrain_available);
          }
          resolve(true);
        } catch (e) {
          console.log(`❌ ${name} Service responded but with invalid JSON`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${name} Service is NOT RUNNING`);
      console.log('   Error:', error.code === 'ECONNREFUSED' ? 'Connection refused' : error.message);
      console.log(`   Start with: cd python-services && python ${name.toLowerCase()}_service.py`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`❌ ${name} Service timed out`);
      req.destroy();
      resolve(false);
    });
  });
}

async function testFlaskServices() {
  console.log('🧪 Testing Flask Services...\n');

  // Test Face Service (Port 8001)
  console.log('📸 Testing Face Service (http://localhost:8001)...');
  const faceRunning = await testService(8001, 'Face');
  
  console.log('');

  // Test Voice Service (Port 8003)
  console.log('🎤 Testing Voice Service (http://localhost:8003)...');
  const voiceRunning = await testService(8003, 'Voice');

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log(`   Face Service (8001): ${faceRunning ? '✅ RUNNING' : '❌ NOT RUNNING'}`);
  console.log(`   Voice Service (8003): ${voiceRunning ? '✅ RUNNING' : '❌ NOT RUNNING'}`);
  console.log('\n💡 To start services:');
  console.log('   Terminal 1: cd python-services && python face_service.py');
  console.log('   Terminal 2: cd python-services && python voice_service.py');
  console.log('='.repeat(60));
}

testFlaskServices().catch(console.error);
