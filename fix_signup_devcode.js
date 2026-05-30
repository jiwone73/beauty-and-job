const fs = require('fs');
let content = fs.readFileSync('app/signup/email/page.tsx', 'utf8');

content = content.replace(
  `      if (data.success) {
        setCodeSent(true);
        setPhoneMsg("인증번호를 발송했어요. (3분 이내 입력)");
      } else {`,
  `      if (data.success) {
        setCodeSent(true);
        setPhoneMsg(data.data?.dev_code ? \`[개발용] 인증번호: \${data.data.dev_code}\` : "인증번호를 발송했어요. (3분 이내 입력)");
      } else {`
);

fs.writeFileSync('app/signup/email/page.tsx', content, 'utf8');
console.log('완료');
