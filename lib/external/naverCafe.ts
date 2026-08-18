// 네이버 카페 구인글 발견.
//
// 카페는 크롤링이 막혀 있다(cafe.naver.com/robots.txt → Disallow: /).
// 대신 네이버 검색 API 의 카페글 검색은 공식 경로라 이걸 쓴다.
//
// API 가 주는 건 제목·요약·링크·카페명 넷뿐이다. 작성일을 안 주므로
// '최근 N일' 같은 필터를 걸 수 없고, 링크로 중복만 걸러낸다.

import pool from "@/lib/db";

const ENDPOINT = "https://openapi.naver.com/v1/search/cafearticle.json";

// 미용 직종 구인글이 걸리는 검색어. 늘리면 그만큼 API 호출이 는다.
export const CAFE_KEYWORDS = [
  "미용실 구인",
  "헤어디자이너 구인",
  "헤어 스텝 구인",
  "미용실 직원구함",
  "네일 구인",
  "속눈썹 구인",
  "왁싱 구인",
  "피부관리사 구인",
  "메이크업 구인",
];

// 검색어에 걸리지만 우리 일이 아닌 카페들.
// 실제로 최신 800건을 세어 보니 절반이 여기서 나왔다 —
// 시술 모델 모집(모델나라), 외식업(푸드앤잡), 애견미용, 유학·간호 등.
const EXCLUDE_CAFE = new RegExp([
  "모델나라", "푸드앤잡", "애견", "워홀", "밴쿠버", "캐나다", "간호조무사",
  "미용학원", "직업전문학교", "요양", "성형외과\\s*모델",
  // 실제로 모아 보고 추가한 것들 — 코스프레·인형 분장, 자격증 카페, 부동산·생활 카페.
  "보부상", "키덜트", "코스프레", "DOF", "인형",
  "벼룩시장", "기출", "공무원", "청소동우회", "분양", "입주",
].join("|"));

// 제목·요약이 채용이 아니라 '시술 모델' 모집인 경우도 걸러낸다.
const EXCLUDE_TEXT = new RegExp([
  "모델\\s*(모집|구합|구해|구인)", "무료\\s*시술",
  "커트\\s*모델", "펌\\s*모델", "염색\\s*모델",
  // 미용이 아니라 분장·인형 쪽
  "코스프레", "코스어", "구체관절", "메쿠사", "팀코",
].join("|"));

// 구인글로 볼 만한 낱말. 제목이나 요약 어느 쪽에 있어도 통과시킨다.
//
// 느슨하게 잡는 게 맞다. 진짜 구인글을 버리면 그 기회는 사라지지만,
// 일반 글이 섞이면 알바가 '제외'를 한 번 누르면 끝이다.
// (제목만 보고 조였더니 "에이바헤어 …에서 함께하실 헤어디자이너"처럼
//  '모집'이란 말을 안 쓴 진짜 구인글이 걸러졌다.)
const JOB_WORDS = new RegExp([
  "구인", "구직", "모집", "구합", "구해", "구함", "채용",
  "모십", "모심", "모삽", "찾습", "찾아", "급구", "초빙", "영입",
  "함께하실", "함께할", "함께 하실", "일하실", "출근",
  "스텝", "스탭", "직원", "실장", "원장", "디자이너", "알바",
].join("|"));

export type CafeLead = {
  link: string;
  title: string;
  summary: string;
  cafeName: string;
  cafeUrl: string;
  keyword: string;
};

const strip = (s: string) =>
  String(s || "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** 검색어 하나를 조회해 쓸 만한 글만 돌려준다. */
export async function searchCafe(keyword: string, display = 100): Promise<CafeLead[]> {
  const id = (process.env.NAVER_CLIENT_ID || "").trim();
  const secret = (process.env.NAVER_CLIENT_SECRET || "").trim();
  if (!id || !secret) throw new Error("네이버 검색 API 키가 없습니다.");

  const url = `${ENDPOINT}?display=${display}&sort=date&query=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, {
    headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
  });
  if (!res.ok) throw new Error(`네이버 카페 검색 ${res.status}`);
  const json = await res.json();

  const out: CafeLead[] = [];
  for (const it of json.items || []) {
    const cafeName = strip(it.cafename);
    if (EXCLUDE_CAFE.test(cafeName)) continue;
    const title = strip(it.title);
    const summary = strip(it.description);
    if (!JOB_WORDS.test(`${title} ${summary}`)) continue;
    if (EXCLUDE_TEXT.test(`${title} ${summary}`)) continue;
    if (!it.link) continue;
    out.push({ link: it.link, title, summary, cafeName, cafeUrl: strip(it.cafeurl), keyword });
  }
  return out;
}

/** 모든 검색어를 돌아 중복 없이 모은다. */
export async function collectCafeLeads(keywords = CAFE_KEYWORDS): Promise<CafeLead[]> {
  const byLink = new Map<string, CafeLead>();
  for (const kw of keywords) {
    try {
      for (const lead of await searchCafe(kw)) {
        if (!byLink.has(lead.link)) byLink.set(lead.link, lead);
      }
    } catch (e) {
      // 한 검색어가 실패해도 나머지는 계속 모은다.
      console.error("[cafe search]", kw, (e as Error).message);
    }
  }
  return [...byLink.values()];
}

/** 새 글만 넣는다. 링크가 기준이라 이미 본 글은 건드리지 않는다. */
export async function saveLeads(leads: CafeLead[]) {
  let added = 0;
  for (const l of leads) {
    const r = await pool.query(
      `INSERT INTO cafe_leads (link, title, summary, cafe_name, cafe_url, keyword)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (link) DO NOTHING`,
      [l.link, l.title, l.summary, l.cafeName, l.cafeUrl, l.keyword]
    );
    added += r.rowCount || 0;
  }
  return added;
}
