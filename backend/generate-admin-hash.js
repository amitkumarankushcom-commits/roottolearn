// Quick script to generate bcrypt hash for admin password
const bcrypt = require('bcryptjs');

const password = 'Admin@123';

bcrypt.hash(password, 12, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log(`\nPassword: ${password}`);
  console.log(`Bcrypt Hash: ${hash}`);
  console.log(`\nUse this hash in your SQL INSERT statement.\n`);
  process.exit(0);
});
