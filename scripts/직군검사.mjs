// 직군·경력 목록이 화면마다 따로 놀지 않는지 검사한다.
//
// 실제로 두 번 어긋났다. 한 번은 인재검색 화면이 「5-10년」·「10년+」을 보내는데
// 서버에 그 둘이 없어 골라도 전체가 나왔고, 또 한 번은 단계표에 적힌 대분류
// 이름이 실제 이름과 달라(「뷰티 리테일(매장)」) 매장 공고에 본사 단계가 떴다.
// 눈으로 보면 멀쩡해 보이는 종류의 어긋남이라 검사로 잡는다.
//
//   node scripts/직군검사.mjs
import { readFileSync } from "node:fs";

const 원본 = readFileSync("lib/data/jobGroups.ts", "utf8");
const 흠 = [];

const 토막 = (여기서, 저기까지) => 원본.slice(원본.indexOf(여기서), 원본.indexOf(저기까지));
const 대분류들 = (토막글) => [...토막글.matchAll(/group: "([^"]+)",\s*items: \[(.*?)\]/gs)]
  .map((m) => ({ 이름: m[1], 항목: [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]) }));

const 매장 = 대분류들(토막("export const STORE_JOB_GROUPS", "export const OFFICE_JOB_GROUPS"));
const 본사 = 대분류들(토막("export const OFFICE_JOB_GROUPS", "// 소분류 → 대분류"));

// 1) 매장 대분류는 모두 단계표에 있어야 한다. 없으면 조용히 본사 연차로 떨어진다.
const 단계표 = 토막("const 단계표", "/** 대분류의 경력 단계");
const 키들 = [...단계표.matchAll(/^\s*"([^"]+)":/gm)].map((m) => m[1]);
for (const g of 매장) {
  if (!키들.includes(g.이름)) 흠.push(`단계표에 「${g.이름}」이 없다 — 매장인데 본사 연차가 뜬다`);
}
for (const k of 키들) {
  if (!매장.some((g) => g.이름 === k)) 흠.push(`단계표의 「${k}」는 그런 대분류가 없다`);
}

// 2) 소분류 이름은 겹치면 안 된다. 검색어·필터가 이름으로만 찾는다.
for (const [무엇, 묶음] of [["매장", 매장], ["본사", 본사]]) {
  const 셈 = {};
  묶음.flatMap((g) => g.항목).forEach((i) => { 셈[i] = (셈[i] || 0) + 1; });
  Object.entries(셈).filter(([, n]) => n > 1)
    .forEach(([i]) => 흠.push(`${무엇} 소분류 「${i}」가 두 번 있다`));
}

// 3) 직군 목록을 제 손으로 또 쓴 화면이 없어야 한다.
//    (인재검색이 경력 목록을 따로 들고 있다가 서버와 어긋났었다.)
//    한두 번 스쳐 나오는 것은 소개 문구다 — 세 개 넘게 나오면 목록을 베낀 것이다.
import { execSync } from "node:child_process";
const 모든항목 = [...매장, ...본사].flatMap((g) => g.항목);
const 코드들 = execSync(`git ls-files 'app/**/*.tsx' 'app/**/*.ts' 'components/**/*.tsx' 'components/**/*.ts'`,
  { encoding: "utf8" }).split("\n").filter(Boolean);
for (const f of 코드들) {
  const 글 = readFileSync(f, "utf8");
  const 든것 = new Set(모든항목.filter((i) => 글.includes(`"${i}"`)));
  if (든것.size >= 3) 흠.push(`${f} 에 직군 이름이 ${든것.size}개 박혀 있다 — jobGroups 에서 가져와야 한다`);
}

if (흠.length) {
  console.error("직군 검사 실패\n" + 흠.map((h) => " - " + h).join("\n"));
  process.exit(1);
}
console.log(`직군 검사 통과 — 매장 ${매장.length}묶음 ${매장.flatMap((g) => g.항목).length}개, ` +
            `본사 ${본사.length}묶음 ${본사.flatMap((g) => g.항목).length}개`);
