import type { MetadataRoute } from "next";
import pool from "@/lib/db";

const 사이트 = "https://beautywork.co.kr";

// 정적 페이지 + 동적 콘텐츠(진행 중인 채용공고·승인된 회사·게시된 공지·
// 이벤트)를 한 파일로 낸다(50,000개 한도에 한참 못 미쳐 여러 파일로
// 나눌 필요가 없다). 마감·삭제된 공고, 미승인/정지 회사, 미게시 글은
// 각 조건에서 자연히 빠진다 — 죽은 주소를 검색엔진에 새로 알리지
// 않기 위해서다. 현장이야기(/stories)는 이번 오픈에서 비공개라
// (lib/storiesGate.js) 아예 넣지 않는다.
//
// 시딩해 둔 샘플 회사·공고(is_sample=true)도 뺀다 — 실제로 지워질
// 데이터라 사이트맵에 올려 색인을 태울 이유가 없다.
//
// robots.ts 가 오픈 전까지 전체 수집을 막아 두므로, 이 사이트맵도
// 실제로는 오픈(2026-10-12) 전까지 아무도 안 가져간다. 그때 robots.ts·
// next.config.js·app/layout.tsx 의 robots 를 셋 다 풀면 이 파일도 같이 산다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const 고정 = [
    { path: "", priority: 1 },
    { path: "/jobs", priority: 0.8 },
    { path: "/about", priority: 0.6 },
    { path: "/notice", priority: 0.5 },
    { path: "/event", priority: 0.5 },
    { path: "/salary", priority: 0.5 },
    { path: "/support/faq", priority: 0.4 },
    { path: "/support/start", priority: 0.4 },
    { path: "/support/info", priority: 0.3 },
    { path: "/support/download", priority: 0.3 },
    { path: "/support/policy", priority: 0.2 },
    { path: "/support/policy/refund", priority: 0.2 },
    { path: "/support/terms", priority: 0.2 },
    { path: "/support/privacy", priority: 0.2 },
  ].map(({ path, priority }) => ({
    url: `${사이트}${path}`,
    changeFrequency: "daily" as const,
    priority,
  }));

  const [공고, 회사, 공지] = await Promise.all([
    pool.query(
      `SELECT id, updated_at FROM job_postings
        WHERE status = 'ACTIVE' AND is_sample IS NOT TRUE`
    ),
    pool.query(
      `SELECT id, updated_at FROM companies
        WHERE status = 'ACTIVE' AND is_sample IS NOT TRUE`
    ),
    pool.query(
      `SELECT id, updated_at FROM notices WHERE status = 'published'`
    ),
  ]);

  const 공고들 = 공고.rows.map((r) => ({
    url: `${사이트}/jobs/${r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));
  const 회사들 = 회사.rows.map((r) => ({
    url: `${사이트}/brands/${r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));
  const 공지들 = 공지.rows.map((r) => ({
    url: `${사이트}/notice/${r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  return [...고정, ...공고들, ...회사들, ...공지들];
}
