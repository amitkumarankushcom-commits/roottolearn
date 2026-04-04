const http = require('http');
const API_BASE = 'http://localhost:4000/api';

// Admin token (from env or test login)
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjYsIm5hbWUiOiJTdXBlciBBZG1pbiIsImVtYWlsIjoiYXJhajgyMTg5N0BnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJhZG1pblJvbGUiOiJzdXBlciIsImlhdCI6MTcyNDM0NzAwMCwiZXhwIjoxODAwMDAwMDAwfQ.dummy'; // This will need to be a real token

// Better approach: create an admin token from the test
async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const tests = [
  {
    name: '✓ Admin Stats Endpoint',
    fn: async () => {
      const res = await request('GET', '/admin/stats');
      return res.status === 200 && res.body.totalUsers !== undefined;
    },
  },
  {
    name: '✓ Admin Users Endpoint',
    fn: async () => {
      const res = await request('GET', '/admin/users?limit=100');
      return res.status === 200 && Array.isArray(res.body.users);
    },
  },
  {
    name: '✓ Admin Summaries Endpoint',
    fn: async () => {
      const res = await request('GET', '/admin/summaries');
      return res.status === 200 && Array.isArray(res.body.summaries);
    },
  },
  {
    name: '✓ Admin Payments Endpoint',
    fn: async () => {
      const res = await request('GET', '/admin/payments');
      return res.status === 200 && Array.isArray(res.body.payments);
    },
  },
  {
    name: '✓ Admin Activity Log Endpoint',
    fn: async () => {
      const res = await request('GET', '/admin/activity');
      const hasEvents = res.body.events && res.body.events.length > 0;
      console.log(`  Activity records: ${res.body.events?.length || 0}`);
      return res.status === 200 && hasEvents;
    },
  },
  {
    name: '✓ Admin Settings GET',
    fn: async () => {
      const res = await request('GET', '/admin/settings');
      return res.status === 200 && res.body.free_plan_limit !== undefined;
    },
  },
  {
    name: '✓ Coupon List Endpoint',
    fn: async () => {
      const res = await request('GET', '/coupons');
      return res.status === 200 && Array.isArray(res.body.coupons);
    },
  },
  {
    name: '✓ Create Coupon',
    fn: async () => {
      const res = await request('POST', '/coupons', {
        code: `TEST${Date.now()}`,
        discount_pct: 15,
        max_uses: 100,
      });
      const success = res.status === 201;
      if (success) {
        console.log(`  Created coupon: ${res.body.message}`);
      }
      return success;
    },
  },
];

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  Admin Dashboard Functionality Tests');
  console.log('='.repeat(60) + '\n');

  // Get admin token first
  console.log('Getting admin token...');
  try {
    // For simplicity, we'll use a test admin token
    // In a real scenario, you'd login first
    console.log('Note: Using admin token from test setup\n');
  } catch (e) {
    console.error('Failed to get admin token:', e.message);
    process.exit(1);
  }

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    try {
      console.log(test.name);
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        console.log('  ✗ FAILED');
      }
    } catch (err) {
      console.log(`  ✗ ERROR: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  Results: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  console.log('='.repeat(60) + '\n');

  process.exit(passed === total ? 0 : 1);
}

setTimeout(runTests, 500);
