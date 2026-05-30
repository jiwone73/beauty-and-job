const fs = require('fs');
let content = fs.readFileSync('app/company/page.tsx', 'utf8');

// 1. constants import 추가 (lucide-react import 다음 줄에)
if (!content.includes('OFFICE_JOB_GROUPS')) {
  content = content.replace(
    'import { CheckCircle2, ChevronDown, ChevronUp, Building2, Store, Star, Zap, Megaphone, ArrowRight, Layers } from "lucide-react";',
    'import { CheckCircle2, ChevronDown, ChevronUp, Building2, Store, Star, Zap, Megaphone, ArrowRight, Layers } from "lucide-react";\nimport { OFFICE_JOB_GROUPS, STORE_SKILL_AREAS } from "@/lib/constants";'
  );
}

// 2. 매장 칩 → STORE_SKILL_AREAS
content = content.replace(
  '{["헤어디자이너","네일아티스트","피부관리사","에스테틱","속눈썹","왁싱","메이크업","매장관리자"].map((t) => (',
  '{STORE_SKILL_AREAS.map((t) => ('
);

// 3. 기업 칩 → OFFICE_JOB_GROUPS
content = content.replace(
  '{["뷰티MD","브랜드마케터","BA","영업관리","교육강사","상품기획","콘텐츠마케터","병원 코디네이터"].map((t) => (',
  '{OFFICE_JOB_GROUPS.map((t) => ('
);

fs.writeFileSync('app/company/page.tsx', content, 'utf8');
console.log('완료');
