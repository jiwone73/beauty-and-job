"use client";
import { useState } from "react";

// 배너/썸네일 한 칸: 이미지를 자르지 않고 높이에 맞춰 축소(contain), 남는 여백은 이미지 모서리 배경색으로 채움.
export function BannerImg({ src, alt }: { src: string; alt?: string }) {
  const [bg, setBg] = useState("#f4f4f4");
  const [noCors, setNoCors] = useState(false);
  const sample = (img: HTMLImageElement) => {
    try {
      const cv = document.createElement("canvas");
      cv.width = 1;
      cv.height = 1;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      // 좌상단 모서리(6x6)를 1px로 축약 → 배경색 추정
      ctx.drawImage(img, 0, 0, 6, 6, 0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      setBg(`rgb(${d[0]}, ${d[1]}, ${d[2]})`);
    } catch {
      /* CORS 등으로 픽셀 샘플 실패 → 기본 배경 유지 */
    }
  };
  return (
    <div style={{ width: "100%", height: "100%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <img
        src={src}
        alt={alt}
        {...(noCors ? {} : { crossOrigin: "anonymous" as const })}
        onLoad={(e) => sample(e.currentTarget)}
        onError={() => setNoCors(true)}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
}
