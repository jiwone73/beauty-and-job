const fs = require('fs');
const lines = fs.readFileSync('app/company/page.tsx', 'utf8').split('\n');

// 1. split 2개 섹션 삭제 (125~163번 줄, 인덱스 124~162)
// 125번 줄 직전이 "{/* ── 3. 매장·샵 채용 서비스 ── */}"
const startIdx = lines.findIndex(l => l.includes('── 3. 매장·샵 채용 서비스 ──'));
const ctaIdx = lines.findIndex(l => l.includes('── 가입 CTA ──'));
if (startIdx === -1 || ctaIdx === -1) { console.log('못찾음'); process.exit(1); }
// startIdx부터 ctaIdx 직전까지 삭제
lines.splice(startIdx, ctaIdx - startIdx);

fs.writeFileSync('app/company/page.tsx', lines.join('\n'), 'utf8');
console.log('split 삭제 완료 (줄 ' + (startIdx+1) + '~' + ctaIdx + ')');
