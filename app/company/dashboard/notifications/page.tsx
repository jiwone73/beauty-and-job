"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import CompanyLayout from "@/components/company/CompanyLayout";
import { 알림칸, 동의칸 } from "@/lib/companyNotifySettings";
import { 플랜, type PlanId } from "@/lib/companyPlans";

/** 기업 알림설정.
 *
 *  스위치는 누르는 즉시 저장한다 — 저장 단추를 따로 두면 켜 놓고 그냥 나가서
 *  안 켜진 채로 남는다. 실패하면 되돌리고 그 자리에서 말한다.
 *
 *  두 묶음이다. 위는 우리 일에 대한 알림, 아래는 광고성 정보 수신 동의 —
 *  뒤엣것은 가입 때 받은 그 동의라, 끄면 철회 기록이 남는다.
 */
export default function CompanyNotificationsPage() {
  const [on, setOn] = useState<Record<string, boolean>>(
    Object.fromEntries(알림칸.map((c) => [c.key, true]))
  );
  const [동의, set동의] = useState<Record<string, boolean>>(
    Object.fromEntries(동의칸.map((c) => [c.key, false]))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/company/me/notification-settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return;
        setOn(res.data.notification_settings);
        set동의(res.data.consents || {});
      })
      .catch((e) => console.error("[알림설정]", e))
      .finally(() => setLoading(false));
    // "추천 인재 메일"은 프리미엄 전용 기능이라("스탠다드도 오나?" → 아니오,
    // lib/companyPlans.ts의 인재추천 플래그가 프리미엄에만 true) 그 등급인지
    // 알아야 토글을 잠글지 정한다.
    fetch("/api/company/me/plan", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setPlan(res.data?.plan ?? null); })
      .catch(() => {});
  }, []);

  const 저장 = async (몸: any, 되돌리기: () => void) => {
    setError("");
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const r = await fetch("/api/company/me/notification-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(몸),
      });
      const res = await r.json();
      if (!res.success) throw new Error(res.error?.message || "저장하지 못했어요.");
      setOn(res.data.notification_settings);
      set동의(res.data.consents || {});
    } catch (e: any) {
      되돌리기();
      setError(e.message || "저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  const 알림바꾸기 = (key: string) => {
    const 이전 = on[key];
    setOn((p) => ({ ...p, [key]: !이전 }));
    저장({ notification_settings: { [key]: !이전 } }, () => setOn((p) => ({ ...p, [key]: 이전 })));
  };
  const 동의바꾸기 = (key: string) => {
    const 이전 = 동의[key];
    set동의((p) => ({ ...p, [key]: !이전 }));
    저장({ consents: { [key]: !이전 } }, () => set동의((p) => ({ ...p, [key]: 이전 })));
  };

  /** 스위치 한 칸 — 이름·설명과 스위치를 좌우로. 무엇을 켜는 건지 한 줄씩 적는다
   *  ("상세하게 다 나열해서 선택을 받는게 좋을거 같아"). 플랜에 없는 기능은
   *  칸을 지우지 않고 스위치를 그대로 둔 채 눌러지지 않게만 한다
   *  ("아예 지우지 말고 비활성화 시켜"). disabled 로 막으면 눌러도 아무 반응이
   *  없어 왜 안 켜지는지 알 길이 없다 — 눌렀을 때 이유를 바로 말해준다
   *  ("토글하면 안내멘트는 보여줘야지"). */
  const 칸 = (key: string, title: string, desc: string | undefined, 켜짐: boolean, 누름: () => void, 잠김?: string) => (
    <div key={key} style={{ border: "1px solid #ececf0", borderRadius: 10, padding: "15px 16px",
      display: "flex", alignItems: "center", gap: 12, opacity: 잠김 ? 0.5 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="set-name" style={{ color: "#333" }}>{title}</div>
        {desc && <div style={{ fontSize: 13, color: "#555", marginTop: 3 }}>{desc}</div>}
        {잠김 && (
          <Link href="/company/plans" style={{ fontSize: 13, color: "var(--color-primary)", fontWeight: 600 }}>
            {잠김} ›
          </Link>
        )}
      </div>
      <button type="button" role="switch" aria-checked={켜짐} aria-label={title}
        onClick={잠김 ? () => alert(`${잠김} 기능이에요. 상품안내에서 확인해 보세요.`) : 누름}
        style={{ width: 42, height: 24, borderRadius: 12, border: "none", flexShrink: 0,
          cursor: 잠김 ? "not-allowed" : "pointer", padding: 2, display: "flex",
          justifyContent: 켜짐 ? "flex-end" : "flex-start",
          background: 켜짐 ? "var(--color-primary)" : "#d8d8dd", transition: "background .18s" }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.22)" }} />
      </button>
    </div>
  );

  const 인재추천가능 = !!plan && !!플랜[plan]?.인재추천;

  const 묶음제목 = { color: "#333", margin: "0 0 4px" } as const;
  const 묶음설명 = { color: "#555", margin: "0 0 12px", lineHeight: 1.6 } as const;
  const 두칸 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as const;

  return (
    <CompanyLayout activePage="notifications">
      <div>
        {loading ? (
          <p style={{ fontSize: 15, color: "#555", padding: "40px 0", textAlign: "center", margin: 0 }}>불러오는 중…</p>
        ) : (
          <>
            <section style={{ marginBottom: 34 }}>
              <h2 className="set-name" style={묶음제목}>새 지원자 알림</h2>
              <p className="set-val" style={묶음설명}>우리 공고에 지원이 들어오면 알려드려요.</p>
              <div style={두칸}>
                {알림칸.map((c) => 칸(c.key, c.title, c.desc, !!on[c.key], () => 알림바꾸기(c.key)))}
              </div>
              {알림칸.every((c) => !on[c.key]) && (
                <p style={{ fontSize: 15, color: "#c98a2e", margin: "10px 2px 0", lineHeight: 1.6 }}>
                  둘 다 끄면 지원이 들어와도 알려드리지 않아요.
                </p>
              )}
            </section>

            <section>
              <h2 className="set-name" style={묶음제목}>뷰티워크 소식 받기</h2>
              <div style={두칸}>
                {동의칸.map((c) => 칸(c.key, c.title, c.desc, !!동의[c.key], () => 동의바꾸기(c.key),
                  c.key === "TALENT_RECOMMEND" && !인재추천가능 ? "프리미엄 전용" : undefined))}
              </div>
            </section>

            {error && (
              <p style={{ fontSize: 15, color: "#e05252", margin: "16px 2px 0" }}>{error}</p>
            )}
          </>
        )}
      </div>
    </CompanyLayout>
  );
}
