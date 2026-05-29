const fs = require('fs');
let content = fs.readFileSync('app/login/page.tsx', 'utf8');

// 1. lucide import 추가
content = content.replace(
  `import { useRouter } from "next/navigation";`,
  `import { useRouter } from "next/navigation";
import { Mail, Building2 } from "lucide-react";`
);

// 2. 이메일 버튼 수정
content = content.replace(
  `          <button className="w-full h-[52px] bg-white border border-[#e0e0e0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:bg-[#fafafa] transition">
            이메일로 시작하기
          </button>`,
  `          <button className="w-full h-[52px] bg-white border border-[#c0c0c0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:border-[#5f0080] hover:bg-[#fafafa] transition flex items-center justify-center gap-2">
            <Mail size={18} />
            <span>이메일로 시작하기</span>
          </button>`
);

// 3. 기업회원 버튼 수정
content = content.replace(
  `          <button className="w-full h-[52px] bg-white border border-[#e0e0e0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:bg-[#fafafa] transition">
            기업회원 시작하기
          </button>`,
  `          <button className="w-full h-[52px] bg-white border border-[#c0c0c0] text-[#1a1a1a] rounded-lg font-semibold text-[15px] hover:border-[#5f0080] hover:bg-[#fafafa] transition flex items-center justify-center gap-2">
            <Building2 size={18} />
            <span>기업회원 시작하기</span>
          </button>`
);

fs.writeFileSync('app/login/page.tsx', content, 'utf8');
console.log('완료');
