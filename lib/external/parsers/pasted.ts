// 붙여넣은 글에서 항목을 읽는다 — AI 없이(요금 0), 해석 없이.
//
// 알바가 붙여넣는 글은 자유 서술이 아니라 정해진 양식을 복사한 것이다.
// 실제로 등록된 붙여넣기 공고를 다 열어 보니 양식이 둘뿐이었다.
//
//   양식 A(카페 번호 양식)   1) 샵명 : … 2) 대표자 : … 3) 전화번호 : …
//                            6) 근무시간 : … 7) 경력 : … 8) 급여 : … 9) 휴일 : …
//   양식 B(마름모 양식)      ◇ 모집분야 / ◇ 담당업무 / ◇ 자격요건 / ◇ 우대사항
//
// 라벨이 고정이라 「그 라벨 다음에 적힌 글자」를 그대로 가져오면 된다.
// 값이 비어 있으면 비워 둔다 — 아래 자유 서술에서 찾아 채우지 않는다.

import { getSigunguList } from "@/lib/data/regions";

export type PastedResult = Record<string, any> & { _확실한가?: boolean };

/** 「1) 샵명 :」 「◇ 모집분야」 처럼 항목을 여는 줄인가
 *
 *  가운뎃점(·)과 붙임표(-)는 넣지 않는다. 그건 항목을 여는 기호가 아니라 값 안에서
 *  쓰는 불릿이다. 넣었더니 「◇ 모집분야」 다음 줄 「·브랜드마케」를 새 항목으로 봐
 *  모집분야가 빈 값이 됐다. 전각 공백(　)도 들여쓰기로 쓰이니 같이 걷는다. */
const 항목머리 = /^[\s\u3000]*(?:\(?\d{1,2}\s*[).]|[◇◆■□▶▷※✔✅☑❖▪▫]|\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*|[【\[])[\s\u3000]*/u;

/** 기호 없이 「근무 시간 : 11시~9시」처럼 콜론 하나로만 적은 항목도 흔하다.
 *
 *  콜론 앞이 짧은 말일 때만 항목으로 본다. 길면 그건 라벨이 아니라 문장이다.
 *  시각(「14 : 00 ~ 15 : 00」)과 비율(「3.3 : 1」)은 숫자로 시작하니 걸러진다. */
const 콜론라벨 = /^[\s\u3000]*([가-힣A-Za-z][가-힣A-Za-z0-9\s\u3000/·()]{1,11})[:：](?![0-9])/;

function 머리인가(line: string): boolean {
  return 항목머리.test(line) || 콜론라벨.test(line);
}

/** 라벨 이름만 남긴다: "1) 전화번호 :" → "전화번호" */
function 라벨(line: string): string {
  // 콜론 뒤가 숫자면 그건 항목을 가르는 콜론이 아니라 시각이다(「평일 09:30~19:00」).
  // 안 거르면 라벨이 「평일09」가 된다.
  return line.replace(항목머리, "").replace(/[:：](?![0-9])[\s\S]*$/, "")
    .replace(/[】\]]/g, "").replace(/\s+/g, "").trim();
}
/** 같은 줄에 붙은 값: "3) 전화번호 : 010-1234-5678" → "010-1234-5678" */
function 같은줄값(line: string): string {
  const m = line.match(/[:：](?![0-9])(.*)$/);
  return m ? m[1].replace(/[\u3000]/g, " ").trim() : "";
}

/** 라벨 → 그 아래(또는 옆)에 적힌 글자 그대로. 없으면 넣지 않는다. */
export function 양식읽기(text: string): Record<string, string> {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const 표: Record<string, string> = {};
  for (let i = 0; i < lines.length; i++) {
    if (!머리인가(lines[i])) continue;
    const key = 라벨(lines[i]);
    if (!key || key.length > 12) continue;
    let val = 같은줄값(lines[i]);
    // 라벨만 있는 줄이면 다음 항목 머리를 만날 때까지가 그 값이다.
    if (!val) {
      const buf: string[] = [];
      for (let j = i + 1; j < lines.length && !머리인가(lines[j]); j++) buf.push(lines[j]);
      // 값 앞의 불릿과 전각 공백만 걷는다. 낱말은 건드리지 않는다.
      val = buf.map((l) => l.replace(/^[\s\u3000]*[·・‧•]\s*/, "").replace(/[\u3000]/g, " ").trimEnd())
        .join("\n").trim();
    }
    if (val && !표[key]) 표[key] = val;
  }
  return 표;
}

