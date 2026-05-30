const fs = require('fs');
let content = fs.readFileSync('components/company/CompanyLayout.tsx', 'utf8');

// useAuthStore import 추가
content = content.replace(
  'import { useRouter, usePathname } from "next/navigation";',
  'import { useRouter, usePathname } from "next/navigation";\nimport { useAuthStore } from "@/lib/store/authStore";'
);

// 로그아웃 시 authStore도 정리
content = content.replace(
  `            <button className="company-logout-btn" onClick={() => {
              localStorage.removeItem("access_token");
              router.push("/login");
            }}>`,
  `            <button className="company-logout-btn" onClick={() => {
              localStorage.removeItem("access_token");
              useAuthStore.getState().logout();
              router.push("/login");
            }}>`
);

fs.writeFileSync('components/company/CompanyLayout.tsx', content, 'utf8');
console.log('완료');
