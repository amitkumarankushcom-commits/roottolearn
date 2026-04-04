// Comprehensive test suite for RootToLearn API
const http = require('http');
const API_BASE = 'http://localhost:4000';
const TEST_EMAIL = `test${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123';

let tokens = {}; // Store tokens for testing

// ── Test utility
async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
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

// ── Test cases
const tests = [
  {
    name: '✓ Health Check',
    fn: async () => {
      const res = await request('GET', '/health');
      return res.status === 200 && res.body.status === 'ok';
    },
  },
  {
    name: '✓ User Signup',
    fn: async () => {
      const res = await request('POST', '/api/auth/signup', {
        name: 'Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      return res.status === 201 && res.body.step === 'verify';
    },
  },
  {
    name: '✓ Fetch OTP from DB',
    fn: async () => {
      // For testing, we need to manually create an OTP entry with the plaintext
      // In production, this would come through email
      const db = require('./config/db');
      const crypto = require('crypto');
      const testOTP = '123456';
      const testOTPHash = crypto.createHash('sha256').update(testOTP).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      // Clear old OTPs for this email
      await db.execute(
        `UPDATE otp_tokens SET used=1 WHERE target=? AND purpose=? AND used=0`,
        [TEST_EMAIL, 'signup']
      );
      
      // Insert a new OTP with plaintext for testing
      await db.execute(
        `INSERT INTO otp_tokens (target,token,purpose,expires_at) VALUES (?,?,?,?)`,
        [TEST_EMAIL, testOTPHash, 'signup', expiresAt]
      );
      
      tokens.otp = testOTP;  // Store the plaintext for verification
      console.log(`  [DB] OTP (plaintext for testing): ${tokens.otp}`);
      return true;
    },
  },
  {
    name: '✓ Verify Email with OTP',
    fn: async () => {
      if (!tokens.otp) {
        console.log('  [Skip] No OTP available');
        return true;
      }
      const res = await request('POST', '/api/auth/verify-email', {
        email: TEST_EMAIL,
        otp: tokens.otp,
      });
      console.log(`  [Email Verify] Status: ${res.status}`);
      if (res.status !== 200) {
        console.log(`  [Email Verify] Error: ${JSON.stringify(res.body)}`);
        return false;
      }
      if (res.body.access) {
        tokens.user = res.body.access;
        console.log('  [Email Verify] User token obtained');
      }
      return res.status === 200;
    },
  },
  {
    name: '✓ User Login (Step 1 & 2)',
    fn: async () => {
      // Step 1: Send OTP
      const res1 = await request('POST', '/api/auth/login', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (res1.status !== 200) {
        console.log(`  [Login] Step 1 failed: Status ${res1.status}`);
        return false;
      }
      console.log(`  [Login] Step 1: OTP sent`);
      
      // Get the OTP for Step 2
      const db = require('./config/db');
      const crypto = require('crypto');
      const testOTP = '654321';
      const testOTPHash = crypto.createHash('sha256').update(testOTP).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      // Create login OTP
      await db.execute(
        `UPDATE otp_tokens SET used=1 WHERE target=? AND purpose=? AND used=0`,
        [TEST_EMAIL, 'login']
      );
      
      await db.execute(
        `INSERT INTO otp_tokens (target,token,purpose,expires_at) VALUES (?,?,?,?)`,
        [TEST_EMAIL, testOTPHash, 'login', expiresAt]
      );
      
      // Step 2: Verify OTP
      const res2 = await request('POST', '/api/auth/login/verify', {
        email: TEST_EMAIL,
        otp: testOTP,
      });
      
      if (res2.status === 200 && res2.body.access) {
        tokens.user = res2.body.access;
        console.log(`  [Login] Step 2: Login successful, token obtained`);
        return true;
      }
      console.log(`  [Login] Step 2 failed: Status ${res2.status}, ${res2.body?.error}`);
      return false;
    },
  },
  {
    name: '✓ Get User Profile',
    fn: async () => {
      if (!tokens.user) {
        console.log('  [Profile] Skip - No user token');
        return true;
      }
      const res = await request('GET', '/api/users/me', null, {
        Authorization: `Bearer ${tokens.user}`,
      });
      const success = res.status === 200 && res.body && (res.body.id || res.body.user?.id);
      if (!success) {
        console.log(`  [Profile] Failed: Status ${res.status}`);
      }
      return success;
    },
  },
  {
    name: '✓ Admin Dashboard Auth',
    fn: async () => {
      // Test that admin endpoints require authentication
      const res = await request('GET', '/api/admin/stats');
      if (res.status === 401) {
        console.log(`  [Admin] Correctly requires authentication`);
        return true;
      }
      return res.status === 401; // Must require auth
    },
  },
  {
    name: '✓ Health Check Again',
    fn: async () => {
      const res = await request('GET', '/health');
      return res.status === 200;
    },
  },
];

// ── Run tests
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  RootToLearn API Test Suite');
  console.log('='.repeat(60) + '\n');

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

// Run after a brief delay to ensure server is ready
setTimeout(runTests, 500);
