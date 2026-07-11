"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Crosshair } from "lucide-react";

declare global {
  interface Window { kakao: any }
}

const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const SEOUL = { lat: 37.5665, lng: 126.978 };
const RADII = [1, 2, 5];
const TYPES: { key: string; label: string }[] = [
  { key: "STORE", label: "매장직" },
  { key: "OFFICE", label: "사무직" },
  { key: "", label: "전체" },
];

type Job = {
  id: string;
  title: string;
  job_type: string;
  location: string | null;
  salary_min: number | null;
  experience_level: string | null;
  company_id: string;
  company_name: string | null;
  brand_name: string | null;
  logo_url: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
};

function loadKakao(cb: () => void) {
  if (window.kakao?.maps?.services) { cb(); return; }
  const finish = () => window.kakao.maps.load(() => cb());
  const existing = document.getElementById("kakao-sdk-services");
  if (existing) { existing.addEventListener("load", finish); return; }
  const s = document.createElement("script");
  s.id = "kakao-sdk-services";
  s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false&libraries=services`;
  s.async = true;
  s.addEventListener("load", finish);
  document.head.appendChild(s);
}

// 두 좌표 사이 거리(m)
function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fmtDist(km: number) {
  if (km < 1) return `약 ${Math.round(km * 1000)}m`;
  return `약 ${km.toFixed(1)}km`;
}
function fmtSalary(min: number | null) {
  return !min ? "급여 협의" : `${(min / 10000).toLocaleString()}만원~`;
}
function fmtExp(level: string | null) {
  return level === "NEW" ? "신입" : level === "EXPERIENCED" ? "경력" : "경력무관";
}

export default function NearbyJobsPage() {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const geocoder = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const lastSearch = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const debounce = useRef<any>(null);

  const [sdkReady, setSdkReady] = useState(false);
  const [radius, setRadius] = useState(2);
  const [type, setType] = useState("STORE");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [areaLabel, setAreaLabel] = useState("");
  const [notice, setNotice] = useState("");

  const radiusRef = useRef(radius);
  const typeRef = useRef(type);
  useEffect(() => { radiusRef.current = radius; }, [radius]);
  useEffect(() => { typeRef.current = type; }, [type]);

  // 현재 지도 중앙 기준 검색
  const searchHere = useCallback(() => {
    if (!mapObj.current) return;
    const c = mapObj.current.getCenter();
    const lat = c.getLat();
    const lng = c.getLng();
    lastSearch.current = { lat, lng };
    setLoading(true);

    // 반경 원 그리기 (중앙 핀 기준)
    const pos = new window.kakao.maps.LatLng(lat, lng);
    if (!circleRef.current) {
      circleRef.current = new window.kakao.maps.Circle({
        center: pos, radius: radiusRef.current * 1000,
        strokeWeight: 2, strokeColor: "#5f0080", strokeOpacity: 0.8, strokeStyle: "dashed",
        fillColor: "#5f0080", fillOpacity: 0.05,
      });
      circleRef.current.setMap(mapObj.current);
    } else {
      circleRef.current.setPosition(pos);
      circleRef.current.setRadius(radiusRef.current * 1000);
    }

    if (geocoder.current) {
      geocoder.current.coord2RegionCode(lng, lat, (res: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const r = res.find((x) => x.region_type === "H") || res[0];
          if (r) setAreaLabel(r.address_name);
        }
      });
    }

    const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radiusRef.current) });
    if (typeRef.current) qs.set("type", typeRef.current);
    fetch(`/api/jobs/nearby?${qs.toString()}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setJobs(res.data.jobs || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 지도 멈추면(idle) 자동 검색 — 디바운스 + 30m 미만 이동은 스킵
  const onIdle = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (!mapObj.current) return;
      const c = mapObj.current.getCenter();
      const cur = { lat: c.getLat(), lng: c.getLng() };
      if (distM(lastSearch.current, cur) < 30) return;
      searchHere();
    }, 400);
  }, [searchHere]);

  // SDK 로드
  useEffect(() => {
    if (!KEY) { setNotice("지도 키가 설정되지 않았습니다."); return; }
    loadKakao(() => setSdkReady(true));
  }, []);

  // 초기 중심(거주지→현재위치 실패 시 서울) 설정 + 지도 생성 + idle 리스너
  useEffect(() => {
    if (!sdkReady || !mapEl.current || mapObj.current) return;
    geocoder.current = new window.kakao.maps.services.Geocoder();

    const createMap = (lat: number, lng: number) => {
      if (mapObj.current || !mapEl.current) return;
      mapObj.current = new window.kakao.maps.Map(mapEl.current, {
        center: new window.kakao.maps.LatLng(lat, lng),
        level: 5,
      });
      window.kakao.maps.event.addListener(mapObj.current, "idle", onIdle);
      searchHere(); // 첫 검색
    };

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      setNotice("로그인하면 거주지에서 시작해요. 지도를 움직이면 그 위치 주변이 자동 검색됩니다.");
      createMap(SEOUL.lat, SEOUL.lng);
      return;
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) throw new Error();
        const d = res.data;
        const addr =
          [d.address_road, d.address_detail].filter(Boolean).join(" ") ||
          [d.region_sido, d.region_sigungu].filter(Boolean).join(" ");
        if (!addr) { createMap(SEOUL.lat, SEOUL.lng); return; }
        geocoder.current.addressSearch(addr, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result[0]) {
            createMap(parseFloat(result[0].y), parseFloat(result[0].x));
          } else {
            createMap(SEOUL.lat, SEOUL.lng);
          }
        });
      })
      .catch(() => createMap(SEOUL.lat, SEOUL.lng));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady]);

  // 반경/유형 변경 시 현재 중심에서 재검색
  useEffect(() => {
    if (mapObj.current) searchHere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, type]);

  // 반경 변경 시 원이 화면에 들어오도록 줌 조정
  useEffect(() => {
    if (!mapObj.current) return;
    const level = radius <= 1 ? 6 : radius <= 2 ? 7 : 8;
    mapObj.current.setLevel(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  // 실제 회사·매장 위치에 마커 표시
  useEffect(() => {
    if (!mapObj.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    const map = mapObj.current;
    jobs.forEach((j) => {
      const lat = Number(j.latitude);
      const lng = Number(j.longitude);
      if (!lat || !lng) return;
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(lat, lng),
        map,
      });
      const iw = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:12px;font-weight:600;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis">${j.brand_name || j.company_name || ""} · ${fmtDist(j.distance_km)}</div>`,
      });
      window.kakao.maps.event.addListener(marker, "click", () => router.push(`/jobs/${j.id}`));
      window.kakao.maps.event.addListener(marker, "mouseover", () => iw.open(map, marker));
      window.kakao.maps.event.addListener(marker, "mouseout", () => iw.close());
      markersRef.current.push(marker);
    });
  }, [jobs, router]);

  const goCurrentLocation = useCallback(() => {
    if (!navigator.geolocation || !mapObj.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => mapObj.current.setCenter(new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)),
      () => setNotice("위치 권한이 없어 이동하지 못했어요."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid #eee", position: "sticky", top: 0, background: "#fff", zIndex: 20 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "#555" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>내 주변 채용</h1>
        {areaLabel && <span style={{ marginLeft: "auto", fontSize: 12.5, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45%" }}>📍 {areaLabel}</span>}
      </div>

      {/* 지도 + 중앙 고정 핀 */}
      <div className="nearby-map-wrap" style={{ position: "relative", width: "100%" }}>
        <div ref={mapEl} style={{ width: "100%", height: "100%", background: "#f2f2f2" }} />
        {/* 화면 중앙 고정 핀 (지도를 움직여도 항상 중앙 = 검색 기준점) */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -100%)", pointerEvents: "none", zIndex: 5, fontSize: 34, lineHeight: 1, filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))" }}>
          📍
        </div>
        {/* 현재위치 */}
        <button onClick={goCurrentLocation}
          style={{ position: "absolute", bottom: 12, right: 12, zIndex: 6, width: 42, height: 42, borderRadius: "50%", background: "#fff", border: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,.2)" }}
          aria-label="현재위치로 이동">
          <Crosshair size={20} color="#5f0080" />
        </button>
        {/* 안내 */}
        <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 6, padding: "5px 12px", background: "rgba(0,0,0,0.55)", color: "#fff", borderRadius: 16, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", pointerEvents: "none" }}>
          지도를 움직이면 그 위치로 검색돼요
        </div>
      </div>

      {/* 반경 · 유형 컨트롤 */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: type === t.key ? "1.5px solid #5f0080" : "1px solid #e5e5e5", background: type === t.key ? "#faf5ff" : "#fff", color: type === t.key ? "#5f0080" : "#666", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#666" }}>반경</span>
          {RADII.map((r) => (
            <button key={r} onClick={() => setRadius(r)}
              style={{ padding: "6px 14px", borderRadius: 20, border: radius === r ? "1.5px solid #5f0080" : "1px solid #e5e5e5", background: radius === r ? "#5f0080" : "#fff", color: radius === r ? "#fff" : "#666", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {r}km
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p style={{ fontSize: 12.5, color: "#8a6d3b", background: "#fcf8e3", padding: "10px 16px", margin: 0, lineHeight: 1.5 }}>{notice}</p>
      )}

      {/* 리스트 */}
      <div style={{ padding: "8px 0" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#888", padding: "32px 0", fontSize: 14 }}>불러오는 중…</p>
        ) : jobs.length === 0 ? (
          <p style={{ textAlign: "center", color: "#888", padding: "40px 24px", fontSize: 14, lineHeight: 1.6 }}>
            이 위치 반경 {radius}km 안에 조건에 맞는 공고가 없어요.<br />지도를 옮기거나 반경을 넓혀보세요.
          </p>
        ) : (
          jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #f2f2f2", textDecoration: "none", color: "inherit" }}>
              <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 10, background: "#f3e5f5", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {j.logo_url ? <img src={j.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#5f0080", fontWeight: 700 }}>{(j.brand_name || j.company_name || "?")[0]}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, color: "#888", margin: 0 }}>{j.brand_name || j.company_name}</p>
                <p style={{ fontSize: 14.5, fontWeight: 600, margin: "2px 0", color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</p>
                <p style={{ fontSize: 12.5, color: "#666", margin: 0 }}>
                  <span style={{ color: "#5f0080", fontWeight: 700 }}>{fmtDist(j.distance_km)}</span>
                  {" · "}{fmtExp(j.experience_level)}{" · "}{fmtSalary(j.salary_min)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
