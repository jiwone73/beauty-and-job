"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

/**
 * 머리줄 종.
 *
 * 무엇을 담나: 내 활동에 실제로 생긴 일만 담는다 — 제안이 왔다, 기업이 내
 * 지원서를 봤다, 결과가 나왔다, 공고가 곧 마감된다. 남의 사이트처럼 광고와
 * 소식지를 섞지 않는다. 종에 광고가 쌓이면 사람은 종을 광고로 배우고, 정작
 * 자기 일이 생겼을 때 열어 보지 않는다.
 *
 * 비어 있어도 채우지 않는다. 대신 알림이 생기게 하는 방법을 한 줄로만 말한다.
 */
export default function NotificationBell({ ownerType }: { ownerType: "user" | "company" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const 기준 = ownerType === "company" ? "/api/company/notifications" : "/api/users/me/notifications";

  const 불러오기 = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(기준, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setItems(res.data.notifications || []);
          setUnread(res.data.unread || 0);
        }
      })
      .catch(() => {});
  };
  useEffect(() => { 불러오기(); }, [ownerType]);

  const 누르기 = async (n: any) => {
    const token = localStorage.getItem("access_token");
    if (!n.is_read && token) {
      await fetch(`${기준}/${n.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    setOpen(false);
    불러오기();
    if (ownerType === "company") {
      if (n.related_type === "application") router.push("/company/dashboard/applicants");
      return;
    }
    // 제안은 공고로, 지원 관련은 지원현황으로 — 알림을 누른 사람이 기대하는 자리.
    if (n.related_type === "job_posting" && n.related_id) router.push(`/jobs/${n.related_id}`);
    else if (n.related_type === "application") router.push("/profile/applied");
  };

  const 모두읽음 = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(기준, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    불러오기();
  };

  return (
    <div className="hdr-bell-wrap">
      <button className="hdr-bell" onClick={() => setOpen((v) => !v)} aria-label="알림">
        <Bell size={20} />
        {unread > 0 && <span className="hdr-bell-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="hdr-bell-scrim" onClick={() => setOpen(false)} />
          <div className="hdr-bell-panel">
            <div className="hdr-bell-head">
              <span>알림</span>
              {unread > 0 && <button onClick={모두읽음} className="hdr-bell-readall">모두 읽음</button>}
            </div>
            <div className="hdr-bell-list">
              {items.length === 0 ? (
                <div className="hdr-bell-empty">
                  <p>새 알림이 없어요.</p>
                  {ownerType === "user" && (
                    <p className="hdr-bell-empty-sub">
                      이력서를 채우면 기업이 먼저 연락해 올 수 있어요.
                    </p>
                  )}
                </div>
              ) : (
                items.slice(0, 12).map((n) => (
                  <button key={n.id} className={`hdr-bell-item${n.is_read ? "" : " unread"}`}
                    onClick={() => 누르기(n)}>
                    <span className="hdr-bell-title">{n.title}</span>
                    <span className="hdr-bell-msg">{n.message}</span>
                    <span className="hdr-bell-time">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                  </button>
                ))
              )}
            </div>
            {ownerType === "user" && items.length > 0 && (
              <button className="hdr-bell-more"
                onClick={() => { setOpen(false); router.push("/profile/notifications"); }}>
                전체 보기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
