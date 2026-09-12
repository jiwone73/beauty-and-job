"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, FileText } from "lucide-react";
import { shortRegion } from "@/lib/regionShort";
import { 마감인가 } from "@/lib/jobClosed";
import MyApplicationModal from "@/components/profile/MyApplicationModal";
import JobSearchCertificateModal from "@/components/profile/JobSearchCertificateModal";
import JobPostingCertificateModal from "@/components/profile/JobPostingCertificateModal";

/** 지원현황.
 *
 *  카드 두 열이었다. 한 건에 담을 것이 제목·매장·날짜·상태뿐이라 카드가
 *  헐거웠고 두 열이라 눈이 지그재그로 갔다. 여러 건을 훑고 견주는 자리는
 *  표가 맞다 — 채용제안에서 카드를 표로 바꾼 것과 같은 이유다.
 *
 *  지원 상태와 공고 상태를 다른 열로 가른다. 「마감」은 매장 사정이고
 *  「열람」은 내 사정인데, 한자리에 있으면 마감된 공고에 지원완료가 붙어
 *  「나는 떨어진 건가」로 읽힌다. */

const 한쪽 = 10;

// 면접·합격·불합격은 매장이 스스로 정리하려고 누르는 값이지 지원자에게 보내는
// 통보가 아니다. 그대로 노출하면 매장이 목록을 정리한 것뿐인데 '불합격 통보'처럼
// 읽힌다. 합격은 어차피 매장이 직접 연락하고, 떨어진 경우는 공고가 마감되면
// 알게 된다. 지원자에게는 '접수됐는지 / 열어봤는지'까지만 보여준다.
const 열람한상태 = ["REVIEWING", "VIEWED", "INTERVIEW", "PASSED", "REJECTED"];
const 지원상태 = (s: string) =>
  s === "WITHDRAWN" ? "지원취소" : 열람한상태.includes(s) ? "기업 열람" : "지원완료";

