"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProposalThread from "@/components/proposal/ProposalThread";
import { 마감인가 } from "@/lib/jobClosed";
import ProfileShell from "@/components/profile/ProfileShell";

/**
 * 받은 제안 — 기업이 인재검색에서 나를 보고 공고를 보내온 기록.
 *
 * 보낸제안(기업 쪽) 표를 그대로 가져온다("받은제안은 보낸제안 테이블을 그대로
 * 가져오면 되. 인재만 기업으로 바꾸면 되지") — 두 화면이 같은 제안을 두고
 * 다른 모양으로 말하면 기업과 구직자가 서로 다른 것을 보는 셈이 된다. 같은
 * CSS 부품(.prop-table 등)을 그대로 쓴다.
 */

type Proposal = {
  id: string;
  message: string;
  read_at: string | null;
  interested_at: string | null;
  interest_message: string | null;
  created_at: string;
  job_posting_id: string;
  company_name: string;
  brand_name: string | null;
  company_logo_url: string | null;
  company_industry: string | null;
  company_region_sido: string | null;
  company_region_sigungu: string | null;
  last_sender: "USER" | "COMPANY" | null;
  last_message_at: string | null;
  job_title: string;
  job_status: string;
  deadline: string | null;
  location: string | null;
  employment_type: string | null;
  declined_at: string | null;
  canceled_at: string | null;
  job_created_at: string | null;
  positionLines: string[];
  workConditionDay: string | null;
  workConditionTime: string | null;
  workConditionSalary: string | null;
  message_count: number;
  appointment_at: string | null;
};

// 상태 이름·색은 보낸제안 표와 똑같이 쓴다 — 같은 제안을 두 화면이 다르게
// 부르면 기업과 구직자가 서로 다른 것으로 읽는다.
type 상태키 = "면접예정" | "채팅중" | "수락" | "거절" | "취소" | "공고마감" | "답변대기";
const 상태이름: Record<상태키, string> = {
  답변대기: "검토중", 수락: "수락", 채팅중: "채팅중",
  면접예정: "면접예정", 거절: "거절", 취소: "제안취소", 공고마감: "공고마감",
};
const 상태색: Record<상태키, string> = {
  수락: "#1f7a4d",
  면접예정: "#582681", 채팅중: "#582681",
  거절: "var(--color-text)", 취소: "var(--color-text)",
  공고마감: "var(--color-text)", 답변대기: "var(--color-text)",
};
function 상태(p: Proposal): 상태키 {
  if (p.declined_at) return "거절";
  if (p.canceled_at) return "취소";
  if (p.appointment_at) return "면접예정";
  // 제안 메시지 자체가 첫 메시지로 들어가 있어(message_count 1부터 시작) —
  // 진짜 대화(2개째부터)가 있어야 "채팅중"이다.
  if (p.interested_at) return p.message_count > 1 ? "채팅중" : "수락";
  if (마감인가(p.job_status, p.deadline)) return "공고마감";
  return "답변대기";
}

/** 지금 누가 답할 차례인지 — 보낸제안 표와 같은 규칙, 1인칭이라 "기업/인재"
 *  대신 "매장"과 "필요"로만 적는다(내 화면에서 "인재"라고 나를 부를 이유가 없다). */
function 차례말(p: Proposal): string | null {
  const st = 상태(p);
  if (st === "거절" || st === "취소" || st === "공고마감") return null;
  if (st === "면접예정") return p.last_sender === "USER" ? "매장 답변대기" : "확인 필요";
  if (st === "채팅중") return p.last_sender === "USER" ? "매장 답변대기" : "답변 필요";
  // 수락만 하고 말이 아직 없으면 매장이 먼저 걸 차례다.
  if (st === "수락") return "매장 답변대기";
  if (p.message_count > 1) return p.last_sender === "USER" ? "매장 답변대기" : "답변 필요";
  return "답변 필요";
}

/** 마지막으로 무슨 일이 있었나. 날짜 앞에 💬, 차례는 따로 반환해 내 차례일
 *  때만 포인트 컬러로 강조한다. */
function 최근활동(p: Proposal): { 글: string; 차례: string | null } {
  let 시각: string;
  if (p.canceled_at) 시각 = p.canceled_at;
  else if (p.declined_at) 시각 = p.declined_at;
  else if (p.appointment_at && p.last_sender !== "USER") 시각 = p.last_message_at!;
  else if (p.message_count > 1) 시각 = p.last_message_at!;
  else if (p.interested_at) 시각 = p.interested_at;
  else if (p.read_at) 시각 = p.read_at;
  else 시각 = p.created_at;
  return { 글: `💬 ${때(시각)}`, 차례: 차례말(p) };
}

/** 이 줄에 열린 대화가 있나 — 거절·거둔 제안만 끝난 것이다. */
function 대화열림(p: Proposal): boolean {
  return !p.declined_at && !p.canceled_at;
}

const 날짜 = (s: string) =>
  new Date(s).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" })
    .replace(/\.$/, "").replace(/\s/g, "");

