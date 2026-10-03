import pool from "@/lib/db";

// 활동 기록 — 노출 순서(가산점)를 매길 재료. **지금은 기록만 한다.** 점수는 데이터가 쌓인 뒤
// (3단계)에 분포를 보고 정한다. 소급해서 만들 수 없는 데이터라 지금부터 쌓는다.
//
// 종류와 뜻:
//  기업  JOB_CREATE 공고 새로 등록 · JOB_REPOST 마감/임시저장 공고를 다시 걸기 · JOB_EDIT 공고 수정
//        TALENT_SEARCH 인재검색 실행 · RESUME_VIEW 인재 이력서 열람(ref=구직자)
//        JOB_VIEW 이 기업 공고가 읽힘(ref=공고, 보는 사람은 남기지 않는다)
//  개인  RESUME_EDIT 이력서·프로필 수정
//  공통  LOGIN_DAY 그날 접속(하루 한 번)
export type 활동종류 =
  | "JOB_CREATE" | "JOB_REPOST" | "JOB_EDIT" | "TALENT_SEARCH" | "RESUME_VIEW" | "JOB_VIEW"
  | "RESUME_EDIT" | "LOGIN_DAY";

type 행위자 = { type: "company" | "user"; id: string };

/**
 * 응답을 막지 않는다 — 기록이 실패해도 하려던 일은 되어야 한다. await 하지 않고 부르면 되지만,
 * 서버리스에서 응답 직후 잘릴 수 있는 자리(로그인처럼 중요한 길)는 await 해도 부담이 작다.
 */
export function 기록(행위자: 행위자, kind: 활동종류, refId?: string | null): Promise<void> {
  const q =
    kind === "LOGIN_DAY"
      ? `INSERT INTO activity_events (actor_type, actor_id, kind) VALUES ($1, $2, $3)
         ON CONFLICT (actor_id, day) WHERE kind = 'LOGIN_DAY' DO NOTHING`
      : `INSERT INTO activity_events (actor_type, actor_id, kind, ref_id) VALUES ($1, $2, $3, $4)`;
  const params = kind === "LOGIN_DAY" ? [행위자.type, 행위자.id, kind] : [행위자.type, 행위자.id, kind, refId ?? null];
  return pool.query(q, params).then(() => undefined).catch((e) => console.error("[activity]", kind, e?.message));
}

/** 공고가 읽혔다 — 보는 사람은 남기지 않고, 그 공고를 올린 기업 쪽에 한 줄 남긴다. */
export function 공고읽힘기록(jobId: string): Promise<void> {
  return pool
    .query(
      `INSERT INTO activity_events (actor_type, actor_id, kind, ref_id)
       SELECT 'company', company_id, 'JOB_VIEW', id FROM job_postings WHERE id = $1 AND company_id IS NOT NULL`,
      [jobId]
    )
    .then(() => undefined)
    .catch((e) => console.error("[activity] JOB_VIEW", e?.message));
}
