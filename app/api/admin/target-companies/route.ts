export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 비회원 컨택 대상 업체 리스트(아웃리치 관리대장) 목록·수정·추가·삭제.
// 테이블: target_companies (migrations/2026-08-09_target_companies*.sql)

// 수정 가능한 컬럼 화이트리스트
const EDITABLE = new Set([
  "brand_name", "group_name", "category", "homepage",
  "is_hiring", "is_registered", "phone", "email",
  "scale", "features", "note",
]);
const HIRING_VALUES = new Set(["채용중", "없음", "확인필요", "미확인"]);
const REG_VALUES = new Set(["미등록", "등록완료", "보류"]);

// 활성공고 제목으로 매장/오피스 추정(외부업체 리스트 UI와 동일 규칙).
//   ① 뚜렷한 본사 사무직 신호 → OFFICE  ② 뚜렷한 매장 시술 신호 → STORE
//   ③ 그 외: 제목에 지점(○○점/역/동)이 있으면 매장, 없으면 오피스.
function hasBranch(title: string): boolean {
  return /([가-힣A-Za-z0-9]{2,}(?:역|동|점|지점))/.test(title || "");
}
function guessStoreOffice(title: string): "STORE" | "OFFICE" {
  const t = (title || "").replace(/\s/g, "");
  if (/인허가|regulatory|품질관리|머천다이저|상품기획|브랜드매니저|퍼포먼스마케팅|재무|회계|세무|법무|구매담당|물류|SCM|인사담당|채용담당|경영지원|전략기획|해외영업|수출입|개발자|엔지니어|데이터분석|약무|약사|고객센터|상담사|콜센터|본사|사무직|디렉터|기획자|마케터|영업|리크루터|헤드헌터|MD채용|재택|자산운용|펀드|운용역|증권|투자|금융|렌탈|설치기사|생산직|제조|영양사/i.test(t)) return "OFFICE";
  if (/디자이너|스타일리스트|스탭|스태프|스텝|인턴|네일|속눈썹|왁싱|피부관리|에스테틱|메이크업|바버|헤어|원장|실장|미용사|점장|샵마스터|관리사|테라피|두피|시술|샴푸/.test(t)) return "STORE";
  return hasBranch(title) ? "STORE" : "OFFICE";
}

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const sp = new URL(req.url).searchParams;
  const group = (sp.get("group") || "").trim();
  const hiring = (sp.get("hiring") || "").trim();
  const reg = (sp.get("reg") || "").trim();
  const phone = (sp.get("phone") || "").trim();  // y=있음 | n=없음
  const email = (sp.get("email") || "").trim();  // y=있음 | n=없음
  const q = (sp.get("q") || "").trim();

  const where: string[] = [];
  const params: unknown[] = [];
  if (group) { params.push(group); where.push(`group_name = $${params.length}`); }
  if (hiring) { params.push(hiring); where.push(`is_hiring = $${params.length}`); }
  if (reg) { params.push(reg); where.push(`is_registered = $${params.length}`); }
  if (phone === "y") where.push(`(phone IS NOT NULL AND phone <> '')`);
  else if (phone === "n") where.push(`(phone IS NULL OR phone = '')`);
  if (email === "y") where.push(`(email IS NOT NULL AND email <> '')`);
  else if (email === "n") where.push(`(email IS NULL OR email = '')`);
  if (q) { params.push(`%${q}%`); where.push(`(brand_name ILIKE $${params.length} OR features ILIKE $${params.length})`); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, group_name, seq, brand_name, category, homepage,
              is_hiring, is_registered, phone, email, scale, features, note,
              found_jobs, found_count, last_checked_at, linked_company_id,
              created_at, updated_at
         FROM target_companies
         ${whereSql}
         ORDER BY group_name, seq NULLS LAST, brand_name`,
      params
    );
    // 그룹별 카운트(필터 무시한 전체) — 필터 탭 배지용
    const counts = await client.query(
      `SELECT group_name, COUNT(*)::int AS cnt,
              COUNT(*) FILTER (WHERE is_hiring = '채용중')::int AS hiring_cnt,
              COUNT(*) FILTER (WHERE is_registered = '등록완료')::int AS registered_cnt,
              COALESCE(SUM(found_count), 0)::int AS active_cnt
         FROM target_companies GROUP BY group_name`
    );
    // 6개 탭 전체 활성공고를 제목으로 매장/오피스 추정 집계
    const jobsRes = await client.query(
      `SELECT found_jobs FROM target_companies WHERE found_count > 0 AND found_jobs IS NOT NULL`
    );
    let storeTotal = 0, officeTotal = 0;
    for (const row of jobsRes.rows) {
      const jobs = Array.isArray(row.found_jobs) ? row.found_jobs : [];
      for (const j of jobs) {
        if (guessStoreOffice(j?.title || "") === "STORE") storeTotal += 1; else officeTotal += 1;
      }
    }
    return ok({ items: result.rows, counts: counts.rows, storeTotal, officeTotal });
  } finally {
    client.release();
  }
}

// 한 행 수정 (인라인 저장)
export async function PATCH(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const id = (b.id || "").trim();
  if (!id) return err("VALIDATION_001", "id가 필요합니다.", 400);

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(b)) {
    if (k === "id" || !EDITABLE.has(k)) continue;
    if (k === "is_hiring" && v && !HIRING_VALUES.has(String(v))) continue;
    if (k === "is_registered" && v && !REG_VALUES.has(String(v))) continue;
    const val = typeof v === "string" ? v.trim() : v;
    params.push(val === "" ? null : val);
    sets.push(`${k} = $${params.length}`);
  }
  if (!sets.length) return err("VALIDATION_001", "수정할 값이 없습니다.", 400);
  params.push(id);

  const client = await pool.connect();
  try {
    const r = await client.query(
      `UPDATE target_companies SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!r.rows.length) return err("NOT_FOUND", "대상을 찾을 수 없습니다.", 404);
    return ok({ item: r.rows[0] });
  } finally {
    client.release();
  }
}

// 새 업체 추가 (수동)
export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const group_name = (b.group_name || "").trim();
  const brand_name = (b.brand_name || "").trim();
  if (!group_name || !brand_name) return err("VALIDATION_001", "그룹·브랜드명은 필수입니다.", 400);
  const client = await pool.connect();
  try {
    const r = await client.query(
      `INSERT INTO target_companies (group_name, brand_name, category, homepage, phone, email, scale, features, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        group_name, brand_name,
        (b.category || "").trim() || null,
        (b.homepage || "").trim() || null,
        (b.phone || "").trim() || null,
        (b.email || "").trim() || null,
        (b.scale || "").trim() || null,
        (b.features || "").trim() || null,
        (b.note || "").trim() || null,
      ]
    );
    return ok({ item: r.rows[0] });
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return err("VALIDATION_001", "id가 필요합니다.", 400);
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM target_companies WHERE id = $1`, [id]);
    return ok({ success: true });
  } finally {
    client.release();
  }
}
