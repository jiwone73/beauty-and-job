const fs = require('fs');

// 1. 이메일 가입
let email = fs.readFileSync('app/api/auth/email/signup/route.ts', 'utf8');
email = email.replace(
  `  const { email, name, phone, password, birth, gender, job_type = 'OFFICE', agreed_term_ids } = await req.json()`,
  `  const { email, name, phone: rawPhone, password, birth, gender, job_type = 'OFFICE', agreed_term_ids } = await req.json()
  const phone = (rawPhone || '').replace(/\\D/g, '')`
);
fs.writeFileSync('app/api/auth/email/signup/route.ts', email, 'utf8');

// 2. OTP 가입
let otp = fs.readFileSync('app/api/auth/signup/route.ts', 'utf8');
otp = otp.replace(
  `    phone,`,
  `    phone: rawPhone,`
);
// 구조분해 뒤 정규화 — 첫 번째 if문 앞에 삽입
otp = otp.replace(
  `  if (!phone || !name || !job_type) {`,
  `  const phone = (rawPhone || '').replace(/\\D/g, '')
  if (!phone || !name || !job_type) {`
);
fs.writeFileSync('app/api/auth/signup/route.ts', otp, 'utf8');

// 3. 기업 가입
let company = fs.readFileSync('app/api/auth/company/signup/route.ts', 'utf8');
company = company.replace(
  `    email, phone, password, address, website_url, description,`,
  `    email, phone: rawPhone, password, address, website_url, description,`
);
company = company.replace(
  `  if (!company_name || !business_number || !company_type || !email || !phone || !password) {`,
  `  const phone = (rawPhone || '').replace(/\\D/g, '')
  if (!company_name || !business_number || !company_type || !email || !phone || !password) {`
);
fs.writeFileSync('app/api/auth/company/signup/route.ts', company, 'utf8');

console.log('완료');
