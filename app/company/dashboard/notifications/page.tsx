"use client";
import { useState, useEffect } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { 알림칸, type 알림열쇠 } from "@/lib/companyNotifySettings";

/** 기업 알림설정.
 *
 *  스위치는 누르는 즉시 저장한다 — 저장 단추를 따로 두면 켜 놓고 그냥 나가서
 *  안 켜진 채로 남는다. 실패하면 되돌리고 그 자리에서 말한다.
 */
export default function CompanyNotificationsPage() {
  const [on, setOn] = useState<Record<string, boolean>>(
    Object.fromEntries(알림칸.map((c) => [c.key, true]))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/company/me/notification-settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setOn(res.data.notification_settings); })
      .catch((e) => console.error("[알림설정]", e))
      .finally(() => setLoading(false));
  }, []);

  const 바꾸기 = async (key: 알림열쇠) => {
    const 이전 = on[key];
    setOn((p) => ({ ...p, [key]: !이전 }));
    setError("");
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const r = await fetch("/api/company/me/notification-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ notification_settings: { [key]: !이전 } }),
      });
      const res = await r.json();
      if (!res.success) throw new Error(res.error?.message || "저장하지 못했어요.");
      setOn(res.data.notification_settings);
    } catch (e: any) {
      setOn((p) => ({ ...p, [key]: 이전 }));           // 못 바꿨으면 화면도 되돌린다
      setError(e.message || "저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <CompanyLayout activePage="notifications">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="company-card">
          <div style={{ padding: "6px 20px 10px" }}>
            {loading ? (
              <p style={{ fontSize: 14, color: "#999", padding: "34px 0", textAlign: "center", margin: 0 }}>불러오는 중…</p>
            ) : (
              <>
                {알림칸.map((c, i) => (
                  <div key={c.key} style={{ display: "flex", alignItems: "flex-start", gap: 16,
                    padding: "18px 0", borderTop: i === 0 ? "none" : "1px solid #f2f2f4" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, color: "#1a1a1a", marginBottom: 4 }}>{c.title}</div>
                      <div style={{ fontSize: 13, color: "#999", lineHeight: 1.6 }}>{c.desc}</div>
                    </div>
                    {/* 스위치 — 켜짐/꺼짐이 색과 동그라미 위치 둘로 보이게 한다. */}
                    <button type="button" role="switch" aria-checked={!!on[c.key]} aria-label={c.title}
                      onClick={() => 바꾸기(c.key)}
                      style={{ width: 44, height: 25, borderRadius: 13, border: "none", flexShrink: 0,
                        marginTop: 2, cursor: "pointer", padding: 2, display: "flex",
                        justifyContent: on[c.key] ? "flex-end" : "flex-start",
                        background: on[c.key] ? "var(--color-primary)" : "#d8d8dd",
                        transition: "background .18s" }}>
                      <span style={{ width: 21, height: 21, borderRadius: "50%", background: "#fff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.22)" }} />
                    </button>
                  </div>
                ))}
                {error && (
                  <p style={{ fontSize: 13, color: "#e05252", margin: "0 0 14px" }}>{error}</p>
                )}
              </>
            )}
          </div>
        </div>
        {/* 둘 다 끄면 지원자가 와도 아무 데서도 안 알려준다 — 그 사실은 말해 주는 게 맞다. */}
        {!loading && 알림칸.every((c) => !on[c.key]) && (
          <p style={{ fontSize: 13, color: "#c98a2e", margin: "12px 2px 0", lineHeight: 1.6 }}>
            모두 꺼 두면 지원이 들어와도 알려드리지 않아요. 지원자 관리 화면에서 직접 확인해야 해요.
          </p>
        )}
      </div>
    </CompanyLayout>
  );
}
