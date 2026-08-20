"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// 포트폴리오 사진 확대보기.
//
// 목록은 4:3 으로 잘라 보여주므로, 잘린 부분을 보려면 크게 열 수 있어야 한다.
// 특히 매장 쪽이 그렇다 — 시술 사진은 잘린 자리(머리 끝, 큐티클 라인)에 실력이
// 있는 경우가 많다. 여기서는 자르지 않고 비율 그대로 화면에 맞춘다.
export default function PhotoLightbox({
  images, startAt = 0, onClose,
}: { images: { url: string }[]; startAt?: number; onClose: () => void }) {
  const [i, setI] = useState(startAt);
  const 이전 = () => setI((v) => (v - 1 + images.length) % images.length);
  const 다음 = () => setI((v) => (v + 1) % images.length);

  // 열려 있는 동안 뒤 화면이 따라 스크롤되지 않게 막는다.
  useEffect(() => {
    const 원래 = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const 키 = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") 이전();
      if (e.key === "ArrowRight") 다음();
    };
    window.addEventListener("keydown", 키);
    return () => { document.body.style.overflow = 원래; window.removeEventListener("keydown", 키); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  if (!images.length) return null;
  const 여럿 = images.length > 1;

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} aria-label="닫기"
        style={{ position: "absolute", top: 14, right: 14, width: 40, height: 40, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <X size={22} />
      </button>
      {여럿 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); 이전(); }} aria-label="이전 사진"
            style={{ position: "absolute", left: 10, width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronLeft size={22} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); 다음(); }} aria-label="다음 사진"
            style={{ position: "absolute", right: 10, width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronRight size={22} />
          </button>
          <div style={{ position: "absolute", bottom: 18, color: "#fff", fontSize: 13, opacity: 0.85 }}>
            {i + 1} / {images.length}
          </div>
        </>
      )}
      {/* 자르지 않고 화면 안에 담는다 — 확대해서 보는 자리라 잘리면 뜻이 없다. */}
      <img
        src={images[i].url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "94vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8 }}
      />
    </div>
  );
}
