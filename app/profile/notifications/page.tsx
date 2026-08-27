"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import ProfileShell from "@/components/profile/ProfileShell";

/**
 * 알림 — 본문에 편다.
 *
 * 사이드 종 옆에 300px 짜리 판을 띄우던 것을 걷었다. 사이드가 220px 이라
 * 판이 화면 밖으로 잘렸고, 지원현황·관심공고는 본문에 펴는데 알림만
 * 판으로 뜰 이유도 없다.
 */
export default function NotificationsPage() {
  const router = useRouter();
  const [알림들, set알림들] = useState<any[]>([]);
  const [안읽음, set안읽음] = useState(0);
  const [불러오는중, set불러오는중] = useState(true);

  const 불러오기 = () => {
    const token = localStorage.getItem("access_token");
    if (!token) { set불러오는중(false); return; }
    fetch("/api/users/me/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          set알림들(res.data.notifications || []);
          set안읽음(res.data.unread || 0);
        }
      })
      .catch(() => {})
      .finally(() => set불러오는중(false));
  };
  useEffect(() => { 불러오기(); }, []);

  const 누르기 = async (n: any) => {
    const token = localStorage.getItem("access_token");
    if (!n.is_read && token) {
      await fetch(`/api/users/me/notifications/${n.id}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    불러오기();
    if (n.related_type === "application") router.push("/profile/applied");
    else if (n.related_type === "job_posting" && n.related_id) router.push(`/jobs/${n.related_id}`);
  };
  const 모두읽음 = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch("/api/users/me/notifications", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    불러오기();
  };
  const 하나지우기 = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`/api/users/me/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    불러오기();
  };
  const 전부지우기 = async () => {
    if (!confirm("모든 알림을 지울까요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch("/api/users/me/notifications", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    불러오기();
  };

  return (
    <ProfileShell>
      <div className="profile-content">
        <section className="profile-section">
          <div className="profile-info-card">
            <div className="pf-notif-head">
              <span className="profile-info-label">알림{안읽음 > 0 && <em className="pf-notif-count">{안읽음}</em>}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                {안읽음 > 0 && <button type="button" className="pf-notif-act" onClick={모두읽음}>모두 읽음</button>}
                {알림들.length > 0 && <button type="button" className="pf-notif-act" onClick={전부지우기}>전체 삭제</button>}
              </span>
            </div>
            {불러오는중 ? (
              <p className="pf-notif-empty">불러오는 중…</p>
            ) : 알림들.length === 0 ? (
              <p className="pf-notif-empty">새 알림이 없어요.</p>
            ) : (
              알림들.map((n) => (
                <div key={n.id} className={`pf-notif-item ${n.is_read ? "" : "unread"}`} onClick={() => 누르기(n)}>
                  <span className="pf-notif-title">{n.title}</span>
                  <span className="pf-notif-msg">{n.message}</span>
                  <span className="pf-notif-time">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                  {/* 카드를 통째로 눌러도 이동하지만, 눌러도 되는 자리라는 게 안 보인다. */}
                  {n.related_type === "job_posting" && n.related_id && (
                    <button type="button" className="pf-notif-cta" onClick={(e) => { e.stopPropagation(); 누르기(n); }}>
                      채용공고 보기
                    </button>
                  )}
                  <button type="button" className="pf-notif-del" aria-label="삭제" onClick={(e) => 하나지우기(n.id, e)}>
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </ProfileShell>
  );
}
