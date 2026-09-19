export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 몸통읽기, 첨부저장 } from "@/lib/inquiryFiles";

const 영역들 = ["연동 시나리오", "동시성·부하", "데이터 정합성", "외부 서비스", "결제·유료", "화면·모바일"];
const 무게들 = ["막힘", "정해야 함", "알림"];
const 상태들 = ["open", "done", "wontfix"];

// 목록. 상태·영역으로 거른다.
export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const sp = new URL(req.url).searchParams;
  const where: string[] = [];
  const vals: any[] = [];
  const status = (sp.get("status") || "").trim();
  const area = (sp.get("area") || "").trim();
  if (상태들.includes(status)) { vals.push(status); where.push(`t.status = $${vals.length}`); }
  if (영역들.includes(area)) { vals.push(area); where.push(`t.area = $${vals.length}`); }
  const r = await pool.query(
    `SELECT t.*, COALESCE(f.files, '[]'::json) AS files
       FROM test_reports t
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('id', x.id, 'name', x.file_name, 'size', x.file_size)
                         ORDER BY x.id) AS files
           FROM inquiry_files x
          WHERE x.kind = 'report' AND x.inquiry_id = t.id::text
       ) f ON true
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY (t.status = 'open') DESC,
               CASE t.severity WHEN '막힘' THEN 0 WHEN '정해야 함' THEN 1 ELSE 2 END,
               t.created_at DESC
      LIMIT 500`,
    vals
  );
  const counts = await pool.query(
    `SELECT status, count(*)::int AS n FROM test_reports GROUP BY status`
  );
  return ok({
    items: r.rows,
    counts: Object.fromEntries(counts.rows.map((x: any) => [x.status, x.n])),
  });
}

const 누구들 = ["비로그인", "개인회원", "기업회원", "관리자"];

// 리포트 올리기. 클로드가 시험하다 어긋난 것과, 사람이 돌아보다 찾은 것이
// 같은 자리에 쌓인다 — 두 화면으로 갈리면 무엇부터 고칠지가 흩어진다.
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const { 값: b, 파일들 } = await 몸통읽기(req).catch(() => ({ 값: {} as any, 파일들: [] as File[] }));
  const title = String(b.title || "").trim();
  const area = String(b.area || "").trim();
  if (!title) return err("VALIDATION_001", "제목이 없습니다.", 400);
  if (!영역들.includes(area)) return err("VALIDATION_001", "영역이 올바르지 않습니다.", 400);
  const severity = 무게들.includes(b.severity) ? b.severity : "정해야 함";
  const options = Array.isArray(b.options) ? b.options.slice(0, 6) : [];
  // 누가 올렸는지는 스스로 적게 두지 않는다. 로그인한 계정으로 판단한다.
  const 올린이 = b.reported_by === "claude" ? "claude" : (auth!.sub === "alba" ? "alba" : "admin");
  const r = await pool.query(
    `INSERT INTO test_reports
       (case_id, area, title, severity, steps, expected, actual, options, decided_by, ref_url, status,
        reported_by, as_who, env)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      String(b.case_id || "").trim() || null, area, title, severity,
      String(b.steps || "").trim() || null,
      String(b.expected || "").trim() || null,
      String(b.actual || "").trim() || null,
      JSON.stringify(options),
      b.decided_by === "alba" ? "alba" : b.decided_by === "admin" ? "admin" : null,
      String(b.ref_url || "").trim() || null,
      // 고칠 길이 하나뿐이라 이미 고쳤으면 done 으로 올린다.
      상태들.includes(b.status) ? b.status : "open",
      올린이,
      누구들.includes(b.as_who) ? b.as_who : null,
      String(b.env || "").trim().slice(0, 200) || null,
    ]
  );
  if (파일들.length) await 첨부저장("report" as any, r.rows[0].id, 파일들);
  return ok(r.rows[0], 201);
}

// 고른 것 적기 / 상태 바꾸기.
export async function PATCH(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "").trim();
  if (!id) return err("VALIDATION_001", "id 가 없습니다.", 400);
  const sets: string[] = [];
  const vals: any[] = [];
  if (typeof b.decision === "string") {
    vals.push(b.decision.trim() || null); sets.push(`decision = $${vals.length}`);
    sets.push(`decided_at = now()`);
  }
  if (상태들.includes(b.status)) { vals.push(b.status); sets.push(`status = $${vals.length}`); }
  if (!sets.length) return err("VALIDATION_001", "바꿀 것이 없습니다.", 400);
  sets.push(`updated_at = now()`);
  vals.push(id);
  const r = await pool.query(
    `UPDATE test_reports SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`, vals
  );
  if (r.rowCount === 0) return err("NOT_FOUND", "리포트를 찾을 수 없습니다.", 404);
  return ok(r.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const id = (new URL(req.url).searchParams.get("id") || "").trim();
  if (!id) return err("VALIDATION_001", "id 가 없습니다.", 400);
  const r = await pool.query(`DELETE FROM test_reports WHERE id = $1 RETURNING id`, [id]);
  if (r.rowCount === 0) return err("NOT_FOUND", "리포트를 찾을 수 없습니다.", 404);
  return ok({ deleted: true });
}
