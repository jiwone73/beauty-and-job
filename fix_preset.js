const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');

const old = `const PRESET_OFFICE_JOB_AREAS = [
  "브랜드 마케팅",
  "디지털·퍼포먼스 마케팅",
  "콘텐츠·PR·SNS",
  "MD·상품기획",
  "영업·채널영업",
  "글로벌 사업",
  "R&D·연구개발",
  "디자인·VMD",
  "생산·품질",
  "구매·SCM·물류",
  "경영지원",
  "데이터·IT",
];`;

const newCode = `const PRESET_OFFICE_JOB_AREAS = [
  "마케팅",
  "MD·상품기획",
  "영업·글로벌",
  "R&D·연구개발",
  "디자인·VMD",
  "SCM·물류·구매",
  "경영·재무·회계",
  "HR·교육",
  "IT·데이터",
  "CS·고객경험",
  "법무·컴플라이언스",
  "기타",
];`;

if (!content.includes(old)) { console.log('못찾음'); process.exit(1); }
content = content.replace(old, newCode);
fs.writeFileSync('app/profile/page.tsx', content, 'utf8');
console.log('완료');
