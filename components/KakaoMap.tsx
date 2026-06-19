"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!KEY || !latitude || !longitude) return;

    const render = () => {
      if (!window.kakao?.maps || !mapRef.current) return;
      window.kakao.maps.load(() => {
        const center = new window.kakao.maps.LatLng(latitude, longitude);
        const map = new window.kakao.maps.Map(mapRef.current, {
          center,
          level: 4,
        });
        const marker = new window.kakao.maps.Marker({ position: center });
        marker.setMap(map);
        if (name) {
          const iw = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:13px;font-weight:600;white-space:nowrap;">${name}</div>`,
          });
          iw.open(map, marker);
        }
      });
    };

    // SDK 이미 로드된 경우
    if (window.kakao?.maps) {
      render();
      return;
    }

    // SDK 스크립트 동적 로드 (중복 방지)
    const existing = document.getElementById("kakao-map-sdk");
    if (existing) {
      existing.addEventListener("load", render);
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;
    script.async = true;
    script.addEventListener("load", render);
    document.head.appendChild(script);
  }, [latitude, longitude, name]);

  if (!latitude || !longitude) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#888", fontSize: 14, background: "#f7f7f7", borderRadius: 8 }}>
        위치 정보가 없습니다.
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: 280, borderRadius: 12, overflow: "hidden" }}
    />
  );
}
