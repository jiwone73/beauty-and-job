"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import ProposalThread from "@/components/proposal/ProposalThread";
import { 마감인가 } from "@/lib/jobClosed";
import ProfileShell from "@/components/profile/ProfileShell";

/**
 * 받은 제안 — 기업이 인재검색에서 나를 보고 공고를 보내온 기록.
 *
 * 받은제안 / 진행중 / 종료 세 탭으로 나눈다 — 제안 정보(기업·공고·조건)와
 * 지금 무엇을 해야 하는지는 서로 다른 질문이라, 하나의 표 안에서 뒤섞으면
 * 어느 쪽도 뚜렷하지 않았다. 탭마다 지금 볼 것만 남긴다.
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
  last_message_body: string | null;
  job_title: string;
  job_status: string;
  deadline: string | null;
  location: string | null;
  employment_type: string | null;
  declined_at: string | null;
  canceled_at: string | null;
  decline_reason: string | null;
  job_created_at: string | null;
  positionLines: string[];
  workConditionDay: string | null;
  workConditionTime: string | null;
  workConditionSalary: string | null;
  message_count: number;
  appointment_at: string | null;
};

// 상태 갈래는 보낸제안 표와 똑같이 쓴다 — 같은 제안을 두 화면이 다르게
// 나누면 기업과 구직자가 서로 다른 것으로 읽는다.
type 상태키 = "면접예정" | "채팅중" | "수락" | "거절" | "취소" | "공고마감" | "답변대기";
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

// 탭 갈래 — 답변대기는 「받은제안」, 수락·채팅중·면접예정은 「진행중」,
// 거절·취소·공고마감은 「종료」.
type 탭키 = "받은제안" | "진행중" | "종료";
function 탭of(p: Proposal): 탭키 {
  const st = 상태(p);
  if (st === "답변대기") return "받은제안";
  if (st === "거절" || st === "취소" || st === "공고마감") return "종료";
  return "진행중";
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

/** 이 줄에 열린 대화가 있나. 채팅은 수락 이후부터다("채팅은 진행중에서만"
 *  / "수락전 채팅은 안돼"). */
function 대화열림(p: Proposal): boolean {
  return !!p.interested_at && !p.declined_at && !p.canceled_at;
}

// 종료 탭 — 무엇으로 끝났는지 한 마디, 그 일이 있었던 날.
const 종료라벨: Record<string, string> = { 거절: "거절함", 취소: "제안 취소됨", 공고마감: "공고마감" };
function 종료일(p: Proposal): string {
  if (p.declined_at) return p.declined_at;
  if (p.canceled_at) return p.canceled_at;
  return p.deadline || p.created_at;
}

