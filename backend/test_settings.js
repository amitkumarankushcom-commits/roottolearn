// Test all new admin settings endpoints
const http = require('http');

const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsIm5hbWUiOiJTdXBlciBBZG1pbiIsImVtYWlsIjoiYXJhajgyMTg5N0BnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJhZG1pblJvbGUiOiJzdXBlciIsImlhdCI6MTcyNDI2NTYwMCwiZXhwIjoxNzI0MzA4ODAwfQ.fake';

function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`\n✓ ${method} ${path}`);
        console.log(`  Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(body);
          console.log(`  Response: ${JSON.stringify(json).substring(0, 100)}...`);
        } catch {
          console.log(`  Response: ${body.substring(0, 100)}`);
        }
        resolve(res.statusCode);
      });
    });

    req.on('error', (e) => {
      console.log(`✗ ${path} - Error: ${e.message}`);
      resolve(500);
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Admin Settings Endpoints\n');
  console.log('═══════════════════════════════════════\n');

  // Test settings endpoints
  console.log('📋 Settings Endpoints:');
  await testEndpoint('/admin/settings', 'GET');
  await testEndpoint('/admin/settings', 'POST', {
    free_plan_limit: 3,
    pro_plan_price: 9.99,
    enterprise_plan_price: 29.99,
    otp_expiry_minutes: 15
  });

  // Test admin info
  console.log('\n👤 Admin Profile:');
  await testEndpoint('/admin/info', 'GET');

  // Test diagnostics
  console.log('\n🔍 Diagnostics:');
  await testEndpoint('/admin/diagnostics', 'GET');

  // Test backup
  console.log('\n📦 Backup & Maintenance:');
  await testEndpoint('/admin/backup', 'POST');
  await testEndpoint('/admin/clear-cache', 'POST');

  console.log('\n═══════════════════════════════════════');
  console.log('✅ All endpoints tested!\n');
}

runTests().catch(console.error);
