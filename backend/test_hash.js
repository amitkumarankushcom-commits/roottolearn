const bcrypt = require('bcryptjs');

const password = 'Admin@123';
const hash = '$2a$12$WN0vG8cBAymLzgcyHp9Co.anm5z44Fz2u5V4aG7t5XxaMUPxIpT66';

bcrypt.compare(password, hash).then(r => console.log('matches:', r));