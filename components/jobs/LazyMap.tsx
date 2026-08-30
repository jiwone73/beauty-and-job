"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const KakaoMap = dynamic(() => import("@/components/KakaoMap"), { ssr: false });
const AddressMap = dynamic(() => import("@/components/AddressMap"), { ssr: false });

// 지도는 공고 맨 아래에 있는데도 페이지를 열자마자 Kakao SDK와 타일 수십 장을 받아
// 첫 화면을 몇 초씩 잡아먹었다(관리자에서 새 탭으로 열면 특히 티가 났다).
// 눈에 들어오기 직전에 받아 온다 — 스크롤해서 닿을 때쯤이면 이미 그려져 있다.
export default function LazyMap({
  latitude, longitude, address, name, height = 280,
}: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  name?: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [보임, set보임] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || 보임) return;
    if (typeof IntersectionObserver === "undefined") { set보임(true); return; }
    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { set보임(true); io.disconnect(); } },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [보임]);

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {보임 && (
        latitude && longitude
          ? <KakaoMap latitude={Number(latitude)} longitude={Number(longitude)} name={name} />
          : <AddressMap address={address || ""} name={name} height={height} />
      )}
    </div>
  );
}
