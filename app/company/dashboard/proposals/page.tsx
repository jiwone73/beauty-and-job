"use client";
import { useCallback, useEffect, useState } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import ProposalThread from "@/components/proposal/ProposalThread";
import ResumePreview from "@/components/profile/ResumePreview";
import { mapResume, calcAgeFromBirth } from "@/lib/resumeView";
import { 제안유효일, 제안만료, 제안남은날 } from "@/lib/proposal";
import { Send, X } from "lucide-react";

// 보낸 제안. 인재 검색은 끝까지 검색이라 제안을 보내는 데서 끝나고, 보낸 뒤의
// 시간축 — 읽었는지, 대화를 수락했는지, 며칠 남았는지 — 은 전부 여기서 본다.
// 사람인의 '인재풀 검색 / 후보자 관리', 셀렉미의 '인재정보 / 보낸제안'과 같은 갈래다.

type 제안 = {
  id: string;
  createdAt: string;
  readAt: string | null;
  interestedAt: string | null;
  interestMessage: string | null;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  lastSender: "USER" | "COMPANY" | null;
  blocked: boolean;
};

const 날짜 = (s: string) => new Date(s).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });

// 지금 어떤 상태인지 한 마디로. 매장이 다음에 뭘 해야 하는지가 여기서 갈린다.
function 상태(p: 제안): { 글: string; 색: string; 급한가: boolean } {
  if (p.blocked) return { 글: "차단됨", 색: "#b4b4b9", 급한가: false };
  if (p.interestedAt) {
    return p.lastSender === "USER"
      ? { 글: "답장 기다리는 중", 색: "#582681", 급한가: true }
      : { 글: "대화 수락", 색: "#1f7a4d", 급한가: false };
  }
  if (제안만료(p.createdAt, p.interestedAt)) return { 글: "기간 지남", 색: "#b4b4b9", 급한가: false };
  return p.readAt
    ? { 글: "읽음 · 답변 대기", 색: "#8a8a90", 급한가: false }
    : { 글: "아직 안 읽음", 색: "#8a8a90", 급한가: false };
}

