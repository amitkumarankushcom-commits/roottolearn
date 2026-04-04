const bcrypt = require('bcryptjs');

const password = 'admin123';
const hash = '$2a$12$qrvyX0.XJho9/Wr/.vKJQOlDTaDd3tBSHY7BZ6c.Mg72KAqPPD5Jy';

bcrypt.compare(password, hash).then(r => console.log('matches:', r));