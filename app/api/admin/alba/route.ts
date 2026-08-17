export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";
import {
  ALBA_ADMIN_ID,
  ALBA_START_DATE,
  ALBA_TOTAL_TARGET_HOURS,
  ALBA_WEEKLY_TARGET_HOURS,
  ALBA_SHORTFALL_PENALTY_HOURS,
  buildWeeks,
  kstDate,
  totalWeeks,
  weekIndexOf,
} from "@/lib/alba";
import { IDLE_GAP_MIN } from "@/lib/albaWork";

// 알바 현황 — 근무 시간, 올린 공고, 주차별 진행 상황을 한 번에 내려 준다.
// 화면이 여러 번 물어보지 않아도 되게 집계까지 여기서 끝낸다.
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const adminId = (new URL(req.url).searchParams.get("admin") || ALBA_ADMIN_ID).trim();

  const [sessRes, jobRes] = await Promise.all([
    pool.query(
      `SELECT id, started_at, ended_at, note
         FROM admin_work_sessions
        WHERE admin_id = $1
        ORDER BY started_at DESC`,
      [adminId]
    ),
    // 비회원(외부) 공고만 센다 — 알바가 맡은 일이 그것이다.
    pool.query(
      `SELECT jp.id, jp.title, jp.created_at, jp.status,
              c.company_name, c.id AS company_id
         FROM job_postings jp
         LEFT JOIN companies c ON c.id = jp.company_id
        WHERE jp.created_by = $1 AND jp.source = 'EXTERNAL'
        ORDER BY jp.created_at DESC`,
      [adminId]
    ),
  ]);

  const now = new Date();
  const today = kstDate(now);

  // 근무 기록 → 날짜별 분. 자정을 넘긴 근무는 시작한 날에 몰아 센다(집계가 단순해진다).
  // ended_at 은 마지막 활동 시각이라, 최근 IDLE_GAP_MIN 안이면 아직 일하는 중으로 본다.
  const minutesByDate: Record<string, number> = {};
  let running: { id: string; started_at: string; minutes: number } | null = null;

  const sessions = sessRes.rows.map((r: any) => {
    const start = new Date(r.started_at);
    const end = r.ended_at ? new Date(r.ended_at) : start;
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    const date = kstDate(start);
    minutesByDate[date] = (minutesByDate[date] || 0) + minutes;
    const isRunning = (now.getTime() - end.getTime()) / 60000 <= IDLE_GAP_MIN;
    if (isRunning && !running) running = { id: r.id, started_at: r.started_at, minutes };
    return {
      id: r.id,
      date,
      started_at: r.started_at,
      ended_at: r.ended_at,
      minutes,
      note: r.note,
      isRunning,
    };
  });

  const postingsByDate: Record<string, number> = {};
  const postings = jobRes.rows.map((r: any) => {
    const date = kstDate(new Date(r.created_at));
    postingsByDate[date] = (postingsByDate[date] || 0) + 1;
    return {
      id: r.id,
      title: r.title,
      company_name: r.company_name,
      company_id: r.company_id,
      status: r.status,
      created_at: r.created_at,
      date,
      week: weekIndexOf(date),
    };
  });

  const weeks = buildWeeks(today, minutesByDate, postingsByDate);
  const totalMinutes = Object.values(minutesByDate).reduce((a, b) => a + b, 0);
  const current = weeks.find((w) => w.isCurrent) || null;

  // 주 6시간은 최소치다. 더 한 주는 그대로 인정하고, 못 채운 주는 벌로 총 목표를 늘린다.
  // 이번 주는 아직 안 끝났으니 판정하지 않는다 — 지나간 주만 센다.
  const weeklyTargetMinutes = ALBA_WEEKLY_TARGET_HOURS * 60;
  const pastWeeks = weeks.filter((w) => !w.isFuture && !w.isCurrent);
  const shortfallWeeks = pastWeeks.filter((w) => w.minutes < weeklyTargetMinutes).length;
  const penaltyHours = shortfallWeeks * ALBA_SHORTFALL_PENALTY_HOURS;
  const adjustedTargetHours = ALBA_TOTAL_TARGET_HOURS + penaltyHours;
  const targetMinutes = adjustedTargetHours * 60;

  // 남은 주(이번 주 포함) 동안 주당 몇 시간씩 해야 목표를 채우는지
  const weeksLeft = Math.max(1, totalWeeks() - pastWeeks.length);
  const remainingMinutes = Math.max(0, targetMinutes - totalMinutes);

  return ok({
    adminId,
    startDate: ALBA_START_DATE,
    today,
    weeklyTargetHours: ALBA_WEEKLY_TARGET_HOURS,
    totalTargetHours: ALBA_TOTAL_TARGET_HOURS,
    penaltyPerShortfallHours: ALBA_SHORTFALL_PENALTY_HOURS,
    shortfallWeeks,
    penaltyHours,
    adjustedTargetHours,
    plannedWeeks: totalWeeks(),
    totalMinutes,
    remainingMinutes,
    weeksLeft,
    neededPerWeekMinutes: Math.ceil(remainingMinutes / weeksLeft),
    currentWeek: current,
    weeks,
    sessions,
    postings,
    running,
    viewerIsOwner: auth!.sub === adminId,
  });
}