// 진행중 탭의 스테퍼 — 수락→채팅중→면접예정→결과 순서로 지금 어디까지 왔는지.
// "결과"는 이 탭에 있는 동안은 늘 남은 단계다(결과가 나면 종료 탭으로 간다).
const 단계들 = ["수락", "채팅중", "면접예정", "결과"] as const;
function 현재단계(st: 상태키): number {
  if (st === "면접예정") return 2;
  if (st === "채팅중") return 1;
  return 0;
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

// 기업 아바타+매장명+업종+지역 — 받은제안 표의 "기업" 칸과 진행중·종료 카드
// 머리에서 똑같이 쓴다.
function 기업칸(p: Proposal, onClick: () => void) {
  return (
    <button type="button" className="apl-td-whobtn" onClick={onClick}>
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
  );
}

export default function ProposalsPage() {
  const router = useRouter();
  const [목록, set목록] = useState<Proposal[]>([]);
  const [불러오는중, set불러오는중] = useState(true);
  const [탭, set탭] = useState<탭키>("받은제안");

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
  // 기업 쪽에는 계속 「답변 대기」로 남아 기약 없이 기다리게 했다. 사유는
  // 선택이고, "종료" 탭에서 기업 입장 참고용으로 보인다.
  const [거절할것, set거절할것] = useState<Proposal | null>(null);
  const [같이차단, set같이차단] = useState(false);
  const [거절사유, set거절사유] = useState("");
  const 거절하기 = async () => {
    const p = 거절할것;
    if (!p) return;
    set거절할것(null);
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`/api/proposals/${p.id}/decline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ block: 같이차단, reason: 거절사유.trim() || undefined }),
    }).catch(() => {});
    set같이차단(false);
    set거절사유("");
    불러오기();
  };

  const 버킷: Record<탭키, Proposal[]> = { 받은제안: [], 진행중: [], 종료: [] };
  목록.forEach((p) => 버킷[탭of(p)].push(p));

  return (
    <ProfileShell>
      <div className="profile-content">
        <section className="profile-section">
          <div className="profile-info-card">
            {/* 수락이 무엇을 여는지 표 위에서 한 번 밝힌다 — 매번 확인창을
                띄우니, 그 확인창 문구를 다시 안 읽어도 되게 여기서도 미리
                말해 둔다. */}
            <p className="prop-notice">
              제안을 수락하시면 해당 기업에게 수락 사실이 알려지고, 채팅으로 궁금한 점을 묻고 면접까지 진행하실 수 있어요.
            </p>

            {불러오는중 ? (
              <p className="pf-notif-empty">불러오는 중…</p>
            ) : 목록.length === 0 ? (
              <p className="pf-notif-empty">아직 받은 제안이 없어요.</p>
            ) : (
              <>
                <div className="prop-tabs">
                  {(["받은제안", "진행중", "종료"] as const).map((k) => (
                    <button key={k} type="button"
                      className={`prop-tab${탭 === k ? " on" : ""}`}
                      onClick={() => set탭(k)}>
                      {k} <span className="prop-tab-n">{버킷[k].length}</span>
                    </button>
                  ))}
                </div>

                {탭 === "받은제안" && (
                  버킷.받은제안.length === 0 ? (
                    <p className="pf-notif-empty">받은 제안이 없어요.</p>
                  ) : (
                    <div className="prop-tablewrap">
                      <table className="prop-table received">
                        <thead>
                          <tr>
                            <th className="apl-td-who">기업</th>
                            <th className="c-post">제안한 공고</th>
                            <th className="c-job">모집분야</th>
                            <th className="c-cond">근무조건</th>
                            <th className="c-date">제안일</th>
                          </tr>
                        </thead>
                        <tbody>
                          {버킷.받은제안.map((p) => (
                            <Fragment key={p.id}>
                              <tr>
                                <td className="apl-td apl-td-who">{기업칸(p, () => 열기(p))}</td>
                                <td className="c-post">
                                  <button type="button" className="prop-post" title={p.job_title}
                                    onClick={() => 열기(p)}>
                                    {p.job_title}
                                  </button>
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
                                <td className="c-date">{날짜(p.created_at)}</td>
                              </tr>
                              {/* 수락·거절은 기업이 보낸 말 박스 하단 오른쪽에 둔다
                                  ("수락 거절은 기업이 보낸 메시지 박스 하단 오른쪽에
                                  거절하기 수락하기 버튼을 넣으면 되지 않을까?"). */}
                              <tr className="prop-msg-row">
                                <td colSpan={5}>
                                  {p.message && <p className="prop-msg-text">“{p.message}”</p>}
                                  {/* 채팅은 수락 이후부터다("채팅은 진행중에서만" /
                                      "수락전 채팅은 안돼") — 여기서는 수락·거절만 고른다. */}
                                  <div className="prop-msg-acts">
                                    <button type="button" className="prop-cancel"
                                      onClick={() => { set거절할것(p); set같이차단(false); set거절사유(""); }}>
                                      거절하기
                                    </button>
                                    <button type="button" className="prop-chat-solid"
                                      onClick={() => { set한마디(""); set답할것(p); }}>
                                      수락하기
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {탭 === "진행중" && (
                  버킷.진행중.length === 0 ? (
                    <p className="pf-notif-empty">진행 중인 제안이 없어요.</p>
                  ) : (
                    <div className="prop-cards">
                      {버킷.진행중.map((p) => {
                        const st = 상태(p);
                        const 활 = 최근활동(p);
                        const 단계 = 현재단계(st);
                        return (
                          <div className="prop-card2" key={p.id}>
                            <div className="prop-card2-co">
                              <span className="apl-td-avatar">
                                {p.company_logo_url
                                  ? <img src={p.company_logo_url} alt="" loading="lazy" />
                                  : <span>{(p.brand_name || p.company_name || "?").slice(0, 1)}</span>}
                              </span>
                              <div className="prop-card2-colines">
                                <span className="prop-card2-name">{p.brand_name || p.company_name}</span>
                                <span className="prop-card2-job">{조건(p) ? `${조건(p)} 모집` : p.job_title}</span>
                                <button type="button" className="prop-card2-viewjob" onClick={() => 열기(p)}>
                                  공고 보기 <ChevronRight size={12} />
                                </button>
                              </div>
                            </div>

                            <div className="prop-step">
                              <div className="prop-step-dots">
                                {단계들.map((label, i) => (
                                  <Fragment key={label}>
                                    {i > 0 && <span className={`prop-step-line${i <= 단계 ? " on" : ""}`} />}
                                    <span className={`prop-step-dot${i <= 단계 ? " on" : ""}${i === 단계 ? " current" : ""}`} />
                                  </Fragment>
                                ))}
                              </div>
                              <div className="prop-step-labels">
                                {단계들.map((label, i) => (
                                  <span key={label} className={i < 단계 ? "on" : i === 단계 ? "current" : undefined}>
                                    {label}
                                    {/* 지금 단계 밑에 날짜를 바로 붙인다 — 상태 칸에 같은 말
                                        (면접예정)을 또 적지 않는다("면접에정이 2번 나올필요
                                        없으니... 날자를 프로그레스바 면접예정밑에 넣어"). */}
                                    {i === 단계 && <em>{활.글.replace("💬 ", "")}</em>}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="prop-card2-recent">
                              <span className="prop-card2-recent-label">최근 대화</span>
                              <button type="button" className="prop-card2-preview" onClick={() => set대화(p)}>
                                <span>{p.last_message_body || "아직 나눈 대화가 없어요"}</span>
                                <ChevronRight size={16} />
                              </button>
                            </div>

                            <div className="prop-card2-acts">
                              <button type="button" className="prop-chat-solid" onClick={() => set대화(p)}>
                                채팅하기
                              </button>
                              <button type="button" className="prop-card2-undo"
                                onClick={() => { set거절할것(p); set같이차단(false); set거절사유(""); }}>
                                제안취소
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {탭 === "종료" && (
                  버킷.종료.length === 0 ? (
                    <p className="pf-notif-empty">종료된 제안이 없어요.</p>
                  ) : (
                    <div className="prop-cards">
                      {버킷.종료.map((p) => {
                        const st = 상태(p);
                        return (
                          <div className="prop-card2 ended" key={p.id}>
                            <div className="prop-card2-co">
                              <span className="apl-td-avatar">
                                {p.company_logo_url
                                  ? <img src={p.company_logo_url} alt="" loading="lazy" />
                                  : <span>{(p.brand_name || p.company_name || "?").slice(0, 1)}</span>}
                              </span>
                              <div className="prop-card2-colines">
                                <span className="prop-card2-name">{p.brand_name || p.company_name}</span>
                                <span className="prop-card2-job">{조건(p) ? `${조건(p)} 모집` : p.job_title}</span>
                                <button type="button" className="prop-card2-viewjob" onClick={() => 열기(p)}>
                                  공고 보기 <ChevronRight size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="prop-card2-end">
                              <span className={`prop-badge prop-badge-${st}`}>{종료라벨[st]}</span>
                              <span className="prop-upd">{날짜(종료일(p))}</span>
                              {st === "거절" && p.decline_reason && (
                                <p className="prop-reason">거절 사유: “{p.decline_reason}”</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </>
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
            <p className="prop-dec-sub">수락하면 이 기업에게 수락 사실이 알려지고, 채팅창이 열려 궁금한 점을 묻고 면접까지 진행하실 수 있어요.</p>
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
            <textarea value={거절사유} onChange={(e) => set거절사유(e.target.value)} rows={2}
              maxLength={300}
              placeholder="거절 사유가 있으면 적어주세요 (선택)" />
            <label className="prop-dec-blk">
              <input type="checkbox" checked={같이차단}
                onChange={(e) => set같이차단(e.target.checked)} />
              이 매장의 제안 다시 받지 않기
            </label>
            <div className="prop-dec-acts">
              <button type="button" onClick={() => { set거절할것(null); set같이차단(false); set거절사유(""); }}>취소</button>
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
