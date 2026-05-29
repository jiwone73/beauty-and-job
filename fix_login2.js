const fs = require('fs');
let content = fs.readFileSync('app/login/page.tsx', 'utf8');
const lines = content.split('\n');

// 60~75번줄 (0-indexed: 59~74) 교체
lines.splice(59, 16,
  '        {/* 기업회원 */}',
  '        <Link href="/company/signup" className="mt-3 block">',
  '          <button className="w-full h-[52px] bg-white border border-[#e0e0e0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:bg-[#fafafa] transition">',
  '            기업회원 시작하기',
  '          </button>',
  '        </Link>',
  '',
  '        {/* 이미 계정이 있으신가요 */}',
  '        <div className="mt-6 text-center">',
  '          <span className="text-[13px] text-[#6b6b6b]">이미 계정이 있으신가요? </span>',
  '          <Link href="/login/email" className="text-[13px] text-[#5f0080] font-semibold hover:underline">',
  '            로그인',
  '          </Link>',
  '        </div>'
);

fs.writeFileSync('app/login/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
