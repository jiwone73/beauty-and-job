// 등록 폼이 만든 칸이 저장·조회 어느 한 곳에서 조용히 빠지지 않았는지 본다.
//
// 폼/미리보기/공개화면이 갈라지던 이유는 대부분 여기였다. 폼에 칸을 하나 늘리면
// 미리보기는 바로 보이는데(폼 값을 그대로 태우니까) 저장 API 나 조회 쿼리에
// 그 칸을 안 넣어 놓으면, 저장 뒤에 값이 사라진다. 아무 오류도 안 난다.
// 「배너가 미리보기엔 있는데 공고엔 없다」가 딱 이 경우였다.
//
// 그래서 빌드할 때 세 곳을 대 본다: 폼이 만드는 칸 · 저장 API 두 벌 · 조회.
import { readFileSync } from "node:fs";

const 읽기 = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const 폼 = 읽기("components/jobs/JobPostForm.tsx");
const 시작 = 폼.indexOf("const payload: any = {");
const 끝 = 폼.indexOf("\n    };", 시작);
if (시작 < 0 || 끝 < 0) {
  console.error("✗ JobPostForm 의 저장값(payload) 블록을 못 찾았습니다. 검사 규칙을 고쳐 주세요.");
  process.exit(1);
}
const 블록 = 폼.slice(시작, 끝);
const 칸 = [...new Set([...블록.matchAll(/^\s{6}([a-z_][a-z0-9_]*):/gm)].map((m) => m[1]))];

// 저장하지 않는 것이 맞는 칸. 왜 그런지 적어 둔다.
const 저장안함 = {
  // 업체 행에 남기고 공고에는 안 싣는다. 회원 공고는 업체 정보에서 읽는다.
};
// 조회에서 따로 안 내보내도 되는 칸.
const 조회안함 = {
  job_type: "job_postings.job_type 을 조회 쿼리가 * 로 가져와 그대로 나간다",
};

const 대상 = [
  ["기업회원 저장", 읽기("app/api/company/jobs/route.ts")],
  ["대행 저장", 읽기("app/api/admin/jobs/route.ts")],
  ["조회", 읽기("lib/jobDetail.ts")],
];

const 빠진것 = [];
for (const k of 칸) {
  for (const [이름, 소스] of 대상) {
    if (이름 === "조회" && 조회안함[k]) continue;
    if (이름 !== "조회" && 저장안함[k]) continue;
    if (!new RegExp(`\\b${k}\\b`).test(소스)) 빠진것.push(`${k} → ${이름}`);
  }
}

if (빠진것.length) {
  console.error("✗ 등록 폼이 보내는데 받는 곳이 없는 칸이 있습니다:");
  for (const s of 빠진것) console.error(`   ${s}`);
  console.error("\n  그대로 두면 저장 뒤에 값이 사라져 「미리보기와 실제가 다르다」가 됩니다.");
  console.error("  받는 쪽에 칸을 넣거나, scripts/공고칸검사.mjs 의 예외 목록에 이유를 적어 주세요.");
  process.exit(1);
}
console.log(`✓ 공고 칸 ${칸.length}개 — 저장·조회 모두 받고 있습니다.`);
