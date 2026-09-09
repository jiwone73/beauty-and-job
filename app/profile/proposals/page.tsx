"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Wallet, Briefcase } from "lucide-react";
import ProposalThread from "@/components/proposal/ProposalThread";
import { 마감인가 } from "@/lib/jobClosed";
import ProfileShell from "@/components/profile/ProfileShell";
import { formatSalaryWon } from "@/lib/salary";
import { 지역비교 } from "@/lib/regionMatch";

/**
 * 받은 제안 — 기업이 인재검색에서 나를 보고 공고를 보내온 기록.
 *
 * 지원현황이 '내가 움직인 것'이면 여기는 '상대가 움직인 것'이다. 그래서
 * 사이드에서 지원현황 바로 옆에 둔다.
 *
 * 알림과 따로 두는 이유: 알림은 흘러가며 지워지는 것이고, 제안은 나중에
 * 다시 찾아보는 기록이다. 수명이 다르다.
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
  job_title: string;
  job_status: string;
  deadline: string | null;
  location: string | null;
  employment_type: string | null;
  salary_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  contact_methods: string[] | null;
  region_prefer: string | null;
  work_type_prefer: string | null;
  declined_at: string | null;
  job_created_at: string | null;
  /** 기업이 고른 자리 한 줄. 옛 제안은 공고의 자리를 전부 담는다. */
  positionLines: string[];
  message_count: number;
  appointment_at: string | null;
  application_status: string | null;
};

