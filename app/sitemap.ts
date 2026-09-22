import type { MetadataRoute } from "next";
import pool from "@/lib/db";

const 사이트 = "https://beautywork.co.kr";

// 정적 페이지 + 진행 중인 채용공고를 한 파일로 낸다(50,000개 한도에
// 한참 못 미쳐 여러 파일로 나눌 필요가 없다). 마감·삭제된 공고는
// status='ACTIVE' 조건에서 자연히 빠진다 — 죽은 채용공고 URL을
// 검색엔진에 새로 알리지 않기 위해서다.
//
// robots.ts 가 오픈 전까지 전체 수집을 막아 두므로, 이 사이트맵도
// 실제로는 오픈(2026-10-12) 전까지 아무도 안 가져간다. 그때 robots.ts·
// next.config.js·app/layout.tsx 의 robots 를 셋 다 풀면 이 파일도 같이 산다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const 고정 = ["", "/jobs", "/about", "/notice", "/event"].map((path) => ({
    url: `${사이트}${path}`,
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const { rows } = await pool.query(
    `SELECT id, updated_at FROM job_postings WHERE status = 'ACTIVE'`
  );
  const 공고들 = rows.map((r) => ({
    url: `${사이트}/jobs/${r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [...고정, ...공고들];
}
