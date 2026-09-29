export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

// 공고가 마감되고 50일이 지난 제안의 채팅을 지운다("채팅하기도 마찬가지야.
// 50일 지나면 삭제야" — 지원서 열람을 지원일 50일로 막은 것과 같은 기한).
// 이력서 열람은 막기만 하고 데이터는 남기지만, 채팅은 "그걸 보여주지도
// 않을건데 갖고 있어야 하는 이유가?" — 아예 지운다.
//
// 기준은 공고가 마감된 날이다(지원일도, 제안일도, 마지막 메시지 날도 아니다).
// 공고·지원자 화면의 90일 기준과 같은 마감날 계산을 쓴다(app/api/company/
// applications/route.ts 의 지난공고/마감날) — 두 화면이 같은 공고를 두고
// 다른 날짜로 "마감됐다"고 하면 안 된다.
//
// proposals 행 자체는 남긴다 — 배지·통계(제안완료/거절됨 등)가 그 행의
// declined_at·interested_at 을 계속 본다. 지우는 것은 대화 내용(proposal_messages)
// 뿐이다.
//
// 사진 청소(cleanup-orphan-images)와 같은 안전장치를 둔다: 한 번에 최대 N개
// 제안만 처리하고, DRY=1 이면 세어만 보고 지우지 않는다.
const 유예일 = 50;
const 한번에 = 300;

const 지난공고 = "(jp.status = 'CLOSED' OR (jp.deadline IS NOT NULL AND jp.deadline < CURRENT_DATE))";
const 마감날 = "COALESCE(jp.deadline, jp.closed_at::date, jp.updated_at::date)";

const 대상SQL = `
  SELECT p.id
    FROM proposals p
    JOIN job_postings jp ON jp.id = p.job_posting_id
   WHERE ${지난공고}
     AND ${마감날} < CURRENT_DATE - ($1 || ' days')::interval
     AND EXISTS (SELECT 1 FROM proposal_messages m WHERE m.proposal_id = p.id)
   LIMIT $2`;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return err("AUTH_001", "권한이 없습니다.", 401);
  }
  const 세보기만 = new URL(req.url).searchParams.get("dry") === "1";

  try {
    const { rows } = await pool.query(대상SQL, [유예일, 한번에]);
    if (!rows.length) return ok({ 지움: 0, 세보기만 });
    const 제안ids = rows.map((r) => r.id);

    if (세보기만) {
      return ok({ 지울제안: 제안ids.length, 맛보기: 제안ids.slice(0, 5) });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM proposal_messages WHERE proposal_id = ANY($1::uuid[])`,
      [제안ids]
    );
    await pool.query(
      `UPDATE proposals SET last_message_at = NULL WHERE id = ANY($1::uuid[])`,
      [제안ids]
    ).catch((e) => console.error("[채팅 청소] last_message_at 정리 실패", e));

    console.log(`[채팅 청소] 제안 ${제안ids.length}건, 메시지 ${rowCount}건 삭제`);
    return ok({ 지운제안: 제안ids.length, 지운메시지: rowCount ?? 0 });
  } catch (e: any) {
    console.error("[채팅 청소]", e);
    return err("CRON_001", "청소 중 오류가 발생했습니다.", 500);
  }
}
