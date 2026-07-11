export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

// 내 위치(위경도) 기준 반경 내 진행중 공고를 거리순으로 반환
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = Math.min(parseFloat(searchParams.get("radius") || "2"), 50); // km, 최대 50
  const type = searchParams.get("type"); // STORE | OFFICE | (없으면 전체)
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);

  if (isNaN(lat) || isNaN(lng)) {
    return err("BAD_REQUEST", "위치 정보(lat, lng)가 필요합니다.", 400);
  }

  const params: any[] = [lat, lng];
  let idx = 3;
  const typeCond =
    type === "STORE" || type === "OFFICE"
      ? `AND jp.job_type = $${idx++}`
      : "";
  if (typeCond) params.push(type);

  // 거리(km) = 하버사인. LEAST(1, ...)로 부동소수 반올림 도메인 에러 방지
  const sql = `
    SELECT * FROM (
      SELECT
        jp.id, jp.title, jp.job_type, jp.location, jp.deadline,
        jp.salary_min, jp.salary_type, jp.experience_level,
        c.id AS company_id, c.company_name, c.brand_name, c.logo_url,
        c.latitude, c.longitude,
        (6371 * acos(LEAST(1,
          cos(radians($1)) * cos(radians(c.latitude)) *
          cos(radians(c.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(c.latitude))
        ))) AS distance_km
      FROM job_postings jp
      JOIN companies c ON c.id = jp.company_id
      WHERE jp.status = 'ACTIVE'
        AND (jp.deadline IS NULL OR jp.deadline >= NOW())
        AND c.latitude IS NOT NULL
        AND c.longitude IS NOT NULL
        ${typeCond}
    ) t
    WHERE t.distance_km <= $${idx++}
    ORDER BY t.distance_km ASC
    LIMIT $${idx++}
  `;
  params.push(radius, limit);

  try {
    const result = await pool.query(sql, params);
    return ok({ jobs: result.rows, count: result.rowCount });
  } catch (e: any) {
    console.error("[jobs/nearby]", e);
    return err("SERVER_ERROR", "주변 공고 조회 중 오류가 발생했습니다.", 500);
  }
}
