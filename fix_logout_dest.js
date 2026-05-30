const fs = require('fs');
let content = fs.readFileSync('components/company/CompanyLayout.tsx', 'utf8');
content = content.replace(
  `              localStorage.removeItem("access_token");
              useAuthStore.getState().logout();
              router.push("/login");`,
  `              localStorage.removeItem("access_token");
              useAuthStore.getState().logout();
              router.push("/company/login");`
);
fs.writeFileSync('components/company/CompanyLayout.tsx', content, 'utf8');
console.log('완료');
