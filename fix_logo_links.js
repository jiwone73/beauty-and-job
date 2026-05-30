const fs = require('fs');

const targets = [
  'app/signup/email/page.tsx',
  'app/admin/login/page.tsx',
  'app/page.tsx',
  'app/login/find-account/page.tsx',
  'app/login/password-reset/[token]/page.tsx',
  'app/login/password-reset/page.tsx',
  'app/login/page.tsx',
  'app/login/email/page.tsx',
  'app/company/signup/page.tsx',
  'app/company/login/page.tsx',
  'components/signup/Step1Select.tsx',
];

targets.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  const before = content;

  // Link import 확인 및 추가
  if (!content.includes('import Link from "next/link"')) {
    // 첫 import 줄 뒤에 추가
    content = content.replace(
      /(import .+ from .+;\n)/,
      `$1import Link from "next/link";\n`
    );
  }

  // <Image ... logo.png ... /> 를 찾아서 <Link href="/">로 감싸기
  // logo.png를 포함한 <Image .../> 태그 매칭
  content = content.replace(
    /(<Image\s+[^>]*logo\.png[^>]*\/>)/g,
    '<Link href="/">$1</Link>'
  );

  if (content !== before) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`수정: ${file}`);
  } else {
    console.log(`변경없음(확인필요): ${file}`);
  }
});
console.log('--- 완료 ---');
