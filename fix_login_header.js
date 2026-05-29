const fs = require('fs');

// 1. login/page.tsx 수정
let login = fs.readFileSync('app/login/page.tsx', 'utf8');
login = login.replace(
  `        {/* 이메일 로그인 */}
        <Link href="/login/email">
          <button className="w-full h-[52px] bg-white border border-[#e0e0e0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:bg-[#fafafa] transition">
            이메일로 시작하기
          </button>
        </Link>`,
  `        {/* 이메일 회원가입 */}
        <Link href="/signup/email">
          <button className="w-full h-[52px] bg-white border border-[#e0e0e0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:bg-[#fafafa] transition">
            이메일로 시작하기
          </button>
        </Link>

        {/* 이미 계정이 있으신가요 */}
        <div className="mt-4 text-center">
          <span className="text-[13px] text-[#6b6b6b]">이미 계정이 있으신가요? </span>
          <Link href="/login/email" className="text-[13px] text-[#5f0080] font-semibold hover:underline">
            로그인
          </Link>
        </div>`
);
fs.writeFileSync('app/login/page.tsx', login, 'utf8');
console.log('login 완료');

// 2. Header.tsx 수정 - 이름 텍스트 제거, 아이콘만
let header = fs.readFileSync('components/Header.tsx', 'utf8');
header = header.replace(
  `          <button className="auth-user-btn" onClick={() => setOpen(!open)}>
            <span className="auth-avatar auth-pc">{userName ? userName.slice(0,1).toUpperCase() : "U"}</span>
            <span className="auth-username auth-pc">{userName || "내 계정"}</span>
            <svg className="auth-pc" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <svg className="auth-mob" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </button>`,
  `          <button className="auth-user-btn" onClick={() => setOpen(!open)}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#f3e5f5"/>
              <circle cx="16" cy="13" r="5" fill="#5f0080"/>
              <path d="M6 28c0-5.5 4.5-9 10-9s10 3.5 10 9" fill="#5f0080"/>
            </svg>
          </button>`
);
fs.writeFileSync('components/Header.tsx', header, 'utf8');
console.log('header 완료');
