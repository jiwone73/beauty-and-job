"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, MapPin, Wallet, Briefcase } from "lucide-react";
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

  const 치우기 = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 제안을 목록에서 치울까요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`/api/users/me/proposals/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
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
                  // 기업이 따로 쓰지 않아도, 내 희망 조건과 겹치는 것을 찾아 붙인다.
                  const 맞는점: string[] = [];
                  if (지역비교(p.location, p.region_prefer) === "same") 맞는점.push("희망 지역");
                  if (p.employment_type && p.work_type_prefer
                      && p.employment_type === p.work_type_prefer) 맞는점.push("희망 근무형태");
                  const 급여 = p.salary_min ? formatSalaryWon(p.salary_min, p.salary_type) : null;

                  return (
                    <div key={p.id} className={`prop-item${p.read_at ? "" : " unread"}`}
                      onClick={() => 열기(p)}>
                      <div className="prop-head">
                        <span className="prop-co">{p.brand_name || p.company_name}</span>
                        <span className="prop-date">
                          {new Date(p.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      <p className="prop-title">
                        {p.job_title}
                        {마감 && <span className="prop-closed">마감</span>}
                      </p>

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

                      {p.message && <p className="prop-msg">{p.message}</p>}

                      <div className="prop-foot">
                        <span className="prop-cta">채용공고 보기</span>
                        {/* 지원 방법은 공고에 적힌 대로 알려 준다 — 이 업계는
                            전화 한 통으로 끝나는 경우가 많다. */}
                        {p.contact_methods && p.contact_methods.length > 0 && (
                          <span className="prop-how">지원 방법 · {p.contact_methods.join(", ")}</span>
                        )}
                      </div>

                      <button type="button" className="prop-del" aria-label="치우기"
                        onClick={(e) => 치우기(p.id, e)}>
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </ProfileShell>
  );
}
