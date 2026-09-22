import type { Metadata } from "next";
import JobsPageClient from "./JobsPageClient";

type SP = Record<string, string | string[] | undefined>;
const 값 = (v: string | string[] | undefined): string => (typeof v === "string" ? v : Array.isArray(v) ? v[0] || "" : "");

/**
 * 필터는 화면 상태로만 바뀌고 주소는 안 바뀐다(components/FilterSheet 등) —
 * 그래서 크롤러가 만날 수 있는 조합은 진입 링크가 실제로 만드는 것뿐이다
 * (지역·직군·매장·오피스, 자유검색어). 지역·직군·매장오피스 조합은 제목을
 * 지어 색인하고, 자유검색어·특정 브랜드처럼 사람마다 달라 색인 가치가
 * 없는 조합은 noindex 로 뺀다. canonical 은 핵심 조건 세 가지만으로
 * 다시 지어, 같은 내용이 여러 주소로 흩어져 색인되는 것을 막는다.
 */
export function generateMetadata({ searchParams }: { searchParams: SP }): Metadata {
  const type = 값(searchParams.type);
  const region = 값(searchParams.region) || 값(searchParams.regions).split(",")[0] || "";
  const job = 값(searchParams.job) || 값(searchParams.group);
  const q = 값(searchParams.q);
  const brand = 값(searchParams.brand);

  const 조각 = [region, job, type].filter(Boolean);
  const 제목 = 조각.length
    ? `${조각.join(" ")} 채용정보 | 뷰티워크`
    : "뷰티 업계 채용정보 | 뷰티워크";
  const 설명 = 조각.length
    ? `${조각.join(" ")} 채용공고를 뷰티워크에서 확인하세요.`
    : "헤어·네일·피부관리 등 뷰티 전문직부터 뷰티 브랜드 사무직까지, 뷰티 업계 채용정보를 한눈에 확인하세요.";

  const canonicalParams = new URLSearchParams();
  if (type) canonicalParams.set("type", type);
  if (region) canonicalParams.set("region", region);
  if (job) canonicalParams.set("job", job);
  const canonicalQuery = canonicalParams.toString();

  const thin = !!q || !!brand;

  return {
    title: 제목,
    description: 설명,
    alternates: { canonical: `/jobs${canonicalQuery ? `?${canonicalQuery}` : ""}` },
    // thin 이 아니면 robots 를 아예 안 넣어 상위(app/layout.tsx, 검색공개
    // 스위치)를 그대로 물려받는다 — 여기서 index:true 를 박으면 오픈 전에도
    // 이 페이지만 새어 나간다.
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function JobsPage() {
  return <JobsPageClient />;
}