export default function AppliedList({ userName }: { userName: string }) {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewAppId, setViewAppId] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);
  const [certApp, setCertApp] = useState<any | null>(null);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  // 평소엔 체크칸을 감춰 목록을 읽기 좋게 두고, 증명서를 누를 때만 고르는 화면이 된다.
  const [selectMode, setSelectMode] = useState(false);
  const [menuAppId, setMenuAppId] = useState<string | null>(null);
  const [탭, set탭] = useState<"전체" | "지원완료" | "기업 열람" | "공고마감">("전체");
  const [기간, set기간] = useState<"3" | "6" | "12" | "전체">("3");
  const [검색, set검색] = useState("");
  const [쪽, set쪽] = useState(1);

  const toggleSelect = (id: string) =>
    setSelectedApps((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  useEffect(() => {
    if (!menuAppId) return;
    const close = () => setMenuAppId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuAppId]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    const load = async (attempt = 0): Promise<void> => {
      try {
        const r = await fetch("/api/users/me/applications?limit=200", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const res = await r.json();
        if (cancelled) return;
        if (res.success) { setApps(res.data || []); setError(false); setLoading(false); }
        else throw new Error(res.error?.message || "응답 실패");
      } catch (e) {
        if (cancelled) return;
        // 콜드스타트·일시 실패는 다시 부른다(최대 3회).
        if (attempt < 2) setTimeout(() => load(attempt + 1), 600);
        else { console.error("[applications]", e); setError(true); setLoading(false); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleCancel = async (appId: string) => {
    if (!confirm("이 지원을 취소하시겠어요? 취소하면 되돌릴 수 없어요.")) return;
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/users/me/applications/${appId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setApps((prev) => prev.map((a) => a.id === appId ? { ...a, status: "WITHDRAWN" } : a));
      else alert(data.error?.message || "지원 취소에 실패했어요.");
    } catch { alert("지원 취소 중 오류가 발생했어요."); }
  };

  // 종료된 지원 건을 목록에서만 숨긴다(기업에는 영향 없음).
  const handleHide = async (appId: string) => {
    if (!confirm("이 지원 내역을 목록에서 삭제할까요?\n(기업에는 영향을 주지 않으며, 되돌릴 수 없어요.)")) return;
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/users/me/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hidden: true }),
      });
      const data = await res.json();
      if (data.success) setApps((prev) => prev.filter((a) => a.id !== appId));
      else alert(data.error?.message || "삭제에 실패했어요.");
    } catch { alert("삭제 중 오류가 발생했어요."); }
  };

  const 마감됨 = (a: any) => 마감인가(a.job_status, a.deadline);

  const 셈 = useMemo(() => ({
    전체: apps.length,
    지원완료: apps.filter((a) => 지원상태(a.status) === "지원완료").length,
    "기업 열람": apps.filter((a) => 지원상태(a.status) === "기업 열람").length,
    공고마감: apps.filter(마감됨).length,
  }), [apps]);

  const 걸러진것 = useMemo(() => {
    const 말 = 검색.trim();
    const 기준 = 기간 === "전체" ? null
      : new Date(Date.now() - Number(기간) * 30 * 86400000);
    return apps.filter((a) => {
      if (탭 === "공고마감" ? !마감됨(a) : 탭 !== "전체" && 지원상태(a.status) !== 탭) return false;
      if (기준 && new Date(a.applied_at) < 기준) return false;
      if (말 && !`${a.job_title || ""} ${a.brand_name || ""} ${a.company_name || ""}`.includes(말)) return false;
      return true;
    });
  }, [apps, 탭, 기간, 검색]);

  useEffect(() => { set쪽(1); }, [탭, 기간, 검색]);

  const 쪽수 = Math.max(1, Math.ceil(걸러진것.length / 한쪽));
  const 보일것 = 걸러진것.slice((쪽 - 1) * 한쪽, 쪽 * 한쪽);

  if (loading) return <div className="profile-empty-tab"><p style={{ color: "#555", padding: "40px 0" }}>불러오는 중...</p></div>;
  if (error) return (
    <div className="profile-empty-tab">
      <div className="profile-empty-icon">⚠️</div>
      <p>지원 내역을 불러오지 못했어요.<br />잠시 후 새로고침해 주세요.</p>
    </div>
  );
  if (apps.length === 0) return (
    <div className="profile-empty-tab">
      <div className="profile-empty-icon">📋</div>
      <p>아직 지원한 공고가 없어요</p>
      <a href="/jobs" className="profile-empty-btn">채용공고 보러가기</a>
    </div>
  );

  const 날짜 = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="profile-tab-content">
      <div className="ap-head">
        <p className="ap-sub">내가 지원한 채용공고와 진행상태를 확인할 수 있습니다.</p>
        {/* 증명서는 넣을 건을 골라야 만들어진다. 그래서 처음 누르면 고르는
            화면으로 바뀌고, 다 고른 뒤 다시 누르면 만들어진다. */}
        <button className="ap-cert" disabled={selectMode && selectedApps.size === 0}
          onClick={() => {
            if (!selectMode) { setSelectMode(true); return; }
            setShowCert(true);
          }}>
          <FileText size={16} />
          {selectMode ? `증명서 발급 ${selectedApps.size > 0 ? selectedApps.size : ""}` : "취업활동 증명서 발급"}
        </button>
      </div>

      <div className="ap-tabs">
        {(["전체", "지원완료", "기업 열람", "공고마감"] as const).map((t) => (
          <button key={t} className={`ap-tab${탭 === t ? " on" : ""}`} onClick={() => set탭(t)}>
            {t}<em>{셈[t]}</em>
          </button>
        ))}
      </div>

      <div className="ap-filters">
        {/* 상태는 위 탭이 이미 가르므로 여기 또 두지 않는다 — 같은 일을 하는
            고르개가 둘이면 어느 것이 이겼는지 알 수 없다. */}
        <select className="ap-search" style={{ flex: "0 0 150px", minWidth: 0 }}
          value={기간} onChange={(e) => set기간(e.target.value as any)}>
          <option value="3">최근 3개월</option>
          <option value="6">최근 6개월</option>
          <option value="12">최근 1년</option>
          <option value="전체">전체 기간</option>
        </select>
        <input className="ap-search" placeholder="공고명 또는 기업명을 검색하세요"
          value={검색} onChange={(e) => set검색(e.target.value)} />
      </div>

      <div className="ap-tablewrap">
        <table className="ap-table">
          <thead>
            <tr>
              {selectMode && <th style={{ width: 44 }}></th>}
              <th>공고 정보</th>
              <th style={{ width: 110 }}>지원일</th>
              <th style={{ width: 110 }}>지원 상태</th>
              <th style={{ width: 100 }}>공고 상태</th>
              <th style={{ width: 150, textAlign: "right" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {보일것.length === 0 && (
              <tr><td colSpan={selectMode ? 6 : 5} style={{ padding: "40px 14px", textAlign: "center", color: "#555" }}>
                조건에 맞는 지원 내역이 없어요
              </td></tr>
            )}
            {보일것.map((app) => {
              const 상태 = 지원상태(app.status);
              const 닫힘 = 마감됨(app);
              const 이름 = app.brand_name || app.company_name || "";
              return (
                <tr key={app.id}>
                  {selectMode && (
                    <td>
                      <input type="checkbox" className="applied-check"
                        checked={selectedApps.has(app.id)} onChange={() => toggleSelect(app.id)} />
                    </td>
                  )}
                  <td>
                    <div className="ap-job">
                      <span className="ap-logo">
                        {app.logo_url ? <img src={app.logo_url} alt="" /> : <span>{이름.slice(0, 1)}</span>}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <a className="ap-job-t"
                          onClick={() => app.job_id && router.push(`/jobs/${app.job_id}`)}
                          style={{ cursor: app.job_id ? "pointer" : "default" }}>
                          {app.job_title}
                        </a>
                        <span className="ap-job-c">
                          {이름}{app.location ? ` | ${shortRegion(app.location)}` : ""}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="ap-date">{날짜(app.applied_at)}</td>
                  <td>
                    <span className={`ap-st${상태 === "기업 열람" ? " seen" : 상태 === "지원취소" ? " off" : ""}`}>
                      {상태}
                    </span>
                  </td>
                  <td><span className={`ap-jst${닫힘 ? " closed" : ""}`}>{닫힘 ? "공고 마감" : "채용중"}</span></td>
                  <td>
                    <div className="ap-acts">
                      {app.job_id && (
                        <button className="ap-view" onClick={() => router.push(`/jobs/${app.job_id}`)}>공고 보기</button>
                      )}
                      <div className="applied-menu-wrap">
                        <button className="applied-menu-btn" aria-label="더보기"
                          onClick={(e) => { e.stopPropagation(); setMenuAppId(menuAppId === app.id ? null : app.id); }}>
                          <MoreHorizontal size={18} />
                        </button>
                        {menuAppId === app.id && (
                          <div className="applied-menu" onClick={(e) => e.stopPropagation()}>
                            <button className="applied-menu-item" onClick={() => { setMenuAppId(null); setViewAppId(app.id); }}>내 지원서 보기</button>
                            <button className="applied-menu-item" onClick={() => { setMenuAppId(null); setCertApp(app); }}>공고 증명서</button>
                            {(app.status === "APPLIED" || app.status === "VIEWED") ? (
                              <button className="applied-menu-item danger" onClick={() => { setMenuAppId(null); handleCancel(app.id); }}>지원 취소</button>
                            ) : (
                              <button className="applied-menu-item" onClick={() => { setMenuAppId(null); handleHide(app.id); }}>목록에서 삭제</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {쪽수 > 1 && (
        <div className="ap-pager">
          <button disabled={쪽 === 1} onClick={() => set쪽((v) => v - 1)}>‹</button>
          {Array.from({ length: 쪽수 }, (_, i) => i + 1).map((n) => (
            <button key={n} className={n === 쪽 ? "on" : undefined} onClick={() => set쪽(n)}>{n}</button>
          ))}
          <button disabled={쪽 === 쪽수} onClick={() => set쪽((v) => v + 1)}>›</button>
        </div>
      )}

      {selectMode && (
        <div className="ap-pager" style={{ marginTop: 14 }}>
          <button onClick={() => { setSelectMode(false); setSelectedApps(new Set()); }}
            style={{ color: "#555" }}>고르기 그만두기</button>
        </div>
      )}

      {viewAppId && <MyApplicationModal applicationId={viewAppId} onClose={() => setViewAppId(null)} />}
      {showCert && (
        <JobSearchCertificateModal name={userName} apps={apps.filter((a) => selectedApps.has(a.id))}
          onClose={() => { setShowCert(false); setSelectMode(false); setSelectedApps(new Set()); }} />
      )}
      {certApp && <JobPostingCertificateModal name={userName} app={certApp} onClose={() => setCertApp(null)} />}
    </div>
  );
}
