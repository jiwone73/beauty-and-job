"use client";
import { useState, useEffect } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { 알림칸, 동의칸 } from "@/lib/companyNotifySettings";

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

  /** 스위치 한 칸 — 테두리 상자 안에 이름과 스위치를 좌우로. 설명은 묶음 제목 아래
   *  한 줄로 끝내고 칸마다 또 붙이지 않는다. */
  const 칸 = (key: string, title: string, 켜짐: boolean, 누름: () => void) => (
    <div key={key} style={{ border: "1px solid #ececf0", borderRadius: 10, padding: "15px 16px",
      display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 16.5, color: "#1a1a1a" }}>{title}</div>
      <button type="button" role="switch" aria-checked={켜짐} aria-label={title} onClick={누름}
        style={{ width: 42, height: 24, borderRadius: 12, border: "none", flexShrink: 0,
          cursor: "pointer", padding: 2, display: "flex",
          justifyContent: 켜짐 ? "flex-end" : "flex-start",
          background: 켜짐 ? "var(--color-primary)" : "#d8d8dd", transition: "background .18s" }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.22)" }} />
      </button>
    </div>
  );

  const 묶음제목 = { fontSize: 17, color: "#1a1a1a", margin: "0 0 4px" } as const;
  const 묶음설명 = { fontSize: 15, color: "#8a8a90", margin: "0 0 12px", lineHeight: 1.6 } as const;
  const 두칸 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as const;

  return (
    <CompanyLayout activePage="notifications">
      <div>
        {loading ? (
          <p style={{ fontSize: 16, color: "#999", padding: "40px 0", textAlign: "center", margin: 0 }}>불러오는 중…</p>
        ) : (
          <>
            <section style={{ marginBottom: 34 }}>
              <h2 style={묶음제목}>새 지원자 알림</h2>
              <p style={묶음설명}>우리 공고에 지원이 들어오면 알려드려요.</p>
              <div style={두칸}>
                {알림칸.map((c) => 칸(c.key, c.title, !!on[c.key], () => 알림바꾸기(c.key)))}
              </div>
              {알림칸.every((c) => !on[c.key]) && (
                <p style={{ fontSize: 14.5, color: "#c98a2e", margin: "10px 2px 0", lineHeight: 1.6 }}>
                  둘 다 끄면 지원이 들어와도 알려드리지 않아요.
                </p>
              )}
            </section>

            <section>
              <h2 style={묶음제목}>뷰티워크 소식 받기</h2>
              <p style={묶음설명}>가입할 때 받은 수신 동의예요. 끄면 그때부터 보내지 않아요.</p>
              <div style={두칸}>
                {동의칸.map((c) => 칸(c.key, c.title, !!동의[c.key], () => 동의바꾸기(c.key)))}
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