const 때 = (s: string) => {
  const d = new Date(s);
  const 오늘 = new Date().toDateString() === d.toDateString();
  const 시각 = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return 오늘 ? `오늘 ${시각}` : `${d.getMonth() + 1}.${d.getDate()} ${시각}`;
};

// 모집분야는 직군 한 단어만("모집분야에는 헤어디자이너 까지만") — 보낸제안
// 표의 모집분야 칸과 같은 규칙.
const 조건 = (p: Proposal) => (p.positionLines?.[0] || "").split("|")[0].trim();

export default function ProposalsPage() {
  const router = useRouter();
  const [목록, set목록] = useState<Proposal[]>([]);
  const [불러오는중, set불러오는중] = useState(true);

  const 불러오기 = () => {
    const token = localStorage.getItem("access_token");
    if (!token) { set불러오는중(false); return; }
    fetch("/api/users/me/proposals", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data) set목록(res.data.proposals || []); })
      .catch(() => {})
      .finally(() => set불러오는중(false));
  };
  useEffect(() => { 불러오기(); }, []);

  const 열기 = async (p: Proposal) => {
    const token = localStorage.getItem("access_token");
    if (!p.read_at && token) {
      await fetch(`/api/users/me/proposals/${p.id}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    router.push(`/jobs/${p.job_posting_id}`);
  };

  const [대화, set대화] = useState<Proposal | null>(null);

  // 수락(관심 있어요) — 누르면 매장이 내 연락처를 볼 수 있고 채팅이 이어진다.
  // 카드 버튼 하나로 바로 되던 것을, 무엇이 열리는지 먼저 밝히는 확인창 하나로
  // 합친다("확인창 한번 더 띄워줘") — 수락이 정확히 뭘 뜻하는지 헷갈렸었다
  // ("수락하기가 뭔지 잘모르잖아").
  const [답할것, set답할것] = useState<Proposal | null>(null);
  const [한마디, set한마디] = useState("");

  const 관심보내기 = async () => {
    const p = 답할것;
    if (!p) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const 글 = 한마디.trim();
    set목록((prev) => prev.map((x) => (x.id === p.id
      ? { ...x, interested_at: new Date().toISOString(), interest_message: 글 || null } : x)));
    set답할것(null);
    await fetch(`/api/users/me/proposals/${p.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: 글 }),
    }).catch(() => {});
  };

  // 거절은 상대에게 전해져야 한다 — 예전의 「치우기」는 내 화면에서만 사라져서
  // 기업 쪽에는 계속 「답변 대기」로 남아 기약 없이 기다리게 했다.
  const [거절할것, set거절할것] = useState<Proposal | null>(null);
  const [같이차단, set같이차단] = useState(false);
  const 거절하기 = async () => {
    const p = 거절할것;
    if (!p) return;
    set거절할것(null);
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`/api/proposals/${p.id}/decline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ block: 같이차단 }),
    }).catch(() => {});
    set같이차단(false);
    불러오기();
  };

  return (
    <ProfileShell>
      <div className="profile-content">
        <section className="profile-section">
          <div className="profile-info-card">
            {/* 수락이 무엇을 여는지 표 위에서 한 번 밝힌다 — 매번 확인창을
                띄우니, 그 확인창 문구를 다시 안 읽어도 되게 여기서도 미리
                말해 둔다. */}
            <p className="prop-notice">
              제안을 수락하시면 채팅으로 궁금한 점을 묻고 면접까지 진행하실 수 있어요.
            </p>

            {불러오는중 ? (
              <p className="pf-notif-empty">불러오는 중…</p>
            ) : 목록.length === 0 ? (
              <p className="pf-notif-empty">아직 받은 제안이 없어요.</p>
            ) : (
              <div className="prop-tablewrap">
                <table className="prop-table has-post">
                  <thead>
                    <tr>
                      <th className="apl-td-who">기업</th>
                      <th className="c-post">제안한 공고</th>
                      <th className="c-job">모집분야</th>
                      <th className="c-cond">근무조건</th>
                      <th className="c-recent">진행상황</th>
                      <th className="c-manage">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {목록.map((p) => {
                      const st = 상태(p);
                      const 활 = 최근활동(p);
                      const 내차례 = 활.차례 === "답변 필요" || 활.차례 === "확인 필요";
                      return (
                        <Fragment key={p.id}>
                        <tr className={내차례 ? "mine" : undefined}>
                          <td className="apl-td apl-td-who">
                            <button type="button" className="apl-td-whobtn" onClick={() => 열기(p)}>
                              <span className="apl-td-avatar">
                                {p.company_logo_url
                                  ? <img src={p.company_logo_url} alt="" loading="lazy" />
                                  : <span>{(p.brand_name || p.company_name || "?").slice(0, 1)}</span>}
                              </span>
                              <span className="apl-td-wholines">
                                <span className="apl-td-name">{p.brand_name || p.company_name}</span>
                                <span className="apl-td-sub">{p.company_industry || "—"}</span>
                                <span className="apl-td-sub">
                                  {[p.company_region_sido, p.company_region_sigungu].filter(Boolean).join(" ") || "—"}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="c-post">
                            <button type="button" className="prop-post" title={p.job_title}
                              onClick={() => 열기(p)}>
                              {p.job_title}
                            </button>
                            <span className="prop-post-date">{날짜(p.created_at)} 제안</span>
                          </td>
                          <td className="c-job" title={조건(p)}><span>{조건(p)}</span></td>
                          <td className="c-cond" title={[p.workConditionDay, p.workConditionTime, p.workConditionSalary]
                            .filter(Boolean).join(" · ") || undefined}>
                            {p.workConditionDay || p.workConditionTime || p.workConditionSalary ? (
                              <>
                                <span>{p.workConditionDay}</span>
                                <span>{p.workConditionTime}</span>
                                <span>{p.workConditionSalary}</span>
                              </>
                            ) : <span>—</span>}
                          </td>
                          <td className={`c-recent${내차례 ? " todo" : ""}`}>
                            <span className="prop-st" style={{ color: 상태색[st] }}>{상태이름[st]}</span>
                            <span className="prop-upd">{활.글}</span>
                            {활.차례 && (
                              <span className={내차례 ? "prop-turn mine" : "prop-turn"}>({활.차례})</span>
                            )}
                          </td>
                          <td className={`c-manage${내차례 ? " todo" : ""}`}>
                            <div className="prop-actrow">
                              {st === "답변대기" && (
                                <button type="button" className="prop-chatbtn"
                                  onClick={(e) => { e.stopPropagation(); set한마디(""); set답할것(p); }}>
                                  수락하기
                                </button>
                              )}
                              <button type="button" className="prop-chatbtn" disabled={!대화열림(p)}
                                onClick={(e) => { e.stopPropagation(); set대화(p); }}>
                                {st === "면접예정" ? "일정 확인" : "채팅하기"}
                              </button>
                              {st === "답변대기" && (
                                <button type="button" className="prop-cancel"
                                  onClick={(e) => { e.stopPropagation(); set거절할것(p); set같이차단(false); }}>
                                  거절하기
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* 기업이 제안하며 쓴 말은 확인창까지 가지 않아도 표에서 바로
                            보여야 한다("차라리 테이블 목록 밑에 구분선을 하나 두고 그
                            밑에 보여주면 어때? 그걸 보고 수락버튼을 눌러야지") — 줄
                            전체 너비로, 구분선(점선) 아래에 펼친다. */}
                        {p.message && (
                          <tr className="prop-msg-row">
                            <td colSpan={6}>“{p.message}”</td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 수락 확인창 — 무엇이 열리는지 밝히고, 기업이 제안하며 쓴 말도 판단에
          쓰라고 같이 보여준다("기업에서 보낸 메시지는 어디에서 보여주면
          좋을지도 고민해봐" — 채팅을 열기 전인 지금이 그 판단 시점이다). */}
      {답할것 && (
        <div className="rp-modal-overlay">
          <div className="prop-dec">
            <p className="prop-dec-t">{답할것.brand_name || 답할것.company_name}의 제안을 수락할까요?</p>
            <p className="prop-dec-sub">수락하면 채팅으로 궁금한 점을 묻고 면접까지 진행하실 수 있어요.</p>
            {답할것.message && <p className="prop-dec-msg">“{답할것.message}”</p>}
            <textarea value={한마디} onChange={(e) => set한마디(e.target.value)} rows={2}
              maxLength={300}
              placeholder="궁금한 점이나 조건이 있으면 적어주세요 (선택)" />
            <div className="prop-dec-acts">
              <button type="button" onClick={() => set답할것(null)}>취소</button>
              <button type="button" className="key" onClick={관심보내기}>수락하기</button>
            </div>
          </div>
        </div>
      )}

      {거절할것 && (
        <div className="rp-modal-overlay">
          <div className="prop-dec">
            <p className="prop-dec-t">{거절할것.brand_name || 거절할것.company_name}의 제안을 거절할까요?</p>
            <label className="prop-dec-blk">
              <input type="checkbox" checked={같이차단}
                onChange={(e) => set같이차단(e.target.checked)} />
              이 매장의 제안 다시 받지 않기
            </label>
            <div className="prop-dec-acts">
              <button type="button" onClick={() => { set거절할것(null); set같이차단(false); }}>취소</button>
              <button type="button" className="key" onClick={거절하기}>거절하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 부제는 공고명 대신 모집분야(직군)로 — 구직자 쪽 화면이라 "상대방"인
          매장이 뭘 뽑는지가 맞는 정보다. */}
      {대화 && (
        <ProposalThread
          proposalId={대화.id}
          제목={(대화.positionLines?.[0] || "").split("|")[0].trim() || 대화.job_title}
          상대={대화.brand_name || 대화.company_name}
          token={localStorage.getItem("access_token") || ""}
          onClose={() => set대화(null)}
        />
      )}
    </ProfileShell>
  );
}