// 상태는 기업의 「공고별 보낸 제안」과 같은 말을 쓴다 — 같은 제안을 놓고 두
// 화면이 다르게 부르면 매장과 구직자가 다른 것을 세게 된다.
// 이미 무슨 일이 일어난 제안은 공고가 닫혀도 그 상태를 지킨다. 공고마감은
// 아직 아무 일도 없는 제안에만 붙는다.
type 상태키 = "채용완료" | "면접예정" | "채팅중" | "수락" | "거절" | "공고마감" | "대기";
const 상태색: Record<상태키, string> = {
  채용완료: "#1f7a4d", 수락: "#1f7a4d",
  면접예정: "var(--color-primary)", 채팅중: "var(--color-primary)",
  거절: "var(--color-text)", 공고마감: "var(--color-text)", 대기: "var(--color-text)",
};
function 상태(p: Proposal): 상태키 {
  if (p.application_status === "PASSED") return "채용완료";
  if (p.declined_at) return "거절";
  if (p.appointment_at) return "면접예정";
  if (p.interested_at) return p.message_count > 0 ? "채팅중" : "수락";
  if (마감인가(p.job_status, p.deadline)) return "공고마감";
  return "대기";
}
const 기간 = (시작: string | null, 마감일: string | null) => {
  const 짧게 = (v: string) => new Date(v).toLocaleDateString("ko-KR",
    { month: "2-digit", day: "2-digit" }).replace(/\.$/, "").replace(/\s/g, "");
  if (!시작) return 마감일 ? `~ ${짧게(마감일)}` : "상시";
  return `${짧게(시작)} ~ ${마감일 ? 짧게(마감일) : "상시"}`;
};

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

  // 「관심 있어요」 — 누르면 매장이 내 연락처를 볼 수 있고 알림이 간다.
  // 수락/거절이 아니라 한 방향이라, 관심 없으면 그냥 두면 된다.
  // 관심은 대개 조건부라 한마디를 붙일 수 있게 열어 준다(선택).
  // 관심을 보낸 뒤에는 그 자리에서 대화를 이어 간다 — 새 화면으로 보내지 않는다.
  const [대화, set대화] = useState<Proposal | null>(null);
  const [관심쓰는중, set관심쓰는중] = useState<string | null>(null);
  const [한마디, set한마디] = useState("");

  const 관심열기 = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    set한마디("");
    set관심쓰는중(id);
  };

  const 관심보내기 = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const 글 = 한마디.trim();
    // 눌린 표시를 먼저 바꾼다 — 응답을 기다리는 동안 아무 일도 안 일어난 것처럼 보인다.
    set목록((prev) => prev.map((p) => (p.id === id
      ? { ...p, interested_at: new Date().toISOString(), interest_message: 글 || null } : p)));
    set관심쓰는중(null);
    await fetch(`/api/users/me/proposals/${id}`, {
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

  const 안읽음 = 목록.filter((p) => !p.read_at).length;

  return (
    <ProfileShell>
      <div className="profile-content">
        <section className="profile-section">
          <div className="profile-info-card">

            {불러오는중 ? (
              <p className="pf-notif-empty">불러오는 중…</p>
            ) : 목록.length === 0 ? (
              <p className="pf-notif-empty">아직 받은 제안이 없어요.</p>
            ) : (
              <div className="prop-list">
                {목록.map((p) => {
                  const st = 상태(p);
                  const 마감 = st === "공고마감" || 마감인가(p.job_status, p.deadline);
                  // 기업이 따로 쓰지 않아도, 내 희망 조건과 겹치는 것을 찾아 붙인다.
                  const 맞는점: string[] = [];
                  if (지역비교(p.location, p.region_prefer) === "same") 맞는점.push("희망 지역");
                  if (p.employment_type && p.work_type_prefer
                      && p.employment_type === p.work_type_prefer) 맞는점.push("희망 근무형태");

                  return (
                    <div key={p.id} className={`prop-item${p.read_at ? "" : " unread"}`}
                      onClick={() => 열기(p)}>
                      <div className="prop-row">
                        <div className="prop-main">
                          {/* 공고 기간이 곧 마감일이다 — 따로 칸을 두지 않는다. */}
                          <p className="prop-period">
                            <span className={마감 ? "off" : "on"}>{마감 ? "마감" : "진행중"}</span>
                            {기간(p.job_created_at, p.deadline)}
                          </p>
                          <p className="prop-title2">{p.job_title}</p>
                          <p className="prop-co2">
                            {p.brand_name || p.company_name}
                            {p.location ? ` · ${p.location}` : ""}
                          </p>
                          {/* 어느 자리로 온 제안인가. 기업이 고른 자리만 적는다 —
                              옛 제안은 그 값이 없어 공고의 자리를 전부 적는다. */}
                          {p.positionLines?.map((줄, i) => (
                            <p key={i} className="prop-pos2">{줄}</p>
                          ))}
                          {맞는점.length > 0 && (
                            <div className="prop-match">
                              {맞는점.map((m) => <span key={m}>{m}과 같아요</span>)}
                            </div>
                          )}
                          {p.message && <p className="prop-msg2">“{p.message}”</p>}
                        </div>

                        {/* 오른쪽은 지금 무슨 상태이고 무엇을 하면 되는가 — 세 줄로 끝낸다. */}
                        <div className="prop-side">
                          <span className="prop-st2" style={{ color: 상태색[st] }}>{st}</span>
                          {st === "면접예정" && p.appointment_at && (
                            <span className="prop-sub2">
                              {new Date(p.appointment_at).toLocaleString("ko-KR",
                                { month: "numeric", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" })}
                            </span>
                          )}
                          {st === "대기" && (
                            <button type="button" className="prop-go"
                              onClick={(e) => 관심열기(p.id, e)}>수락하기</button>
                          )}
                          {(st === "수락" || st === "채팅중") && (
                            <button type="button" className="prop-go"
                              onClick={(e) => { e.stopPropagation(); set대화(p); }}>채팅하기</button>
                          )}
                          {st === "면접예정" && (
                            <button type="button" className="prop-go ghost"
                              onClick={(e) => { e.stopPropagation(); set대화(p); }}>일정 확인</button>
                          )}
                          {st === "대기" && (
                            <button type="button" className="prop-decline"
                              onClick={(e) => { e.stopPropagation(); set거절할것(p); set같이차단(false); }}>
                              거절하기
                            </button>
                          )}
                        </div>
                      </div>

                      {관심쓰는중 === p.id && (
                        <div className="prop-interest-box" onClick={(e) => e.stopPropagation()}>
                          <textarea value={한마디} onChange={(e) => set한마디(e.target.value)} rows={2}
                            maxLength={300} autoFocus
                            placeholder="궁금한 점이나 조건이 있으면 적어주세요 (예: 주 4일 가능할까요?)" />
                          <div className="prop-interest-acts">
                            <button type="button" onClick={(e) => { e.stopPropagation(); set관심쓰는중(null); }}>취소</button>
                            <button type="button" className="key" onClick={(e) => 관심보내기(p.id, e)}>보내기</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
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

      {대화 && (
        <ProposalThread
          proposalId={대화.id}
          제목={대화.job_title}
          상대={대화.brand_name || 대화.company_name}
          token={localStorage.getItem("access_token") || ""}
          onClose={() => set대화(null)}
        />
      )}
    </ProfileShell>
  );
}
