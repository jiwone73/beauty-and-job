export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";

const AUTO_HIDE_THRESHOLD = 3; // 신고 3회 누적 시 자동 숨김

// 신고 (글/댓글). body: { target_type: "post"|"comment", target_id, reason? }
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return err("AUTH_001", "인증이 필요합니다.", 401);
  let payload: any;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return err("AUTH_001", "유효하지 않은 토큰입니다.", 401);
  }
  if (payload.owner_type !== "user") {
    return err("AUTH_002", "개인 회원만 신고할 수 있습니다.", 403);
  }

  const userId = payload.sub;
  let target_type = "";
  let target_id = "";
  let reason = "";
  try {
    const json = await req.json();
    target_type = json.target_type;
    target_id = json.target_id;
    reason = (json.reason || "").trim();
  } catch {
    return err("REQ_001", "잘못된 요청입니다.", 400);
  }
  if (target_type !== "post" && target_type !== "comment") {
    return err("REQ_002", "신고 대상이 올바르지 않습니다.", 400);
  }
  if (!target_id) return err("REQ_003", "신고 대상이 없습니다.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 중복 신고 방지: 같은 사용자가 같은 대상을 이미 신고했는지
    const dup = await client.query(
      `SELECT id FROM community_reports
        WHERE target_type = $1 AND target_id = $2 AND reporter_id = $3`,
      [target_type, target_id, userId]
    );
    if (dup.rowCount && dup.rowCount > 0) {
      await client.query("ROLLBACK");
      return err("REPORT_001", "이미 신고한 항목입니다.", 409);
    }

    // 신고 기록
    await client.query(
      `INSERT INTO community_reports (target_type, target_id, reporter_id, reason)
       VALUES ($1, $2, $3, $4)`,
      [target_type, target_id, userId, reason || null]
    );

    // 누적 신고 수 집계
    const cnt = await client.query(
      `SELECT COUNT(*)::int AS n FROM community_reports
        WHERE target_type = $1 AND target_id = $2`,
      [target_type, target_id]
    );
    const reportCount = cnt.rows[0].n as number;

    // 대상 테이블의 report_count 갱신 + 임계치 도달 시 자동 숨김
    let hidden = false;
    if (target_type === "comment") {
      await client.query(
        `UPDATE community_comments SET report_count = $1 WHERE id = $2`,
        [reportCount, target_id]
      );
      if (reportCount >= AUTO_HIDE_THRESHOLD) {
        await client.query(
          `UPDATE community_comments SET status = 'hidden' WHERE id = $1`,
          [target_id]
        );
        hidden = true;
      }
    } else {
      // post (community_posts에는 report_count 컬럼이 없으므로 상태만 처리)
      if (reportCount >= AUTO_HIDE_THRESHOLD) {
        await client.query(
          `UPDATE community_posts SET status = 'hidden' WHERE id = $1`,
          [target_id]
        );
        hidden = true;
      }
    }

    await client.query("COMMIT");
    return ok({ reported: true, report_count: reportCount, hidden });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[community report]", e);
    return err("SERVER_001", "신고 처리에 실패했습니다.", 500);
  } finally {
    client.release();
  }
}
