const fs = require('fs');

// 1. 개인 로그인: "이메일로 회원가입" → "개인회원 가입"
let personal = fs.readFileSync('app/login/email/page.tsx', 'utf8');
personal = personal.replace('이메일로 회원가입', '개인회원 가입');
fs.writeFileSync('app/login/email/page.tsx', personal, 'utf8');

// 2. 기업 로그인: 하단에 비밀번호 재설정 추가
let company = fs.readFileSync('app/company/login/page.tsx', 'utf8');
company = company.replace(
  `          <div className="mt-6 flex justify-center text-[13px] text-[#6b6b6b]">
            <Link href="/company/signup" className="hover:text-[#5f0080] hover:underline">
              기업회원 가입
            </Link>
          </div>`,
  `          <div className="mt-6 flex justify-center gap-4 text-[13px] text-[#6b6b6b]">
            <Link href="/company/signup" className="hover:text-[#5f0080] hover:underline">
              기업회원 가입
            </Link>
            <span>·</span>
            <Link href="/login/password-reset" className="hover:text-[#5f0080] hover:underline">
              비밀번호 재설정
            </Link>
          </div>`
);
fs.writeFileSync('app/company/login/page.tsx', company, 'utf8');

console.log('완료');
