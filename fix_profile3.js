const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// 97번줄 (0-indexed: 96) - setStoreProfile → setOfficeJobAreas
lines[96] = '            setOfficeJobAreas(res.data.office_job_areas);';

// 223번줄 (0-indexed: 222) - setStoreProfile → setOfficeJobAreas
lines[222] = '    setOfficeJobAreas([...officeJobAreas, v]);';

fs.writeFileSync('app/profile/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
