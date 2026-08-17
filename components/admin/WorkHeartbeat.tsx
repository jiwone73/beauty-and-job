"use client";
import { useEffect, useRef, useState } from "react";
import { Clock, PauseCircle } from "lucide-react";

// 근무 시간 자동 측정기 + 실시간 타이머. 관리자 화면 어디에 있든 함께 돈다.
//
// 로그인·로그아웃으로 재지 않는 이유는 서버 쪽 heartbeat 주석에 적어 뒀다.
// 여기서는 '화면을 보고 있고, 최근에 손을 댔을 때'만 서버를 두드린다.
//  · 탭이 뒤에 있으면(document.hidden) 두드리지 않는다 → 켜 두고 자리 비운 시간은 안 센다
//  · 마지막 조작이 ACTIVE_WINDOW_MS 보다 오래됐으면 두드리지 않고 '멈춤'으로 보여 준다
// 서버는 15분 넘게 조용하면 그 구간을 마지막 두드림에서 끊는다.
const PING_MS = 60_000;
const ACTIVE_WINDOW_MS = 5 * 60_000;

// 시간을 재는 대상. 다른 관리자까지 재면 통계가 지저분해진다.
const TRACKED = ["alba"];

function hm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}시간 ${m}분` : `${m}분`;
}

export default function WorkHeartbeat() {
  const lastActive = useRef(Date.now());
  const [on, setOn] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // 서버가 알려 준 오늘 합계와, 그 값을 받은 시각. 사이 시간은 화면에서 더해 보여 준다.
  const [base, setBase] = useState<{ minutes: number; at: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    let adminId = "";
    try {
      adminId = JSON.parse(atob(token.split(".")[1]))?.sub || "";
    } catch {
      return;
    }
    if (!TRACKED.includes(adminId)) return;
    setOn(true);

    const touch = () => { lastActive.current = Date.now(); };
    const events: (keyof DocumentEventMap)[] = ["pointerdown", "keydown", "scroll", "visibilitychange"];
    events.forEach((e) => document.addEventListener(e, touch, { passive: true }));

    const ping = async () => {
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
    };
  }, []);

  if (!on) return null;

  const sessionMin = startedAt ? Math.floor((now - startedAt) / 60000) : 0;
  const sessionSec = startedAt ? Math.floor(((now - startedAt) % 60000) / 1000) : 0;
  // 서버 값을 받은 뒤 흐른 시간을 더해, 초 단위로도 멈춰 보이지 않게 한다.
  const todayMin = base ? base.minutes + (paused ? 0 : Math.floor((now - base.at) / 60000)) : 0;

  return (
    <div
      title={paused ? "조작이 없어 시간이 멈췄어요. 화면을 다시 쓰면 이어집니다." : "관리자 화면을 쓰는 동안 자동으로 쌓입니다."}
      style={{
        position: "fixed", right: 16, bottom: 16, zIndex: 9999,
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: 999,
        background: paused ? "#6b6b6b" : "#5f0080", color: "#fff",
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
