const fs = require('fs');
let content = fs.readFileSync('app/signup/email/page.tsx', 'utf8');

// 두 군데 모두 phone 검증 다음에 phoneVerified 조건 추가
content = content.split(`    phone.replace(/\\D/g, "").length >= 10 &&`).join(
  `    phone.replace(/\\D/g, "").length >= 10 &&
    phoneVerified &&`
);

fs.writeFileSync('app/signup/email/page.tsx', content, 'utf8');
console.log('완료');
