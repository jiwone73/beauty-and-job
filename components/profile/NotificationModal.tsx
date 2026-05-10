"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ToggleItem {
  id: string;
  title: string;
  desc: string;
  defaultOn: boolean;
}

const NOTIFICATION_GROUPS = [
  {
    group: "뷰티앤잡 소식받기",
    items: [
      { id: "newsletter", title: "Dbd 뉴스레터 구독", desc: "데일리뷰티드롭의 아티클을 손쉽게 받아보세요.", defaultOn: false },
      { id: "agent", title: "뷰티앤잡 에이전트 제안받기", desc: "프로필을 채우면 더 많은 커리어 제안을 받아요.", defaultOn: false },
      { id: "offline", title: "오프라인 네트워킹 소식 받기", desc: "뷰티앤잡의 뷰티클럽 행사에 초대드려요.", defaultOn: true },
    ],
  },
  {
    group: "새로운 커리어",
    items: [
      { id: "recommend", title: "추천 포지션 알림", desc: "내 직무, 연차에 맞는 포지션을 알려드려요.", defaultOn: true },
      { id: "brand", title: "관심 브랜드 공고 알림", desc: "내가 찜한 브랜드의 새 공고를 빠르게 만나봐요.", defaultOn: true },
    ],
  },
];

export default function NotificationModal({ isOpen, onClose }: Props) {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NOTIFICATION_GROUPS.forEach((g) => g.items.forEach((item) => { init[item.id] = item.defaultOn; }));
    return init;
  });

  if (!isOpen) return null;

  const toggle = (id: string) => setToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal noti-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <div style={{ width: 36 }} />
          <h2 className="cv-title">알림 설정</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
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

          <button className="cv-btn-primary" onClick={onClose}>저장</button>
        </div>
      </div>
    </div>
  );
}
