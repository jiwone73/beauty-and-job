const fs = require('fs');
let content = fs.readFileSync('app/api/users/me/route.ts', 'utf8');
const lines = content.split('\n');

const insertCode = [
  '  if (office_job_areas !== undefined) {',
  '    sets.push(`office_job_areas = $${idx++}`);',
  '    params.push(office_job_areas);',
  '  }',
  ''
];

// 78번째 줄(0-indexed: 77) 앞에 삽입
lines.splice(77, 0, ...insertCode);

fs.writeFileSync('app/api/users/me/route.ts', lines.join('\n'), 'utf8');
console.log('완료');
