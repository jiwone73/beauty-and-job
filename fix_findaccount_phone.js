const fs = require('fs');
let content = fs.readFileSync('app/api/auth/find-account/route.ts', 'utf8');
content = content.replace(
  "SELECT email, created_at FROM users WHERE phone = $1 ORDER BY created_at ASC",
  "SELECT email, created_at FROM users WHERE replace(phone, '-', '') = $1 ORDER BY created_at ASC"
);
fs.writeFileSync('app/api/auth/find-account/route.ts', content, 'utf8');
console.log('완료');
