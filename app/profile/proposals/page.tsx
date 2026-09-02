"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Wallet, Briefcase } from "lucide-react";
import ProposalThread from "@/components/proposal/ProposalThread";
import { 제안만료, 제안남은날 } from "@/lib/proposal";
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
            <div className="pf-notif-head">
              <span className="profile-info-label">
                받은 제안{안읽음 > 0 && <em className="pf-notif-count">{안읽음}</em>}
              </span>
            </div>

            {불러오는중 ? (
              <p className="pf-notif-empty">불러오는 중…</p>
            ) : 목록.length === 0 ? (
              <p className="pf-notif-empty">아직 받은 제안이 없어요.</p>
            ) : (
              <div className="prop-list">
                {목록.map((p) => {
                  const 마감 = p.job_status === "CLOSED"
                    || (p.deadline && new Date(p.deadline) < new Date());
                  // 답 없이 기간이 지나면 닫힌다. 거절을 통보하는 대신 기다리는
                  // 기간을 정해 둔 것이라, 남은 날을 미리 알려 준다.
                  const 만료 = 제안만료(p.created_at, p.interested_at);
                  const 남은날 = 제안남은날(p.created_at);
                  // 기업이 따로 쓰지 않아도, 내 희망 조건과 겹치는 것을 찾아 붙인다.
                  const 맞는점: string[] = [];
                  if (지역비교(p.location, p.region_prefer) === "same") 맞는점.push("희망 지역");
                  if (p.employment_type && p.work_type_prefer
                      && p.employment_type === p.work_type_prefer) 맞는점.push("희망 근무형태");
                  const 급여 = p.salary_min ? formatSalaryWon(p.salary_min, p.salary_type) : null;

                  return (
                    <div key={p.id} className={`prop-item${p.read_at ? "" : " unread"}`}
                      onClick={() => 열기(p)}>
                      {/* 왼쪽에 누가 무엇을 보냈는지, 오른쪽에 언제와 갈 곳.
                          제목을 머리줄 밖으로 내리면 오른쪽 두 줄만큼 빈 자리가 생긴다. */}
                      <div className="prop-head">
                        <span className="prop-headl">
                          <span className="prop-co">{p.brand_name || p.company_name}</span>
                          <span className="prop-title">
                            {/* 누르면 공고로 간다 — 밑줄이 그 길을 말한다. */}
                            <span className="prop-titletxt">{p.job_title}</span>
                            {마감 && <span className="prop-closed">마감</span>}
                          </span>
                        </span>
                        <span className="prop-when">
                          <span className="prop-date">
                            {new Date(p.created_at).toLocaleDateString("ko-KR")}
                          </span>
                        </span>
                      </div>

                      <div className="prop-meta">
                        {p.location && <span><MapPin size={12} />{p.location}</span>}
                        {p.employment_type && <span><Briefcase size={12} />{p.employment_type}</span>}
                        {급여 && <span><Wallet size={12} />{급여}</span>}
                      </div>

                      {맞는점.length > 0 && (
                        <div className="prop-match">
                          {맞는점.map((m) => <span key={m}>{m}과 같아요</span>)}
                        </div>
                      )}

                      {/* 매장이 쓴 말과 그에 대한 답은 한 줄이다 — 버튼을 아래로
                          따로 내리면 카드가 세로로 길어지고 눌 곳이 멀어진다. */}
                      <div className="prop-say">
                        {p.message ? <p className="prop-msg">{p.message}</p> : <span className="prop-msg" />}
                        {/* 마감된 자리는 관심을 눌러도 갈 데가 없다. */}
                        {p.interested_at ? (
                          <button type="button" className="prop-interest"
                            onClick={(e) => { e.stopPropagation(); set대화(p); }}>
                            대화하기
                          </button>
                        ) : 마감 ? null : 만료 ? (
                          <span className="prop-interest on">답변 기간이 지났어요</span>
                        ) : 관심쓰는중 === p.id ? null : (
                          <button type="button" className="prop-interest"
                            onClick={(e) => 관심열기(p.id, e)}>
                            관심 있어요
                            {남은날 <= 3 && <span className="prop-interest-left">{남은날}일 남음</span>}
                          </button>
                        )}
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

                      <div className="prop-foot">
                        {/* 지원 방법은 공고에 적힌 대로 알려 준다 — 이 업계는
                            전화 한 통으로 끝나는 경우가 많다. */}
                        {p.contact_methods && p.contact_methods.length > 0 && (
                          <span className="prop-how">지원 방법 · {p.contact_methods.join(", ")}</span>
                        )}
                        {!p.interested_at && (
                          <button type="button" className="prop-decline"
                            onClick={(e) => { e.stopPropagation(); set거절할것(p); set같이차단(false); }}>
                            거절하기
                          </button>
                        )}
                      </div>
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
