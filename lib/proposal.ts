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

// 「채팅중」의 뜻을 한 곳에만 둔다.
//
// 채용제안 화면은 제안 하나가 어디까지 왔는지를 상태 하나로 적는다
// (대기 → 수락 → 채팅중 → 면접예정 → 채용완료). 홈의 「채팅」 칸은 그 중
// 채팅중인 것을 센다. 예전에는 홈이 「메시지가 하나라도 있으면 채팅」으로
// 따로 세는 바람에, 면접 약속까지 잡힌 사람도 채팅으로 잡혀 두 화면의
// 숫자가 갈렸다.
//
// 아래 조건은 proposals/page.tsx 의 상태() 를 SQL 로 옮긴 것이다. 한쪽을
// 고치면 다른 쪽도 같이 고쳐야 한다 — 순서까지 그대로 맞춰 두었다.
//   1) 최종합격이면 채용완료   2) 거절·차단이면 거절
//   3) 잡힌 약속이 있으면 면접예정   4) 수락 + 오간 말이 있으면 채팅중
// p 는 proposals 를 가리키는 별칭이어야 한다.
export const 채팅중SQL = `
  p.interested_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM applications ap
                   WHERE ap.user_id = p.user_id AND ap.job_posting_id = p.job_posting_id
                     AND ap.status = 'PASSED')
  AND p.declined_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM user_company_blocks b
                   WHERE b.user_id = p.user_id AND b.company_id = p.company_id)
  AND NOT EXISTS (SELECT 1 FROM proposal_messages m
                   WHERE m.proposal_id = p.id AND m.kind = 'APPOINTMENT'
                     AND m.appointment_status = 'ACCEPTED')
  AND EXISTS (SELECT 1 FROM proposal_messages m
               WHERE m.proposal_id = p.id AND m.kind = 'TEXT')`
