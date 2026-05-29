const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');

const old1 = 'const customOfficeAreas = officeJobAreas.filter((a) => !PRESET_OFFICE_JOB_AREAS.includes(a));';
const new1 = `const customOfficeAreas = officeJobAreas.filter((a) => !PRESET_OFFICE_JOB_AREAS.includes(a));

  const saveOfficeJobAreas = async (newAreas) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setStoreProfile({ officeJobAreas: newAreas });
    await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({ office_job_areas: newAreas }),
    });
  };`;

const old2 = 'onClick={() => setStoreProfile({ officeJobAreas: officeJobAreas.includes(area) ? officeJobAreas.filter(a=>a!==area) : [...officeJobAreas, area] })}';
const new2 = 'onClick={() => saveOfficeJobAreas(officeJobAreas.includes(area) ? officeJobAreas.filter(a=>a!==area) : [...officeJobAreas, area])}';

const old3 = 'onClick={() => setStoreProfile({ officeJobAreas: officeJobAreas.filter(a=>a!==area) })}';
const new3 = 'onClick={() => saveOfficeJobAreas(officeJobAreas.filter(a=>a!==area))}';

if (!content.includes(old1)) { console.log('1번 못찾음'); process.exit(1); }
if (!content.includes(old2)) { console.log('2번 못찾음'); process.exit(1); }
if (!content.includes(old3)) { console.log('3번 못찾음'); process.exit(1); }

content = content.replace(old1, new1).replace(old2, new2).replace(old3, new3);
fs.writeFileSync('app/profile/page.tsx', content, 'utf8');
console.log('완료');
