export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

const 결과들 = ["pass", "fail", "blocked"];

// 케이스별 마지막 결과. 현황 화면이 이걸로 「어디까지 왔나」를 센다.
export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const r = await pool.query(`SELECT * FROM test_case_runs ORDER BY ran_at DESC`);
  return ok({ items: r.rows });
}

// 한 건 또는 여러 건 기록. 클로드가 케이스를 돌리고 나서 남긴다.
export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const b = await req.json().catch(() => ({}));
  const rows = Array.isArray(b.runs) ? b.runs : [b];
  const 담을것 = rows
    .map((x: any) => ({
      case_id: String(x.case_id || "").trim(),
      area: String(x.area || "").trim(),
      result: 결과들.includes(x.result) ? x.result : "",
      note: String(x.note || "").trim() || null,
      report_id: String(x.report_id || "").trim() || null,
    }))
    .filter((x: any) => x.case_id && x.area && x.result);
  if (!담을것.length) return err("VALIDATION_001", "기록할 것이 없습니다.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const x of 담을것) {
      await client.query(
        `INSERT INTO test_case_runs (case_id, area, result, note, report_id, ran_at)
         VALUES ($1,$2,$3,$4,$5, now())
         ON CONFLICT (case_id) DO UPDATE
           SET area = EXCLUDED.area, result = EXCLUDED.result, note = EXCLUDED.note,
               report_id = EXCLUDED.report_id, ran_at = now()`,
        [x.case_id, x.area, x.result, x.note, x.report_id]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return ok({ saved: 담을것.length });
}
