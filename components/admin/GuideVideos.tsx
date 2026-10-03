"use client";
import { useState } from "react";

// 알바 근무현황 페이지 안에서 보는 가이드 영상.
//
// 페이지 밖(새 탭·내려받기)으로 보내지 않고 이 자리에서 재생한다 — 보는 시간도 근무로 세려면
// 관리자 창이 화면에 떠 있어야 하고, 재생 신호는 WorkHeartbeat 가 듣는다(영상이 재생되는 동안은
// 조작이 없어도 일하는 것으로 본다).
const 영상 = [
  { id: "seeker", 이름: "구직자 가이드", src: "/guides/seeker.mp4" },
  { id: "company-1", 이름: "기업 가이드 1부", src: "/guides/company-1.mp4" },
  { id: "company-2", 이름: "기업 가이드 2부", src: "/guides/company-2.mp4" },
] as const;

export default function GuideVideos() {
  const [고른것, set고른것] = useState<(typeof 영상)[number]["id"]>(영상[0].id);
  const 지금 = 영상.find((v) => v.id === 고른것) || 영상[0];

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14, marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {영상.map((v) => {
          const 켜짐 = v.id === 고른것;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => set고른것(v.id)}
              style={{
                fontSize: 13, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                border: 켜짐 ? "1px solid #582681" : "1px solid #ddd",
                background: 켜짐 ? "#f4eefa" : "#fff",
                color: 켜짐 ? "#582681" : "#555",
              }}
            >
              {v.이름}
            </button>
          );
        })}
      </div>
      {/* key 로 영상을 갈아 끼운다 — 같은 요소에 src 만 바꾸면 앞 영상이 이어 재생되기도 한다. */}
      <video
        key={지금.id}
        src={지금.src}
        controls
        playsInline
        preload="metadata"
        style={{ width: "100%", maxWidth: 960, aspectRatio: "1400 / 818", background: "#f7f7f8", borderRadius: 8, display: "block" }}
      />
    </div>
  );
}
