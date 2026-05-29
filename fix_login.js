const fs = require('fs');
let content = fs.readFileSync('app/login/page.tsx', 'utf8');
content = content
  .replace('카카오 계정으로 계속하기', '카카오로 시작하기')
  .replace('이메일로 계속하기', '이메일로 시작하기');
fs.writeFileSync('app/login/page.tsx', content, 'utf8');
console.log('완료');
