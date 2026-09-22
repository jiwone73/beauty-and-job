import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { 공고읽기 } from "@/lib/jobDetail";
import { jobCompanyName } from "@/lib/companyName";
import { formatSalaryWon } from "@/lib/salary";
import JobDetailClient from "./JobDetailClient";

// 공고를 서버에서 읽어 HTML 에 실어 보낸다. 예전에는 껍데기만 보내고 브라우저가
// JS 를 다 받아 붙인 뒤에야 공고를 요청해서, 새 탭으로 열면(관리자 목록에서
// 공고명을 누르면 늘 새 탭이다) 몇 초씩 '불러오는 중'만 떠 있었다.
export const dynamic = "force-dynamic";

// 조회 자체가 실패(DB 일시 오류)한 것과 정말 없는 공고(삭제·미등록)를
// 가른다 — 앞의 것까지 404로 박으면 한 번 흔들렸다고 검색엔진이 그 URL을
// 지워 버린다. 마감(CLOSED)은 공고읽기()가 그대로 내어 준다 — 실제
// 삭제와 달리 다시 열릴 수 있고, 지원한 사람·회사가 계속 봐야 해서
// 404로 막지 않는다(대신 검색 노출만 뺀다 — 아래 generateMetadata).
async function 안전하게읽기(id: string) {
  try {
    return { 공고: await 공고읽기(id), 오류: false };
  } catch {
    return { 공고: null, 오류: true };
  }
}

// cover_images·company.cover_images 는 { url } 객체 배열이다 — 문자열인 줄
// 알고 그대로 openGraph.images 에 넣으면 Next 가 내부에서 그 값으로 경로를
// 만들다가 "path 인자는 문자열이어야" 에러를 내며 페이지 전체가 500 난다.
function 대표이미지(공고: NonNullable<Awaited<ReturnType<typeof 공고읽기>>>): string | undefined {
  const 첫장 = Array.isArray(공고.cover_images) ? 공고.cover_images[0] : null;
  return 첫장?.url || 공고.company?.logo_url || undefined;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { 공고 } = await 안전하게읽기(params.id);
  if (!공고) return {};

  const 회사 = jobCompanyName(공고.job_type, 공고.company?.company_name, 공고.company?.brand_name);
  const 제목 = `${공고.title} | ${회사} 채용 - 뷰티워크`;
  const 급여 = formatSalaryWon(공고.salary_min, 공고.salary_type);
  const 지역 = 공고.location || 공고.address || "";
  const 설명 = [회사, 지역, 급여].filter(Boolean).join(" · ") +
    ` — 뷰티워크에서 지원하세요.`;
  const 이미지 = 대표이미지(공고);

  return {
    title: 제목,
    description: 설명,
    alternates: { canonical: `/jobs/${params.id}` },
    openGraph: {
      title: 제목,
      description: 설명,
      url: `/jobs/${params.id}`,
      images: 이미지 ? [{ url: 이미지 }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: 제목,
      description: 설명,
      images: 이미지 ? [이미지] : undefined,
    },
    // 마감된 공고는 더 이상 뽑는 자리가 아니라 검색에 새로 태울 이유가
    // 없다 — 페이지 자체는 살려 두되(지원자·회사가 봐야 함) 색인만 뺀다.
    ...(공고.status === "CLOSED" ? { robots: { index: false, follow: true } } : {}),
  };
}

// 채용공고 구조화 데이터(schema.org JobPosting) — 네이버·구글의 채용정보
// 노출(잡서치류 리치 리절트)에 쓰인다. 실제 화면에 적힌 값과 달라지면
// 스팸으로 판단될 수 있어, 표시 문구를 새로 짓지 않고 있는 값만 그대로 옮긴다.
function 구조화데이터(공고: NonNullable<Awaited<ReturnType<typeof 공고읽기>>>, id: string) {
  const 회사 = jobCompanyName(공고.job_type, 공고.company?.company_name, 공고.company?.brand_name);
  // employment_type 은 "정규직,알바,스페어"처럼 한글 자유 조합으로 저장돼 있어
  // schema.org 의 고정 값(FULL_TIME 등)으로 안전하게 못 옮긴다 — 잘못된 값을
  // 넣느니 이 칸은 비워 둔다(권장 항목이라 없어도 무효화되지 않는다).
  const json: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: 공고.title,
    description: 공고.description || 공고.responsibilities || 공고.title,
    identifier: {
      "@type": "PropertyValue",
      name: "뷰티워크",
      value: id,
    },
    datePosted: 공고.created_at ? String(공고.created_at).slice(0, 10) : undefined,
    validThrough: 공고.deadline || undefined,
    hiringOrganization: {
      "@type": "Organization",
      name: 회사 || undefined,
      logo: 공고.company?.logo_url || undefined,
    },
    jobLocation: (공고.address || 공고.location) ? {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: 공고.address || 공고.location,
        addressRegion: 공고.company?.region_sido || undefined,
        addressCountry: "KR",
      },
    } : undefined,
    baseSalary: 공고.salary_min ? {
      "@type": "MonetaryAmount",
      currency: "KRW",
      value: {
        "@type": "QuantitativeValue",
        value: 공고.salary_min,
        unitText: 공고.salary_type === "HOURLY" ? "HOUR" : 공고.salary_type === "DAILY" ? "DAY" : "MONTH",
      },
    } : undefined,
  };
  return json;
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  // 못 읽어도 화면은 띄운다 — 브라우저가 한 번 더 물어보고 없으면 안내를 낸다.
  const { 공고: 미리, 오류 } = await 안전하게읽기(params.id);
  if (!미리 && !오류) notFound();

  // 마감된 공고는 이제 채용 중이 아니므로 JobPosting 구조화 데이터를 빼야
  // 한다 — 실제로 안 뽑는 자리를 채용 중이라고 검색엔진에 계속 알리는
  // 셈이 된다(구글 채용정보 가이드라인 위반 소지).
  const 채용중 = 미리 && 미리.status !== "CLOSED";

  return (
    <>
      {채용중 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(구조화데이터(미리!, params.id)) }}
        />
      )}
      <JobDetailClient 미리={미리} />
    </>
  );
}
