"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { shortRegion } from "@/lib/regionShort";
import { MapPin } from "lucide-react";

/** 관심공고. 지원현황과 같은 이유로 떼어 냈다. */
export default 
function BookmarkList() {
  const [bookmarkedJobs, setBookmarkedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 지원현황과 같은 방식 — 평소엔 목록만 보이고, '선택'을 눌렀을 때만 고르는 화면이 된다.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const 선택끝내기 = () => { setSelectMode(false); setSelected(new Set()); };
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/users/me/bookmarks", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setBookmarkedJobs(res.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "상시";
    const today = new Date();
    const dl = new Date(deadline);
    const dDay = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (dDay < 0) return "마감";
    if (dDay === 0) return "오늘 마감";
    return `D-${dDay}`;
  };


  const 고른것삭제 = async () => {
    if (selected.size === 0) return;
    if (!confirm(`고른 ${selected.size}건을 관심목록에서 지울까요?`)) return;
    const token = localStorage.getItem("access_token");
    for (const id of Array.from(selected)) {
      try {
        await fetch(`/api/users/me/bookmarks?job_posting_id=${id}`, {
          method: "DELETE", headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* 한 건 실패해도 나머지는 계속 지운다 */ }
    }
    setBookmarkedJobs((prev) => prev.filter((j) => !selected.has(j.job_posting_id)));
    선택끝내기();
  };

  if (loading) return <div className="profile-empty-tab"><p style={{ color: "#888", padding: "40px 0" }}>불러오는 중...</p></div>;
  if (bookmarkedJobs.length === 0) return (
    <div className="profile-empty-tab">
      <div className="profile-empty-icon">🔖</div>
      <p>저장한 공고가 없어요<br />관심있는 공고를 스크랩해보세요</p>
      <a href="/jobs" className="profile-empty-btn">채용공고 보러가기</a>
    </div>
  );

  return (
    <div className="profile-tab-content">
      <div className="profile-select-bar">
        {selectMode ? (
          <>
            <label className="profile-select-all">
              <input type="checkbox" className="applied-check"
                checked={bookmarkedJobs.length > 0 && selected.size === bookmarkedJobs.length}
                onChange={(e) => setSelected(e.target.checked ? new Set(bookmarkedJobs.map((j) => j.job_posting_id)) : new Set())}
              />
              전체{selected.size > 0 ? ` (${selected.size})` : ""}
            </label>
            <button className="profile-select-btn" style={{ marginLeft: "auto" }} onClick={선택끝내기}>취소</button>
            {selected.size > 0 && (
              <button className="profile-select-btn danger" onClick={고른것삭제}>삭제 {selected.size}</button>
            )}
          </>
        ) : (
          <button className="profile-select-btn" onClick={() => setSelectMode(true)}>선택</button>
        )}
      </div>
      <div className="bookmark-list">
        {bookmarkedJobs.map((job) => {
          const 안쪽 = (
            <>
              {selectMode && (
                <input type="checkbox" className="applied-check"
                  checked={selected.has(job.job_posting_id)}
                  onChange={() => toggle(job.job_posting_id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className="bookmark-item-left">
                <h3 className="bookmark-title">{job.title}</h3>
                <span className="bookmark-brand">{job.brand_name || job.company_name}</span>
                <span className="bookmark-location">
                  <MapPin size={13} strokeWidth={2} />
                  {job.location ? shortRegion(job.location) : "협의"}
                </span>
              </div>
              <span className="bookmark-deadline">{formatDeadline(job.deadline)}</span>
            </>
          );
          // 고르는 중에는 공고로 넘어가면 안 되므로 링크가 아니라 눌러서 체크하는 칸이 된다.
          return selectMode ? (
            <div key={job.id} className="bookmark-item" onClick={() => toggle(job.job_posting_id)} style={{ cursor: "pointer" }}>
              {안쪽}
            </div>
          ) : (
            <a key={job.id} href={`/jobs/${job.job_posting_id}`} className="bookmark-item">{안쪽}</a>
          );
        })}
      </div>
    </div>
  );
}
