const fs = require('fs');
let content = fs.readFileSync('app/login/email/page.tsx', 'utf8');
content = content.replace(
  `            <Link href="/login/password-reset" className="hover:text-[#5f0080] hover:underline">
              비밀번호 재설정
            </Link>
          </div>`,
  `            <Link href="/login/password-reset" className="hover:text-[#5f0080] hover:underline">
              비밀번호 재설정
            </Link>
            <span>·</span>
            <Link href="/login/find-account" className="hover:text-[#5f0080] hover:underline">
              계정 찾기
            </Link>
          </div>`
);
fs.writeFileSync('app/login/email/page.tsx', content, 'utf8');
console.log('완료');
