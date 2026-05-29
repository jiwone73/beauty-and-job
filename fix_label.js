const fs = require('fs');
let content = fs.readFileSync('components/company/CompanyLayout.tsx', 'utf8');
content = content.replace(
  'category: res.data.company_type === "OFFICE" ? "기업·브랜드" : "매장·살롱",',
  'category: res.data.company_type === "OFFICE" ? "기업·브랜드" : res.data.company_type === "STORE" ? "매장·살롱" : "기업+매장",'
);
fs.writeFileSync('components/company/CompanyLayout.tsx', content, 'utf8');
console.log('완료');
