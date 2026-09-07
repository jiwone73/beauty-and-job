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

/**
 * 붙여넣은 글을 파싱한다. 양식이 아니면 null 을 돌려 AI 경로로 보낸다.
 *
 * _확실한가 가 true 면 라우트가 AI 호출을 건너뛴다 — 요금이 0 이 된다.
 * 라벨을 셋 이상 찾았을 때만 양식으로 본다(한둘은 우연히 걸린 것일 수 있다).
 */
export function parsePasted(text: string): PastedResult | null {
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
