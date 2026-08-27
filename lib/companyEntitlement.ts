import pool from "@/lib/db";

/**
 * 이 기업이 인재의 연락처·자기소개서를 볼 수 있고 제안을 보낼 수 있는가.
 *
 * 셀렉미와 같은 규칙을 쓴다 — 공고가 입장권이다("유료공고 등록 시 인재정보
 * 상세 열람이 가능합니다"). 인재 목록과 경력·직군·희망조건은 누구나 보되,
 * 연락처와 자기소개서는 채용을 실제로 하고 있는 곳에만 연다. 제안도 마찬가지다 —
 * 공고가 없으면 받는 사람이 근무지·급여를 볼 수 없어 판단할 것이 없고, 그런
 * 제안이 쌓이면 인재가 제안 알림을 아예 안 열게 된다.
 *
 * 지금은 '진행중인 공고가 하나라도 있는가'로 본다. 결제(통신판매업 신고 뒤)를
 * 붙이면 이 함수만 '유료 공고가 있는가'로 바꾼다 — 부르는 쪽은 손대지 않는다.
 */
export async function 인재열람가능(companyId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM job_postings
     WHERE company_id = $1 AND status = 'ACTIVE'
       AND (deadline IS NULL OR deadline >= CURRENT_DATE)
     LIMIT 1`,
    [companyId]
  );
  return rows.length > 0;
}

/** 잠겼을 때 화면에 대신 보여줄 값. 서버에서 지워 보낸다 — 화면에서만 가리면
 *  응답에 남아 개발자 도구로 그대로 보인다. */
export const 잠긴값 = null;
