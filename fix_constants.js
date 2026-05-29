const fs = require('fs');
let content = fs.readFileSync('lib/constants.ts', 'utf8');

const oldOffice = `export const OFFICE_JOB_GROUPS = [
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
] as const;`;

const newOffice = `export const OFFICE_JOB_GROUPS = [
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
] as const;`;

const oldStore = `export const STORE_SKILL_AREAS = [
  "헤어",
  "네일",
  "피부관리",
  "메이크업",
  "속눈썹",
  "왁싱",
  "스파·에스테틱",
  "반영구",
] as const;`;

const newStore = `export const STORE_SKILL_AREAS = [
  "헤어",
  "네일",
  "피부관리·에스테틱",
  "메이크업·아티스트",
  "반영구·속눈썹",
  "왁싱·제모",
  "마사지·테라피",
  "두피관리",
  "타투·바디아트",
  "샵매니저",
  "뷰티강사·교육",
  "기타",
] as const;`;

if (!content.includes(oldOffice)) { console.log('오피스 못찾음'); process.exit(1); }
if (!content.includes(oldStore)) { console.log('매장 못찾음'); process.exit(1); }

content = content.replace(oldOffice, newOffice).replace(oldStore, newStore);
fs.writeFileSync('lib/constants.ts', content, 'utf8');
console.log('완료');
