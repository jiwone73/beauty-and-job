/**
 * SNS 이름과 주소 앞부분.
 *
 * 링크명을 치기 시작하면 후보로 뜨고, 고르면 이름과 주소 앞부분이 함께
 * 채워진다. 브라우저 자동완성은 전에 친 글자만 돌려줄 뿐 무엇을 골랐는지
 * 알려 주지 않아 주소까지 채울 수 없다. 그래서 목록을 직접 갖는다.
 */
export type SNS후보 = { 이름: string; 앞부분: string; 별칭: string[] };

export const SNS목록: SNS후보[] = [
  { 이름: "인스타그램",    앞부분: "https://instagram.com/",  별칭: ["insta", "instagram", "ig", "인스타", "인스타그램"] },
  { 이름: "유튜브",        앞부분: "https://youtube.com/@",   별칭: ["yt", "youtube", "유튜브", "유툽"] },
  { 이름: "틱톡",          앞부분: "https://tiktok.com/@",    별칭: ["tiktok", "틱톡"] },
  { 이름: "네이버 블로그",  앞부분: "https://blog.naver.com/", 별칭: ["blog", "naver", "블로그", "네이버"] },
  { 이름: "카카오톡 채널",  앞부분: "https://pf.kakao.com/",   별칭: ["kakao", "카카오", "카톡", "플친"] },
  { 이름: "네이버 예약",    앞부분: "https://booking.naver.com/", 별칭: ["booking", "예약", "네이버예약"] },
  { 이름: "노션",          앞부분: "https://notion.so/",      별칭: ["notion", "노션"] },
  { 이름: "비핸스",        앞부분: "https://behance.net/",    별칭: ["behance", "비핸스"] },
  { 이름: "브런치",        앞부분: "https://brunch.co.kr/@",  별칭: ["brunch", "브런치"] },
];

/** 친 글자로 후보를 고른다. 아무것도 안 쳤으면 아무것도 주지 않는다. */
export function SNS찾기(친것: string, 몇개 = 5): SNS후보[] {
  const q = 친것.trim().toLowerCase();
  if (!q) return [];
  return SNS목록
    .filter((k) => k.이름.toLowerCase().startsWith(q) || k.별칭.some((a) => a.startsWith(q)))
    .slice(0, 몇개);
}
