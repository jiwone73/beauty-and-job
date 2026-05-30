const fs = require('fs');

// 1. 기업 라벨 purple 제거
let page = fs.readFileSync('app/company/page.tsx', 'utf8');
page = page.replace(
  '<span className="co-label-tag purple">기업·브랜드 채용</span>',
  '<span className="co-label-tag">기업·브랜드 채용</span>'
);
fs.writeFileSync('app/company/page.tsx', page, 'utf8');

// 2. co-combined-title 크기 키우기
let css = fs.readFileSync('app/globals.css', 'utf8');
css = css.split('.co-combined-title {\n  font-size: 18px; font-weight: 800; color: #111; margin-bottom: 4px;\n}').join('.co-combined-title {\n  font-size: clamp(20px, 3vw, 28px); font-weight: 800; color: #111; margin-bottom: 4px;\n}');
fs.writeFileSync('app/globals.css', css, 'utf8');

console.log('완료');
