const fs = require('fs');
let content = fs.readFileSync('lib/types/company.ts', 'utf8');
content = content.replace(
  'export type CompanyType = "OFFICE" | "STORE";',
  'export type CompanyType = "OFFICE" | "STORE" | "BOTH";'
);
fs.writeFileSync('lib/types/company.ts', content, 'utf8');
console.log('완료');
