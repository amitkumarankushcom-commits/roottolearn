const http = require('http');

async function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const url = new URL('http://localhost:4000' + path);
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, ok: res.statusCode === 200, data: json, name });
        } catch {
          resolve({ status: res.statusCode, ok: res.statusCode === 200, data: body, name });
        }
      });
    }).on('error', (e) => resolve({ status: 0, ok: false, name, error: e.message }));
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  Admin Dashboard API Endpoints Test');
  console.log('='.repeat(60) + '\n');

  const tests = [
    ['/health', 'Health Check'],
    ['/api/admin/stats', 'Admin Stats'],
    ['/api/admin/users?limit=5', 'Admin Users'],
    ['/api/admin/summaries', 'Summaries'],
    ['/api/admin/payments', 'Payments'],
    ['/api/admin/activity', 'Activity Log'],
    ['/api/coupons', 'Coupons (public)'],
  ];

  let passed = 0;
  for (const [path, name] of tests) {
    const result = await testEndpoint(path, name);
    const icon = result.ok ? '✓' : '✗';
    console.log(`${icon} ${result.name} [${result.status}]`);
    
    if (result.data) {
      if (result.data.events) console.log(`  → Activity records: ${result.data.events.length}`);
      if (result.data.users) console.log(`  → Users: ${result.data.users.length}`);
      if (result.data.summaries) console.log(`  → Summaries: ${result.data.summaries.length}`);
      if (result.data.payments) console.log(`  → Payments: ${result.data.payments.length}`);
      if (result.data.coupons) console.log(`  → Coupons: ${result.data.coupons.length}`);
    }
    if (result.ok) passed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed}/${tests.length} endpoints working`);
  console.log('='.repeat(60) + '\n');
  process.exit(passed === tests.length ? 0 : 1);
}

setTimeout(runTests, 500);
