const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// 1. signupStore에서 officeJobAreas 제거 (줄 53, 0-indexed: 52)
lines[52] = '    skillAreas, workTypePrefer, regionPrefer, setStoreProfile,';

// 2. userName 선언 앞에 로컬 state 추가 (줄 55, 0-indexed: 54)
lines.splice(54, 0, '  const [officeJobAreas, setOfficeJobAreas] = useState<string[]>([]);');

// 3. DB 읽어올 때 로컬 state로 (줄 96~98이었는데 splice로 1줄 밀림 → 96,97,98)
// 다시 찾아서 교체
let joined = lines.join('\n');
joined = joined.replace(
  'if (res.data.office_job_areas?.length > 0) {\n            setStoreProfile({ officeJobAreas: res.data.office_job_areas });\n          }',
  'if (res.data.office_job_areas?.length > 0) {\n            setOfficeJobAreas(res.data.office_job_areas);\n          }'
);

// 4. saveOfficeJobAreas 함수에서 setStoreProfile 대신 setOfficeJobAreas
joined = joined.replace(
  '    setStoreProfile({ officeJobAreas: newAreas });',
  '    setOfficeJobAreas(newAreas);'
);

fs.writeFileSync('app/profile/page.tsx', joined, 'utf8');
console.log('완료');
