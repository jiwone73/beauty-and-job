const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync("grep -rln 'logo.png' app components", { encoding: 'utf8' })
  .trim().split('\n').filter(f => !f.endsWith('.bak'));

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  // logo.png가 포함된 줄 찾기
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('logo.png')) {
      // 앞 3줄 정도를 봐서 Link로 감싸졌는지 확인
      const context = lines.slice(Math.max(0, i - 3), i + 1).join(' ');
      const hasLink = context.includes('<Link') || context.includes('href');
      const hasOnClick = context.includes('onClick') || context.includes('router.push') || context.includes('cursor');
      if (!hasLink && !hasOnClick) {
        console.log(`[링크없음] ${file}:${i + 1}`);
      }
    }
  });
});
console.log('--- 검사 완료 ---');
