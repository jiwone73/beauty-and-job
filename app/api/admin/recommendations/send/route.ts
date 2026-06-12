export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { sendJobRecommendationEmail } from "@/lib/email";
import { getGroupOfItem, getJobSubGroups, JobType } from "@/lib/data/jobGroups";

const RECOMMENDATION_TERM_ID = "fb392275-4dc3-45cd-ad26-c59b3e571cee";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beauty-and-job.vercel.app";

const JOB_TYPE_LABEL: Record<string, string> = {
  OFFICE: "사무직",
  STORE: "매장·기술직",
  BOTH: "맞춤",
};

function unsubToken(userId: string) {
  return crypto.createHmac("sha256", process.env.CRON_SECRET || "").update(userId).digest("hex");
}
function sidoPrefix(s: any) {
  return s ? String(s).trim().slice(0, 2) : "";
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) {
    return err("AUTH_001", "인증이 필요합니다.", 401);
  }

  const onlyEmail = req.nextUrl.searchParams.get("onlyEmail") || undefined;

  const recipients = await pool.query(
    `SELECT u.id, u.email, u.name, u.job_type, u.region_sido, u.preferred_regions, u.office_job_areas
     FROM users u
     JOIN term_agreements ta ON ta.owner_type='user' AND ta.owner_id=u.id
     WHERE ta.term_id=$1 AND u.status='ACTIVE'
       ${onlyEmail ? "AND u.email=$2" : ""}`,
    onlyEmail ? [RECOMMENDATION_TERM_ID, onlyEmail] : [RECOMMENDATION_TERM_ID]
  );

  let sent = 0, skipped = 0;
  const errors: string[] = [];

  for (const u of recipients.rows) {
    try {
      // 지역 우선순위: preferred_regions > region_sido
      const prefixes: string[] = [];
      const pr = Array.isArray(u.preferred_regions) ? u.preferred_regions : [];
      for (const r of pr) { const p = sidoPrefix(r?.sido); if (p) prefixes.push(`${p}%`); }
      if (prefixes.length === 0) { const p = sidoPrefix(u.region_sido); if (p) prefixes.push(`${p}%`); }
      const likeArr = prefixes.length ? prefixes : ["%"];

      // 세부직군(L3) → 중분류(L2) → 산하 전체 세부로 확장 (중분류 하드매칭용)
      const jt: JobType = u.job_type === "STORE" ? "STORE" : "OFFICE";
      const areas: string[] = Array.isArray(u.office_job_areas) ? u.office_job_areas : [];
      const groups = new Set<string>();
      for (const a of areas) { const g = getGroupOfItem(jt, a); if (g) groups.add(g); }
      const expanded: string[] = [];
      for (const g of groups) for (const it of getJobSubGroups(jt, g)) expanded.push(it);
      const exactAreas = areas.filter((a) => getGroupOfItem(jt, a) !== null); // 정확 세부일치 정렬용

      const params: any[] = [u.job_type, likeArr, exactAreas];
      let groupFilter = "";
      if (expanded.length) {
        params.push(expanded); // $4
        groupFilter = "AND jp.categories && $4::text[]"; // 중분류 하드필터
      }

      const jobs = await pool.query(
        `SELECT jp.id, jp.title, jp.location, jp.experience_level,
                c.brand_name, c.company_name, c.logo_url,
                CASE WHEN jp.categories && $3::text[] THEN 1 ELSE 0 END AS category_match,
                CASE WHEN jp.location LIKE ANY($2::text[]) THEN 1 ELSE 0 END AS region_match
         FROM job_postings jp
         JOIN companies c ON c.id = jp.company_id
         WHERE jp.job_type = $1
           AND jp.status = 'ACTIVE'
           AND (jp.deadline IS NULL OR jp.deadline >= NOW())
           ${groupFilter}
         ORDER BY category_match DESC, region_match DESC, jp.created_at DESC
         LIMIT 6`,
        params
      );

      if (jobs.rowCount === 0) { skipped++; continue; }

      const unsubscribeUrl = `${SITE_URL}/api/email/unsubscribe?u=${u.id}&t=${unsubToken(u.id)}`;
      const label = JOB_TYPE_LABEL[u.job_type] || "맞춤";
      await sendJobRecommendationEmail(u.email, u.name, label, jobs.rows, unsubscribeUrl);
      sent++;
    } catch (e: any) {
      errors.push(`${u.email}: ${e?.message || "error"}`);
    }
  }

  return ok({ total: recipients.rowCount, sent, skipped, errors });
}
