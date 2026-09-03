import Anthropic from "@anthropic-ai/sdk";
import { ASSIST_MODEL } from "@/lib/ai/models";

/**
 * 자기소개서 초안과 맞춤법 검사.
 *
 * 값은 이미 갖고 있는 것으로 만든다 — 한 줄 소개·희망직군·스킬·경력·자격증·
 * 어학·희망 근무 조건. 헤어인잡처럼 백지에서 키워드를 열두 개 고르게 하지
 * 않는다. 우리는 그 사람이 무엇을 하는 사람인지 이미 알고 있다.
 *
 * 값싸게 두는 법: 비용의 9할이 출력이라 프롬프트 캐시로는 거의 줄지 않는다
 * (하이쿠 4.5 는 4,096 토큰이 넘어야 캐시가 걸리는데 우리 지시문은 그 근처에도
 * 못 간다). 대신 출력을 조인다 — 자소서는 분량을 못 박고, 맞춤법은 고친 전문이
 * 아니라 틀린 곳만 돌려받는다.
 */

export type 이력자료 = {
  이름?: string | null;
  한줄소개?: string | null;
  구직유형?: "STORE" | "OFFICE" | null;
  희망직군?: string[];
  스킬?: string[];
  자격증?: string[];
  어학?: { language?: string | null; level?: string | null }[];
  경력?: { company?: string | null; position?: string | null; department?: string | null;
           startDate?: string | null; endDate?: string | null; description?: string | null }[];
  신입?: boolean;
  희망근무지?: string | null;
  희망급여?: string | null;
  /** 창에서 고른 것 — 우리가 갖고 있지 않은 값이라 물어서 받는다. */
  장점?: string[];
  포부?: string[];
  /** 본인이 한 줄로 적어 준, 꼭 넣고 싶은 말. 비어 있을 수 있다. */
  강조?: string | null;
  /** 공고에 맞춰 쓸 때만 온다. */
  공고?: { 매장?: string | null; 제목?: string | null; 분야?: string | null; 근무지?: string | null } | null;
};

const 있음 = (v?: string | null) => !!String(v ?? "").trim();

/** 사람이 읽는 꼴로 자료를 편다 — 모델에게도 사람에게 주듯 준다. */
function 자료글(d: 이력자료): string {
  const 줄: string[] = [];
  if (있음(d.한줄소개)) 줄.push(`한 줄 소개: ${d.한줄소개}`);
  줄.push(`구직 유형: ${d.구직유형 === "OFFICE" ? "본사·기업" : "매장·현장"}`);
  if (d.희망직군?.length) 줄.push(`희망 직군: ${d.희망직군.join(", ")}`);
  if (d.스킬?.length) 줄.push(`할 수 있는 것: ${d.스킬.join(", ")}`);
  if (d.자격증?.length) 줄.push(`자격증: ${d.자격증.join(", ")}`);
  const 어 = (d.어학 || []).filter((l) => 있음(l.language)).map((l) => `${l.language}(${l.level || ""})`);
  if (어.length) 줄.push(`어학: ${어.join(", ")}`);
  if (d.신입) 줄.push("경력: 신입");
  for (const c of d.경력 || []) {
    const 기간 = [c.startDate, c.endDate || "재직 중"].filter(Boolean).join("~");
    const 뒤 = [c.position, c.department].filter(Boolean).join("·");
    줄.push(`경력: ${c.company || "(매장명 비공개)"} ${기간}${뒤 ? ` / ${뒤}` : ""}${있음(c.description) ? ` / 한 일: ${c.description}` : ""}`);
  }
  if (있음(d.희망근무지)) 줄.push(`희망 근무지: ${d.희망근무지}`);
  if (있음(d.희망급여)) 줄.push(`희망 급여: ${d.희망급여}`);
  if (d.장점?.length) 줄.push(`본인이 고른 장점: ${d.장점.join(", ")}`);
  if (d.포부?.length) 줄.push(`입사 후 하고 싶은 것: ${d.포부.join(", ")}`);
  if (있음(d.강조)) 줄.push(`본인이 꼭 넣고 싶다고 한 말: ${d.강조}`);
  if (d.공고) {
    줄.push("");
    줄.push("[지원하는 공고]");
    if (있음(d.공고.매장)) 줄.push(`매장: ${d.공고.매장}`);
    if (있음(d.공고.제목)) 줄.push(`공고: ${d.공고.제목}`);
    if (있음(d.공고.분야)) 줄.push(`모집분야: ${d.공고.분야}`);
    if (있음(d.공고.근무지)) 줄.push(`근무지: ${d.공고.근무지}`);
  }
  return 줄.join("\n");
}

