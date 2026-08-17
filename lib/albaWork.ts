import pool from "@/lib/db";

// 근무 구간을 이어 붙이는 한 가지 규칙. 화면의 heartbeat 와 공고 저장이 같이 쓴다.
//
// 마지막 신호에서 IDLE_GAP_MIN 안이면 그 구간을 지금까지로 늘리고,
// 더 조용했으면 그 구간은 마지막 신호에서 끝난 것으로 두고 새로 시작한다.
// 그래서 깜빡하고 창을 켜 둬도 시간이 무한정 쌓이지 않는다.
export const IDLE_GAP_MIN = 5;

// 시간을 재는 대상. 다른 관리자까지 재면 통계가 지저분해진다.
const TRACKED = new Set(["alba"]);

export function isTracked(adminId: string | undefined | null) {
  return !!adminId && TRACKED.has(adminId);
}

export async function touchWorkSession(adminId: string) {
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

  if (last && gapMin <= IDLE_GAP_MIN) {
    const upd = await pool.query(
      `UPDATE admin_work_sessions SET ended_at = now() WHERE id = $1 RETURNING started_at`,
      [last.id]
    );
    return { sessionId: last.id as string, startedAt: upd.rows[0].started_at as string };
  }

  const ins = await pool.query(
    `INSERT INTO admin_work_sessions (admin_id, started_at, ended_at)
     VALUES ($1, now(), now())
     RETURNING id, started_at`,
    [adminId]
  );
  return { sessionId: ins.rows[0].id as string, startedAt: ins.rows[0].started_at as string };
}

/** 오늘(한국 날짜) 누적 근무 분 */
export async function todayMinutes(adminId: string) {
  const r = await pool.query(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, started_at) - started_at)) / 60), 0)::int AS minutes
       FROM admin_work_sessions
      WHERE admin_id = $1
        AND (started_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`,
    [adminId]
  );
  return r.rows[0].minutes as number;
}
