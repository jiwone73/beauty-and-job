"use client";
import { useEffect, useRef } from "react";

// 전체 주소 문자열을 지오코딩해 Kakao 지도로 렌더.
// - 좌표가 없어도(자유 텍스트 주소) 지도 표시가 가능하고,
// - 확대/축소 시 목적지(마커)가 항상 지도 중앙에 오도록 고정한다.
// 지오코딩 실패 시 키워드 검색으로 폴백, 그래도 없으면 Google 임베드로 폴백.
export default function AddressMap({
  address,
  name,
  height = 220,
}: {
  address: string;
  name?: string;
  height?: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const failedRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    const addr = (address || "").trim();
    if (!KEY || !addr) return;
    let cancelled = false;

    const showFallback = () => {
      // Kakao 지오코딩이 안 되면 Google 임베드(정적)로라도 위치를 보여준다.
      if (cancelled || !mapRef.current) return;
      mapRef.current.innerHTML = "";
      const ifr = document.createElement("iframe");
      ifr.title = "근무지역 지도";
      ifr.width = "100%";
      ifr.height = String(height);
      ifr.loading = "lazy";
      ifr.referrerPolicy = "no-referrer-when-downgrade";
      ifr.style.border = "0";
      ifr.style.borderRadius = "12px";
      ifr.src = `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&output=embed&hl=ko`;
      mapRef.current.appendChild(ifr);
    };

    const place = (lat: number, lng: number) => {
      if (cancelled || !mapRef.current) return;
      mapRef.current.innerHTML = "";
      const center = new window.kakao.maps.LatLng(lat, lng);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 3 });
      const marker = new window.kakao.maps.Marker({ position: center });
      marker.setMap(map);
      if (name) {
        const iw = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:6px 10px;font-size:13px;font-weight:600;white-space:nowrap;">${name}</div>`,
        });
        iw.open(map, marker);
      }
      // 확대/축소해도 목적지가 항상 지도 중앙에 오도록 재정렬
      window.kakao.maps.event.addListener(map, "zoom_changed", () => map.setCenter(center));
    };

    // 도로명 주소 뒤에 붙은 상세(동·건물명·상호)를 잘라낸다. 예) "서울 금천구 벚꽃로40 롯데캐슬골드파크 104동"
    const detailM = addr.match(/^(.*?(?:대로|로|길)\s*\d+(?:-\d+)?)\s+(.+)$/);
    const roadCore = (detailM?.[1] || "").match(/(\S*(?:대로|로|길))\s*(\d+(?:-\d+)?)/);
    const roadKey = roadCore ? `${roadCore[1]}${roadCore[2]}` : "";
    const norm = (s: string) => (s || "").replace(/\s+/g, "");

    const geocode = () => {
      if (cancelled || !window.kakao?.maps?.services) { showFallback(); return; }
      const geocoder = new window.kakao.maps.services.Geocoder();
      const byAddress = (onFail: () => void) => {
        geocoder.addressSearch(addr, (result: any[], status: string) => {
          if (cancelled) return;
          if (status === window.kakao.maps.services.Status.OK && result[0]) place(Number(result[0].y), Number(result[0].x));
          else onFail();
        });
      };
      const byKeyword = (onFail: () => void, mustMatchRoad = false) => {
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(addr, (r2: any[], s2: string) => {
          if (cancelled) return;
          const list = s2 === window.kakao.maps.services.Status.OK ? r2 : [];
          // 같은 도로명 주소에 속한 결과만 채택(동명이 같은 다른 지역 아파트가 잡히지 않도록)
          const hit = mustMatchRoad && roadKey
            ? list.find((d) => norm(d.road_address_name || d.address_name || "").includes(roadKey))
            : list[0];
          if (hit) place(Number(hit.y), Number(hit.x));
          else onFail();
        });
      };
      // 상세(동·건물명)가 있으면 주소검색은 그 부분을 무시하고 도로명 지점만 찍는다 → 키워드 검색을 먼저 시도.
      if (detailM) byKeyword(() => byAddress(showFallback), true);
      else byAddress(() => byKeyword(showFallback));
    };

    const render = () => window.kakao.maps.load(geocode);

    let cleanupListener: (() => void) | undefined;
    if (window.kakao?.maps?.services) {
      render();
    } else {
      const existing = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
      if (existing) {
        if (window.kakao?.maps) {
          render();
        } else {
          const onLoad = () => (window.kakao?.maps ? render() : showFallback());
          existing.addEventListener("load", onLoad);
          cleanupListener = () => existing.removeEventListener("load", onLoad);
        }
      } else {
        const script = document.createElement("script");
        script.id = "kakao-map-sdk";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false&libraries=services`;
        script.async = true;
        script.addEventListener("load", render);
        script.addEventListener("error", showFallback);
        document.head.appendChild(script);
      }
    }

    return () => { cancelled = true; cleanupListener?.(); };
  }, [address, name, height]);

  const addr = (address || "").trim();
  if (!addr) return null;

  return <div ref={mapRef} style={{ width: "100%", height, borderRadius: 12, overflow: "hidden", marginTop: 4 }} />;
}
