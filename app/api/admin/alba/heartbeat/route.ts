export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

// 근무 시간 자동 측정.
//
// 로그인·로그아웃 기준으로 재면 안 된다 — 로그아웃을 누르는 사람이 없고,
// '로그인 저장하기'로 며칠씩 로그인이 유지되면 하루 24시간이 잡혀 버린다.
// 그래서 관리자 화면이 열려 있고 실제로 쓰는 동안만 센다.
//
// 화면이 주기적으로 여기를 두드리면 진행 중인 구간의 끝(ended_at)을 지금으로 민다.
// 마지막 두드림에서 IDLE_GAP_MIN 이 넘게 조용했으면 그 구간은 거기서 끝난 것으로 두고
// 새 구간을 시작한다. 깜빡해도 시간이 부풀지 않는 이유가 이것이다.
const IDLE_GAP_MIN = 15;

export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const adminId = auth!.sub;

  const { rows } = await pool.query(
    `SELECT id, started_at, ended_at
       FROM admin_work_sessions
      WHERE admin_id = $1
      ORDER BY started_at DESC
      LIMIT 1`,
    [adminId]
  );

  const last = rows[0];
  const lastSeen = last ? new Date(last.ended_at || last.started_at) : null;
  const gapMin = lastSeen ? (Date.now() - lastSeen.getTime()) / 60000 : Infinity;

  let sessionId: string;
  let startedAt: string;

  if (last && gapMin <= IDLE_GAP_MIN) {
    const upd = await pool.query(
      `UPDATE admin_work_sessions SET ended_at = now() WHERE id = $1 RETURNING started_at`,
      [last.id]
    );
    sessionId = last.id;
    startedAt = upd.rows[0].started_at;
  } else {
    const ins = await pool.query(
      `INSERT INTO admin_work_sessions (admin_id, started_at, ended_at)
       VALUES ($1, now(), now())
       RETURNING id, started_at`,
      [adminId]
    );
    sessionId = ins.rows[0].id;
    startedAt = ins.rows[0].started_at;
  }

  // 화면에 띄울 숫자 — 이번 구간과 오늘 합계(한국 날짜 기준).
  const totals = await pool.query(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, started_at) - started_at)) / 60), 0)::int AS minutes
       FROM admin_work_sessions
      WHERE admin_id = $1
        AND (started_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`,
    [adminId]
  );

  return ok({
    sessionId,
    startedAt,
    todayMinutes: totals.rows[0].minutes,
    idleGapMin: IDLE_GAP_MIN,
  });
}
