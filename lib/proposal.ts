// 제안은 공고가 살아 있는 동안 살아 있다.
//
// 예전에는 7일이라는 숫자를 우리가 정해 두고 그때 닫았다. 그런데 그 숫자에는
// 근거가 없었다 — 공고가 열려 있으면 그 자리는 실제로 있는 것이라 열흘 뒤에
// 수락해도 틀린 게 아니고, 반대로 매장이 사람을 뽑아 공고를 내렸으면 하루
// 만에도 의미가 없다. 그래서 제안의 수명을 공고의 수명에 맡긴다.
//
// 「닫히는 날」·「기간 지남」 같은 말도 같이 없앴다. 구직자에게 필요한 것은
// 「지금 살아 있는 자리인가」 하나이고, 그건 공고 기간이 이미 말해 준다.

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
