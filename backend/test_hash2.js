const bcrypt = require('bcryptjs');

const password = 'Amitlove@gmail.com';
const hash = '$2a$12$ZiglgNQTI.JaKzSKk786X.N9We/VN/gqLAUYsXf9oZnNs/96HVTOS';

bcrypt.compare(password, hash).then(r => console.log('matches:', r));