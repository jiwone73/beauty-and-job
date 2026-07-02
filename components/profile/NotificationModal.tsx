"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenBlockModal: () => void;
}
const NOTIFICATION_GROUPS = [
  {
    group: "지원·이력서 알림",
    items: [
      { id: "resume_viewed", title: "이력서 열람 알림", desc: "기업이 내 지원 이력서를 열람하면 이메일로 알려드려요.", defaultOn: true },
    ],
  },
  {
    group: "뷰티워크 소식받기",
    items: [
      { id: "newsletter", title: "뷰티워크 뉴스레터 구독", desc: "엄선된 뷰티 채용 소식과 업계 인사이트를 메일로 받아보세요.", defaultOn: false },
      { id: "event", title: "이벤트·혜택 소식 받기", desc: "뷰티워크의 이벤트와 혜택 소식을 메일로 받아보세요.", defaultOn: false },
      { id: "agent", title: "기업 채용 제안받기", desc: "프로필을 공개하면 기업이 직접 채용 제안을 보낼 수 있어요.", defaultOn: false },
    ],
  },
  {
    group: "새로운 커리어",
    items: [
      { id: "recommend", title: "추천 포지션 알림", desc: "내 직무·지역에 맞는 채용공고를 이메일로 추천해드려요.", defaultOn: true },
    ],
  },
];
export default function NotificationModal({ isOpen, onClose, onOpenBlockModal }: Props) {
  const [activeTab, setActiveTab] = useState<"notification" | "block">("notification");
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NOTIFICATION_GROUPS.forEach((g) => g.items.forEach((item) => { init[item.id] = item.defaultOn; }));
    return init;
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch("/api/users/me/notification-settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const saved = res.data.notification_settings || {};
          setToggles((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((k) => { if (typeof saved[k] === "boolean") next[k] = saved[k]; });
            return next;
          });
        }
      })
      .catch(console.error);

    fetch("/api/users/me/recommendation-consent", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setToggles((prev) => ({ ...prev, recommend: res.data.agreed }));
      })
      .catch(console.error);

    fetch("/api/users/me/newsletter", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setToggles((prev) => ({ ...prev, newsletter: res.data.subscribed }));
      })
      .catch(console.error);
  }, [isOpen]);

  if (!isOpen) return null;
  const toggle = (id: string) => setToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { onClose(); return; }
    setSaving(true);
    try {
      await fetch("/api/users/me/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: toggles }),
      });
      await fetch("/api/users/me/recommendation-consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agreed: !!toggles.recommend }),
      });
      await fetch("/api/users/me/newsletter", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscribe: !!toggles.newsletter }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal noti-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <div style={{ width: 36 }} />
          <h2 className="cv-title">설정</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #eee", padding: "0 20px" }}>
          <button
            onClick={() => setActiveTab("notification")}
            style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: activeTab === "notification" ? "2px solid #5f0080" : "2px solid transparent", color: activeTab === "notification" ? "#5f0080" : "#888", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            알림
          </button>
          <button
            onClick={() => { setActiveTab("block"); onClose(); onOpenBlockModal(); }}
            style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#888", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
          >
            기업 차단 관리
          </button>
        </div>
        <div className="cv-body">
          <p className="cv-desc">나에게 필요한 알림을 맞춤으로 설정해보세요.</p>
          {NOTIFICATION_GROUPS.map((group) => (
            <div key={group.group} className="noti-group">
              <h3 className="noti-group-title">{group.group}</h3>
              {group.items.map((item) => (
                <div key={item.id} className="noti-item">
                  <div className="noti-item-text">
                    <strong>{item.title}</strong>
                    <span>{item.desc}</span>
                  </div>
                  <button
                    className={`noti-toggle ${toggles[item.id] ? "on" : ""}`}
                    onClick={() => toggle(item.id)}
                    aria-label={toggles[item.id] ? "끄기" : "켜기"}
                  >
                    <span className="noti-toggle-thumb" />
                  </button>
                </div>
              ))}
            </div>
          ))}
          <button className="cv-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
