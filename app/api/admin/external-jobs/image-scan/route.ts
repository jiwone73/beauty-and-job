export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { dhashHex, fetchImageBuf, extractPostingImages, classifyOrigin } from "@/lib/external/imageHash";

const isOwnSite = (source: string) => /자사|homepage|자사홈/i.test(source || "");

// 활성공고 목록 이미지 출처 분석(증분): 이미 해시된 공고는 건너뛰고, 새 공고만 fetch·해시·저장.
//   판정: 이미지가 (외부호스트=company) or (자사홈 출처) or (같은 해시가 2개 이상 사이트에 존재) → 기업 제공.
//   요청당 최대 40건(그 이상은 클라이언트가 나눠서 반복 호출).
export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const postings: { url: string; source: string }[] = (Array.isArray(b.postings) ? b.postings : [])
    .map((p: any) => ({ url: String(p?.url || ""), source: String(p?.source || "") }))
    .filter((p: { url: string }) => /^https?:\/\//i.test(p.url))
    .slice(0, 15);
  if (!postings.length) return err("VALIDATION_001", "분석할 공고가 없어요.", 400);

  const client = await pool.connect();
  try {
    // 캐시에 없는 공고만 fetch·해시·저장(증분)
    for (const p of postings) {
      const cached = await client.query("SELECT 1 FROM job_image_hashes WHERE posting_url = $1 LIMIT 1", [p.url]);
      if (cached.rowCount) continue;
      let ext: { images: string[]; protected: boolean } = { images: [], protected: false };
      try { ext = await extractPostingImages(p.url); } catch { ext = { images: [], protected: false }; }
      if (!ext.images.length) {
        // 이미지 없음도 '분석 완료'로 기록(재분석 방지) — 빈 해시 행
        await client.query(
          `INSERT INTO job_image_hashes (posting_url, image_url, source, hash, host_origin, site_protected)
           VALUES ($1, '', $2, '', 'none', $3) ON CONFLICT (posting_url, image_url) DO NOTHING`,
          [p.url, p.source, ext.protected]
        );
        continue;
      }
      const ref = (() => { try { return "https://" + new URL(p.url).hostname + "/"; } catch { return ""; } })();
      // 한 공고의 이미지들은 병렬 다운로드·해시(타임아웃 여유 확보)
      const hashed = await Promise.all(ext.images.map(async (iu) => {
        const buf = await fetchImageBuf(iu, ref);
        return { iu, hash: buf ? await dhashHex(buf) : null };
      }));
      for (const { iu, hash } of hashed) {
        await client.query(
          `INSERT INTO job_image_hashes (posting_url, image_url, source, hash, host_origin, site_protected)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (posting_url, image_url) DO NOTHING`,
          [p.url, iu, p.source, hash || "", classifyOrigin(iu), ext.protected]
        );
      }
    }

    // 요청된 공고들의 저장 이미지 조회
    const urls = postings.map((p) => p.url);
    const rows = (await client.query(
      `SELECT posting_url, image_url, source, hash, host_origin, site_protected FROM job_image_hashes WHERE posting_url = ANY($1)`,
      [urls]
    )).rows;
    // 교차대조: 같은 해시가 2개 이상 서로 다른 source에 존재하면 공용(기업 제공, 재사용 안전)
    const hashes = [...new Set(rows.map((r) => r.hash).filter(Boolean))];
    const shared = new Set<string>();
    if (hashes.length) {
      const g = await client.query(
        "SELECT hash, count(DISTINCT source) AS n FROM job_image_hashes WHERE hash = ANY($1) AND hash <> '' GROUP BY hash",
        [hashes]
      );
      for (const r of g.rows) if (Number(r.n) >= 2) shared.add(r.hash);
    }

    // 공고별 판정(과단정 금지): 확실히 기업 제공(외부호스트·자사홈·교차대조 일치)만 company,
    // 나머지 사이트 CDN 이미지는 '확인 필요'(업체 업로드인지 사이트 편집인지 자동 판별 불가).
    const byPosting = new Map<string, any[]>();
    for (const r of rows) { const a = byPosting.get(r.posting_url) || []; a.push(r); byPosting.set(r.posting_url, a); }
    const results = postings.map((p) => {
      const all = byPosting.get(p.url) || [];
      const imgs = all.filter((r) => r.image_url);
      const isCompanyImg = (r: any) => r.host_origin === "company" || isOwnSite(r.source) || (r.hash && shared.has(r.hash));
      const companyCount = imgs.filter(isCompanyImg).length;
      const badge = imgs.length === 0 ? "none" : companyCount > 0 ? "company" : "uncertain";
      const isProtected = all.some((r) => r.site_protected);
      return { url: p.url, badge, image_count: imgs.length, company_image_count: companyCount, protected: isProtected };
    });
    return ok({ results, analyzed: postings.length });
  } finally {
    client.release();
  }
}
