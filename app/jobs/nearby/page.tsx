"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { jobCompanyName } from "@/lib/companyName";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Crosshair, Search } from "lucide-react";

declare global {
  interface Window { kakao: any }
}

const KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const SEOUL = { lat: 37.5665, lng: 126.978 };
const RADII = [1, 2, 5];
const TYPES: { key: string; label: string }[] = [
  { key: "STORE", label: "매장" },
  { key: "OFFICE", label: "본사" },
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
  // 지도 위 주소 찾기. 타이핑하는 동안 후보가 따라 나오고, 고르면 지도가 그리로 간다.
  const [주소글, set주소글] = useState("");
  const [후보, set후보] = useState<{ name: string; sub: string; lat: number; lng: number }[]>([]);
  const [후보열림, set후보열림] = useState(false);
  const 찾기지연 = useRef<any>(null);

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
        strokeWeight: 2, strokeColor: "#582681", strokeOpacity: 0.8, strokeStyle: "dashed",
        fillColor: "#582681", fillOpacity: 0.05,
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

  // 초기 중심 = 지금 있는 자리. 이 화면의 이름이 '내 주변'이니 현재 위치가
  // 기본이어야 한다. 위치를 못 얻을 때에만(권한 거부·미지원·시간초과) 저장된
  // 거주지로, 그것도 없으면 서울로 떨어진다.
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

    // 위치를 못 쓸 때의 차선. 저장된 거주지 → 없으면 서울.
    const 지정한자리에서열기 = (안내: string) => {
      setNotice(안내);
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) { createMap(SEOUL.lat, SEOUL.lng); return; }
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
    };

    if (!navigator.geolocation) {
      지정한자리에서열기("이 브라우저는 위치를 알 수 없어요. 지도를 옮기면 그 자리 주변을 찾아드려요.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNotice("");
        createMap(pos.coords.latitude, pos.coords.longitude);
      },
      () => 지정한자리에서열기("위치를 쓸 수 없어 저장된 주소에서 열었어요. 지도를 옮기면 그 자리 주변을 찾아드려요."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
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

  // 매장 위치를 지도에 세운다.
  //
  // 기본 핀으로는 두 가지가 안 됐다. 한 매장에 공고가 여럿이면 좌표가 같아
  // 마커가 그대로 포개져 일곱 개가 하나로 보였고, 이름은 마우스를 올려야
  // 나와서 폰에서는 아예 볼 수 없었다.
  //
  // 그래서 매장 단위로 묶어 하나만 세우고, 이름과 공고 수를 늘 보이게 한다.
  // 지도만 보고도 "이 동네에 어디가 사람을 구하는지"를 읽을 수 있어야 한다.
  useEffect(() => {
    if (!mapObj.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    const map = mapObj.current;

    const 매장별 = new Map<string, Job[]>();
    jobs.forEach((j) => {
      if (!Number(j.latitude) || !Number(j.longitude)) return;
      const 목록 = 매장별.get(j.company_id);
      if (목록) 목록.push(j);
      else 매장별.set(j.company_id, [j]);
    });

    매장별.forEach((목록) => {
      const j = 목록[0];
      const pos = new window.kakao.maps.LatLng(Number(j.latitude), Number(j.longitude));
      const 이름 = jobCompanyName(j.job_type, j.company_name, j.brand_name) || "매장";

      // 매장 이름은 남이 적은 글이다. innerHTML 로 붙이면 그대로 실행되므로
      // textContent 로만 넣는다.
      const el = document.createElement("div");
      el.className = "nb-pin";
      const dot = document.createElement("span"); dot.className = "nb-pin-dot";
      const t = document.createElement("span"); t.className = "nb-pin-t"; t.textContent = 이름;
      el.append(dot, t);
      if (목록.length > 1) {
        const n = document.createElement("span"); n.className = "nb-pin-n";
        n.textContent = String(목록.length);
        el.append(n);
      }

      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos, content: el, yAnchor: 1.1, clickable: true,
      });
      overlay.setMap(map);

      // 공고가 하나면 바로 그 공고로. 여럿이면 무엇이 있는지 먼저 보여 준다.
      const iw = new window.kakao.maps.InfoWindow({ position: pos, removable: true });
      el.addEventListener("click", () => {
        if (목록.length === 1) { router.push(`/jobs/${j.id}`); return; }
        const box = document.createElement("div");
        box.className = "nb-iw";
        const h = document.createElement("b"); h.textContent = `${이름} · ${목록.length}건`;
        box.append(h);
        목록.forEach((it) => {
          const a = document.createElement("a");
          a.href = `/jobs/${it.id}`;
          a.textContent = it.title;
          a.addEventListener("click", (ev) => { ev.preventDefault(); router.push(`/jobs/${it.id}`); });
          box.append(a);
        });
        iw.setContent(box);
        iw.open(map);
      });

      markersRef.current.push(overlay);
    });
  }, [jobs, router]);

  // 주소로 먼저 묻고, 없으면 장소로 묻는다.
  //
  // 순서가 중요하다. 장소 검색을 먼저 하면 "서초동"에 서초약수터·푸드트럭존이
  // 앞에 나온다 — 동네를 찾는 사람에게는 쓸모없는 답이다. 주소 검색은 같은
  // 말에 "서울 서초구 서초동"을 정확히 준다.
  //
  // 반대로 "강남역", "롯데백화점"은 주소가 아니라서 주소 검색이 비운다.
  // 그때 장소 검색이 받는다.
  const 후보찾기 = useCallback((말: string) => {
    const w = window as any;
    if (!말.trim() || !w.kakao?.maps?.services) { set후보([]); return; }
    const 담기 = (목록: any[]) => {
      set후보(목록.slice(0, 6).map((x) => ({
        name: x.place_name || x.address_name,
        sub: x.road_address_name || x.address_name || "",
        lat: parseFloat(x.y), lng: parseFloat(x.x),
      })));
      set후보열림(true);
    };
    const 장소로 = () => {
      const ps = new w.kakao.maps.services.Places();
      ps.keywordSearch(말, (res: any[], st: string) => {
        if (st === w.kakao.maps.services.Status.OK && res.length) 담기(res);
        else { set후보([]); set후보열림(true); }
      });
    };
    if (!geocoder.current) { 장소로(); return; }
    geocoder.current.addressSearch(말, (res: any[], st: string) => {
      if (st === w.kakao.maps.services.Status.OK && res.length) 담기(res);
      else 장소로();
    });
  }, []);

  const 주소바뀜 = (v: string) => {
    set주소글(v);
    if (찾기지연.current) clearTimeout(찾기지연.current);
    if (!v.trim()) { set후보([]); set후보열림(false); return; }
    // 한 글자 칠 때마다 물으면 후보가 깜빡인다. 손이 멈추면 묻는다.
    찾기지연.current = setTimeout(() => 후보찾기(v), 300);
  };

  const 후보로이동 = (c: { name: string; lat: number; lng: number }) => {
    set주소글(c.name);
    set후보열림(false);
    if (mapObj.current) {
      mapObj.current.setCenter(new (window as any).kakao.maps.LatLng(c.lat, c.lng));
    }
  };

  const goCurrentLocation = useCallback(() => {
    if (!navigator.geolocation || !mapObj.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => mapObj.current.setCenter(new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)),
      () => setNotice("위치 권한이 없어 이동하지 못했어요."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return (
    <>
      {/* 메뉴에서 바로 들어오는 자리라 사이트 헤더를 그대로 이고 간다. 헤더가
          없으면 다른 화면으로 갈 길이 뒤로가기뿐이라 갇힌 것처럼 된다. 같은
          이유로 안쪽 뒤로가기 화살표는 뺀다 — 파고든 화면이 아니다. */}
      <Header />
      {/* .nb-page 는 max-width 로 가운데 둔 안쪽 기둥이라 화면 전체 폭을
          안 채운다. 바탕은 이 바깥 겹에서 칠한다 — body 는 전역 규칙이
          !important 로 걸려 있어 여기서 못 이긴다. */}
      <div className="nb-shell">
      <div className="nb-page">
        <div className="nb-head">
          <h1>내 주변 공고</h1>
          {areaLabel && <span className="nb-area">📍 {areaLabel}</span>}
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
          <Crosshair size={20} color="#582681" />
        </button>
        {/* 안내 */}
        {/* 지도 위 주소 찾기. 지금 자리가 아닌 데를 보고 싶을 때 — 이사 갈
            동네, 학원 근처 — 지도를 끌어서 찾아가는 것보다 이름을 치는 편이
            빠르다. 지도 위에 얹어야 '이 지도를 옮기는 것'으로 읽힌다. */}
        <div className="nb-find">
          <div className="nb-find-box">
            <Search size={16} />
            <input
              value={주소글}
              onChange={(e) => 주소바뀜(e.target.value)}
              onFocus={() => { if (후보.length) set후보열림(true); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); if (후보[0]) 후보로이동(후보[0]); }
                if (e.key === "Escape") set후보열림(false);
              }}
              placeholder="동네·역·건물 이름으로 옮기기"
              aria-label="지도를 옮길 곳"
            />
            {주소글 && (
              <button type="button" aria-label="지우기"
                onClick={() => { set주소글(""); set후보([]); set후보열림(false); }}>×</button>
            )}
          </div>
          {후보열림 && (
            <ul className="nb-find-list">
              {후보.length === 0 ? (
                <li className="nb-find-none">그런 곳을 못 찾았어요</li>
              ) : (
                후보.map((c, i) => (
                  <li key={`${c.name}-${i}`}>
                    <button type="button" onClick={() => 후보로이동(c)}>
                      <b>{c.name}</b>
                      {c.sub && <span>{c.sub}</span>}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="nb-hint">지도를 움직이면 그 위치로 검색돼요</div>
      </div>

      {/* 반경 · 유형 컨트롤 */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <div className="seg" style={{ display: "flex", marginBottom: 10 }}>
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`seg-btn ${type === t.key ? "active" : ""}`}
              style={{ flex: 1 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#666" }}>반경</span>
          <div className="seg">
            {RADII.map((r) => (
              <button key={r} onClick={() => setRadius(r)}
                className={`seg-btn ${radius === r ? "active" : ""}`}
                style={{ padding: "6px 13px", fontSize: 13 }}>
                {r}km
              </button>
            ))}
          </div>
        </div>
        {/* 이 화면이 어떻게 도는지 한 줄로 말해 둔다. 지도는 조작법을 스스로
            설명하지 못해서, 처음 온 사람은 끌어 볼 생각을 못 한다. */}
        <p className="nb-how">
          지금 있는 자리에서 열려요. 지도를 끌거나 <b>위쪽 칸에 동네·역 이름을 넣으면</b> 그 자리 주변 공고를 바로 찾아드려요.
        </p>
      </div>

      {notice && (
        <p style={{ fontSize: 12.5, color: "#8a6d3b", background: "#fcf8e3", padding: "10px 16px", margin: 0, lineHeight: 1.5 }}>{notice}</p>
      )}

      {/* 리스트 */}
      <div className="nb-list">
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
              <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 10, background: "#f7f7f8", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {j.logo_url ? <img src={j.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#582681", fontWeight: 700 }}>{(jobCompanyName(j.job_type, j.company_name, j.brand_name) || "?")[0]}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, color: "#888", margin: 0 }}>{jobCompanyName(j.job_type, j.company_name, j.brand_name)}</p>
                <p style={{ fontSize: 14.5, fontWeight: 600, margin: "2px 0", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</p>
                <p style={{ fontSize: 12.5, color: "#666", margin: 0 }}>
                  <span style={{ color: "#582681", fontWeight: 700 }}>{fmtDist(j.distance_km)}</span>
                  {" · "}{fmtExp(j.experience_level)}{" · "}{fmtSalary(j.salary_min)}
                </p>
              </div>
            </Link>
          ))
        )}
        </div>
      </div>
      </div>
    </>
  );
}