// 양식이 쓰는 라벨 이름 → 우리 칸. 같은 뜻을 여러 이름으로 적는다.
const 칸이름: Record<string, string[]> = {
  company_name: ["샵명", "업체명", "매장명", "회사명", "상호"],
  contact_name: ["대표자", "담당자", "채용담당자"],
  contact_phone: ["전화번호", "연락처", "문의", "지원문의", "전화"],
  address: ["샵위치", "위치", "주소", "근무지", "근무지역"],
  work_time: ["근무시간", "영업시간", "근무시간대", "근무시간및휴무"],
  career: ["경력", "자격요건", "지원자격"],
  salary: ["급여", "급여조건", "월급", "시급", "급여및복지"],
  work_days: ["휴일", "휴무", "근무요일"],
  job_category_raw: ["모집분야", "모집부문", "채용분야", "구인분야", "직무", "담당업무"],
  main_duties: ["담당업무", "업무내용", "주요업무"],
  preferred: ["우대사항", "우대조건"],
  benefits: ["복리후생", "복지", "혜택", "복지및근무환경", "근무환경"],
  company_description: ["매장특징", "샵특성", "매장소개", "샵소개"],
  extra_notes: ["조건", "근무조건", "지원방법", "하고픈말", "기타", "4대보험유/무", "4대보험"],
};


