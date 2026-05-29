const fs = require('fs');
let content = fs.readFileSync('components/company/CompanyLayout.tsx', 'utf8');

// 1. 사이드바 로고 아바타 제거
content = content.replace(
  '            <div className="company-logo-avatar">{companyInfo.name.slice(0, 1)}</div>\n',
  ''
);

// 2. 상단 프로필 아바타 제거
content = content.replace(
  '              <div className="company-avatar">{companyInfo.name.slice(0, 1)}</div>\n',
  ''
);

fs.writeFileSync('components/company/CompanyLayout.tsx', content, 'utf8');
console.log('완료');
