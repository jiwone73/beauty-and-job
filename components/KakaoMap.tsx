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
          // 카카오 기본 InfoWindow 는 제 테두리와 최소 너비를 들고 있어 짧은
          // 이름에도 상자가 크게 남는다. 직접 그려 글자만큼만 차지하게 한다.
          const 안전한이름 = String(name)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
          const 라벨 = new window.kakao.maps.CustomOverlay({
            position: center,
            yAnchor: 2.1,          // 마커 머리 위
            content:
              `<div style="display:inline-block;max-width:220px;padding:5px 10px;` +
              `border-radius:8px;background:#fff;border:1px solid #e2e2e6;` +
              `box-shadow:0 2px 8px rgba(0,0,0,.12);font-size:13px;font-weight:600;` +
              `color:#555;line-height:1.4;white-space:nowrap;overflow:hidden;` +
              `text-overflow:ellipsis;">${안전한이름}</div>`,
          });
          라벨.setMap(map);
        }
        // 확대/축소해도 목적지(마커)가 항상 지도 중앙에 오도록 재정렬
        window.kakao.maps.event.addListener(map, "zoom_changed", () => map.setCenter(center));
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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false&libraries=services`;
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
