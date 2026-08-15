export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 복리후생 태그 마스터 — 공고등록 폼의 검색/자동완성 + 새 태그 소프트 등록.
// 테이블: benefit_tags (migrations/2026-08-10_benefit_tags.sql)

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// 태그 조회(검색/자동완성). job_type=STORE|OFFICE → 해당 + BOTH 노출.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  // curated=1 은 공개 어휘(검수된 마스터)라 로그인 없이도 준다 — 공고 목록 필터가 이걸 쓴다.
  // 미검수 태그까지 보는 건 등록 폼(자동완성)뿐이라 로그인 상태에서만.
  const curatedOnly = sp.get("curated") === "1";
  let me: string | null = null;      // 기업회원이면 자기 id
  let isAdmin = false;
  if (!curatedOnly) {
    const { auth, res: authErr } = requireAuth(req); // 관리자·기업회원 모두 허용
    if (authErr) return authErr;
    isAdmin = auth!.owner_type === "admin";
    me = auth!.owner_type === "company" ? String(auth!.sub) : null;
  }
  const jt = (sp.get("job_type") || "").toUpperCase();
  const q = norm(sp.get("q") || "");

  const where: string[] = [];
  const params: unknown[] = [];
  if (curatedOnly) where.push("is_curated = true");
  // 직접 추가한 태그는 공용이 아니다 — 등록한 기업(과 그 태그를 이미 쓴 기업)만 본다.
  // 관리자는 비회원 공고를 대신 넣으므로 제한하지 않는다.
  if (!curatedOnly && !isAdmin) {
    if (me) {
      params.push(me);
      const p = `$${params.length}`;
      where.push(`(is_curated OR created_by_company_id = ${p}::uuid
        OR EXISTS (SELECT 1 FROM job_postings jp
                   WHERE jp.company_id = ${p}::uuid AND benefit_tags.name = ANY(jp.benefit_tags)))`);
    } else {
      where.push("is_curated");
    }
  }
  if (jt === "STORE" || jt === "OFFICE") { params.push(jt); where.push(`(job_type = $${params.length} OR job_type = 'BOTH')`); }
  if (q) { params.push(`%${q}%`); where.push(`name ILIKE $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const r = await pool.query(
    `SELECT name, job_type, is_curated FROM benefit_tags ${whereSql}
     ORDER BY is_curated DESC, usage_count DESC, name ASC LIMIT 100`,
    params
  );
  return ok({ items: r.rows });
}

// 새 태그 소프트 등록(기업이 목록에 없는 복리후생 추가). is_curated=false로 저장, 관리자가 나중에 정규화.
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json().catch(() => ({}));
  const name = norm(String(body.name || ""));
  let jt = String(body.job_type || "BOTH").toUpperCase();
  if (!["STORE", "OFFICE", "BOTH"].includes(jt)) jt = "BOTH";
  if (name.length < 1 || name.length > 40) return err("BAD_REQUEST", "태그는 1~40자여야 합니다.", 400);
  // 한글 조합이 끝나기 전에 Enter 를 누르면 '명절귀향ㅂ' 같은 자모 꼬리가 그대로 등록된다.
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(name)) return err("BAD_REQUEST", "글자가 덜 입력됐어요. 다시 입력해주세요.", 400);

  // 이미 있으면 사용횟수만 +1, 없으면 미검수 태그로 삽입
  const owner = auth && auth.owner_type === "company" ? String(auth.sub) : null;
  const r = await pool.query(
    `INSERT INTO benefit_tags (name, job_type, is_curated, usage_count, created_by_company_id)
     VALUES ($1, $2, false, 1, $3::uuid)
     ON CONFLICT (name, job_type) DO UPDATE SET
       usage_count = benefit_tags.usage_count + 1,
       created_by_company_id = COALESCE(benefit_tags.created_by_company_id, EXCLUDED.created_by_company_id)
     RETURNING name, job_type, is_curated`,
    [name, jt, owner]
  );
  return ok(r.rows[0]);
}

// 직접 추가한 태그 삭제 — 오타로 만든 값을 스스로 지운다.
// 내가 등록한 미검수 태그만. 검수된 공용 태그와 남의 태그는 손대지 못한다.
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req);
  if (authErr) return authErr;
  const name = norm(new URL(req.url).searchParams.get("name") || "");
  if (!name) return err("BAD_REQUEST", "지울 태그 이름이 필요합니다.", 400);

  const isAdmin = auth!.owner_type === "admin";
  const me = auth!.owner_type === "company" ? String(auth!.sub) : null;
  if (!isAdmin && !me) return err("AUTH_002", "권한이 없습니다.", 403);

  const r = isAdmin
    ? await pool.query(`DELETE FROM benefit_tags WHERE name = $1 AND is_curated = false RETURNING name`, [name])
    : await pool.query(
        `DELETE FROM benefit_tags
         WHERE name = $1 AND is_curated = false AND created_by_company_id = $2::uuid
         RETURNING name`,
        [name, me]
      );
  if (r.rowCount === 0) return err("NOT_FOUND", "직접 추가한 태그만 지울 수 있어요.", 404);
  return ok({ deleted: name });
}
