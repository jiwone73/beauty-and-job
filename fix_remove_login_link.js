const fs = require('fs');

// 1. 개인 회원가입
let personal = fs.readFileSync('app/signup/email/page.tsx', 'utf8');
personal = personal.replace(
  `          <div className="mt-6 text-center text-[13px] text-[#6b6b6b]">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login/email"
              className="text-[#5f0080] font-semibold hover:underline"
            >
              로그인
            </Link>
          </div>
`,
  ''
);
fs.writeFileSync('app/signup/email/page.tsx', personal, 'utf8');

// 2. 기업 회원가입
let company = fs.readFileSync('app/company/signup/page.tsx', 'utf8');
company = company.replace(
  `          <div className="mt-6 text-center text-[13px] text-[#6b6b6b]">
            이미 계정이 있으신가요?{" "}
            <Link href="/company/login" className="text-[#5f0080] font-semibold hover:underline">로그인</Link>
          </div>
`,
  ''
);
fs.writeFileSync('app/company/signup/page.tsx', company, 'utf8');

console.log('완료');
