"use client";
import { useState } from "react";

// 배너/썸네일 한 칸.
//  기본: 정해진 칸 높이에 맞춰 축소(contain), 남는 여백은 이미지 모서리 배경색으로 채움.
//  ratio: 폭만 정해 두고 높이는 사진 비율이 정한다 — 여백 자체가 안 생긴다.
export function BannerImg({ src, alt, ratio = false }: { src: string; alt?: string; ratio?: boolean }) {
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
    <div style={{ width: "100%", height: ratio ? "auto" : "100%", background: ratio ? "transparent" : bg, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <img
        src={src}
        alt={alt}
        {...(noCors ? {} : { crossOrigin: "anonymous" as const })}
        onLoad={(e) => sample(e.currentTarget)}
        onError={() => setNoCors(true)}
        style={ratio
          ? { width: "100%", height: "auto", display: "block" }
          : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
}