// ───────────── 라벨이 없을 때: 값 모양으로 읽는다 ─────────────
//
// 「급여 :」 같은 항목 이름이 없어도 「월 350만원」 「11:00 ~ 21:00」 처럼 값 자체가
// 모양을 갖춘 것들이 있다. 모양이 정해져 있으니 코드로 읽으면 된다 — 찍는 것이
// 아니라 글자를 그대로 옮기는 것이다.
//
// 다만 금액이라고 다 급여는 아니다. 정착지원금·성장축하금·보증금처럼 급여가
// 아닌 것이 분명한 말이 같은 줄에 있으면 읽지 않는다.
//   매출·객단가는 거르지 않는다. 「월 350만원 이상 가능」이라 적고 다음 줄에서
//   「예약이 많아 매출 올리기 좋다」고 설명하는 식이라, 그 줄 자체는 급여다.
const 급여아닌줄 = /정착지원금|성장축하금|축하금|입사지원금|위약금|권리금|월세|보증금|퇴직금|교육비|재료비/;
const 급여모양 = [
  // 단위를 앞에 붙인 것: 「월 350만원 이상」 「시급 13,000원」 「기본급 250만원」
  /(?:연봉|월급|월|시급|일급|주급|기본급|초봉)\s*[가-힣]{0,4}\s*[\d,]+\s*(?:만원|원|만)?\s*(?:이상|~|부터)?/,
  // 단위만 뒤에 있는 것: 「250만원 이상」 「3200 + 인센티브」
  /[\d,]+\s*만원\s*(?:이상|~|부터)?/,
];
const 전화모양 = /(?:1[0-9]{3}[-.\s]?[0-9]{4})|(?:0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4})/;
/** 「010.6851.7582」 「01044072072」를 「010-6851-7582」로. 숫자는 그대로 두고 꼴만 맞춘다. */
function 전화꼴(v: string): string {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (d.length === 10) return d.replace(/(\d{2,3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  if (d.length === 8) return d.replace(/(\d{4})(\d{4})/, "$1-$2");
  return v;
}
const 시간모양 = /(?:오전|오후)?\s*\d{1,2}\s*[:시]\s*\d{0,2}\s*분?\s*[~\-–]\s*(?:오전|오후)?\s*\d{1,2}\s*[:시]\s*\d{0,2}\s*분?/;
const 휴무모양 = /(?:월|화|수|목|금|토|일)요일\s*(?:고정\s*)?휴(?:무|일)|주\s*[1-7]\s*일\s*(?:근무)?|월\s*\d{1,2}\s*회\s*휴무|격주\s*[1-7]?\s*일?/;
const 경력모양 = new RegExp([
  "경력\\s*무관", "초보\\s*(?:가능|환영)", "신입\\s*(?:가능|환영|모집)?",
  // 「경력 2년 이상」 「샵경력 6개월 이상」 「3년 이상 경력」 — 년·개월 둘 다 본다.
  "(?:샵\\s*)?경력\\s*\\d{1,2}\\s*(?:년|개월)\\s*(?:이상|차)?",
  "\\d{1,2}\\s*(?:년|개월)\\s*(?:이상|차)\\s*경력",
].join("|"));

/** 줄들에서 그 모양에 처음 맞는 글자를 그대로 돌려준다. 없으면 "". */
function 모양읽기(lines: string[], 모양: RegExp | RegExp[], 거르개?: RegExp): string {
  const 모양들 = Array.isArray(모양) ? 모양 : [모양];
  for (const line of lines) {
    if (거르개 && 거르개.test(line)) continue;
    for (const re of 모양들) {
      const m = line.match(re);
      if (m) return m[0].replace(/\s+/g, " ").trim();
    }
  }
  return "";
}


/** 라벨로 잡은 값에서 그 칸에 맞는 조각만 남긴다.
 *
 *  「🩵 급여」 아래에는 금액 말고도 「기존 예약이 많은 매장이라…」 같은 설명이
 *  줄줄이 붙는다. 그걸 통째로 급여 칸에 넣으면 화면이 깨진다. 값 모양에 맞는
 *  조각을 원문에서 잘라 오고, 못 찾으면 첫 줄만 쓴다. 지어내는 것은 없다. */
function 값다듬기(v: string, 모양: RegExp | RegExp[], 거르개?: RegExp): string {
  const 줄 = String(v || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const 조각 = 모양읽기(줄, 모양, 거르개);
  if (조각) return 조각;
  // 모양에 안 맞으면 첫 줄이 짧을 때만 쓴다 — 「추후협의」·「면접 후 결정」처럼
  // 금액이 없는 답도 값이기 때문이다. 길면 그건 값이 아니라 설명 문장이고
  // (「입사 시 아래 2가지 급여제 중 선택 가능합니다…」), 거르개에 걸리는 줄도
  // 값이 아니다(「성장축하금 200만원」). 그런 경우엔 비워서 아래 전체 검색에
  // 넘긴다 — 라벨 밖에 진짜 값이 있을 수 있다.
  const 첫줄 = (줄[0] || "").replace(/\s+/g, " ").trim();
  if (!첫줄 || 첫줄.length > 20) return "";
  if (거르개 && 거르개.test(첫줄)) return "";
  return 첫줄;
}

/** 항목 값에서 이모지·장식 기호를 걷는다. 폼의 한 칸에 들어갈 값이라 글자만 남긴다.
 *  (상세요강은 원문 그대로 두므로 여기 걸지 않는다.) */
function 값글자만(v: string): string {
  return String(v || "").replace(/[\p{So}\p{Extended_Pictographic}\uFE0F\u200D]/gu, " ")
    .replace(/\s{2,}/g, " ").trim();
}


// ───────────── 나머지 칸도 값 모양으로 읽는다 ─────────────

const 시도표: Record<string, string> = {
  서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시", 인천: "인천광역시",
  광주: "광주광역시", 대전: "대전광역시", 울산: "울산광역시", 세종: "세종특별자치시",
  경기: "경기도", 강원: "강원특별자치도", 충북: "충청북도", 충남: "충청남도",
  전북: "전북특별자치도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도", 제주: "제주특별자치도",
};
const 시도말 = Object.keys(시도표).join("|");

/** 「경기도 시흥 은계지구」 「서울시 양화로6길 18」처럼 시도로 시작하는 주소 한 줄. */
const 주소모양 = new RegExp(`(?:${시도말})(?:특별자치도|특별자치시|특별시|광역시|도|시)?\\s*[가-힣0-9]{1,10}(?:시|군|구)?[^\\n]{0,40}`);

/** 주소에서 「시도 시군구」를 뽑는다. 못 뽑으면 "".
 *
 *  「경기도 시흥 은계지구」처럼 「시」를 빼고 적는 사람이 많아, 실제 시군구 표와
 *  맞춰 본다. 표에 있는 이름만 쓰므로 지어내는 것이 아니다. */
function 지역뽑기(addr: string): string {
  const t = String(addr || "");
  const sm = t.match(new RegExp(`(${시도말})`));
  if (!sm) return "";
  const 시도 = 시도표[sm[1]] || sm[1];
  const 후보 = getSigunguList(시도);
  // 긴 이름부터 본다 — 「고양시 일산동구」가 「고양시」보다 먼저 맞아야 한다.
  const 맞는것 = [...후보].sort((a, b) => b.length - a.length)
    .find((g) => t.includes(g) || t.includes(g.replace(/(시|군|구)$/, "")));
  return 맞는것 ? `${시도} ${맞는것}` : 시도;
}

// 폼이 가진 선택지 그대로. 글에 그 말이 있을 때만 고른다.
// 「인턴」은 넣지 않는다. 매장에서 인턴은 고용형태가 아니라 자리(인턴·신입·경력·
// 실장)다. 넣었더니 「디자이너&인턴 구인중!」 공고의 고용형태가 인턴이 됐다.
const 고용형태모양 = /정규직|계약직|아르바이트|파트타임|파트\s*타임|프리랜서|스페어|스페아|일용직|3\.3\s*%/;
const 고용형태맞춤: Record<string, string> = {
  "파트타임": "아르바이트", "파트 타임": "아르바이트", "스페아": "스페어", "3.3%": "프리랜서", "3.3 %": "프리랜서",
};
const 학력모양 = /학력\s*무관|고등학교\s*졸업(?:\s*이상)?|고졸(?:\s*이상)?|전문대\s*졸(?:업)?(?:\s*이상)?|대학교?\s*졸업(?:\s*이상)?|대졸(?:\s*이상)?|초대졸(?:\s*이상)?/;
const 성별모양 = /성별\s*무관|남녀\s*무관|여성?\s*(?:분\s*)?(?:만|우대|선호)|남성?\s*(?:분\s*)?(?:만|우대|선호)/;
const 마감모양 = /채용\s*시\s*까지|상시\s*(?:채용|모집)|수시\s*(?:채용|모집)|\d{1,2}\s*월\s*\d{1,2}\s*일\s*까지|\d{4}[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2}\s*까지/;

/** 매장 이름. 「리안헤어 마들역점」처럼 브랜드 + 지점으로 끝나는 말을 그대로 가져온다. */
const 매장이름모양 = /[가-힣A-Za-z0-9()]{2,20}\s*(?:[가-힣A-Za-z0-9]{1,12}(?:점|지점|본점|센터|아카데미|살롱|샵|스튜디오))/;


/** 직종명을 우리 직군 이름으로 맞춘다.
 *
 *  글이 쓰는 말과 우리 직군 이름이 다르다(「헤어스탭」 → 「헤어 스텝」).
 *  글에 그 말이 실제로 있을 때만 고른다 — 없는 직군을 만들지 않는다.
 *  셀렉트미 파서가 쓰는 표와 같은 규칙이라, 한쪽만 고쳐 갈라지지 않게 여기 모아 둔다. */
const 직종표: [RegExp, string][] = [
  [/바버|barber/i, "바버(Barber)"],
  [/헤어\s*디자이너|헤어디자이너/, "헤어 디자이너"],
  [/헤어\s*스[탭텝태]프?|헤어스[탭텝]|미용\s*스[탭텝태]프?|샴푸|헤어\s*인턴|미용\s*보조/, "헤어 스텝"],
  [/메이크업/, "메이크업 아티스트"],
  [/네일/, "네일 아티스트"],
  [/속눈썹|래쉬|반영구/, "속눈썹·반영구 아티스트"],
  [/왁싱|제모/, "왁싱·제모 전문가"],
  [/피부\s*관리|에스테틱|피부관리사|뷰티스트/, "피부 관리사(일반·경락)"],
  [/발\s*관리|문제성\s*발|풋\s*케어/, "문제성 네일 손발톱 관리사"],
  [/두피|탈모/, "두피 관리사"],
  [/샵\s*매니저|샵매니저|점장/, "샵매니저"],
  [/원장|부원장/, "헤어 디자이너"],
];

/** 글에서 직군을 고른다. 맞는 말이 없으면 빈 배열 — 찍지 않는다. */
function 직군읽기(글: string): string[] {
  const n = String(글 || "").replace(/\s/g, "");
  const out: string[] = [];
  for (const [re, cat] of 직종표) {
    if (re.test(글) || re.test(n)) { if (!out.includes(cat)) out.push(cat); }
  }
  return out.slice(0, 3);
}

/**
 * 붙여넣은 글을 파싱한다. 양식이 아니면 null 을 돌려 AI 경로로 보낸다.
 *
 * _확실한가 가 true 면 라우트가 AI 호출을 건너뛴다 — 요금이 0 이 된다.
 * 라벨을 셋 이상 찾았을 때만 양식으로 본다(한둘은 우연히 걸린 것일 수 있다).
 */
export function parsePasted(text: string, 제목 = ""): PastedResult | null {
  const 표 = 양식읽기(text);
  const out: Record<string, any> = {};
  let 찾은수 = 0;
  for (const [칸, 이름들] of Object.entries(칸이름)) {
    // 이름이 그대로 있으면 그것으로. 없으면 「모집분야및급여」처럼 두 항목을 한 줄에
    // 적은 라벨을 찾는다 — 값은 손대지 않고 그대로 담으니 섞여 있어도 잃는 것이 없다.
    const 맞는이름 = 이름들.find((n) => 표[n]) || 이름들.find((n) => Object.keys(표).some((k) => k.includes(n)));
    if (!맞는이름) continue;
    const key = 표[맞는이름] ? 맞는이름 : Object.keys(표).find((k) => k.includes(맞는이름))!;
    out[칸] = 표[key];
    찾은수++;
  }
  // 라벨로 잡은 값은 설명 문장까지 딸려 오므로 그 칸에 맞는 조각만 남긴다.
  if (out.salary) out.salary = 값다듬기(out.salary, 급여모양, 급여아닌줄);
  if (out.work_time) out.work_time = 값다듬기(out.work_time, 시간모양);
  if (out.work_days) out.work_days = 값다듬기(out.work_days, 휴무모양);
  if (out.career) out.career = 값다듬기(out.career, 경력모양);
  // 「◇ 지원문의」 아래에는 번호 다음 줄까지 붙어 온다("…3691\n본 채용정보에 관심 가").
  if (out.contact_phone) out.contact_phone = 전화꼴(값다듬기(out.contact_phone, 전화모양));

  // 라벨로 못 채운 칸은 글 전체에서 값 모양으로 한 번 더 읽는다.
  const 줄들 = String(text || "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!out.salary) { const v = 모양읽기(줄들, 급여모양, 급여아닌줄); if (v) { out.salary = v; 찾은수++; } }
  if (!out.work_time) { const v = 모양읽기(줄들, 시간모양); if (v) { out.work_time = v; 찾은수++; } }
  if (!out.work_days) { const v = 모양읽기(줄들, 휴무모양); if (v) { out.work_days = v; 찾은수++; } }
  if (!out.career) { const v = 모양읽기(줄들, 경력모양); if (v) { out.career = v; 찾은수++; } }
  if (!out.contact_phone) { const v = 모양읽기(줄들, 전화모양); if (v) { out.contact_phone = 전화꼴(v); 찾은수++; } }

  // 주소·지역. 라벨(「샵 위치」)로 못 잡았으면 시도로 시작하는 줄을 찾는다.
  if (!out.address) { const v = 모양읽기(줄들, 주소모양); if (v) { out.address = v; 찾은수++; } }
  if (out.address) { const r = 지역뽑기(out.address); if (r) out.region = r; }
  if (!out.region) { const v = 모양읽기(줄들, 주소모양); const r = 지역뽑기(v); if (r) out.region = r; }

  // 고용형태·학력·성별·마감 — 폼 선택지에 있는 말이 글에 나올 때만 고른다.
  {
    const 원말 = 모양읽기(줄들, 고용형태모양);
    if (원말) out.employment_type = 고용형태맞춤[원말.replace(/\s/g, "")] || 고용형태맞춤[원말] || 원말;
  }
  if (!out.education) { const v = 모양읽기(줄들, 학력모양); if (v) out.education = v; }
  if (!out.gender_preference) {
    const v = 모양읽기(줄들, 성별모양);
    if (v) out.gender_preference = /무관/.test(v) ? "무관" : /^여/.test(v) ? "여성" : "남성";
  }
  {
    const v = 모양읽기(줄들, 마감모양);
    if (v && /채용\s*시|상시|수시/.test(v)) out.always_open = true;
    else if (v) out.deadline_text = v;
  }

  // 직군. 근거는 공고명과 「모집분야」 칸뿐이다 — 상세요강은 안 본다.
  //   (본문을 보면 「교육 시스템」 같은 자랑글에 강사 직군이 딸려 왔다.)
  {
    // 담당업무는 근거로 쓰지 않는다. 왁싱 공고의 업무에 「속눈썹펌(교육제공)」이
    // 적혀 있어 속눈썹 직군이 딸려 왔다 — 뽑는 자리는 제목과 모집분야 칸에 있다.
    const 근거 = [제목, out.job_category_raw].filter(Boolean).join(" ");
    const cats = 직군읽기(근거);
    if (cats.length) { out.job_categories = cats; 찾은수++; }
  }

  // 매장 이름. 제목에 대개 「리안헤어 마들역점」처럼 들어 있다.
  if (!out.company_name) {
    const v = 모양읽기(줄들.slice(0, 4), 매장이름모양);
    if (v) { out.company_name = v; 찾은수++; }
  }

  // 한 칸에 들어갈 값들은 글자만 남긴다. 상세요강은 원문 그대로라 여기 안 걸린다.
  for (const k of ["salary", "work_time", "work_days", "career", "company_name", "contact_name", "address", "job_category_raw", "employment_type", "education"]) {
    if (out[k]) out[k] = 값글자만(out[k]);
  }

  // 항목이 넷 이상 늘어선 글은 양식이 확실하다. 그 경우엔 우리 칸으로 옮겨진 것이
  // 둘만 되어도 양식으로 본다(「조건」「매장특징」처럼 우리에게 칸이 없는 항목이 섞인다).
  const 항목수 = Object.keys(표).length;
  if (찾은수 < 3 && !(항목수 >= 4 && 찾은수 >= 2)) return null;
  // 「4대보험 : 유」처럼 양식에만 있는 항목은 우리 칸이 없다 — 버리지 말고 비고로.
  const 쓴이름 = new Set(Object.values(칸이름).flat());
  const 남은것 = Object.entries(표)
    .filter(([k]) => !쓴이름.has(k) && !Object.values(out).includes(표[k]))
    .map(([k, v]) => `${k}: ${v}`);
  if (남은것.length) out.extra_notes = [out.extra_notes, ...남은것].filter(Boolean).join("\n");
  out.parsed_by = "pasted";
  out._확실한가 = 찾은수 >= 5;
  return out;
}
