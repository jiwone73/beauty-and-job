/**
 * 어학 시험 정보를 담고 푸는 곳.
 *
 * user_languages 표에는 test 열 하나뿐이라 시험명·점수·취득년월을 따로 담을
 * 자리가 없다. 열을 새로 만드는 대신 그 한 칸에 구조를 실어 보낸다.
 * 예전에 저장된 맨 글자("TOEIC 900")는 시험명으로 읽는다.
 */
export type 어학시험 = { name: string; score: string; ym: string };

export function 시험읽기(t?: string | null): 어학시험 {
  if (!t) return { name: "", score: "", ym: "" };
  try {
    const o = JSON.parse(t);
    if (o && typeof o === "object") {
      return { name: o.name || "", score: o.score || "", ym: o.ym || "" };
    }
  } catch { /* 옛 값은 그냥 글자다 */ }
  return { name: t, score: "", ym: "" };
}

export function 시험쓰기(v: 어학시험): string {
  return v.name || v.score || v.ym ? JSON.stringify(v) : "";
}

/** 화면에 한 줄로 적을 때. "TOEIC 900 · 2024.05" */
export function 시험한줄(t?: string | null): string {
  const v = 시험읽기(t);
  const 앞 = [v.name, v.score].filter(Boolean).join(" ");
  return [앞, v.ym].filter(Boolean).join(" · ");
}