export default function CompanyProposalsPage() {
  const [목록, set목록] = useState<제안[]>([]);
  const [로딩, set로딩] = useState(true);
  const [대화, set대화] = useState<제안 | null>(null);
  // 이력서는 인재 검색에서만 열리던 것이라, 여기서 사람을 보고도 다시 검색으로
  // 돌아가야 했다. 이름과 사진을 누르면 그 자리에서 열린다.
  const [이력서, set이력서] = useState<제안 | null>(null);
  const [이력서값, set이력서값] = useState<any>(null);
  const [이력서로딩, set이력서로딩] = useState(false);

  const 불러오기 = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const r = await fetch("/api/company/proposals", { headers: { Authorization: `Bearer ${token}` } })
      .then((x) => x.json()).catch(() => null);
    if (r?.success && Array.isArray(r.data)) set목록(r.data);
    set로딩(false);
  }, []);
  useEffect(() => { 불러오기(); }, [불러오기]);

  useEffect(() => {
    if (!이력서) { set이력서값(null); return; }
    const token = localStorage.getItem("access_token");
    set이력서로딩(true);
    fetch(`/api/company/talent/${이력서.userId}/resume`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => set이력서값(d.data || d))
      .catch(() => set이력서값(null))
      .finally(() => set이력서로딩(false));
  }, [이력서]);

  // 답장을 기다리게 둔 것이 맨 위. 그다음 회신 대기, 끝난 것은 아래로.
  const 정렬 = [...목록].sort((a, b) => {
    const 급 = (p: 제안) => (상태(p).급한가 ? 0 : 제안만료(p.createdAt, p.interestedAt) || p.blocked ? 2 : 1);
    return 급(a) - 급(b) || +new Date(b.createdAt) - +new Date(a.createdAt);
  });
  const 회신대기 = 목록.filter((p) => !p.interestedAt && !p.blocked && !제안만료(p.createdAt, p.interestedAt)).length;
  const 답할것 = 목록.filter((p) => 상태(p).급한가).length;

  return (
    <CompanyLayout activePage="proposals">
      <div>
        <div className="tal-listhead">
          <span style={{ marginLeft: 0 }}>
            보낸 제안 <strong>{목록.length}</strong>
            {회신대기 > 0 && <> · 회신 대기 <strong>{회신대기}</strong></>}
            {답할것 > 0 && <> · 미답변 문의 <strong>{답할것}</strong></>}
          </span>
        </div>

        {로딩 ? (
          <p style={{ padding: "48px 0", textAlign: "center", color: "#9a9a9a", fontSize: 14 }}>불러오는 중…</p>
        ) : 목록.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#9a9a9a" }}>
            <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: "#f7f7f8", color: "#bfbfbf", marginBottom: 12 }}>
              <Send size={30} />
            </div>
            <p style={{ fontSize: 15, color: "#3a3a3a", margin: 0 }}>아직 보낸 제안이 없어요</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>인재 검색에서 마음에 드는 분에게 제안을 보내보세요</p>
          </div>
        ) : (
          <div className="tal-list">
            {정렬.map((p) => {
              const st = 상태(p);
              const 남은 = 제안남은날(p.createdAt);
              const 진행중 = !p.interestedAt && !p.blocked && !제안만료(p.createdAt, p.interestedAt);
              return (
                <div key={p.id} className="tal-card prop">
                  <div className="tal-top">
                    <div className="tal-avatar" onClick={() => set이력서(p)} title="이력서 보기">
                      {p.avatarUrl
                        ? <img src={p.avatarUrl} alt={p.userName} loading="lazy" />
                        : <span>{(p.userName || "?").slice(0, 1)}</span>}
                    </div>

                    <div className="tal-main">
                      <div className="tal-nameline">
                        <button type="button" className="tal-name" onClick={() => set이력서(p)}>{p.userName}</button>
                      </div>
                      <div className="tal-head">
                        <span style={{ fontSize: 12.5, color: st.색 }}>{st.글}</span>
                        {/* 기한은 사흘 안쪽일 때만 말한다 — 일주일 내내 세고 있으면 재촉으로 읽힌다. */}
                        {진행중 && 남은 <= 3 && (
                          <span className="tal-sub">D-{남은}</span>
                        )}
                      </div>
                      <div className="tal-meta">
                        {p.jobTitle && <span>{p.jobTitle}</span>}
                        <span>{날짜(p.createdAt)} 보냄</span>
                      </div>
                      {p.interestMessage && (
                        <div className="tal-recent">“{p.interestMessage}”</div>
                      )}
                    </div>

                    {/* 이 화면의 할 일은 대화 하나뿐이라 모양도 하나다. 급한 건은
                        버튼 색이 아니라 상태 문구와 맨 위 자리가 말한다. */}
                    <div className="tal-acts">
                      {p.interestedAt && !p.blocked && (
                        <button type="button" className="tal-btn key" onClick={() => set대화(p)}>
                          대화하기
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 기한 안내는 목록 아래 한 줄로. 카드마다 붙이면 같은 말이 스무 번 선다. */}
        {목록.length > 0 && (
          <p style={{ margin: "14px 2px 0", fontSize: 12.5, color: "#a0a0a6" }}>
            답이 없으면 {제안유효일}일 뒤 닫혀요. 그때까지는 상대가 언제든 답할 수 있어요.
          </p>
        )}
      </div>

      {대화 && (
        <ProposalThread
          proposalId={대화.id}
          제목={대화.jobTitle || "제안한 공고"}
          상대={대화.userName}
          token={typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : ""}
          onClose={() => { set대화(null); 불러오기(); }}
        />
      )}

      {이력서 && (
        <div className="rp-modal-overlay" onClick={() => set이력서(null)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <h2 style={{ fontSize: 18, color: "#1a1a1a", margin: 0 }}>{이력서.userName}</h2>
              <div className="rp-modal-actions">
                <button onClick={() => set이력서(null)} title="닫기"
                  style={{ display: "inline-flex", padding: 4, border: "none", background: "none", color: "#888", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="rp-modal-body">
              {이력서로딩 ? (
                <div className="admin-empty">이력서 불러오는 중...</div>
              ) : 이력서값 ? (
                <ResumePreview
                  name={이력서값.user?.name || 이력서.userName}
                  birthDisplay={
                    이력서값.user?.birth_date
                      ? `${String(이력서값.user.birth_date).slice(0, 4)}년 (${calcAgeFromBirth(이력서값.user.birth_date)}세, ${이력서값.user.gender === "FEMALE" ? "여" : 이력서값.user.gender === "MALE" ? "남" : ""})`
                      : ""
                  }
                  jobDisplay={이력서값.user?.job_type === "STORE" ? "매장" : "본사"}
                  phone={이력서값.user?.phone || ""}
                  email={이력서값.user?.email || ""}
                  portfolioImages={이력서값.user?.portfolio_images || []}
                  avatarUrl={이력서값.user?.avatar_url || null}
                  resumeType={이력서값.user?.job_type === "STORE" ? "salon" : "office"}
                  {...mapResume(이력서값)}
                />
              ) : (
                <div className="admin-empty">이력서 데이터를 불러올 수 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
