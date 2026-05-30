const fs = require('fs');
let content = fs.readFileSync('app/login/email/page.tsx', 'utf8');
content = content.replace('이메일로 로그인', '개인회원 로그인');
fs.writeFileSync('app/login/email/page.tsx', content, 'utf8');
console.log('완료');
