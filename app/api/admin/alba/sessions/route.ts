export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { ALBA_ADMIN_ID } from "@/lib/alba";
import { isTracked } from "@/lib/albaWork";

// 자동 측정이 잘못 잡은 구간을 손보기 위한 창구.
// (자리를 비웠는데 화면만 열려 있었다거나, 반대로 화면 없이 일한 시간을 넣어야 할 때)
//
// 본인은 못 고친다. 자기 근무 시간을 스스로 적을 수 있으면 기록이 근거가 되지 못한다.
// 알바가 빠진 시간을 주장하면 관리자가 확인하고 넣어 준다.
// 시각은 한국 시간 문자열로 받아 그대로 저장한다.
function toTimestamp(date: string, time: string) {
  return `${date}T${time}:00+09:00`;
}

export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  if (isTracked(auth!.sub)) return err("AUTH_002", "본인 근무 기록은 직접 고칠 수 없어요.", 403);

  const { admin_id, date, start, end, note } = await req.json();
  if (!date || !start || !end) return err("VALIDATION_001", "날짜와 시작·종료 시각을 입력해주세요.");

  const startedAt = toTimestamp(date, start);
  // 자정을 넘겨 끝나는 근무는 다음 날로 넘긴다.
  const endDate = end <= start ? new Date(Date.parse(`${date}T00:00:00+09:00`) + 86400000).toISOString().slice(0, 10) : date;
  const endedAt = toTimestamp(endDate, end);

  const r = await pool.query(
    `INSERT INTO admin_work_sessions (admin_id, started_at, ended_at, note)
     VALUES ($1, $2::timestamptz, $3::timestamptz, $4)
     RETURNING id`,
    [(admin_id || ALBA_ADMIN_ID).trim(), startedAt, endedAt, (note || "").trim() || null]
  );
  return ok({ id: r.rows[0].id }, 201);
}

export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  if (isTracked(auth!.sub)) return err("AUTH_002", "본인 근무 기록은 직접 고칠 수 없어요.", 403);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return err("VALIDATION_001", "삭제할 기록을 지정해주세요.");

  await pool.query(`DELETE FROM admin_work_sessions WHERE id = $1`, [id]);
  return ok({ deleted: id });
}