/* 뷰티업계 매장이 실제로 읽는 자소서의 꼴. 「저는 ~로서 5년 이상의 경력을
   보유한 지원자입니다」로 시작하는 관공서 문투는 이 판에서 안 읽힌다 —
   원장이 보는 것은 손이 되느냐, 손님을 받을 수 있느냐, 오래 다닐 사람이냐다. */
const 자소서지시 = `너는 뷰티 업계(미용실·네일·피부·메이크업·본사) 채용을 오래 본 사람이다.
아래 자료만 가지고 자기소개서 초안을 쓴다.

지켜야 할 것
- 2~3문단, 전체 300~400자. 400자를 넘기지 않는다.
- 매장 원장은 폰으로 지원자를 넘기며 본다. 한 화면에 들어가지 않으면 안 읽힌다.
- 자료에 없는 사실을 지어내지 않는다. 숫자·수상·매출은 자료에 있을 때만 쓴다.
- 고른 장점·포부와 「꼭 넣고 싶다고 한 말」은 반드시 담는다. 다만 그 낱말을
  그대로 옮겨 적지 않는다 — 그러면 누가 써도 같은 글이 된다. 그 사람의 경력·
  시술·직군과 이어 붙여, 그 낱말이 왜 사실인지 보이게 한 문장으로 만든다.
  (「성실함」 → 「12년을 한 매장에서 일했습니다」처럼)
- 「최선을 다하겠습니다」「열정을 가지고」처럼 누구나 쓰는 말은 쓰지 않는다.
- 한 문장은 짧게. 미사여구보다 무엇을 해봤는지가 앞선다.
- 공고 정보가 있으면 마지막 문단에서 그 매장·그 자리에 왜 맞는지로 맺는다.
- 존댓말(~습니다)로 쓴다. 이모지·제목·머리말·따옴표를 넣지 않는다.

문단 구성 (인사말은 넣어도 되고 빼도 된다 — 글에 맞게 알아서 정한다)
1) 지금 무엇을 하는 사람인가 — 직군·연차·할 수 있는 시술이나 업무
2) 어디서 무엇을 해왔나 — 경력에서 가장 무게 있는 것 하나만
3) 여기서 무엇을 하고 싶은가 — 공고가 있으면 그 자리에 맞춰 한두 문장으로

자기소개서 본문만 출력한다. 다른 말은 붙이지 않는다.`;

const 맞춤법지시 = `너는 한국어 교정자다. 아래 글에서 맞춤법·띄어쓰기·오타만 고친다.

지켜야 할 것
- 글의 내용·문체·길이를 바꾸지 않는다. 표현을 다듬지 않는다.
- 틀린 곳만 찾는다. 맞는 곳은 건드리지 않는다.
- 같은 오류가 여러 번 나오면 한 번만 적는다.
- 고칠 것이 없으면 빈 배열을 낸다.

반드시 아래 JSON 배열만 출력한다. 설명·코드블록을 붙이지 않는다.
[{"before":"틀린 표현","after":"고친 표현","why":"띄어쓰기"}]
why 는 「맞춤법」「띄어쓰기」「오타」 중 하나로 짧게 적는다.`;

function 클라이언트() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const 글꺼내기 = (msg: any) =>
  (msg.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();

/** 자기소개서 초안. 출력 분량을 못 박아 요금을 묶는다. */
export async function 자소서짓기(자료: 이력자료): Promise<string> {
  const msg = await 클라이언트().messages.create({
    model: ASSIST_MODEL,
    max_tokens: 600,
    system: 자소서지시,
    messages: [{ role: "user", content: 자료글(자료) }],
  });
  return 글꺼내기(msg);
}

export type 교정 = { before: string; after: string; why: string };

/** 맞춤법 — 고친 전문이 아니라 틀린 곳만 받는다(출력이 5분의 1로 준다). */
export async function 맞춤법보기(글: string): Promise<교정[]> {
  const msg = await 클라이언트().messages.create({
    model: ASSIST_MODEL,
    max_tokens: 700,
    system: 맞춤법지시,
    messages: [{ role: "user", content: 글.slice(0, 2000) }],
  });
  const t = 글꺼내기(msg);
  try {
    const 시작 = t.indexOf("[");
    const 끝 = t.lastIndexOf("]");
    if (시작 < 0 || 끝 < 시작) return [];
    const arr = JSON.parse(t.slice(시작, 끝 + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x: any) => 있음(x?.before) && 있음(x?.after) && x.before !== x.after)
      .slice(0, 20)
      .map((x: any) => ({ before: String(x.before), after: String(x.after), why: String(x.why || "맞춤법") }));
  } catch {
    return [];
  }
}
