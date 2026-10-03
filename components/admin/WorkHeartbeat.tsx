"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Clock, PauseCircle } from "lucide-react";
import { ALBA_IDLE_GAP_MIN } from "@/lib/alba";

// 근무 시간 자동 측정기 + 실시간 타이머. 루트 레이아웃에 걸려 사이트 전체에서 돈다.
//  · /admin 아래: 타이머 배지를 보여 준다.
//  · 그 밖의 화면(알바가 사이트를 직접 써 보며 테스트하는 일): 배지 없이 조용히 센다.
//    알바 일이 공고 입력에서 사이트 테스트·가이드 영상 시청으로 넓어졌다. 같은 브라우저에
//    알바 관리자 토큰(admin_token)이 있으면, 일반 화면에서 하는 테스트도 근무로 센다.
//    알바 토큰이 없는 방문자는 여기서 아무것도 보내지 않는다.
//  · 영상을 보는 동안(재생 중·탭이 보임·창에 포커스·영상이 화면 안)은 조작이 없어도 일하는 것으로 본다.
//    뒤에서 돌기만 하는 영상은 세지 않는다.
//
// 로그인·로그아웃으로 재지 않는 이유는 서버 쪽 heartbeat 주석에 적어 뒀다.
// 여기서는 '관리자 창이 화면에 떠 있고, 최근에 손을 댔을 때'만 서버를 두드린다.
//  · 탭이 뒤에 있거나 창이 내려가 있으면(document.hidden) 두드리지 않는다
//  · 마지막 조작이 ACTIVE_WINDOW_MS 보다 오래됐으면 두드리지 않고 '멈춤'으로 보여 준다
// 서버도 같은 시간만큼 조용하면 그 구간을 마지막 신호에서 끊는다 (lib/albaWork.ts).
const PING_MS = 30_000;
const ACTIVE_WINDOW_MS = ALBA_IDLE_GAP_MIN * 60_000;

// 시간을 재는 대상. 다른 관리자까지 재면 통계가 지저분해진다.
const TRACKED = ["alba"];

function trackedToken(): string | null {
  const token = localStorage.getItem("admin_token");
  if (!token) return null;
  try {
    const sub = JSON.parse(atob(token.split(".")[1]))?.sub || "";
    return TRACKED.includes(sub) ? token : null;
  } catch {
    return null;
  }
}

function hm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}시간 ${m}분` : `${m}분`;
}

export default function WorkHeartbeat() {
  const pathname = usePathname();
  const onAdmin = (pathname || "").startsWith("/admin");
  const lastActive = useRef(Date.now());
  const [on, setOn] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // 서버가 알려 준 오늘 합계와, 그 값을 받은 시각. 사이 시간은 화면에서 더해 보여 준다.
  const [base, setBase] = useState<{ minutes: number; at: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const touch = () => { lastActive.current = Date.now(); };
    const events: (keyof DocumentEventMap)[] = ["pointerdown", "keydown", "scroll", "visibilitychange"];
    events.forEach((e) => document.addEventListener(e, touch, { passive: true }));
    // 영상은 재생 중에 클릭도 스크롤도 없다. 미디어 이벤트는 버블링하지 않아 캡처로 듣는다.
    // 다만 '보고 있는 영상'만 센다 — 영상이 뒤에서(다른 탭·가려진 창·화면 밖) 돌기만 하는 것은
    // 시청이 아니다. 아래 조건을 모두 채울 때만 조작으로 친다:
    //   재생 중 · 탭이 보이는 중 · 창에 포커스 · 영상이 화면 안에 걸쳐 있음.
    // timeupdate 는 재생되는 동안만 계속 온다 — 하나라도 어긋나면 평소대로 2분 뒤 '멈춤'이 된다.
    const watching = (e: Event) => {
      const el = e.target as HTMLMediaElement | null;
      if (!el || typeof el.paused !== "boolean" || el.paused || el.ended) return;
      if (document.hidden || !document.hasFocus()) return;
      const r = el.getBoundingClientRect();
      const inView = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
      if (inView) lastActive.current = Date.now();
    };
    const mediaEvents = ["play", "playing", "timeupdate"];
    mediaEvents.forEach((e) => document.addEventListener(e, watching, true));

    // 토큰은 주기마다 다시 읽는다. 이 레이아웃은 로그인 화면에서도 살아 있어서,
    // 처음 한 번만 읽으면 로그인 직후에 측정이 시작되지 않는다.
    const ping = async () => {
      const token = trackedToken();
      setOn(!!token);
      if (!token) return;

      const idle = document.hidden || Date.now() - lastActive.current > ACTIVE_WINDOW_MS;
      setPaused(idle);
      if (idle) return;

      try {
        const res = await fetch("/api/admin/alba/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        if (d.success) {
          setStartedAt(new Date(d.data.startedAt).getTime());
          setBase({ minutes: d.data.todayMinutes, at: Date.now() });
        }
      } catch {
        /* 잠깐 끊겨도 다음 주기에 다시 보낸다 */
      }
    };

    ping();
    const pingTimer = setInterval(ping, PING_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(pingTimer);
      clearInterval(tick);
      events.forEach((e) => document.removeEventListener(e, touch));
      mediaEvents.forEach((e) => document.removeEventListener(e, watching, true));
    };
  }, []);

  if (!on || !onAdmin) return null;

  const sessionMin = startedAt ? Math.floor((now - startedAt) / 60000) : 0;
  const sessionSec = startedAt ? Math.floor(((now - startedAt) % 60000) / 1000) : 0;
  // 서버 값을 받은 뒤 흐른 시간을 더해, 초 단위로도 멈춰 보이지 않게 한다.
  const todayMin = base ? base.minutes + (paused ? 0 : Math.floor((now - base.at) / 60000)) : 0;

  return (
    <div
      title={paused
        ? `${ALBA_IDLE_GAP_MIN}분 넘게 조작이 없어 멈췄어요. 화면을 다시 쓰면 이어집니다.`
        : "관리자 창이 화면에 떠 있는 동안 자동으로 쌓입니다."}
      style={{
        position: "fixed", right: 16, bottom: 16, zIndex: 9999,
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: "var(--chip-radius)",
        background: paused ? "#6b6b6b" : "#582681", color: "#fff",
        boxShadow: "0 6px 20px rgba(0,0,0,.18)",
        fontSize: 13, fontVariantNumeric: "tabular-nums",
      }}
    >
      {paused ? <PauseCircle size={16} /> : <Clock size={16} />}
      <span>
        {paused ? "멈춤" : "근무 중"} {String(Math.floor(sessionMin / 60)).padStart(2, "0")}:
        {String(sessionMin % 60).padStart(2, "0")}:{String(sessionSec).padStart(2, "0")}
      </span>
      <span style={{ opacity: 0.75 }}>오늘 {hm(todayMin)}</span>
    </div>
  );
}
