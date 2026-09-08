// 제안에 답이 없으면 언제까지 기다리나. 거절 통보를 만들지 않기로 한 대신,
// 기다리는 기간을 정해 둔다 — 매장이 다음 사람을 찾을 판단이 서야 한다.
// (원티드도 면접 제안을 7일 뒤 자동 거절로 처리한다.)
export const 제안유효일 = 7;

export function 제안만료(created_at: string | Date | null, interested_at?: string | Date | null): boolean {
  if (interested_at) return false;            // 답한 제안은 만료되지 않는다
  if (!created_at) return false;
  const 지난날 = (Date.now() - new Date(created_at).getTime()) / 86400000;
  return 지난날 >= 제안유효일;
}

// 며칠 남았나. 만료됐으면 0.
export function 제안남은날(created_at: string | Date | null): number {
  if (!created_at) return 제안유효일;
  const 지난날 = (Date.now() - new Date(created_at).getTime()) / 86400000;
  return Math.max(0, Math.ceil(제안유효일 - 지난날));
}

// 홈의 「채팅」 칸이 세는 것 — 지금 대화가 열려 있는 제안.
//
// 채용제안 화면은 제안 하나가 어디까지 왔는지를 단계로 적는다
// (대기 → 수락 → 채팅중 → 면접예정 → 채용완료). 그 단계 중 「채팅중」과
// 「면접예정」이 여기 해당한다. 약속을 잡았다고 대화가 끝나지 않는다 —
// 오히려 그 뒤로 더 오간다. 단계로는 앞으로 나아간 것이지만 채팅은
// 그대로 열려 있다.
//
// 빠지는 것: 아직 말이 없는 것(대기·수락), 끝난 것(채용완료·거절·차단).
// p 는 proposals 를 가리키는 별칭이어야 한다.
export const 채팅열림SQL = `
  p.interested_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM applications ap
                   WHERE ap.user_id = p.user_id AND ap.job_posting_id = p.job_posting_id
                     AND ap.status = 'PASSED')
  AND p.declined_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM user_company_blocks b
                   WHERE b.user_id = p.user_id AND b.company_id = p.company_id)
  AND EXISTS (SELECT 1 FROM proposal_messages m
               WHERE m.proposal_id = p.id AND m.kind = 'TEXT')`
