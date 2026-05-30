const fs = require('fs');
let content = fs.readFileSync('app/api/auth/phone/send/route.ts', 'utf8');

content = content.replace(
  `  await sendSMS(cleanPhone, \`[뷰티앤잡] 인증번호는 \${code} 입니다.\`)

  return ok({ expires_in: 180 })`,
  `  await sendSMS(cleanPhone, \`[뷰티앤잡] 인증번호는 \${code} 입니다.\`)

  // [개발용] SMS 미연동 상태에서 테스트 위해 응답에 코드 포함
  // 상용화 시 dev_code 줄 제거
  return ok({ expires_in: 180, dev_code: code })`
);

fs.writeFileSync('app/api/auth/phone/send/route.ts', content, 'utf8');
console.log('완료');
