const fs = require('fs');
let page = fs.readFileSync('app/company/page.tsx', 'utf8');
page = page.replace(
  '<span key={t} className="co-job-tag purple">{t}</span>',
  '<span key={t} className="co-job-tag">{t}</span>'
);
fs.writeFileSync('app/company/page.tsx', page, 'utf8');
let css = fs.readFileSync('app/globals.css', 'utf8');
css = css.split('.co-section { padding: 64px 20px; }').join('.co-section { padding: 32px 20px; }');
fs.writeFileSync('app/globals.css', css, 'utf8');
console.log('완료');
