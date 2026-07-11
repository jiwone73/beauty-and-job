"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Crosshair, MapPin } from "lucide-react";

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

type Base = { lat: number; lng: number; label: string };
type Job = {
  id: string;
  title: string;
  job_type: string;
  location: string | null;
  deadline: string | null;
  salary_min: number | null;
  salary_type: string | null;
  experience_level: string | null;
  company_id: string;
  company_name: string | null;
  brand_name: string | null;
  logo_url: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
};

// 카카오 SDK(services 포함) 로드
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

function fmtDist(km: number) {
  if (km < 1) return `약 ${Math.round(km * 1000)}m`;
  return `약 ${km.toFixed(1)}km`;
}
function fmtSalary(min: number | null) {
  if (!min) return "급여 협의";
  return `${(min / 10000).toLocaleString()}만원~`;
}
function fmtExp(level: string | null) {
  return level === "NEW" ? "신입" : level === "EXPERIENCED" ? "경력" : "경력무관";
}

export default function NearbyJobsPage() {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const overlays = useRef<any[]>([]);

  const [sdkReady, setSdkReady] = useState(false);
  const [base, setBase] = useState<Base | null>(null);
  const [radius, setRadius] = useState(2);
  const [type, setType] = useState("STORE");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>("");

  // 1) SDK 로드
  useEffect(() => {
    if (!KEY) { setNotice("지도 키가 설정되지 않았습니다."); return; }
    loadKakao(() => setSdkReady(true));
  }, []);

  // 2) 거주지 주소 → 좌표 (기본 기준점)
  useEffect(() => {
    if (!sdkReady) return;
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      setNotice("거주지 기준으로 보려면 로그인이 필요해요. 우선 현재위치로 볼 수 있어요.");
      useCurrentLocation();
      return;
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res.success) throw new Error();
        const d = res.data;
        const addr =
          [d.address_road, d.address_detail].filter(Boolean).join(" ") ||
          [d.region_sido, d.region_sigungu].filter(Boolean).join(" ");
        if (!addr) {
          setNotice("프로필에 거주지가 없어요. 거주지를 등록하면 집 근처 공고를 볼 수 있어요. (지금은 현재위치 기준)");
          useCurrentLocation();
          return;
        }
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(addr, (result: any[], status: string) => {
          if (cancelled) return;
          if (status === window.kakao.maps.services.Status.OK && result[0]) {
            setBase({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x), label: "거주지 기준" });
          } else {
            setNotice("거주지 주소를 좌표로 변환하지 못했어요. 현재위치 기준으로 보여드릴게요.");
            useCurrentLocation();
          }
        });
      })
      .catch(() => {
        if (!cancelled) useCurrentLocation();
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady]);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setBase({ ...SEOUL, label: "서울 기준" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setBase({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "현재위치 기준" }),
      () => {
        setNotice("위치 권한이 없어 서울 기준으로 표시해요.");
        setBase({ ...SEOUL, label: "서울 기준" });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 3) 지도 생성 / 중심 이동
  useEffect(() => {
    if (!sdkReady || !base || !mapEl.current) return;
    const center = new window.kakao.maps.LatLng(base.lat, base.lng);
    if (!mapObj.current) {
      mapObj.current = new window.kakao.maps.Map(mapEl.current, { center, level: radius <= 1 ? 4 : radius <= 2 ? 5 : 6 });
    } else {
      mapObj.current.setCenter(center);
      mapObj.current.setLevel(radius <= 1 ? 4 : radius <= 2 ? 5 : 6);
    }
  }, [sdkReady, base, radius]);

  // 4) 반경 내 공고 조회
  useEffect(() => {
    if (!base) return;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ lat: String(base.lat), lng: String(base.lng), radius: String(radius) });
    if (type) qs.set("type", type);
    fetch(`/api/jobs/nearby?${qs.toString()}`)
      .then((r) => r.json())
      .then((res) => { if (!cancelled && res.success) setJobs(res.data.jobs || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [base, radius, type]);

  // 5) 마커 + 기준점 + 반경원 렌더
  useEffect(() => {
    if (!mapObj.current || !base) return;
    overlays.current.forEach((o) => o.setMap(null));
    overlays.current = [];
    const map = mapObj.current;

    // 기준점 원
    const circle = new window.kakao.maps.Circle({
      center: new window.kakao.maps.LatLng(base.lat, base.lng),
      radius: radius * 1000,
      strokeWeight: 1, strokeColor: "#5f0080", strokeOpacity: 0.4,
      fillColor: "#5f0080", fillOpacity: 0.05,
    });
    circle.setMap(map);
    overlays.current.push(circle);

    // 기준점 마커
    const homeMarker = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(base.lat, base.lng),
      content: `<div style="background:#5f0080;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:12px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${base.label}</div>`,
      yAnchor: 1.4,
    });
    homeMarker.setMap(map);
    overlays.current.push(homeMarker);

    // 공고 마커
    jobs.forEach((j) => {
      if (!j.latitude || !j.longitude) return;
      const pos = new window.kakao.maps.LatLng(j.latitude, j.longitude);
      const marker = new window.kakao.maps.Marker({ position: pos, map });
      const iw = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:12px;font-weight:600;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis">${j.brand_name || j.company_name || ""} · ${fmtDist(j.distance_km)}</div>`,
      });
      window.kakao.maps.event.addListener(marker, "click", () => router.push(`/jobs/${j.id}`));
      window.kakao.maps.event.addListener(marker, "mouseover", () => iw.open(map, marker));
      window.kakao.maps.event.addListener(marker, "mouseout", () => iw.close());
      overlays.current.push(marker);
    });
  }, [jobs, base, radius, router]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid #eee", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "#555" }}>
          <ChevronLeft size={22} />
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>내 주변 채용</h1>
      </div>

      {/* 지도 */}
      <div ref={mapEl} style={{ width: "100%", height: 300, background: "#f2f2f2" }} />

      {/* 컨트롤 */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: "#666", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <MapPin size={14} color="#5f0080" />{base ? base.label : "위치 확인 중…"}
          </span>
          <button onClick={useCurrentLocation}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", border: "1px solid #e0d0f0", borderRadius: 8, background: "#faf5ff", color: "#5f0080", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Crosshair size={14} /> 현재위치
          </button>
        </div>

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
            반경 {radius}km 안에 조건에 맞는 공고가 없어요.<br />반경을 넓히거나 유형을 바꿔보세요.
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
