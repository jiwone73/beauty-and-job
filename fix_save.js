const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');

const old = `  const saveOfficeJobAreas = async (newAreas: string[]) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setOfficeJobAreas(newAreas);
    await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({ office_job_areas: newAreas }),
    });
  };`;

const newCode = `  const saveOfficeJobAreas = async (newAreas: string[]) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setOfficeJobAreas(newAreas);
    useAuthStore.getState().login({
      ...useAuthStore.getState(),
      userJobAreas: newAreas,
    });
    await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({ office_job_areas: newAreas }),
    });
  };`;

if (!content.includes(old)) { console.log('못찾음'); process.exit(1); }
content = content.replace(old, newCode);
fs.writeFileSync('app/profile/page.tsx', content, 'utf8');
console.log('완료');
