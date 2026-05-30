const fs = require('fs');
let content = fs.readFileSync('app/profile/resume/page.tsx', 'utf8');
content = content.replace(
  `  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    // DB에서 프로필 동기화`,
  `  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    // DB에서 프로필 동기화`
);
fs.writeFileSync('app/profile/resume/page.tsx', content, 'utf8');
console.log('완료');
