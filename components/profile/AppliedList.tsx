"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { shortRegion } from "@/lib/regionShort";
import MyApplicationModal from "@/components/profile/MyApplicationModal";
import JobSearchCertificateModal from "@/components/profile/JobSearchCertificateModal";
import JobPostingCertificateModal from "@/components/profile/JobPostingCertificateModal";

/** 지원현황. 프로필 화면의 탭이었는데 주소를 따로 갖게 되면서 떼어 냈다. */
export default function AppliedList({ userName }: { userName: string }) {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewAppId, setViewAppId] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);
  const [certApp, setCertApp] = useState<any | null>(null);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  // 평소엔 체크박스를 감춰 목록을 읽기 좋게 두고, '선택'을 눌렀을 때만 고르는 화면이 된다.
  const [selectMode, setSelectMode] = useState(false);
  const 선택끝내기 = () => { setSelectMode(false); setSelectedApps(new Set()); };
  const [menuAppId, setMenuAppId] = useState<string | null>(null);
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
        const r = await fetch("/api/users/me/applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const res = await r.json();
        if (cancelled) return;
        if (res.success) {
          setApps(res.data || []);
          setError(false);
          setLoading(false);
        } else {
          throw new Error(res.error?.message || "응답 실패");
        }
      } catch (e) {
        if (cancelled) return;
        if (attempt < 2) {
          setTimeout(() => load(attempt + 1), 600); // 콜드스타트/일시 실패 시 재시도 (최대 3회)
        } else {
          console.error("[applications]", e);
          setError(true);
          setLoading(false);
        }
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
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setApps((prev) => prev.map((a) => a.id === appId ? { ...a, status: "WITHDRAWN" } : a));
      } else {
        alert(data.error?.message || "지원 취소에 실패했어요.");
      }
    } catch {
      alert("지원 취소 중 오류가 발생했어요.");
    }
  };

  // 종료된 지원 건을 목록에서만 숨김 (기업에는 영향 없음)
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
      if (data.success) {
        setApps((prev) => prev.filter((a) => a.id !== appId));
      } else {
        alert(data.error?.message || "삭제에 실패했어요.");
      }
    } catch {
      alert("삭제 중 오류가 발생했어요.");
    }
  };

  const handleBulkHide = async () => {
    if (selectedApps.size === 0) { alert("삭제할 지원 내역을 선택해주세요."); return; }
    if (!confirm(`선택한 ${selectedApps.size}건을 목록에서 삭제할까요?\n(기업에는 영향을 주지 않으며, 되돌릴 수 없어요.)`)) return;
    const token = localStorage.getItem("access_token");
    const ids = Array.from(selectedApps);
    for (const id of ids) {
      try {
        await fetch(`/api/users/me/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ hidden: true }),
        });
      } catch {}
    }
    setApps((prev) => prev.filter((a) => !selectedApps.has(a.id)));
    setSelectedApps(new Set());
  };

  // 면접·합격·불합격은 매장이 스스로 정리하려고 누르는 값이지 지원자에게 보내는 통보가 아니다.
  // 그대로 노출하면 매장이 목록을 정리한 것뿐인데 '불합격 통보'처럼 읽힌다.
  // 합격은 어차피 매장이 직접 연락하고, 떨어진 경우는 공고가 마감되면 알게 된다.
  // 지원자에게는 '접수됐는지 / 열어봤는지'까지만 보여준다.
  const statusTextColor: Record<string, string> = {
    APPLIED: "#582681", REVIEWING: "#582681", VIEWED: "#582681",
    INTERVIEW: "#582681", PASSED: "#582681", REJECTED: "#582681", WITHDRAWN: "#999",
  };
  const statusLabel: Record<string, string> = {
    APPLIED: "지원완료", REVIEWING: "열람됨", VIEWED: "열람됨",
    INTERVIEW: "열람됨", PASSED: "열람됨", REJECTED: "열람됨", WITHDRAWN: "지원취소",
  };
  const statusStyle: Record<string, string> = {
    APPLIED: "applied-status-review", REVIEWING: "applied-status-review", VIEWED: "applied-status-review",
    INTERVIEW: "applied-status-review", PASSED: "applied-status-review",
    REJECTED: "applied-status-review", WITHDRAWN: "applied-status-fail",
  };

  if (loading) return <div className="profile-empty-tab"><p style={{ color: "#888", padding: "40px 0" }}>불러오는 중...</p></div>;
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

  /* 증명서 단추는 고르는 중이든 아니든 막대 오른쪽 끝에 같은 크기로 선다.
     고르는 중일 때만 통줄 막대로 따로 떠 있으니 누를 곳이 두 군데로 갈렸다.
     건수는 왼쪽 '전체 (N)' 이 이미 말해 주므로 글도 한 가지로 둔다. */
  const 증명서단추 = (
    <button
      className="profile-select-btn accent"
      style={selectMode ? undefined : { marginLeft: "auto" }}
      disabled={selectMode && selectedApps.size === 0}
      onClick={() => {
        if (!selectMode) { setSelectMode(true); alert("증명서에 넣을 지원 내역을 골라 주세요."); return; }
        setShowCert(true);
      }}
    >
      📄 취업활동 증명서
    </button>
  );

  return (
    <div className="profile-tab-content">
      <div className="profile-select-bar">
        {selectMode ? (
          <>
            <label className="profile-select-all">
              <input type="checkbox" className="applied-check"
                checked={apps.length > 0 && selectedApps.size === apps.length}
                onChange={(e) => setSelectedApps(e.target.checked ? new Set(apps.map((a) => a.id)) : new Set())}
              />
              전체{selectedApps.size > 0 ? ` (${selectedApps.size})` : ""}
            </label>
            <button className="profile-select-btn" style={{ marginLeft: "auto" }} onClick={선택끝내기}>취소</button>
            {/* 삭제는 고른 것이 있을 때만 나타난다. 아무것도 안 고른 채 눌러 경고를 보는 일이 없다. */}
            {selectedApps.size > 0 && (
              <button className="profile-select-btn danger" onClick={async () => { await handleBulkHide(); setSelectMode(false); }}>
                삭제 {selectedApps.size}
              </button>
            )}
            {증명서단추}
          </>
        ) : (
          <>
            <button className="profile-select-btn" onClick={() => setSelectMode(true)}>선택</button>
            {증명서단추}
          </>
        )}
      </div>
      <div className="applied-list">
        {apps.map((app) => {
          const date = new Date(app.applied_at);
          const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
          return (
            <div key={app.id} className="applied-item">
              {selectMode && (
                <input type="checkbox" className="applied-check"
                  checked={selectedApps.has(app.id)}
                  onChange={() => toggleSelect(app.id)}
                />
              )}
              <div
                className="applied-body"
                onClick={() => (selectMode ? toggleSelect(app.id) : app.job_id && router.push(`/jobs/${app.job_id}`))}
              >
                <h3 className="applied-position">{app.job_title}</h3>
                <span className="applied-company">{app.brand_name || app.company_name}</span>
                <span className="applied-date">지원일 {dateStr}</span>
              </div>
              <div className="applied-right">
                <div className="applied-menu-wrap">
                  <button
                    className="applied-menu-btn"
                    aria-label="더보기"
                    onClick={(e) => { e.stopPropagation(); setMenuAppId(menuAppId === app.id ? null : app.id); }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuAppId === app.id && (
                    <div className="applied-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="applied-menu-item" onClick={() => { setMenuAppId(null); setViewAppId(app.id); }}>내 지원서 보기</button>
                      <button className="applied-menu-item" onClick={() => { setMenuAppId(null); setCertApp(app); }}>공고 증명서</button>
                      {(app.status === "APPLIED" || app.status === "VIEWED") ? (
                        <button className="applied-menu-item danger" onClick={() => { setMenuAppId(null); handleCancel(app.id); }}>지원 취소</button>
                      ) : (
                        <button className="applied-menu-item disabled" disabled>지원 취소</button>
                      )}
                    </div>
                  )}
                </div>
                <span className="applied-status-text" style={{ color: statusTextColor[app.status] || "#582681" }}>
                  {statusLabel[app.status] || app.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {viewAppId && (
        <MyApplicationModal applicationId={viewAppId} onClose={() => setViewAppId(null)} />
      )}
      {showCert && (
        <JobSearchCertificateModal name={userName} apps={apps.filter((a) => selectedApps.has(a.id))} onClose={() => setShowCert(false)} />
      )}
      {certApp && (
        <JobPostingCertificateModal name={userName} app={certApp} onClose={() => setCertApp(null)} />
      )}
    </div>
  );
}