"use client";
import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * 공고 배너 띠 — 공고 상세·기업정보 설정·공고 등록 미리보기에서 같은 모양으로 쓴다.
 *
 * 규칙 두 가지만 지킨다.
 *  1. 전체 높이는 장수와 무관하게 3:1 고정. 공고마다 배너 높이가 달라지면 안 된다.
 *  2. 이미지 한 장의 폭은 언제나 전체의 1/3. 1~2장이라고 늘려 버리면 같은 사진이
 *     공고마다 다른 크기로 잘려 보인다. 남는 좌우는 그 사진을 크게 깔고 흐리게 처리해
 *     사진 배경색과 이어지는 여백으로 채운다.
 *
 * 3장을 넘으면 좌우 화살표로 3장씩 돌려 본다.
 */
export default function BannerStrip({
  images,
  alt,
  onDelete,
  radius = 12,
}: {
  images: string[];
  alt?: string;
  onDelete?: (url: string) => void;   // 편집 화면에서만 넘긴다(공개 화면은 생략)
  radius?: number;
}) {
  const [start, setStart] = useState(0);
  const n = images.length;
  if (!n) return null;

  const PER = 3;
  const cols = Math.min(n, PER);
  const s = ((start % n) + n) % n;
  const visible = Array.from({ length: cols }, (_, k) => images[(s + k) % n]);

  const arrow: CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 34, height: 34, borderRadius: "50%", border: "none",
    background: "rgba(255,255,255,0.95)", color: "#333",
    cursor: "pointer", zIndex: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 1", borderRadius: radius, overflow: "hidden", background: "#f4f4f4" }}>
        {/* 좌우 여백 채움: 첫 장을 꽉 채워 깔고 흐리게 → 사진 배경색과 자연스럽게 이어진다. */}
        {cols < PER && (
          <img src={visible[0]} alt="" aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(22px)", transform: "scale(1.25)" }} />
        )}
        <div style={{ position: "relative", height: "100%", display: "flex", justifyContent: "center" }}>
          {visible.map((src, k) => (
            <div key={`${s}-${k}-${src}`} style={{ position: "relative", width: `${100 / PER}%`, height: "100%", flexShrink: 0 }}>
              <img src={src} alt={alt}
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
              {onDelete && (
                <button type="button" onClick={() => onDelete(src)} title="삭제"
                  style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {n > PER && (
        <>
          <button type="button" aria-label="이전 이미지" onClick={() => setStart(s - 1)} style={{ ...arrow, left: 8 }}><ChevronLeft size={20} /></button>
          <button type="button" aria-label="다음 이미지" onClick={() => setStart(s + 1)} style={{ ...arrow, right: 8 }}><ChevronRight size={20} /></button>
        </>
      )}
    </div>
  );
}
